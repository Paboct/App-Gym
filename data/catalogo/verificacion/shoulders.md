# Verificación del lote shoulders

Fuentes abiertas en esta sesión (11): Saeterbakken & Fimland 2013 (resumen); Coratella 2022 (Front Physiol);
Coratella 2020 (IJERPH); Sweeney et al. 2015 (ACE, no revisado por pares); Luczak 2013; Dicus 2018;
McAllister 2013; Schoenfeld 2013; Fukunaga 2022; Ekstrom 2003 (resumen); Larsen 2025 (no mide EMG).
Las páginas de PubMed/PMC bloqueaban la descarga: los resúmenes y textos se leyeron vía Europe PMC o la web de la revista.
Los porcentajes de %MVC solo se usaron del estudio ACE y de Coratella 2020; los demás no daban cifras por músculo en el texto.

## Cambios de coeficientes

| id | antes → después | confianza | fuente |
|---|---|---|---|
| db_rear_fly | deltoides_lateral 0,30 → 0,60 | media → media | ACE: pájaros sentado, deltoides medio 70 %MVC vs posterior 73 %MVC; Coratella 2020 (elevación lateral rotada internamente: medio ~52 vs posterior ~85) |
| seated_rear_delt_raise | deltoides_lateral 0,35 → 0,60 | baja → media | ACE (mismo ejercicio) |
| one_arm_shoulder_press | recto_abdominal (estabilizador 0,20) → pectoral_clavicular (secundario 0,35) | baja → media | Dicus 2018: pectoral mayor 31 %MVIC vs deltoides anterior 63 %MVIC en press a una mano; coherente con el press con mancuernas |

## Cambios de confianza / fuentes (sin tocar coeficientes)

| id | confianza | fuente (URL) |
|---|---|---|
| db_shoulder_press | media → alta | ACE (anterior 74, medio 62, posterior 10 %MVC; coeficiente 0,75 vs 0,84 relativo, dentro de 0,15); Luczak 2013 (trapecio superior y pectoral clavicular activos); Saeterbakken 2013 — https://www.acefitness.org/education-and-resources/professional/prosource/research-special-issue-2015/5320/dynamite-delts-ace-research-identifies-top-shoulder-exercises/ , https://dx.doi.org/10.1155/2013/612650 |
| db_lateral_raise | media → alta | Coratella 2020 https://pmc.ncbi.nlm.nih.gov/articles/PMC7503819/ ; ACE (elevación lateral con codo flexionado: anterior 32, medio 77, posterior 33 %MVC; coincide con 0,35/0,30) |
| ohp | baja → media | Saeterbakken 2013 https://pubmed.ncbi.nlm.nih.gov/23096062/ ; Coratella 2022 https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.825880/full |
| seated_barbell_press | media → media | Saeterbakken 2013 (mismo ejercicio); Coratella 2022 |
| machine_shoulder_press | baja → media | Coratella 2022 (press en máquina medido directamente) |
| standing_db_press | baja → media | Saeterbakken 2013 (de pie con mancuernas: mayor actividad deltoidea); ACE |
| one_arm_shoulder_press | baja → media | Dicus 2018 https://pmc.ncbi.nlm.nih.gov/articles/PMC6033506/ |
| cable_lateral_raise | baja → media | Larsen 2025 https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1611468/full (deltoides lateral como diana; sin EMG) |
| one_arm_lateral_raise, seated_lateral_raise | baja → media | Coratella 2020; ACE (variantes casi idénticas a la elevación lateral con mancuernas) |
| db_front_raise | baja → media | Coratella 2020 (deltoides anterior y pectoral clavicular dominan; tríceps poco activo); ACE (anterior 57 %MVC) |
| plate_front_raise | baja → media | igual que db_front_raise (variante muy equivalente) |
| reverse_pec_deck | media → media | Schoenfeld 2013 https://pubmed.ncbi.nlm.nih.gov/23302754/ ; ACE |
| db_rear_fly, seated_rear_delt_raise | ver arriba | ACE, Schoenfeld 2013 |
| band_pull_apart | baja → media | Fukunaga 2022 https://pubmed.ncbi.nlm.nih.gov/35391860/ (deltoides posterior, infraespinoso y trapecios activos; 15-73 %MVC) |
| upright_row, db_upright_row | baja → media | McAllister 2013 https://pubmed.ncbi.nlm.nih.gov/22362088/ ; ACE (remo al mentón: anterior 33, medio 73, posterior 31 %MVC; coeficientes actuales dentro de 0,15) |
| cable_y_raise | baja → baja | Ekstrom 2003 https://pubmed.ncbi.nlm.nih.gov/12774999/ solo como contexto (versión en prono) |
| face_pull | baja → baja | Fukunaga 2022 solo como análogo; sin EMG de face pull |

Se eliminaron todas las citas «(recordado, sin verificar)» (Saeterbakken 2011, Coratella 2020 recordada, Ogasawara 2018, analogías).
Ogasawara 2018 no apareció en la búsqueda: no se cita.

## Discrepancias anotadas, sin cambio (evidencia insuficiente o contradictoria)

- db_front_raise: ACE da deltoides medio 36 vs anterior 57 (relativo 0,63) frente a 0,40 actual (>0,15); Coratella 2020 dice que medio/posterior son despreciables en la elevación frontal. Se deja 0,40.
- reverse_pec_deck, cable_rear_fly, face_pull, cable_rope_rear_row: el deltoides lateral (0,30) podría estar infravalorado, como en db_rear_fly según ACE, pero no se midió en esas variantes; sin cambio.
- Serrato anterior y manguito rotador: ningún estudio abierto da cifras por ejercicio (Ekstrom 2003 solo indica que el serrato requiere gran rotación escapular superior).

## No verificados

- arnold_press (solo webs secundarias y un estudio indio sin acceso), smith_shoulder_press, cable_shoulder_press, landmine_press, push_press (sin EMG primario accesible), machine_lateral_raise, lean_lateral_raise, cable_front_raise, cable_rear_fly, cable_rope_rear_row, db_scaption, upright_cable_row, face_pull, cable_y_raise: siguen en confianza baja con fuentes de analogía.
