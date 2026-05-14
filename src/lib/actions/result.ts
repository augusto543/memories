/**
 * Resultado padrão para Server Actions.
 *
 * Em vez de throw (que dispara error.tsx e atrapalha UX de forms), retornamos
 * um discriminated union. O client pode reagir inline:
 *   const res = await createDate(input);
 *   if (!res.ok) toast.error(res.error);
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (
  error: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<never> => ({ ok: false, error, fieldErrors });
