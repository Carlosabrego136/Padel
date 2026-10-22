/**
 * Motor del ranking: funciones PURAS (sin base de datos) que calculan cómo se mueve cada
 * categoría al cierre de una jornada. Todo el comportamiento ambiguo del reglamento queda
 * concentrado en este archivo para poder ajustarlo en un solo lugar.
 *
 * Reglas del reglamento/convocatoria:
 *  1. Una pareja solo puede retar a la que está una posición arriba.
 *  2. Ganar el reto: sube una posición. Perder: baja una posición.
 *  3. La pareja que no juega ningún partido en la semana baja una posición.
 *  4. No se pueden saltar lugares.
 *  5. Ascenso: el 1er lugar reta al último de la categoría superior; si gana, ocupa el último
 *     lugar de la superior y el perdedor pasa al primer lugar de la inferior.
 *
 * Cómo se resuelven los movimientos (todos SIMULTÁNEOS, con el ranking congelado al inicio de la
 * jornada, así el resultado no depende del orden en que se capturaron los partidos):
 *   - Cada pareja recibe un movimiento neto: retadora que gana −1, retadora que pierde +1,
 *     retada que pierde +1, retada que gana 0, inactiva +1 (el neto se limita a −1/+1).
 *   - Las que suben ocupan exactamente su lugar de arriba (si ganas, subes).
 *   - Las que bajan ocupan el lugar de abajo si está libre; si ese lugar ya lo ganó alguien que
 *     sube, conservan el suyo (siempre se respeta primero al que sube).
 *   - Las demás parejas ocupan los lugares que queden, conservando su orden relativo.
 *  Los movimientos propios son siempre de un lugar; una pareja puede desplazarse más solo de
 *  forma pasiva (por ejemplo, varias inactivas consecutivas que la rebasan).
 */

export type PairId = string;

export interface RetoResuelto {
  retadoraId: PairId;
  retadaId: PairId;
  ganadoraId: PairId;
}

export interface SemanaInput {
  /** Orden al inicio de la jornada: índice 0 = 1er lugar. */
  orden: readonly PairId[];
  /** Retos de la categoría ya jugados o resueltos por el club. */
  retos: readonly RetoResuelto[];
  /** Parejas que jugaron al menos un partido válido (reto o ascenso, en cualquier papel). */
  jugaron: ReadonlySet<PairId>;
  /** Si es true, el 1er lugar no baja por inactividad (no tiene a quién retar hacia arriba). */
  eximirPrimerLugar: boolean;
}

export type MotivoMovimiento = 'victoria' | 'derrota' | 'inactividad' | 'ajuste' | 'sin_cambio';

export interface SemanaOutput {
  orden: PairId[];
  motivos: Map<PairId, MotivoMovimiento>;
  /** Retos ignorados porque involucran parejas que ya no están en el ranking. */
  descartados: RetoResuelto[];
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export function aplicarSemana(input: SemanaInput): SemanaOutput {
  const inicio = [...input.orden];
  const n = inicio.length;
  if (new Set(inicio).size !== n) throw new EngineError('El orden contiene parejas repetidas');
  const presentes = new Set(inicio);
  const motivos = new Map<PairId, MotivoMovimiento>(inicio.map((id) => [id, 'sin_cambio']));
  const descartados: RetoResuelto[] = [];
  const delta = new Map<PairId, number>();
  const sumar = (id: PairId, d: number) => delta.set(id, (delta.get(id) ?? 0) + d);

  for (const r of input.retos) {
    const valido =
      presentes.has(r.retadoraId) &&
      presentes.has(r.retadaId) &&
      r.retadoraId !== r.retadaId &&
      (r.ganadoraId === r.retadoraId || r.ganadoraId === r.retadaId);
    if (!valido) {
      descartados.push(r);
      continue;
    }
    if (r.ganadoraId === r.retadoraId) {
      sumar(r.retadoraId, -1);
      sumar(r.retadaId, +1);
      motivos.set(r.retadoraId, 'victoria');
      if (motivos.get(r.retadaId) !== 'victoria') motivos.set(r.retadaId, 'derrota');
    } else {
      sumar(r.retadoraId, +1);
      if (motivos.get(r.retadoraId) !== 'victoria') motivos.set(r.retadoraId, 'derrota');
    }
  }

  const primero = inicio[0];
  for (const id of inicio) {
    if (input.jugaron.has(id)) continue;
    if (input.eximirPrimerLugar && id === primero) continue;
    sumar(id, +1);
    motivos.set(id, 'inactividad');
  }

  const neto = (id: PairId) => Math.max(-1, Math.min(1, delta.get(id) ?? 0));
  const dest: (PairId | null)[] = new Array(n).fill(null);
  const colocadas = new Set<PairId>();

  // 1) Las que suben ocupan exactamente el lugar de arriba.
  for (let p = 1; p < n; p++) {
    const id = inicio[p];
    if (neto(id) < 0) {
      dest[p - 1] = id;
      colocadas.add(id);
    }
  }
  // 2) Las que bajan (de abajo hacia arriba): lugar de abajo si está libre; si no, conservan el suyo si está libre.
  for (let p = n - 1; p >= 0; p--) {
    const id = inicio[p];
    if (neto(id) <= 0) continue;
    const abajo = Math.min(p + 1, n - 1);
    if (dest[abajo] === null) {
      dest[abajo] = id;
      colocadas.add(id);
    } else if (dest[p] === null) {
      dest[p] = id;
      colocadas.add(id);
    }
  }
  // 3) El resto llena los huecos conservando su orden relativo.
  const resto = inicio.filter((id) => !colocadas.has(id));
  let k = 0;
  for (let s = 0; s < n; s++) if (dest[s] === null) dest[s] = resto[k++];

  const orden = dest as PairId[];
  if (orden.length !== n || new Set(orden).size !== n || orden.some((x) => x === undefined || !presentes.has(x))) {
    throw new EngineError('Invariante violada: el orden resultante no es una permutación');
  }

  const posInicial = new Map(inicio.map((id, i) => [id, i]));
  orden.forEach((id, i) => {
    if (posInicial.get(id) !== i && motivos.get(id) === 'sin_cambio') motivos.set(id, 'ajuste');
  });
  return { orden, motivos, descartados };
}

// ---------------------------------------------------------------------------
// Ascenso entre categorías
// ---------------------------------------------------------------------------

export interface AscensoResuelto {
  categoriaInferiorId: number;
  categoriaSuperiorId: number;
  retadoraId: PairId; // 1er lugar de la categoría inferior
  retadaId: PairId; // último lugar de la categoría superior
  ganadoraId: PairId;
}

/** Aplica un ascenso sobre los órdenes ya calculados. Devuelve copias nuevas (no muta la entrada). */
export function aplicarAscenso(ordenes: ReadonlyMap<number, readonly PairId[]>, a: AscensoResuelto): Map<number, PairId[]> {
  const out = new Map<number, PairId[]>();
  for (const [k, v] of ordenes) out.set(k, [...v]);
  if (a.ganadoraId !== a.retadoraId) return out; // la superior defendió su lugar: no hay cambios

  const inferior = out.get(a.categoriaInferiorId);
  const superior = out.get(a.categoriaSuperiorId);
  if (!inferior || !superior) throw new EngineError('Categoría inexistente en el ascenso');
  const iR = inferior.indexOf(a.retadoraId);
  const iD = superior.indexOf(a.retadaId);
  if (iR === -1 || iD === -1) throw new EngineError('Las parejas del ascenso ya no están en sus categorías');

  inferior.splice(iR, 1);
  superior.splice(iD, 1);
  superior.push(a.retadoraId); // entra en el último lugar de la categoría superior
  inferior.unshift(a.retadaId); // el perdedor pasa al primer lugar de la inferior
  return out;
}
