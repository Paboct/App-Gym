// Genera data/catalogo/informe-revision.md a partir de los JSON del catálogo.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'catalogo')
const leer = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))
const ejercicios = leer('ejercicios.json').ejercicios
const gemini = leer('gemini-ejercicios.json').ejercicios
const emp = leer('emparejamiento.json')

const porId = new Map(ejercicios.map((e) => [e.id, e]))
const gPorId = new Map(gemini.map((e) => [e.id, e]))
const esc = (s) => String(s).replace(/\|/g, '\|')
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const fmt = (m) => (m ? `${m.rol} ${m.activacion}` : 'ausente (0)')
const tabla = (cab, filas) =>
  [`| ${cab.join(' | ')} |`, `|${cab.map(() => '---').join('|')}|`, ...filas.map((f) => `| ${f.map(esc).join(' | ')} |`)].join('\n')

const cuenta = (campo) => {
  const c = {}
  for (const e of ejercicios) c[e[campo]] = (c[e[campo]] ?? 0) + 1
  return c
}

const out = ['# Informe de revisión del catálogo', '']

// 1. Resumen
const conf = cuenta('confianza')
out.push('## 1. Resumen', '', `Total de ejercicios: ${ejercicios.length}`, '')
out.push(tabla(['confianza', 'ejercicios'], ['alta', 'media', 'baja'].map((k) => [k, conf[k] ?? 0])), '')
out.push(tabla(['grupo', 'ejercicios'], Object.entries(cuenta('grupo')).sort((a, b) => cmp(a[0], b[0]))), '')

// 2. Confianza baja
const bajos = ejercicios
  .filter((e) => e.confianza === 'baja')
  .sort((a, b) => cmp(a.grupo, b.grupo) || cmp(a.id, b.id))
out.push(`## 2. Ejercicios con confianza baja (${bajos.length})`, '')
out.push(
  tabla(
    ['id', 'nombre', 'músculos principales', 'fuentes'],
    bajos.map((e) => [
      e.id,
      e.nombre,
      e.musculos.filter((m) => m.rol === 'principal').map((m) => `${m.musculo_id} ${m.activacion}`).join(', '),
      (e.fuentes ?? []).join('; '),
    ]),
  ),
  '',
)

// 3. Discrepancias
const filas = []
for (const [gid, { appId }] of Object.entries(emp)) {
  const nuestro = porId.get(appId)
  const g = gPorId.get(gid)
  if (!nuestro || !g) continue
  const a = new Map(nuestro.musculos.map((m) => [m.musculo_id, m]))
  const b = new Map(g.musculos.map((m) => [m.musculo_id, m]))
  for (const id of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(id)
    const y = b.get(id)
    const dif = Math.abs((x?.activacion ?? 0) - (y?.activacion ?? 0))
    if (dif > 0.2 + 1e-9 || !x || !y || x.rol !== y.rol) filas.push([appId, nuestro.nombre, id, fmt(x), fmt(y)])
  }
}
filas.sort((p, q) => cmp(p[0], q[0]) || cmp(p[2], q[2]))
out.push(`## 3. Discrepancias con Gemini (${filas.length})`, '')
out.push(tabla(['appId', 'nombre', 'músculo', 'nuestra (rol/activación)', 'Gemini (rol/activación)'], filas), '')

// 4. Vigilar
const sinSec = ejercicios.filter((e) => !e.musculos.some((m) => m.rol === 'secundario'))
const solapan = []
for (const e of ejercicios) {
  const prin = e.musculos.filter((m) => m.rol === 'principal').map((m) => m.activacion)
  if (!prin.length) continue
  const min = Math.min(...prin)
  const raros = e.musculos.filter((m) => m.rol !== 'principal' && m.activacion >= min)
  if (raros.length) solapan.push([e.id, e.nombre, String(min), raros.map((m) => `${m.musculo_id} (${m.rol} ${m.activacion})`).join(', ')])
}
out.push('## 4. Casos para vigilar', '')
out.push(`### 4.1 Sin ningún músculo secundario (${sinSec.length})`, '')
out.push(tabla(['id', 'nombre', 'grupo'], sinSec.map((e) => [e.id, e.nombre, e.grupo])), '')
out.push(`### 4.2 Músculo no principal con activación >= la principal más baja (${solapan.length})`, '')
out.push(tabla(['id', 'nombre', 'principal mínima', 'músculos'], solapan), '')

writeFileSync(join(dir, 'informe-revision.md'), out.join('\n'))
console.log(JSON.stringify({ confianza: conf, discrepancias: filas.length, sinSecundario: sinSec.length, solapan: solapan.length }))
