"""Comprueba con openpyxl un .xlsx exportado: hojas, gráficas y validación de lista.

Uso: python scripts/check-xlsx.py <archivo.xlsx>
"""
import sys
import warnings

from openpyxl import load_workbook


def main(path: str) -> int:
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        wb = load_workbook(path)
    print("Hojas:", wb.sheetnames)
    problems = [str(w.message) for w in caught]

    progress = next((ws for ws in wb.worksheets if ws.title in ("Progreso", "Progress")), None)
    if progress is None:
        print("ERROR: no hay hoja de progreso")
        return 1
    charts = progress._charts
    print("Gráficas en la hoja de progreso:", len(charts))
    for chart in charts:
        kind = type(chart).__name__
        series = [s.val.numRef.f for s in chart.series]
        print(f"  - {kind}: {series}")
    lists = [dv for dv in progress.data_validations.dataValidation if dv.type == "list"]
    print("Validaciones de lista:", [(str(dv.sqref), dv.formula1) for dv in lists])

    if len(charts) != 2:
        problems.append(f"se esperaban 2 gráficas y hay {len(charts)}")
    if not lists:
        problems.append("falta el desplegable de ejercicio")
    for p in problems:
        print("PROBLEMA:", p)
    print("OK" if not problems else "CON PROBLEMAS")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
