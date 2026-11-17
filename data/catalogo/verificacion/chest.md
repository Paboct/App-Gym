# Verificación del lote chest

Fuentes abiertas en esta sesión: Rodríguez-Ridao 2020 (PMC7579505), Saeterbakken 2017 (PMC5504579), Saeterbakken 2011 (qxmd 21225489), Schick 2010 (qxmd 20093960), Muyor 2023 (PMC10203828), Solstad 2020 (jssm-19-645), Schanke 2012 (ACE + minds.wisc.edu), Marcolin 2015 (PMC4732391), Calatayud 2014 (jssm-13-502).

## Cambios de coeficientes

| id | antes → después | confianza | fuente |
|---|---|---|---|
| bench_press | clavicular 0,6 → 0,8; abdominal 0,5 → 0,7 | media → alta | https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505 (a 0° las tres porciones ~27 % MVIC) |
| db_bench_press | ídem | media → media | PMC7579505 + Saeterbakken 2011 |
| smith_bench_press | ídem | media → media | PMC7579505 + Schick 2010 |
| wide_grip_bench | ídem | media → media | PMC7579505 + PMC5504579 |
| machine_chest_press | clavicular 0,6 → 0,8; abdominal 0,45 → 0,65 | baja → media | https://pmc.ncbi.nlm.nih.gov/articles/PMC10203828/ (clavicular mayor en máquina) |

## Solo cambia la confianza

| id | confianza | motivo |
|---|---|---|
| incline_bench_press | media → alta | PMC7579505 (clavicular máx. a 30°, esternal baja, deltoides sube) y PMC5504579. Discrepancia en tríceps (ver abajo), no cambiado |
| incline_db_press, smith_incline_press, db_fly, incline_db_fly, pec_deck, cable_fly_mid, push_up, one_arm_db_press | media → media | fuentes reales añadidas, citas «recordado» eliminadas |
| decline_bench_press, decline_db_press, smith_decline_press, decline_db_fly | media → baja | ninguna fuente abierta respalda la porción abdominal como principal en declinado (Saeterbakken 2017: pectoral similar al plano) |
| cable_fly_high, cable_fly_low, incline_cable_fly | media → baja | sin fuente abierta que respalde la porción principal |
| decline_push_up, incline_push_up | media → baja | Marcolin 2015 no cubre pies/manos elevados |
| chest_dip, machine_incline_press, incline_cable_press, standing_cable_press, db_floor_press, svend_press, machine_decline_press | baja → baja | sin cambios (se añade la fuente de contexto en chest_dip) |

## Sin verificar / dudas

- Barnett 1995, Glass 1997, Welsch 2005, Cogley 2005, Lauver 2016: solo vistos en resúmenes de búsqueda o listados, no abiertos; se eliminaron como fuentes. PubMed y PMC (algunos) bloquearon la apertura.
- Tríceps en inclinado: Saeterbakken 2017 lo da 58–63 % menor que en plano; Rodríguez-Ridao (solo cabeza medial) sin diferencias. Se mantuvo 0,55/0,5/0,3.
- Deltoides anterior en plano (~26 % vs ~27 % pectoral en Rodríguez-Ridao): comparación entre músculos con normalizaciones distintas, no se cambió.
- Svend press, press de suelo, fondos, cruces de poleas por porciones: sin EMG utilizable encontrado.
- Los coeficientes de plano (clavicular/abdominal) de flexiones, press en polea de pie y press de suelo no se tocaron (sin fuente directa), por lo que quedan menos coherentes con el press de banca.


## Ajuste de coherencia (controlador)
push_up, standing_cable_press, db_floor_press, one_arm_db_press: pectoral_clavicular -> 0,75 y pectoral_abdominal -> 0,6, igual que el press de banca verificado (el resto del lote no cambia).
