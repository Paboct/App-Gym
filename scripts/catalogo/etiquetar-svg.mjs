// Uso: node scripts/catalogo/etiquetar-svg.mjs <entrada.svg> <salida.svg>
// Añade data-musculo="<id>" a cada <g class="muscle"> según el comentario que lo precede.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAPA = {
  'trapecio superior': 'trapecio_superior', 'trapecio medio': 'trapecio_medio', 'trapecio inferior': 'trapecio_inferior',
  romboides: 'romboides',
  'deltoides anterior': 'deltoides_anterior', 'deltoides lateral': 'deltoides_lateral', 'deltoides posterior': 'deltoides_posterior',
  'pectoral clavicular': 'pectoral_clavicular', 'pectoral esternal': 'pectoral_esternal', 'pectoral abdominal': 'pectoral_abdominal',
  'biceps braquial': 'biceps_braquial', 'braquial anterior': 'braquial_anterior', braquiorradial: 'braquiorradial',
  'flexores antebrazo': 'flexores_antebrazo', 'extensores antebrazo': 'extensores_antebrazo',
  'serrato anterior': 'serrato_anterior', 'recto abdominal': 'recto_abdominal', oblicuos: 'oblicuos',
  'transverso del abdomen': 'transverso_abdomen',
  'gluteo medio': 'gluteo_medio', 'gluteo mayor': 'gluteo_mayor', aductores: 'aductores',
  'recto femoral': 'recto_femoral', 'cuadriceps vastos': 'cuadriceps_vastos', isquiotibiales: 'isquiotibiales',
  'tibial anterior': 'tibial_anterior', gastrocnemio: 'gastrocnemio', soleo: 'soleo',
  'manguito rotador': 'manguito_rotador', 'redondo mayor': 'redondo_mayor', 'dorsal ancho': 'dorsal_ancho',
  'erectores espinales': 'erectores_espinales',
  'triceps cabeza larga': 'triceps_larga', 'triceps cabeza lateral': 'triceps_lateral', 'triceps cabeza medial': 'triceps_medial',
};

export function normalizar(nombre) {
  return nombre
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function etiquetar(svg) {
  const total = (svg.match(/<g class="muscle"/g) ?? []).length;
  let n = 0;
  const out = svg.replace(/<!--((?:(?!-->)[\s\S])*)-->(\s*)<g class="muscle"/g, (_, comentario, esp) => {
    const nombre = normalizar(comentario);
    const id = MAPA[nombre];
    if (!id) throw new Error(`Comentario de músculo sin mapeo: «${comentario.trim()}» (normalizado: «${nombre}»)`);
    n++;
    return `<!--${comentario}-->${esp}<g class="muscle" data-musculo="${id}"`;
  });
  if (n !== total) throw new Error(`${total - n} grupo(s) <g class="muscle"> sin comentario previo (de ${total})`);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [entrada, salida] = process.argv.slice(2);
  if (!entrada || !salida) throw new Error('Uso: etiquetar-svg.mjs <entrada> <salida>');
  writeFileSync(salida, etiquetar(readFileSync(entrada, 'utf8')));
  console.log(`${salida}: etiquetado`);
}
