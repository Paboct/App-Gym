// Uso: node scripts/catalogo/generar-bodyart.mjs
// Lee src/assets/body/{hombre,mujer}.svg (ya etiquetados) y escribe src/data/bodyArtV2.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const SEXOS = { male: 'src/assets/body/hombre.svg', female: 'src/assets/body/mujer.svg' };
// Las clases CSS del SVG original se pasan a atributos para que `base` sea autónomo.
const ESTILOS = {
  silhouette: 'fill="#121212" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"',
  'joint-white': 'fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"',
  'tendon-line': 'fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"',
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
    if (/\bfill\s*=|\bclass\s*=/.test(el)) throw new Error(`Zona ${id} con fill o class`);
    muscles.set(id, (muscles.get(id) ? muscles.get(id) + ' ' : '') + el);
    return '';
  });
  if (/class="muscle"/.test(resto)) throw new Error(`Hay <g class="muscle"> sin data-musculo en ${vista.id}`);
  const base = resto
    .replace(/class="([a-z-]+)"/g, (m, c) => {
      if (!ESTILOS[c]) throw new Error(`Clase desconocida en base: ${c}`);
      return ESTILOS[c];
    })
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  if (!base) throw new Error(`Base vacía en ${vista.id}`);
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
export interface BodyView2 {
  viewBox: string;
  base: string;
  muscles: { id: string; el: string }[];
}

export const BODY2: Record<'male' | 'female', { front: BodyView2; back: BodyView2 }> = ${JSON.stringify(out, null, 2)};
`;
writeFileSync('src/data/bodyArtV2.ts', ts);
for (const s of Object.keys(out)) for (const l of Object.keys(out[s])) console.log(s, l, out[s][l].muscles.length, 'zonas');
