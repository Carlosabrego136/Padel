/**
 * Marcador del partido según el reglamento (sección 2):
 *  - Se juega a ganar 2 de 3 sets.
 *  - Sets 1 y 2: sets normales de juegos (6-0…6-4, 7-5, 7-6).
 *  - Si hay 1-1, el tercer set es súper tie-break a 10 puntos con diferencia de 2.
 */

export interface SetScore {
  a: number; // juegos/puntos de la pareja retadora
  b: number; // juegos/puntos de la pareja retada
}

export type ScoreResult =
  | { ok: true; ganadora: 'a' | 'b'; setsA: number; setsB: number }
  | { ok: false; error: string };

const esEntero = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** Set normal de juegos. Devuelve el lado ganador o null si el marcador no es posible. */
export function ganadorSetNormal(a: number, b: number): 'a' | 'b' | null {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  const valido = (max === 6 && min <= 4) || (max === 7 && (min === 5 || min === 6));
  if (!valido) return null;
  return a > b ? 'a' : 'b';
}

/** Súper tie-break a 10 puntos con diferencia obligatoria de 2. */
export function ganadorSuperTieBreak(a: number, b: number): 'a' | 'b' | null {
  const max = Math.max(a, b);
  const diff = Math.abs(a - b);
  if (max < 10 || diff < 2) return null;
  if (max > 10 && diff !== 2) return null; // pasado de 10 solo se llega con diferencia exacta de 2
  return a > b ? 'a' : 'b';
}

export function evaluarMarcador(sets: SetScore[]): ScoreResult {
  if (!Array.isArray(sets) || sets.length < 2 || sets.length > 3) {
    return { ok: false, error: 'El partido se juega a 2 de 3 sets: captura 2 o 3 sets' };
  }
  if (!sets.every((s) => s && esEntero(s.a) && esEntero(s.b))) {
    return { ok: false, error: 'Los marcadores deben ser números enteros' };
  }

  const g1 = ganadorSetNormal(sets[0].a, sets[0].b);
  if (!g1) return { ok: false, error: 'Marcador inválido en el set 1 (ej. 6-3, 7-5, 7-6)' };
  const g2 = ganadorSetNormal(sets[1].a, sets[1].b);
  if (!g2) return { ok: false, error: 'Marcador inválido en el set 2 (ej. 6-3, 7-5, 7-6)' };

  if (g1 === g2) {
    if (sets.length === 3) return { ok: false, error: 'Ya hay ganador en 2 sets: no se captura un tercero' };
    return { ok: true, ganadora: g1, setsA: g1 === 'a' ? 2 : 0, setsB: g1 === 'b' ? 2 : 0 };
  }

  if (sets.length !== 3) return { ok: false, error: 'Hay 1-1 en sets: falta el súper tie-break' };
  const g3 = ganadorSuperTieBreak(sets[2].a, sets[2].b);
  if (!g3) return { ok: false, error: 'Súper tie-break inválido: a 10 puntos con diferencia de 2 (ej. 10-7, 12-10)' };
  return { ok: true, ganadora: g3, setsA: g3 === 'a' ? 2 : 1, setsB: g3 === 'b' ? 2 : 1 };
}
