# Auditoría de músculos del catálogo

Fecha: 2026-11-16. Método: un script (`scripts/audit-muscles.mjs`, retirado al llegar el catálogo con activación; la validación vive ahora en `tests/catalogData.test.ts`) compara, por grupo muscular, los principales del catálogo con los del dataset en los 139 ejercicios con foto. Después, revisión anatómica de cada desacuerdo y de los 17 ejercicios sin foto.

Resultado: el dataset es más grueso que el catálogo (no separa espalda alta de dorsales, ni las porciones del pecho o del hombro), así que la mayoría de los 32 desacuerdos eran diferencias de detalle y el catálogo estaba bien.

## Corregidos

| Ejercicio | Antes | Después | Motivo |
|---|---|---|---|
| Peso muerto con barra hexagonal (`trap_bar_deadlift`) | P: lumbar, glúteo mayor | P: cuádriceps, glúteo mayor. S: isquios, lumbar, trapecio sup., antebrazo | La barra hexagonal reparte más carga a las piernas que el peso muerto convencional. |
| Pullover con mancuerna (`db_pullover`) | S: pecho inferior, tríceps | S: pecho medio, pecho inferior, tríceps | El pullover trabaja el pecho además de los dorsales. |
| Pullover en máquina (`machine_pullover`) | S: pecho inferior, tríceps, abdomen | S: pecho medio, pecho inferior, tríceps, abdomen | Igual que el anterior. |
| Press landmine (`landmine_press`) | P: pecho superior. S: deltoides ant., tríceps | P: deltoides ant., pecho superior. S: tríceps, deltoides lat. | Es sobre todo un press de hombro inclinado. |

## Revisados y dejados como estaban

- **Remos** (`barbell_row`, `tbar_row`, `db_row`, `seated_cable_row`, `machine_row`, `chest_supported_row`, `single_arm_cable_row`, `inverted_row`): dorsales y espalda alta como principales, tal como pediste. El dataset solo da "espalda media".
- **Dominadas supinas** (`chin_up`): el dataset pone solo dorsales, pero el bíceps trabaja mucho más que en la dominada prona; se mantiene como principal.
- **Curl martillo, con cuerda y Zottman**: antebrazo (braquiorradial) como principal junto al bíceps.
- **Curl inverso** (`reverse_curl`): antebrazo principal, bíceps secundario. El dataset lo pone al revés y es incorrecto.
- **Aducción en polea** (`cable_hip_adduction`): aductores. El dataset dice cuádriceps y es incorrecto.
- **Peso muerto sumo, convencional, rumano, buenos días, zancadas, sentadillas**: la distribución entre glúteo, isquios y cuádriceps del catálogo es más fina que la del dataset y anatómicamente correcta.

## Ejercicios sin foto (17)

Revisados sin cambios: `cable_fly_mid`, `wide_cable_row`, `machine_pullover` (corregido arriba), `machine_lateral_raise`, `bayesian_curl`, `single_leg_curl`, `machine_hip_thrust`, `cable_hip_abduction`, `copenhagen_plank`, `single_leg_calf_raise`, `landmine_press` (corregido arriba), `pendlay_row`, `meadows_row`, `lean_lateral_raise`, `cable_y_raise`, `belt_squat`, `frog_pump`.
