import ExcelJS from 'exceljs';
import { formatDuration } from '../../domain/calc';
import {
  buildProgressRows,
  buildRoutineRows,
  buildSetRows,
  type ExportInput,
  type ProgressRow,
} from '../../domain/exportRows';
import { addCharts, sheetRef } from './addCharts';
import { labels, type ExportLabels } from './labels';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAED' } };
const DAY_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0D5' } };

/** Posición de la tabla de la hoja Progreso (la usan también las gráficas). */
export const PROGRESS_LAYOUT = { pickerCell: 'B2', headerRow: 4, firstRow: 5 } as const;

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle' };
}

function fit(ws: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function routineSheet(wb: ExcelJS.Workbook, input: ExportInput, l: ExportLabels): void {
  const ws = wb.addWorksheet(l.sheetRoutine);
  ws.addRow([input.meso.name]).font = { bold: true, size: 14 };
  ws.addRow([l.microcycles, input.meso.microcycles, l.deloadWeek, input.meso.deloadMicro ?? l.none]);
  ws.getRow(2).getCell(1).font = { bold: true };
  ws.getRow(2).getCell(3).font = { bold: true };
  ws.addRow([]);
  styleHeader(ws.addRow([l.colDay, l.colExercise, l.colSets, l.colReps, l.colRir, l.colRest, l.colNotes]));

  const rows = buildRoutineRows(input);
  let lastDay = -1;
  for (const r of rows) {
    if (r.day !== lastDay) {
      const dayRow = ws.addRow([`${l.colDay} ${r.day} — ${r.dayName}`]);
      dayRow.font = { bold: true };
      dayRow.fill = DAY_FILL;
      lastDay = r.day;
    }
    ws.addRow([r.day, r.exercise, r.sets, r.reps, r.rir, formatDuration(r.restSec), r.notes]);
  }
  fit(ws, [8, 36, 9, 14, 13, 11, 40]);
  ws.views = [{ state: 'frozen', ySplit: 4 }];
}

function setsSheet(wb: ExcelJS.Workbook, input: ExportInput, l: ExportLabels): void {
  const ws = wb.addWorksheet(l.sheetSets);
  const header = ws.addRow([
    l.colMicro, l.colDay, l.colDate, l.colExercise, l.colType, l.colSetNo,
    l.colWeight(input.unit), l.colRepsDone, 'RIR', l.colDrops, l.colVolume(input.unit),
  ]);
  styleHeader(header);
  for (const r of buildSetRows(input)) {
    ws.addRow([
      r.micro, r.day, r.date, r.exercise, r.kind === 'warmup' ? l.typeWarmup : l.typeWork, r.setNo,
      r.weight, r.reps, r.rir, r.drops, r.volume,
    ]);
  }
  fit(ws, [8, 18, 12, 34, 14, 8, 12, 8, 6, 22, 14]);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };
}

function dataSheet(wb: ExcelJS.Workbook, input: ExportInput, l: ExportLabels, rows: ProgressRow[]): string[] {
  const ws = wb.addWorksheet(l.sheetData);
  styleHeader(
    ws.addRow([
      l.colKey, l.colExercise, l.colMicro, l.colMaxWeight(input.unit), l.colE1rm(input.unit),
      l.colVolume(input.unit), l.colEffectiveSets, '', l.colExercise,
    ]),
  );
  for (const r of rows) ws.addRow([`${r.exercise}|${r.micro}`, r.exercise, r.micro, r.maxWeight, r.e1rm, r.volume, r.sets]);
  const names = [...new Set(rows.map((r) => r.exercise))];
  names.forEach((n, i) => {
    ws.getCell(i + 2, 9).value = n;
  });
  fit(ws, [34, 34, 8, 14, 18, 14, 16, 3, 34]);
  return names;
}

function progressSheet(
  wb: ExcelJS.Workbook,
  input: ExportInput,
  l: ExportLabels,
  rows: ProgressRow[],
  names: string[],
): void {
  const ws = wb.addWorksheet(l.sheetProgress);
  const { headerRow, firstRow } = PROGRESS_LAYOUT;
  ws.getCell('A1').value = input.meso.name;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = l.pickExercise;
  ws.getCell('A2').font = { bold: true };

  if (names.length > 0) {
    ws.getCell('B2').value = names[0];
    ws.getCell('B2').dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`'${l.sheetData}'!$I$2:$I$${names.length + 1}`],
    };
    ws.getCell('B2').border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
  }

  const head = ws.getRow(headerRow);
  head.values = [l.colMicro, l.colMaxWeight(input.unit), l.colE1rm(input.unit), l.colVolume(input.unit), l.colEffectiveSets];
  styleHeader(head);

  const data = `'${l.sheetData}'`;
  const columns = ['D', 'E', 'F', 'G'];
  const first = names[0];
  for (let m = 1; m <= input.meso.microcycles; m++) {
    const rowNumber = firstRow + m - 1;
    const row = ws.getRow(rowNumber);
    row.getCell(1).value = m;
    const cached = rows.find((r) => r.exercise === first && r.micro === m);
    const results = cached ? [cached.maxWeight, cached.e1rm, cached.volume, cached.sets] : [];
    columns.forEach((col, i) => {
      row.getCell(i + 2).value = {
        formula: `IFERROR(INDEX(${data}!$${col}:$${col},MATCH($B$2&"|"&$A${rowNumber},${data}!$A:$A,0)),NA())`,
        result: cached ? results[i] : { error: '#N/A' },
      } as ExcelJS.CellFormulaValue;
    });
  }
  const lastRow = firstRow + input.meso.microcycles - 1;
  ws.addConditionalFormatting({
    ref: `B${firstRow}:E${lastRow}`,
    rules: [{ type: 'expression', formulae: [`ISNA(B${firstRow})`], priority: 1, style: { font: { color: { argb: 'FFBBBBBB' } } } }],
  });
  fit(ws, [14, 18, 22, 18, 18]);
}

/** Genera el .xlsx del mesociclo (sin las gráficas, que se añaden después). */
export async function buildWorkbook(input: ExportInput): Promise<Uint8Array> {
  const l = labels(input.lang);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Legacy';
  wb.calcProperties.fullCalcOnLoad = true;

  const rows = buildProgressRows(input);
  routineSheet(wb, input, l);
  setsSheet(wb, input, l);
  const names = dataSheet(wb, input, l, rows);
  progressSheet(wb, input, l, rows, names);

  const bytes = new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  if (names.length === 0) return bytes;

  const first = PROGRESS_LAYOUT.firstRow;
  const last = first + input.meso.microcycles - 1;
  const range = (col: string) => sheetRef(l.sheetProgress, `$${col}$${first}:$${col}$${last}`);
  try {
    return await addCharts(bytes, [
      { title: l.chartMaxWeight, sheetName: l.sheetProgress, categories: range('A'), values: range('B'), anchorCol: 6, anchorRow: 3 },
      { title: l.chartVolume, sheetName: l.sheetProgress, categories: range('A'), values: range('D'), anchorCol: 6, anchorRow: 18 },
    ]);
  } catch {
    // Sin gráficas el archivo sigue siendo útil: se entrega igualmente.
    return bytes;
  }
}
