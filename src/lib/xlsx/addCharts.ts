import JSZip from 'jszip';

/** Una gráfica de líneas. `categories` y `values` son referencias como `'Progreso'!$A$5:$A$10` (ver `sheetRef`). */
export interface ChartSpec {
  title: string;
  sheetName: string;
  categories: string;
  values: string;
  /** Columna y fila de la esquina superior izquierda, contando desde 0. */
  anchorCol: number;
  anchorRow: number;
}

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_DRAWING = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const CT_CHART = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';
const REL_DRAWING = `${NS_R}/drawing`;
const REL_CHART = `${NS_R}/chart`;
const COLOR = '1D6F42';

/** Referencia a un rango de una hoja, con las comillas simples del nombre duplicadas. */
export function sheetRef(sheetName: string, range: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function chartXml(spec: ChartSpec, n: number): string {
  const catAx = 500000000 + n * 2;
  const valAx = 500000001 + n * 2;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr>` +
    `<a:r><a:rPr lang="es-ES" sz="1200" b="1"/><a:t>${esc(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>` +
    `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${esc(spec.title)}</c:v></c:tx>` +
    `<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${COLOR}"/></a:solidFill><a:round/></a:ln></c:spPr>` +
    `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${COLOR}"/></a:solidFill></c:spPr></c:marker>` +
    `<c:cat><c:numRef><c:f>${esc(spec.categories)}</c:f></c:numRef></c:cat>` +
    `<c:val><c:numRef><c:f>${esc(spec.values)}</c:f></c:numRef></c:val>` +
    `<c:smooth val="0"/></c:ser>` +
    `<c:marker val="1"/><c:axId val="${catAx}"/><c:axId val="${valAx}"/></c:lineChart>` +
    `<c:catAx><c:axId val="${catAx}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>` +
    `<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="${valAx}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="${valAx}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/>` +
    `<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="${catAx}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`
  );
}

function drawingXml(specs: ChartSpec[], relIds: string[]): string {
  const anchors = specs
    .map(
      (s, i) =>
        `<xdr:oneCellAnchor><xdr:from><xdr:col>${s.anchorCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${s.anchorRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:ext cx="5400000" cy="2700000"/>` +
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" r:id="${relIds[i]}"/></a:graphicData></a:graphic></xdr:graphicFrame>` +
        `<xdr:clientData/></xdr:oneCellAnchor>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">${anchors}</xdr:wsDr>`;
}

function nextIndex(zip: JSZip, dir: string, prefix: string): number {
  const re = new RegExp(`^${dir}/${prefix}(\\d+)\\.xml$`);
  const used = Object.keys(zip.files).map((n) => Number(re.exec(n)?.[1] ?? 0));
  return Math.max(0, ...used) + 1;
}

/** Ruta del XML de una hoja a partir de su nombre, leyendo workbook.xml y sus relaciones. */
async function sheetPath(zip: JSZip, sheetName: string): Promise<string> {
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const unesc = (t: string) => t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  let rId: string | undefined;
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = /\bname="([^"]*)"/.exec(m[0])?.[1];
    if (name !== undefined && unesc(name) === sheetName) rId = /\br:id="([^"]*)"/.exec(m[0])?.[1];
  }
  if (!rId) throw new Error(`No existe la hoja "${sheetName}" en el libro`);
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    if (new RegExp(`\\bId="${rId}"`).test(m[0])) {
      const target = /\bTarget="([^"]*)"/.exec(m[0])?.[1] ?? '';
      return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    }
  }
  throw new Error(`No se encontró el archivo de la hoja "${sheetName}"`);
}

function addContentTypes(xml: string, overrides: { part: string; type: string }[]): string {
  const extra = overrides.map((o) => `<Override PartName="${o.part}" ContentType="${o.type}"/>`).join('');
  return xml.replace('</Types>', `${extra}</Types>`);
}

/** Inserta `<drawing>` en el orden que exige el esquema (antes de tableParts/extLst y al final del resto). */
function insertDrawing(sheetXml: string, relId: string): string {
  const tag = `<drawing xmlns:r="${NS_R}" r:id="${relId}"/>`;
  for (const marker of ['<legacyDrawing', '<tableParts', '<extLst', '</worksheet>']) {
    const at = sheetXml.indexOf(marker);
    if (at >= 0) return sheetXml.slice(0, at) + tag + sheetXml.slice(at);
  }
  throw new Error('Hoja con formato inesperado');
}

/** Añade gráficas de líneas de Excel (editables) al libro. Agrupa por hoja; devuelve un .xlsx nuevo. */
export async function addCharts(xlsx: Uint8Array, charts: ChartSpec[]): Promise<Uint8Array> {
  if (charts.length === 0) return xlsx;
  const zip = await JSZip.loadAsync(xlsx);
  const bySheet = new Map<string, ChartSpec[]>();
  for (const c of charts) bySheet.set(c.sheetName, [...(bySheet.get(c.sheetName) ?? []), c]);

  const overrides: { part: string; type: string }[] = [];
  let chartCount = 0;
  for (const [sheetName, specs] of bySheet) {
    const sheetFile = await sheetPath(zip, sheetName);
    const drawingNo = nextIndex(zip, 'xl/drawings', 'drawing');
    const relIds: string[] = [];
    const drawingRels: string[] = [];

    for (const [i, spec] of specs.entries()) {
      const chartNo = nextIndex(zip, 'xl/charts', 'chart');
      chartCount += 1;
      zip.file(`xl/charts/chart${chartNo}.xml`, chartXml(spec, chartCount));
      overrides.push({ part: `/xl/charts/chart${chartNo}.xml`, type: CT_CHART });
      relIds.push(`rId${i + 1}`);
      drawingRels.push(`<Relationship Id="rId${i + 1}" Type="${REL_CHART}" Target="/xl/charts/chart${chartNo}.xml"/>`);
    }
    zip.file(`xl/drawings/drawing${drawingNo}.xml`, drawingXml(specs, relIds));
    zip.file(
      `xl/drawings/_rels/drawing${drawingNo}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_REL}">${drawingRels.join('')}</Relationships>`,
    );
    overrides.push({ part: `/xl/drawings/drawing${drawingNo}.xml`, type: CT_DRAWING });

    // Relación hoja -> dibujo (la hoja puede no tener archivo de relaciones aún).
    const relsPath = sheetFile.replace(/worksheets\/(sheet\d+\.xml)$/, 'worksheets/_rels/$1.rels');
    const existing = zip.file(relsPath);
    const relsXml = existing
      ? await existing.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_REL}"></Relationships>`;
    const used = [...relsXml.matchAll(/\bId="rId(\d+)"/g)].map((m) => Number(m[1]));
    const sheetRelId = `rId${Math.max(0, ...used) + 1}`;
    zip.file(
      relsPath,
      relsXml.replace('</Relationships>', `<Relationship Id="${sheetRelId}" Type="${REL_DRAWING}" Target="/xl/drawings/drawing${drawingNo}.xml"/></Relationships>`),
    );
    const sheetXml = await zip.file(sheetFile)!.async('string');
    zip.file(sheetFile, insertDrawing(sheetXml, sheetRelId));
  }

  const ct = await zip.file('[Content_Types].xml')!.async('string');
  zip.file('[Content_Types].xml', addContentTypes(ct, overrides));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
