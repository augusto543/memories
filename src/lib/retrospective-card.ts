import type { RetrospectiveData } from "@/lib/queries/retrospectives";

// Card contains only summary values explicitly selected by the user.
// Escaping prevents memory titles/locations from injecting SVG markup.
const escapeXml = (input: string): string => input.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[char] ?? char));

function abbreviate(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : normalized.slice(0, max - 1).trimEnd() + "…";
}

export function buildRetrospectiveSvg(data: RetrospectiveData): string {
  const label = escapeXml(abbreviate(data.label, 42));
  const highlight = escapeXml(abbreviate(data.bestMoment?.title ?? "Cada momento merece ser lembrado.", 58));
  const city = escapeXml(abbreviate(data.topCity ?? "Muitos lugares para descobrir", 46));
  const rating = data.averageRating === null ? "—" : data.averageRating.toFixed(1).replace(".", ",");
  const numbers: { x: number; value: string; label: string }[] = [
    { x: 180, value: String(data.totalDates), label: "encontros" },
    { x: 540, value: String(data.totalPhotos), label: "fotos" },
    { x: 900, value: String(data.totalNotes), label: "notinhas" },
  ];
  const statMarkup = numbers.map(({ x, value, label: caption }) => `
    <text x="${x}" y="705" fill="#fff2e8" text-anchor="middle" font-family="Georgia,serif" font-size="102">${escapeXml(value)}</text>
    <text x="${x}" y="760" fill="#f6c9c3" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" letter-spacing="3">${caption}</text>
  `).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#411e39"/>
      <stop offset="50%" stop-color="#7a3856"/>
      <stop offset="100%" stop-color="#bd6b70"/>
    </linearGradient>
    <radialGradient id="orb">
      <stop offset="0%" stop-color="#f6cbbb" stop-opacity=".32"/>
      <stop offset="100%" stop-color="#f6cbbb" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <circle cx="920" cy="210" r="530" fill="url(#orb)"/>
  <circle cx="-100" cy="1110" r="470" fill="url(#orb)"/>
  <rect x="48" y="48" width="984" height="1254" rx="32" fill="none" stroke="#f5d3c4" stroke-opacity=".45" stroke-width="2"/>
  <text x="540" y="166" text-anchor="middle" fill="#f5d3c4" font-family="Arial,sans-serif" font-size="30" letter-spacing="10">MEMORIES</text>
  <text x="540" y="315" text-anchor="middle" fill="#fff8ed" font-family="Georgia,serif" font-size="91" font-style="italic">Nossa história</text>
  <text x="540" y="398" text-anchor="middle" fill="#ffddd0" font-family="Georgia,serif" font-size="49" font-style="italic">${label}</text>
  <path d="M540 525 C495 475 428 515 540 610 C652 515 585 475 540 525Z" fill="#f3b2ad" opacity=".93"/>
  <line x1="120" y1="831" x2="960" y2="831" stroke="#e7b9b2" stroke-opacity=".55"/>
  ${statMarkup}
  <text x="540" y="928" text-anchor="middle" fill="#f6c9c3" font-family="Arial,sans-serif" font-size="26" letter-spacing="3">MOMENTO MARCANTE</text>
  <text x="540" y="990" text-anchor="middle" fill="#fff8ed" font-family="Georgia,serif" font-size="43">${highlight}</text>
  <text x="540" y="1088" text-anchor="middle" fill="#ffddd0" font-family="Arial,sans-serif" font-size="27">Nota média: ${escapeXml(rating)}  ·  Lugar especial: ${city}</text>
  <text x="540" y="1215" text-anchor="middle" fill="#f6c9c3" font-family="Georgia,serif" font-size="34" font-style="italic">As melhores memórias continuam sendo nossas.</text>
  <text x="540" y="1260" text-anchor="middle" fill="#f6c9c3" font-family="Arial,sans-serif" font-size="22" letter-spacing="4">memories</text>
</svg>`;
}

export async function retrospectivePng(data: RetrospectiveData): Promise<Blob> {
  const svg = buildRetrospectiveSvg(data);
  const source = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Não foi possível montar o cartão."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas não está disponível.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível exportar a imagem.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
