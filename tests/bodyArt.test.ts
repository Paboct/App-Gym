import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BODY } from '../src/data/bodyArt';

const ids: string[] = JSON.parse(readFileSync('data/catalogo/musculos.json', 'utf8')).map((m: { id: string }) => m.id);

describe('BODY (mapa corporal de 35 zonas)', () => {
  it('el catálogo tiene 35 músculos', () => expect(ids).toHaveLength(35));

  for (const sexo of ['male', 'female'] as const) {
    describe(sexo, () => {
      const { front, back } = BODY[sexo];
      it('la unión de ids de frente y espalda son exactamente los 35 del catálogo', () => {
        const union = new Set([...front.muscles, ...back.muscles].map((m) => m.id));
        expect([...union].sort()).toEqual([...ids].sort());
      });
      it('ningún id desconocido y ninguna zona sin el', () => {
        for (const m of [...front.muscles, ...back.muscles]) {
          expect(ids).toContain(m.id);
          expect(m.el.trim().length).toBeGreaterThan(0);
        }
      });
      it('base no vacío y el sin fill ni class de color', () => {
        for (const v of [front, back]) {
          expect(v.base.length).toBeGreaterThan(0);
          for (const m of v.muscles) {
            expect(m.el).not.toMatch(/fill\s*=/);
            expect(m.el).not.toMatch(/class="c-/);
          }
        }
      });
      it('la base no lleva colores fijos: sigue el tema con variables CSS', () => {
        for (const v of [front, back]) {
          expect(v.base).not.toMatch(/#[0-9a-f]{3,6}\b/i);
          expect(v.base).toContain('var(--body-base)');
          expect(v.base).toContain('var(--body-line)');
        }
      });
      it('cada viewBox abarca solo una figura (la mitad del SVG de 880)', () => {
        for (const v of [front, back]) {
          const [, , w, h] = v.viewBox.split(/\s+/).map(Number);
          expect(w).toBeGreaterThan(380);
          expect(w).toBeLessThanOrEqual(450);
          expect(h).toBeGreaterThan(800);
        }
        const x = (v: { viewBox: string }) => Number(v.viewBox.split(/\s+/)[0]);
        expect(x(front)).toBeLessThan(x(back));
      });
    });
  }
});
