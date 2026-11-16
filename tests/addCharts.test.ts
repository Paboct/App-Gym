import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { addCharts, sheetRef, type ChartSpec } from '../src/lib/xlsx/addCharts';

async function tinyWorkbook(sheetName = 'Progreso'): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Otra').addRow(['x']);
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(['Micro', 'Peso', 'Volumen']);
  for (let i = 1; i <= 6; i++) ws.addRow([i, 80 + i, 1000 * i]);
  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

const specs = (sheetName = 'Progreso'): ChartSpec[] => [
  { title: 'Peso máximo por microciclo', sheetName, categories: sheetRef(sheetName, '$A$2:$A$7'), values: sheetRef(sheetName, '$B$2:$B$7'), anchorCol: 6, anchorRow: 3 },
  { title: 'Volumen por microciclo', sheetName, categories: sheetRef(sheetName, '$A$2:$A$7'), values: sheetRef(sheetName, '$C$2:$C$7'), anchorCol: 6, anchorRow: 18 },
];

describe('addCharts', () => {
  it('añade dos gráficas, el dibujo y sus relaciones al zip', async () => {
    const zip = await JSZip.loadAsync(await addCharts(await tinyWorkbook(), specs()));
    const names = Object.keys(zip.files);
    expect(names).toEqual(expect.arrayContaining(['xl/charts/chart1.xml', 'xl/charts/chart2.xml', 'xl/drawings/drawing1.xml', 'xl/drawings/_rels/drawing1.xml.rels']));
    const rels = await zip.file('xl/drawings/_rels/drawing1.xml.rels')!.async('string');
    expect(rels).toContain('/xl/charts/chart1.xml');
    expect(rels).toContain('/xl/charts/chart2.xml');
  });

  it('declara los tipos de contenido de dibujo y gráfica', async () => {
    const zip = await JSZip.loadAsync(await addCharts(await tinyWorkbook(), specs()));
    const ct = await zip.file('[Content_Types].xml')!.async('string');
    expect(ct).toContain('/xl/drawings/drawing1.xml');
    expect(ct).toContain('application/vnd.openxmlformats-officedocument.drawing+xml');
    expect(ct).toContain('/xl/charts/chart1.xml');
    expect(ct).toContain('application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
  });

  it('la hoja Progreso referencia el dibujo y las series apuntan al rango de la tabla', async () => {
    const zip = await JSZip.loadAsync(await addCharts(await tinyWorkbook(), specs()));
    const sheet = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    expect(sheet).toMatch(/<drawing [^>]*r:id="[^"]+"/);
    const other = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(other).not.toContain('<drawing');
    const chart = await zip.file('xl/charts/chart1.xml')!.async('string');
    expect(chart).toContain("'Progreso'!$B$2:$B$7");
    expect(chart).toContain("'Progreso'!$A$2:$A$7");
    expect(chart).toContain('<c:delete val="0"/>');
  });

  it('el libro sigue abriéndose con ExcelJS', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await addCharts(await tinyWorkbook(), specs())) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Otra', 'Progreso']);
  });

  it('escapa caracteres especiales en el título y en el nombre de hoja', async () => {
    const name = "Pro & 'gre'so";
    const out = await addCharts(await tinyWorkbook(name), specs(name).map((s) => ({ ...s, title: 'A & B <1>' })));
    const zip = await JSZip.loadAsync(out);
    const chart = await zip.file('xl/charts/chart1.xml')!.async('string');
    expect(chart).toContain('A &amp; B &lt;1&gt;');
    expect(chart).toContain("'Pro &amp; ''gre''so'!$B$2:$B$7");
  });

  it('una hoja que no existe lanza un error claro', async () => {
    await expect(addCharts(await tinyWorkbook(), specs('Inexistente'))).rejects.toThrow(/Inexistente/);
  });
});
