import type { EquipmentId, GroupId, MuscleId } from '../domain/muscles';
import type { Exercise } from '../domain/types';

/**
 * Catálogo propio de ejercicios (sin restricciones de licencia).
 * Formato por línea:
 *   id | nombre ES | nombre EN | grupo | material | músculos principales | secundarios | u (unilateral)
 * Los ids son estables: no se deben cambiar una vez publicados, porque los
 * entrenos guardados apuntan a ellos.
 */
const RAW = `
bench_press|Press de banca|Bench press|chest|barbell|chest_mid|chest_lower,delt_front,triceps
incline_bench_press|Press inclinado con barra|Incline bench press|chest|barbell|chest_upper|chest_mid,delt_front,triceps
decline_bench_press|Press declinado con barra|Decline bench press|chest|barbell|chest_lower|chest_mid,delt_front,triceps
db_bench_press|Press de banca con mancuernas|Dumbbell bench press|chest|dumbbell|chest_mid|chest_lower,delt_front,triceps
incline_db_press|Press inclinado con mancuernas|Incline dumbbell press|chest|dumbbell|chest_upper|chest_mid,delt_front,triceps
smith_bench_press|Press de banca en multipower|Smith machine bench press|chest|smith|chest_mid|chest_lower,delt_front,triceps
smith_incline_press|Press inclinado en multipower|Smith machine incline press|chest|smith|chest_upper|chest_mid,delt_front,triceps
machine_chest_press|Press de pecho en máquina|Machine chest press|chest|machine|chest_mid|chest_lower,delt_front,triceps
machine_incline_press|Press inclinado en máquina|Machine incline press|chest|machine|chest_upper|chest_mid,delt_front,triceps
pec_deck|Contractora (pec deck)|Pec deck fly|chest|machine|chest_mid|chest_upper,chest_lower,delt_front
cable_fly_high|Cruce de poleas de arriba abajo|High-to-low cable fly|chest|cable|chest_lower|chest_mid,delt_front
cable_fly_low|Cruce de poleas de abajo arriba|Low-to-high cable fly|chest|cable|chest_upper|chest_mid,delt_front
cable_fly_mid|Aperturas en polea a media altura|Cable fly|chest|cable|chest_mid|chest_upper,chest_lower,delt_front
db_fly|Aperturas con mancuernas|Dumbbell fly|chest|dumbbell|chest_mid|chest_upper,chest_lower,delt_front
incline_db_fly|Aperturas inclinadas con mancuernas|Incline dumbbell fly|chest|dumbbell|chest_upper|chest_mid,delt_front
push_up|Flexiones|Push-up|chest|bodyweight|chest_mid|chest_lower,delt_front,triceps,abs
chest_dip|Fondos en paralelas (pecho)|Chest dip|chest|bodyweight|chest_lower|chest_mid,triceps,delt_front
pull_up|Dominadas|Pull-up|back|bodyweight|lats|upper_back,traps_mid,biceps,forearm
chin_up|Dominadas supinas|Chin-up|back|bodyweight|lats,biceps|upper_back,forearm
neutral_pull_up|Dominadas con agarre neutro|Neutral-grip pull-up|back|bodyweight|lats|upper_back,biceps,forearm
lat_pulldown|Jalón al pecho|Lat pulldown|back|cable|lats|upper_back,biceps,forearm
close_grip_pulldown|Jalón con agarre estrecho|Close-grip pulldown|back|cable|lats|upper_back,biceps,forearm
single_arm_pulldown|Jalón unilateral en polea|Single-arm lat pulldown|back|cable|lats|upper_back,biceps|u
straight_arm_pulldown|Pullover en polea alta|Straight-arm pulldown|back|cable|lats|triceps,abs
barbell_row|Remo con barra|Barbell row|back|barbell|lats,upper_back|traps_mid,delt_rear,biceps,lower_back,forearm
tbar_row|Remo en barra T|T-bar row|back|barbell|upper_back,lats|traps_mid,delt_rear,biceps,lower_back
db_row|Remo con mancuerna|Dumbbell row|back|dumbbell|lats|upper_back,traps_mid,delt_rear,biceps,forearm|u
seated_cable_row|Remo sentado en polea|Seated cable row|back|cable|upper_back,lats|traps_mid,delt_rear,biceps,forearm
wide_cable_row|Remo en polea con agarre ancho|Wide-grip cable row|back|cable|upper_back|traps_mid,delt_rear,lats,biceps
machine_row|Remo en máquina|Machine row|back|machine|upper_back,lats|traps_mid,delt_rear,biceps
chest_supported_row|Remo con apoyo en el pecho|Chest-supported row|back|machine|upper_back,lats|traps_mid,delt_rear,biceps
single_arm_cable_row|Remo unilateral en polea|Single-arm cable row|back|cable|lats|upper_back,delt_rear,biceps|u
db_pullover|Pullover con mancuerna|Dumbbell pullover|back|dumbbell|lats|chest_lower,triceps
machine_pullover|Pullover en máquina|Machine pullover|back|machine|lats|chest_lower,triceps,abs
deadlift|Peso muerto|Deadlift|back|barbell|lower_back,glute_max,hamstrings|quads,traps_upper,lats,forearm
rack_pull|Rack pull|Rack pull|back|barbell|lower_back,traps_upper|glute_max,hamstrings,forearm
back_extension|Hiperextensiones|Back extension|back|bodyweight|lower_back|glute_max,hamstrings
barbell_shrug|Encogimientos con barra|Barbell shrug|back|barbell|traps_upper|traps_mid,forearm
db_shrug|Encogimientos con mancuernas|Dumbbell shrug|back|dumbbell|traps_upper|traps_mid,forearm
ohp|Press militar con barra|Overhead press|shoulders|barbell|delt_front|delt_side,triceps,chest_upper,traps_upper
db_shoulder_press|Press de hombros con mancuernas|Dumbbell shoulder press|shoulders|dumbbell|delt_front|delt_side,triceps,traps_upper
machine_shoulder_press|Press de hombros en máquina|Machine shoulder press|shoulders|machine|delt_front|delt_side,triceps
smith_shoulder_press|Press de hombros en multipower|Smith machine shoulder press|shoulders|smith|delt_front|delt_side,triceps
arnold_press|Press Arnold|Arnold press|shoulders|dumbbell|delt_front|delt_side,triceps
db_lateral_raise|Elevaciones laterales con mancuernas|Dumbbell lateral raise|shoulders|dumbbell|delt_side|delt_front,traps_upper
cable_lateral_raise|Elevaciones laterales en polea|Cable lateral raise|shoulders|cable|delt_side|delt_front,traps_upper|u
machine_lateral_raise|Elevaciones laterales en máquina|Machine lateral raise|shoulders|machine|delt_side|traps_upper
db_front_raise|Elevaciones frontales con mancuernas|Dumbbell front raise|shoulders|dumbbell|delt_front|delt_side,chest_upper
cable_front_raise|Elevaciones frontales en polea|Cable front raise|shoulders|cable|delt_front|delt_side
reverse_pec_deck|Pájaros en máquina|Reverse pec deck|shoulders|machine|delt_rear|upper_back,traps_mid
db_rear_fly|Pájaros con mancuernas|Dumbbell reverse fly|shoulders|dumbbell|delt_rear|upper_back,traps_mid
cable_rear_fly|Pájaros en polea|Cable reverse fly|shoulders|cable|delt_rear|upper_back,traps_mid
face_pull|Face pull|Face pull|shoulders|cable|delt_rear|upper_back,traps_mid
upright_row|Remo al mentón|Upright row|shoulders|barbell|delt_side|traps_upper,delt_front,biceps
barbell_curl|Curl con barra|Barbell curl|biceps|barbell|biceps|forearm
ez_curl|Curl con barra Z|EZ-bar curl|biceps|barbell|biceps|forearm
db_curl|Curl con mancuernas|Dumbbell curl|biceps|dumbbell|biceps|forearm
alt_db_curl|Curl alterno con mancuernas|Alternating dumbbell curl|biceps|dumbbell|biceps|forearm|u
hammer_curl|Curl martillo|Hammer curl|biceps|dumbbell|biceps,forearm|
incline_db_curl|Curl inclinado con mancuernas|Incline dumbbell curl|biceps|dumbbell|biceps|forearm
preacher_curl|Curl en banco Scott|Preacher curl|biceps|barbell|biceps|forearm
machine_preacher_curl|Curl Scott en máquina|Machine preacher curl|biceps|machine|biceps|forearm
cable_curl|Curl en polea baja|Cable curl|biceps|cable|biceps|forearm
bayesian_curl|Curl bayesian en polea|Bayesian cable curl|biceps|cable|biceps|forearm|u
concentration_curl|Curl concentrado|Concentration curl|biceps|dumbbell|biceps|forearm|u
spider_curl|Curl araña|Spider curl|biceps|dumbbell|biceps|forearm
rope_hammer_curl|Curl martillo con cuerda|Rope hammer curl|biceps|cable|biceps,forearm|
triceps_pushdown|Extensión de tríceps en polea con barra|Triceps pushdown|triceps|cable|triceps|forearm
rope_pushdown|Extensión de tríceps con cuerda|Rope pushdown|triceps|cable|triceps|forearm
overhead_cable_ext|Extensión de tríceps sobre la cabeza en polea|Overhead cable triceps extension|triceps|cable|triceps|
single_arm_pushdown|Extensión de tríceps unilateral en polea|Single-arm pushdown|triceps|cable|triceps||u
skullcrusher|Press francés|Skull crusher|triceps|barbell|triceps|forearm
db_overhead_ext|Extensión de tríceps con mancuerna sobre la cabeza|Dumbbell overhead triceps extension|triceps|dumbbell|triceps|
close_grip_bench|Press de banca con agarre cerrado|Close-grip bench press|triceps|barbell|triceps|chest_mid,delt_front
triceps_dip|Fondos en paralelas (tríceps)|Triceps dip|triceps|bodyweight|triceps|chest_lower,delt_front
machine_dip|Fondos en máquina|Machine dip|triceps|machine|triceps|chest_lower,delt_front
bench_dip|Fondos entre bancos|Bench dip|triceps|bodyweight|triceps|delt_front,chest_lower
db_kickback|Patada de tríceps con mancuerna|Dumbbell kickback|triceps|dumbbell|triceps||u
machine_triceps_ext|Extensión de tríceps en máquina|Machine triceps extension|triceps|machine|triceps|
wrist_curl|Curl de muñeca|Wrist curl|forearms|barbell|forearm|
reverse_wrist_curl|Curl de muñeca inverso|Reverse wrist curl|forearms|barbell|forearm|
reverse_curl|Curl inverso|Reverse curl|forearms|barbell|forearm|biceps
farmer_walk|Paseo del granjero|Farmer's walk|forearms|dumbbell|forearm|traps_upper,abs
crunch|Crunch abdominal|Crunch|core|bodyweight|abs|obliques
cable_crunch|Crunch en polea|Cable crunch|core|cable|abs|obliques
machine_crunch|Crunch en máquina|Machine crunch|core|machine|abs|obliques
hanging_leg_raise|Elevación de piernas colgado|Hanging leg raise|core|bodyweight|abs|obliques,forearm
lying_leg_raise|Elevación de piernas tumbado|Lying leg raise|core|bodyweight|abs|obliques
plank|Plancha|Plank|core|bodyweight|abs|obliques,lower_back
side_plank|Plancha lateral|Side plank|core|bodyweight|obliques|abs,glute_med|u
ab_wheel|Rueda abdominal|Ab wheel rollout|core|other|abs|obliques,lats
russian_twist|Giro ruso|Russian twist|core|bodyweight|obliques|abs
cable_woodchop|Leñador en polea|Cable woodchop|core|cable|obliques|abs|u
squat|Sentadilla con barra|Back squat|quads|barbell|quads,glute_max|adductors,hamstrings,lower_back
front_squat|Sentadilla frontal|Front squat|quads|barbell|quads|glute_max,abs,upper_back
smith_squat|Sentadilla en multipower|Smith machine squat|quads|smith|quads,glute_max|adductors
hack_squat|Sentadilla hack|Hack squat|quads|machine|quads|glute_max,adductors
leg_press|Prensa de piernas|Leg press|quads|machine|quads|glute_max,adductors,hamstrings
goblet_squat|Sentadilla goblet|Goblet squat|quads|dumbbell|quads|glute_max,adductors,abs
bulgarian_split_squat|Sentadilla búlgara|Bulgarian split squat|quads|dumbbell|quads,glute_max|adductors,hamstrings,glute_med|u
lunge|Zancadas|Lunge|quads|dumbbell|quads,glute_max|hamstrings,adductors,glute_med|u
walking_lunge|Zancadas caminando|Walking lunge|quads|dumbbell|quads,glute_max|hamstrings,adductors,glute_med|u
leg_extension|Extensión de cuádriceps|Leg extension|quads|machine|quads|
single_leg_extension|Extensión de cuádriceps unilateral|Single-leg extension|quads|machine|quads||u
step_up|Subida al cajón|Step-up|quads|dumbbell|quads,glute_max|glute_med,hamstrings|u
sissy_squat|Sentadilla sissy|Sissy squat|quads|bodyweight|quads|abs
rdl|Peso muerto rumano|Romanian deadlift|hamstrings|barbell|hamstrings,glute_max|lower_back,adductors,forearm
db_rdl|Peso muerto rumano con mancuernas|Dumbbell Romanian deadlift|hamstrings|dumbbell|hamstrings,glute_max|lower_back,forearm
stiff_leg_deadlift|Peso muerto con piernas rígidas|Stiff-leg deadlift|hamstrings|barbell|hamstrings|glute_max,lower_back
lying_leg_curl|Curl femoral tumbado|Lying leg curl|hamstrings|machine|hamstrings|calves
seated_leg_curl|Curl femoral sentado|Seated leg curl|hamstrings|machine|hamstrings|calves
single_leg_curl|Curl femoral unilateral|Single-leg curl|hamstrings|machine|hamstrings|calves|u
nordic_curl|Curl nórdico|Nordic curl|hamstrings|bodyweight|hamstrings|glute_max,calves
good_morning|Buenos días|Good morning|hamstrings|barbell|hamstrings,lower_back|glute_max
hip_thrust|Hip thrust con barra|Barbell hip thrust|glutes|barbell|glute_max|hamstrings,glute_med,quads
machine_hip_thrust|Hip thrust en máquina|Machine hip thrust|glutes|machine|glute_max|hamstrings,glute_med
glute_bridge|Puente de glúteos|Glute bridge|glutes|barbell|glute_max|hamstrings
cable_kickback|Patada de glúteo en polea|Cable glute kickback|glutes|cable|glute_max|hamstrings,glute_med|u
machine_kickback|Patada de glúteo en máquina|Machine glute kickback|glutes|machine|glute_max|hamstrings|u
hip_abduction|Abducción de cadera en máquina|Hip abduction machine|glutes|machine|glute_med|glute_max
cable_hip_abduction|Abducción de cadera en polea|Cable hip abduction|glutes|cable|glute_med|glute_max|u
sumo_deadlift|Peso muerto sumo|Sumo deadlift|glutes|barbell|glute_max,adductors|quads,hamstrings,lower_back,traps_upper
cable_pull_through|Pull through en polea|Cable pull-through|glutes|cable|glute_max|hamstrings,lower_back
hip_adduction|Aducción de cadera en máquina|Hip adduction machine|adductors|machine|adductors|
cable_hip_adduction|Aducción de cadera en polea|Cable hip adduction|adductors|cable|adductors||u
copenhagen_plank|Plancha Copenhague|Copenhagen plank|adductors|bodyweight|adductors|obliques,abs|u
standing_calf_raise|Elevación de gemelos de pie|Standing calf raise|calves|machine|calves|
seated_calf_raise|Elevación de gemelos sentado|Seated calf raise|calves|machine|calves|
leg_press_calf_raise|Gemelos en prensa|Leg press calf raise|calves|machine|calves|
smith_calf_raise|Elevación de gemelos en multipower|Smith machine calf raise|calves|smith|calves|
single_leg_calf_raise|Elevación de gemelo a una pierna|Single-leg calf raise|calves|dumbbell|calves||u
`;

function parseList(value: string | undefined): MuscleId[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as MuscleId[];
}

export const CATALOG: Exercise[] = RAW.trim()
  .split('\n')
  .map((line) => {
    const [id, nameEs, nameEn, group, equipment, primary, secondary, flag] = line.split('|');
    return {
      id,
      nameEs,
      nameEn,
      group: group as GroupId,
      equipment: equipment as EquipmentId,
      primary: parseList(primary),
      secondary: parseList(secondary),
      unilateral: flag === 'u',
      custom: false,
      updatedAt: 0,
    };
  });
