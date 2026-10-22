import { describe, expect, it } from 'vitest';
import { evaluarMarcador, ganadorSetNormal, ganadorSuperTieBreak } from '../src/lib/ranking/score';

describe('sets normales', () => {
  it('acepta marcadores posibles', () => {
    for (const [a, b] of [[6, 0], [6, 4], [7, 5], [7, 6]]) {
      expect(ganadorSetNormal(a, b)).toBe('a');
      expect(ganadorSetNormal(b, a)).toBe('b');
    }
  });
  it('rechaza marcadores imposibles', () => {
    for (const [a, b] of [[6, 5], [6, 6], [7, 4], [8, 6], [5, 3], [0, 0], [7, 7]]) expect(ganadorSetNormal(a, b)).toBeNull();
  });
});

describe('súper tie-break', () => {
  it('requiere 10 puntos y diferencia de 2', () => {
    expect(ganadorSuperTieBreak(10, 8)).toBe('a');
    expect(ganadorSuperTieBreak(12, 10)).toBe('a');
    expect(ganadorSuperTieBreak(7, 10)).toBe('b');
    expect(ganadorSuperTieBreak(10, 9)).toBeNull();
    expect(ganadorSuperTieBreak(9, 7)).toBeNull();
    expect(ganadorSuperTieBreak(13, 10)).toBeNull();
  });
});

describe('evaluarMarcador', () => {
  it('gana en dos sets', () => {
    const r = evaluarMarcador([{ a: 6, b: 3 }, { a: 7, b: 5 }]);
    expect(r).toEqual({ ok: true, ganadora: 'a', setsA: 2, setsB: 0 });
  });
  it('gana en tres sets con súper tie-break', () => {
    const r = evaluarMarcador([{ a: 6, b: 3 }, { a: 4, b: 6 }, { a: 8, b: 10 }]);
    expect(r).toEqual({ ok: true, ganadora: 'b', setsA: 1, setsB: 2 });
  });
  it('rechaza tercer set cuando ya hay ganador', () => {
    expect(evaluarMarcador([{ a: 6, b: 3 }, { a: 6, b: 2 }, { a: 10, b: 5 }]).ok).toBe(false);
  });
  it('exige tercer set cuando hay 1-1', () => {
    expect(evaluarMarcador([{ a: 6, b: 3 }, { a: 3, b: 6 }]).ok).toBe(false);
  });
  it('rechaza entradas inválidas', () => {
    expect(evaluarMarcador([] as never).ok).toBe(false);
    expect(evaluarMarcador([{ a: 6, b: 3 }] as never).ok).toBe(false);
    expect(evaluarMarcador([{ a: 6.5, b: 3 }, { a: 6, b: 1 }] as never).ok).toBe(false);
    expect(evaluarMarcador([{ a: -1, b: 3 }, { a: 6, b: 1 }] as never).ok).toBe(false);
  });
});
