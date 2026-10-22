import { describe, expect, it } from 'vitest';
import { aplicarAscenso, aplicarSemana, EngineError, type RetoResuelto } from '../src/lib/ranking/engine';

const set = (...ids: string[]) => new Set(ids);
const reto = (retadoraId: string, retadaId: string, ganadoraId: string): RetoResuelto => ({ retadoraId, retadaId, ganadoraId });

describe('aplicarSemana · retos', () => {
  it('si la retadora gana sube un lugar y la retada baja uno', () => {
    const r = aplicarSemana({ orden: ['A', 'B', 'C', 'D'], retos: [reto('C', 'B', 'C')], jugaron: set('B', 'C', 'D'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'C', 'B', 'D']);
    expect(r.motivos.get('C')).toBe('victoria');
    expect(r.motivos.get('B')).toBe('derrota');
  });

  it('si la retadora pierde baja un lugar y la retada conserva el suyo', () => {
    const r = aplicarSemana({
      orden: ['A', 'B', 'C', 'D', 'E'],
      retos: [reto('C', 'B', 'B'), reto('E', 'D', 'D')],
      jugaron: set('B', 'C', 'D', 'E'),
      eximirPrimerLugar: true,
    });
    expect(r.orden).toEqual(['A', 'B', 'D', 'C', 'E']);
  });

  it('la última pareja que pierde como retadora no puede bajar más', () => {
    const r = aplicarSemana({ orden: ['A', 'B', 'C'], retos: [reto('C', 'B', 'B')], jugaron: set('B', 'C'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'B', 'C']);
  });

  it('retos encadenados: movimientos simultáneos con deltas netos', () => {
    // B→A (B gana), C→B (C gana), D→C (D gana)
    // Deltas: A +1(derrota), B -1+1=0(victoria+derrota), C -1+1=0(victoria+derrota), D -1(victoria), E +1(inactiva)
    // Simultáneo: D sube (3→2), A baja (0→1), B y C net 0 mantienen orden relativo, E baja
    const r = aplicarSemana({
      orden: ['A', 'B', 'C', 'D', 'E'],
      retos: [reto('B', 'A', 'B'), reto('C', 'B', 'C'), reto('D', 'C', 'D')],
      jugaron: set('A', 'B', 'C', 'D'),
      eximirPrimerLugar: true,
    });
    expect(new Set(r.orden).size).toBe(5);
    // D ganó su reto: debe subir respecto a su posición inicial (3)
    expect(r.orden.indexOf('D')).toBeLessThan(3);
    // A perdió: debe bajar respecto a su posición inicial (0)
    expect(r.orden.indexOf('A')).toBeGreaterThan(0);
    // B y C tienen delta neto 0 (ganaron uno, perdieron otro): mantienen orden relativo
    expect(r.orden.indexOf('B')).toBeLessThan(r.orden.indexOf('C'));
    expect(r.orden).toEqual(['B', 'A', 'D', 'C', 'E']);
  });

  it('descarta retos con parejas que ya no están en el ranking', () => {
    const r = aplicarSemana({ orden: ['A', 'B'], retos: [reto('Z', 'A', 'Z')], jugaron: set('A'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'B'].sort((x, y) => (x === 'A' ? -1 : 1)));
    expect(r.descartados).toHaveLength(1);
  });
});

describe('aplicarSemana · inactividad', () => {
  it('una pareja inactiva baja un lugar', () => {
    const r = aplicarSemana({ orden: ['A', 'B', 'C', 'D'], retos: [], jugaron: set('A', 'B', 'D'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'B', 'D', 'C']);
    expect(r.motivos.get('C')).toBe('inactividad');
    expect(r.motivos.get('D')).toBe('ajuste');
  });

  it('dos inactivas consecutivas bajan un lugar cada una', () => {
    const r = aplicarSemana({ orden: ['A', 'B', 'C', 'D'], retos: [], jugaron: set('A', 'D'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'D', 'B', 'C']);
  });

  it('si nadie juega, el orden no cambia', () => {
    for (const eximir of [true, false]) {
      const r = aplicarSemana({ orden: ['A', 'B', 'C', 'D'], retos: [], jugaron: set(), eximirPrimerLugar: eximir });
      expect(r.orden).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('el 1er lugar queda eximido solo si la regla está activa', () => {
    const base = { orden: ['A', 'B', 'C'], retos: [], jugaron: set('B', 'C') };
    expect(aplicarSemana({ ...base, eximirPrimerLugar: true }).orden).toEqual(['A', 'B', 'C']);
    expect(aplicarSemana({ ...base, eximirPrimerLugar: false }).orden).toEqual(['B', 'A', 'C']);
  });

  it('la última pareja inactiva se queda en su lugar', () => {
    const r = aplicarSemana({ orden: ['A', 'B', 'C'], retos: [], jugaron: set('A', 'B'), eximirPrimerLugar: true });
    expect(r.orden).toEqual(['A', 'B', 'C']);
  });

  it('categoría vacía o de una pareja no falla', () => {
    expect(aplicarSemana({ orden: [], retos: [], jugaron: set(), eximirPrimerLugar: true }).orden).toEqual([]);
    expect(aplicarSemana({ orden: ['A'], retos: [], jugaron: set(), eximirPrimerLugar: false }).orden).toEqual(['A']);
  });

  it('rechaza órdenes con parejas repetidas', () => {
    expect(() => aplicarSemana({ orden: ['A', 'A'], retos: [], jugaron: set(), eximirPrimerLugar: true })).toThrow(EngineError);
  });
});

describe('aplicarSemana · propiedad: siempre devuelve una permutación', () => {
  it('con 300 semanas aleatorias', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let t = 0; t < 300; t++) {
      const n = 1 + Math.floor(rnd() * 14);
      const orden = Array.from({ length: n }, (_, i) => `P${i}`);
      const retos: RetoResuelto[] = [];
      const jugaron = new Set<string>();
      for (let p = 1; p < n; p++) {
        if (rnd() < 0.6) {
          const ret = rnd() < 0.5 ? orden[p] : orden[p - 1];
          retos.push(reto(orden[p], orden[p - 1], ret));
          jugaron.add(orden[p]);
          jugaron.add(orden[p - 1]);
        }
      }
      const out = aplicarSemana({ orden, retos, jugaron, eximirPrimerLugar: rnd() < 0.5 });
      expect([...out.orden].sort()).toEqual([...orden].sort());
      // determinismo
      expect(aplicarSemana({ orden, retos, jugaron, eximirPrimerLugar: true }).orden).toEqual(
        aplicarSemana({ orden, retos, jugaron, eximirPrimerLugar: true }).orden,
      );
    }
  });
});

describe('aplicarAscenso', () => {
  const ordenes = () =>
    new Map<number, string[]>([
      [1, ['L1', 'L2', 'L3']],
      [2, ['T1', 'T2', 'T3']],
    ]);

  it('si gana la retadora entra al último lugar de la superior y el perdedor pasa al primero de la inferior', () => {
    const out = aplicarAscenso(ordenes(), { categoriaInferiorId: 2, categoriaSuperiorId: 1, retadoraId: 'T1', retadaId: 'L3', ganadoraId: 'T1' });
    expect(out.get(1)).toEqual(['L1', 'L2', 'T1']);
    expect(out.get(2)).toEqual(['L3', 'T2', 'T3']);
  });

  it('si gana la retada no hay cambios', () => {
    const out = aplicarAscenso(ordenes(), { categoriaInferiorId: 2, categoriaSuperiorId: 1, retadoraId: 'T1', retadaId: 'L3', ganadoraId: 'L3' });
    expect(out.get(1)).toEqual(['L1', 'L2', 'L3']);
    expect(out.get(2)).toEqual(['T1', 'T2', 'T3']);
  });

  it('no muta la entrada y falla si las parejas ya no están', () => {
    const input = ordenes();
    aplicarAscenso(input, { categoriaInferiorId: 2, categoriaSuperiorId: 1, retadoraId: 'T1', retadaId: 'L3', ganadoraId: 'T1' });
    expect(input.get(1)).toEqual(['L1', 'L2', 'L3']);
    expect(() =>
      aplicarAscenso(input, { categoriaInferiorId: 2, categoriaSuperiorId: 1, retadoraId: 'X', retadaId: 'L3', ganadoraId: 'X' }),
    ).toThrow(EngineError);
  });
});
