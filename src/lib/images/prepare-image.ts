import { PHOTO_LIMITS } from "@/lib/constants";

/**
 * Compressão/redimensionamento de imagem no browser (Canvas API, sem dependência).
 *
 * Regra: arquivos <= PHOTO_LIMITS.MAX_BYTES passam intactos (nada é degradado
 * sem necessidade). Acima disso, reduzimos dimensão e qualidade até caber no
 * limite, preservando proporção e orientação EXIF.
 *
 * Client-only: usa document/canvas.
 */

const ALLOWED = PHOTO_LIMITS.ALLOWED_MIME_TYPES as readonly string[];

/** Mira um pouco abaixo do limite para nunca esbarrar na validação final. */
const TARGET_BYTES = Math.floor(PHOTO_LIMITS.MAX_BYTES * 0.95);

/** Teto de resolução: suficiente para telas grandes, corta o excesso de câmeras. */
const MAX_DIMENSION = 2560;

/** Tentativas: primeiro só qualidade, depois reduzindo a dimensão. */
const SCALE_STEPS = [1, 0.75, 0.5, 0.35] as const;
const QUALITY_STEPS = [0.85, 0.7, 0.55] as const;

const GENERIC_ERROR =
  "não foi possível otimizar essa foto. Tente escolher outra imagem.";
const TOO_BIG_ERROR =
  "essa foto é muito grande e não conseguimos reduzir o suficiente. Tente uma imagem menor.";
const TIMEOUT_ERROR =
  "essa foto demorou demais para ser processada. Tente escolher outra imagem.";

/** Teto por operação: generoso para celulares lentos, curto o bastante para não travar a fila. */
const OP_TIMEOUT_MS = 15_000;

class ImageTimeoutError extends Error {}

/**
 * Safari/iOS pode nunca invocar o callback de `toBlob`/`onload` quando falha a
 * alocação de memória do canvas. Sem este teto o `await` fica pendente para
 * sempre e a fila de upload congela sem erro nenhum.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ImageTimeoutError("image operation timed out")),
      OP_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function errorFor(err: unknown): string {
  return err instanceof ImageTimeoutError ? TIMEOUT_ERROR : GENERIC_ERROR;
}

export type PrepareImageResult =
  | { ok: true; file: File; optimized: boolean }
  | { ok: false; error: string };

function canEncode(type: string): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(type).startsWith(`data:${type}`);
  } catch {
    return false;
  }
}

let webpSupport: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupport === null) webpSupport = canEncode("image/webp");
  return webpSupport;
}

/**
 * JPEG continua JPEG. PNG/WebP saem em WebP: o canvas não aceita `quality` em
 * PNG e o WebP preserva transparência. Sem suporte a WebP, cai para JPEG.
 */
function outputTypeFor(file: File): string {
  if (file.type === "image/jpeg") return "image/jpeg";
  return supportsWebp() ? "image/webp" : "image/jpeg";
}

/** O storage_path deriva a extensão do nome do arquivo — precisa acompanhar o tipo. */
function renameFor(filename: string, type: string): string {
  const ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  const base = filename.replace(/\.[^./\\]+$/, "") || "foto";
  return `${base}.${ext}`;
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await withTimeout(
        createImageBitmap(file, { imageOrientation: "from-image" }),
      );
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch (err) {
      if (err instanceof ImageTimeoutError) throw err;
      // navegador antigo ou formato recusado pelo createImageBitmap: usa <img>
    }
  }

  const url = URL.createObjectURL(file);
  const holder: { el: HTMLImageElement | null } = { el: null };
  try {
    const img = await withTimeout(
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        holder.el = image;
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("decode failed"));
        image.src = url;
      }),
    );
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      // Solta o bitmap decodificado, não só o objectURL.
      release: () => {
        img.removeAttribute("src");
        URL.revokeObjectURL(url);
      },
    };
  } catch (err) {
    // Aborta o decode em andamento para não segurar memória no iOS.
    holder.el?.removeAttribute("src");
    URL.revokeObjectURL(url);
    throw err;
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return withTimeout(
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    ),
  );
}

/**
 * Devolve o arquivo pronto para o upload atual (mesmo fluxo, mesmo limite).
 * Tipos fora de ALLOWED_MIME_TYPES passam intactos: quem reporta o formato
 * inválido é o `photoFileSchema`.
 */
export async function prepareImageForUpload(
  file: File,
): Promise<PrepareImageResult> {
  if (!ALLOWED.includes(file.type)) return { ok: true, file, optimized: false };
  if (file.size <= PHOTO_LIMITS.MAX_BYTES) {
    return { ok: true, file, optimized: false };
  }

  let decoded: DecodedImage;
  try {
    decoded = await decode(file);
  } catch (err) {
    return { ok: false, error: errorFor(err) };
  }

  // Um único canvas para todas as tentativas: cada resize troca o backing store
  // em vez de acumular um canvas órfão por passo (estourava a memória no iOS).
  let canvas: HTMLCanvasElement | null = null;
  try {
    const { source, width, height } = decoded;
    if (!width || !height) return { ok: false, error: GENERIC_ERROR };

    const type = outputTypeFor(file);
    // Proporção preservada: um único fator aplicado nos dois lados.
    const fit = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    canvas = document.createElement("canvas");

    for (const scale of SCALE_STEPS) {
      const factor = fit * scale;
      const w = Math.max(1, Math.round(width * factor));
      const h = Math.max(1, Math.round(height * factor));

      // Reatribuir width/height também limpa o canvas para o novo drawImage.
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, error: GENERIC_ERROR };
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, w, h);

      for (const quality of QUALITY_STEPS) {
        const blob = await toBlob(canvas, type, quality);
        if (!blob) return { ok: false, error: GENERIC_ERROR };
        if (blob.size <= TARGET_BYTES) {
          return {
            ok: true,
            file: new File([blob], renameFor(file.name, type), {
              type,
              lastModified: file.lastModified,
            }),
            optimized: true,
          };
        }
      }
    }

    return { ok: false, error: TOO_BIG_ERROR };
  } catch (err) {
    return { ok: false, error: errorFor(err) };
  } finally {
    // Sempre solta o ImageBitmap/<img> e zera o canvas, inclusive em timeout —
    // sem isso a foto seguinte já começa sem memória disponível no Safari.
    decoded.release();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
