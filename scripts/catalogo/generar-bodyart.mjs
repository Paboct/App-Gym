// Uso: node scripts/catalogo/generar-bodyart.mjs
// Lee src/assets/body/{hombre,mujer}.svg (ya etiquetados) y escribe src/data/bodyArt.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const SEXOS = { male: 'src/assets/body/hombre.svg', female: 'src/assets/body/mujer.svg' };
// Las clases CSS del SVG original se pasan a estilos en línea para que `base` sea
// autónomo. Los colores son variables CSS del tema (src/styles.css): `--body-base`
// para la silueta y `--body-line` para contornos, articulaciones y tendones, así el
// mapa se ve bien con el tema oscuro y con el claro.
const ESTILOS = {
  silhouette:
    'style="fill:var(--body-base);stroke:var(--body-line)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"',
  'joint-white': 'style="fill:var(--body-line);stroke:var(--body-line)" stroke-width="2" stroke-linejoin="round"',
  'tendon-line': 'style="fill:none;stroke:var(--body-line)" stroke-width="2.5" stroke-linecap="round"',
};
// Anchura de cada figura recortada (centros en x=235 y x=645 del SVG de 880x860).
const MEDIO = 220;
const VISTAS = { front: { id: 'vista-frontal', cx: 235 }, back: { id: 'vista-trasera', cx: 645 } };

function cortarVista(svg, idVista) {
  const ini = svg.indexOf(`<g id="${idVista}">`);
  if (ini < 0) throw new Error(`No hay #${idVista}`);
  const otra = idVista === 'vista-frontal' ? svg.indexOf('<g id="vista-trasera">') : svg.lastIndexOf('</svg>');
  if (otra < ini) throw new Error(`Orden inesperado de vistas`);
  const trozo = svg.slice(ini + `<g id="${idVista}">`.length, otra);
  const fin = trozo.lastIndexOf('</g>');
  return trozo.slice(0, fin);
}

function procesarVista(svg, vista) {
  const interior = cortarVista(svg, vista.id).replace(/<!--[\s\S]*?-->/g, '');
  const muscles = new Map();
  const re = /<g class="muscle" data-musculo="([a-z_]+)">([\s\S]*?)<\/g>/g;
  const resto = interior.replace(re, (_, id, contenido) => {
    const el = contenido.replace(/\s+/g, ' ').trim();
    if (!el) throw new Error(`Zona ${id} vacía`);
    if (/\bfill\s*=|\bclass\s*=|\bstyle\s*=/.test(el)) throw new Error(`Zona ${id} con fill, class o style`);
    muscles.set(id, (muscles.get(id) ? muscles.get(id) + ' ' : '') + el);
    return '';
  });
  if (/class="muscle"/.test(resto)) throw new Error(`Hay <g class="muscle"> sin data-musculo en ${vista.id}`);
  const base = resto
    .replace(/class="([a-z-]+)"/g, (m, c) => {
      if (!ESTILOS[c]) throw new Error(`Clase desconocida en base: ${c}`);
      return ESTILOS[c];
    })
    // Trazos sueltos con blanco fijo (p. ej. los codos de la espalda): también al tema.
    .replace(/\bstroke="#fff(?:fff)?"/gi, 'style="stroke:var(--body-line)"')
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  if (!base) throw new Error(`Base vacía en ${vista.id}`);
  // Un elemento con dos atributos `style` es SVG inválido: el segundo se ignoraría.
  if (/<[^>]*style="[^"]*"[^>]*style="/.test(base)) throw new Error(`Elemento con dos atributos style en la base de ${vista.id}`);
  if (/#[0-9a-f]{3,6}\b/i.test(base)) throw new Error(`Color fijo en la base de ${vista.id}`);
  return {
    viewBox: `${vista.cx - MEDIO} 0 ${MEDIO * 2} 860`,
    base,
    muscles: [...muscles].map(([id, el]) => ({ id, el })),
  };
}

const out = {};
for (const [sexo, ruta] of Object.entries(SEXOS)) {
  const svg = readFileSync(ruta, 'utf8');
  out[sexo] = {};
  for (const [lado, vista] of Object.entries(VISTAS)) out[sexo][lado] = procesarVista(svg, vista);
}

const ts = `// GENERADO por scripts/catalogo/generar-bodyart.mjs desde src/assets/body/*.svg. No editar a mano.
import type { MuscleId } from '../domain/muscles';
import type { Figure } from '../domain/types';

/**
 * Mapa corporal de 35 zonas (frente y espalda; hombre y mujer). \`base\` es la
 * silueta con articulaciones y tendones, coloreada con variables CSS del tema;
 * cada zona es un \`<g>\` sin color que pinta BodyMap. Un músculo puede salir en
 * las dos vistas.
 */
export interface BodyMuscle {
  id: MuscleId;
  el: string;
}

export interface BodyView {
  viewBox: string;
  base: string;
  muscles: BodyMuscle[];
}

export const BODY: Record<Figure, { front: BodyView; back: BodyView }> = ${JSON.stringify(out, null, 2)};
`;
writeFileSync('src/data/bodyArt.ts', ts);
for (const s of Object.keys(out)) for (const l of Object.keys(out[s])) console.log(s, l, out[s][l].muscles.length, 'zonas');
