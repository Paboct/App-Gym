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
db_pullover|Pullover con mancuerna|Dumbbell pullover|back|dumbbell|lats|chest_mid,chest_lower,triceps
machine_pullover|Pullover en máquina|Machine pullover|back|machine|lats|chest_mid,chest_lower,triceps,abs
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
decline_db_press|Press declinado con mancuernas|Decline dumbbell press|chest|dumbbell|chest_lower|chest_mid,delt_front,triceps
landmine_press|Press landmine|Landmine press|shoulders|barbell|delt_front,chest_upper|triceps,delt_side
svend_press|Press Svend|Svend press|chest|other|chest_mid|chest_upper,delt_front
pendlay_row|Remo Pendlay|Pendlay row|back|barbell|upper_back,lats|traps_mid,delt_rear,biceps,lower_back
inverted_row|Remo invertido|Inverted row|back|bodyweight|upper_back,lats|biceps,delt_rear,forearm
trap_bar_deadlift|Peso muerto con barra hexagonal|Trap bar deadlift|back|barbell|quads,glute_max|hamstrings,lower_back,traps_upper,forearm
machine_shrug|Encogimientos en máquina|Machine shrug|back|machine|traps_upper|traps_mid,forearm
meadows_row|Remo Meadows|Meadows row|back|barbell|lats,upper_back|delt_rear,biceps,forearm|u
push_press|Push press|Push press|shoulders|barbell|delt_front|delt_side,triceps,quads,glute_max
lean_lateral_raise|Elevación lateral inclinado en polea|Leaning cable lateral raise|shoulders|cable|delt_side|delt_front,traps_upper|u
cable_y_raise|Elevación en Y en polea|Cable Y-raise|shoulders|cable|delt_rear|delt_side,traps_mid
zottman_curl|Curl Zottman|Zottman curl|biceps|dumbbell|biceps,forearm|
high_cable_curl|Curl en polea alta|High cable curl|biceps|cable|biceps|forearm|u
lying_db_extension|Press francés con mancuernas|Lying dumbbell triceps extension|triceps|dumbbell|triceps|forearm
captains_chair_raise|Elevación de rodillas en silla romana|Captain's chair leg raise|core|bodyweight|abs|obliques,forearm
decline_crunch|Crunch declinado|Decline crunch|core|bodyweight|abs|obliques
pallof_press|Press Pallof|Pallof press|core|cable|obliques|abs
reverse_lunge|Zancada inversa|Reverse lunge|quads|dumbbell|quads,glute_max|hamstrings,adductors,glute_med|u
pistol_squat|Sentadilla pistol|Pistol squat|quads|bodyweight|quads,glute_max|hamstrings,adductors|u
belt_squat|Sentadilla con cinturón|Belt squat|quads|machine|quads,glute_max|adductors,hamstrings
single_leg_rdl|Peso muerto rumano a una pierna|Single-leg Romanian deadlift|hamstrings|dumbbell|hamstrings,glute_max|lower_back,glute_med|u
single_leg_hip_thrust|Hip thrust a una pierna|Single-leg hip thrust|glutes|bodyweight|glute_max|hamstrings,glute_med|u
frog_pump|Frog pump|Frog pump|glutes|bodyweight|glute_max|hamstrings
donkey_calf_raise|Gemelo burro|Donkey calf raise|calves|machine|calves|
plate_pinch|Pinza con disco|Plate pinch|forearms|other|forearm|
incline_cable_fly|Aperturas inclinadas en polea|Incline cable fly|chest|cable|chest_upper|chest_mid,delt_front
decline_db_fly|Aperturas declinadas con mancuernas|Decline dumbbell fly|chest|dumbbell|chest_lower|chest_mid,delt_front
incline_cable_press|Press inclinado en polea|Incline cable chest press|chest|cable|chest_upper|chest_mid,delt_front,triceps
standing_cable_press|Press de pecho de pie en polea|Standing cable chest press|chest|cable|chest_mid|chest_upper,delt_front,triceps
db_floor_press|Press de suelo con mancuernas|Dumbbell floor press|chest|dumbbell|chest_mid|triceps,delt_front
decline_push_up|Flexiones declinadas|Decline push-up|chest|bodyweight|chest_upper|chest_mid,delt_front,triceps,abs
incline_push_up|Flexiones inclinadas|Incline push-up|chest|bodyweight|chest_lower|chest_mid,delt_front,triceps
diamond_push_up|Flexiones diamante|Diamond push-up|triceps|bodyweight|triceps|chest_mid,delt_front
wide_grip_bench|Press de banca agarre ancho|Wide-grip bench press|chest|barbell|chest_mid|chest_upper,delt_front,triceps
one_arm_db_press|Press de banca con una mancuerna|One-arm dumbbell bench press|chest|dumbbell|chest_mid|chest_lower,delt_front,triceps,obliques|u
smith_decline_press|Press declinado en multipower|Smith machine decline press|chest|smith|chest_lower|chest_mid,delt_front,triceps
machine_decline_press|Press declinado en máquina|Machine decline chest press|chest|machine|chest_lower|chest_mid,delt_front,triceps
reverse_grip_row|Remo con barra agarre supino|Reverse-grip barbell row|back|barbell|lats,upper_back|biceps,delt_rear,traps_mid,lower_back
vbar_pulldown|Jalón con agarre en V|V-bar pulldown|back|cable|lats|upper_back,biceps,forearm
underhand_pulldown|Jalón con agarre supino|Underhand lat pulldown|back|cable|lats|biceps,upper_back,forearm
kneeling_cable_row|Remo unilateral de rodillas en polea|Kneeling single-arm cable row|back|cable|lats,upper_back|biceps,delt_rear|u
suspended_row|Remo en suspensión|Suspended row|back|bodyweight|upper_back,lats|biceps,delt_rear,forearm
db_bent_over_row|Remo inclinado con dos mancuernas|Bent-over two-dumbbell row|back|dumbbell|lats,upper_back|traps_mid,delt_rear,biceps,lower_back
band_pull_apart|Apertura con banda|Band pull-apart|shoulders|other|delt_rear|upper_back,traps_mid
superman|Superman|Superman|back|bodyweight|lower_back|glute_max,hamstrings,delt_rear
deficit_deadlift|Peso muerto con déficit|Deficit deadlift|back|barbell|lower_back,glute_max,hamstrings|quads,traps_upper,lats,forearm
leverage_high_row|Remo alto en máquina|Machine high row|back|machine|upper_back,lats|traps_mid,delt_rear,biceps
cable_shrug|Encogimientos en polea|Cable shrug|back|cable|traps_upper|traps_mid,forearm
weighted_pull_up|Dominadas lastradas|Weighted pull-up|back|bodyweight|lats|upper_back,traps_mid,biceps,forearm
seated_barbell_press|Press militar sentado con barra|Seated barbell shoulder press|shoulders|barbell|delt_front|delt_side,triceps,chest_upper,traps_upper
cable_shoulder_press|Press de hombros en polea|Cable shoulder press|shoulders|cable|delt_front|delt_side,triceps,traps_upper
standing_db_press|Press de hombros de pie con mancuernas|Standing dumbbell shoulder press|shoulders|dumbbell|delt_front|delt_side,triceps,traps_upper,abs
one_arm_shoulder_press|Press de hombros con una mancuerna|One-arm dumbbell shoulder press|shoulders|dumbbell|delt_front|delt_side,triceps,obliques|u
plate_front_raise|Elevaciones frontales con disco|Plate front raise|shoulders|other|delt_front|delt_side,chest_upper
one_arm_lateral_raise|Elevación lateral a una mano|One-arm lateral raise|shoulders|dumbbell|delt_side|delt_front,traps_upper|u
seated_lateral_raise|Elevaciones laterales sentado|Seated lateral raise|shoulders|dumbbell|delt_side|delt_front,traps_upper
seated_rear_delt_raise|Pájaros sentado inclinado|Seated bent-over rear delt raise|shoulders|dumbbell|delt_rear|upper_back,traps_mid,delt_side
cable_rope_rear_row|Remo a la cara con cuerda en polea|Cable rope rear-delt row|shoulders|cable|delt_rear|upper_back,traps_mid,biceps
db_scaption|Elevación en escaución con mancuernas|Dumbbell scaption|shoulders|dumbbell|delt_front|delt_side,traps_upper
upright_cable_row|Remo al mentón en polea|Upright cable row|shoulders|cable|delt_side|traps_upper,delt_front,biceps
db_upright_row|Remo al mentón con mancuernas|Dumbbell upright row|shoulders|dumbbell|delt_side|traps_upper,delt_front,biceps
cable_preacher_curl|Curl predicador en polea|Cable preacher curl|biceps|cable|biceps|forearm
seated_db_curl|Curl sentado con mancuernas|Seated dumbbell curl|biceps|dumbbell|biceps|forearm
inner_biceps_curl|Curl con mancuernas agarre interno|Standing inner-biceps curl|biceps|dumbbell|biceps|forearm
lying_cable_curl|Curl tumbado en polea|Lying cable curl|biceps|cable|biceps|forearm
overhead_cable_curl|Curl con polea sobre la cabeza|Overhead cable curl|biceps|cable|biceps|forearm
wide_grip_curl|Curl con barra agarre ancho|Wide-grip barbell curl|biceps|barbell|biceps|forearm
close_grip_ez_curl|Curl con barra Z agarre cerrado|Close-grip EZ-bar curl|biceps|barbell|biceps|forearm
cross_body_hammer_curl|Curl martillo cruzado|Cross-body hammer curl|biceps|dumbbell|biceps,forearm|
incline_hammer_curl|Curl martillo inclinado|Incline hammer curl|biceps|dumbbell|biceps,forearm|
drag_curl|Curl arrastrado|Drag curl|biceps|barbell|biceps|delt_rear,forearm
machine_biceps_curl|Curl de bíceps en máquina|Machine biceps curl|biceps|machine|biceps|forearm
reverse_grip_pushdown|Extensión de tríceps agarre supino en polea|Reverse-grip triceps pushdown|triceps|cable|triceps|forearm
low_cable_triceps_ext|Extensión de tríceps en polea baja|Low cable triceps extension|triceps|cable|triceps|forearm
kneeling_cable_triceps|Extensión de tríceps de rodillas en polea|Kneeling cable triceps extension|triceps|cable|triceps|forearm
decline_ez_triceps|Press francés declinado con barra Z|Decline EZ-bar triceps extension|triceps|barbell|triceps|forearm,delt_front
incline_triceps_ext|Press francés inclinado con barra|Incline barbell triceps extension|triceps|barbell|triceps|forearm,delt_front
seated_triceps_press|Press de tríceps sentado con mancuerna|Seated triceps press|triceps|dumbbell|triceps|forearm
jm_press|JM press|JM press|triceps|barbell|triceps|chest_mid,delt_front
tate_press|Tate press|Tate press|triceps|dumbbell|triceps|chest_mid,delt_front
seated_wrist_curl|Curl de muñeca sentado con mancuernas|Seated dumbbell wrist curl|forearms|dumbbell|forearm|
cable_wrist_curl|Curl de muñeca en polea|Cable wrist curl|forearms|cable|forearm|
wrist_roller|Rodillo de muñeca|Wrist roller|forearms|other|forearm|delt_front
sit_up|Abdominales (sit-up)|Sit-up|core|bodyweight|abs|obliques
reverse_crunch|Crunch inverso|Reverse crunch|core|bodyweight|abs|obliques
dead_bug|Bicho muerto|Dead bug|core|bodyweight|abs|obliques
hanging_pike|Elevación de piernas en pica colgado|Hanging pike|core|bodyweight|abs|obliques,forearm
oblique_crunch|Crunch oblicuo|Oblique crunch|core|bodyweight|obliques|abs
db_side_bend|Inclinación lateral con mancuerna|Dumbbell side bend|core|dumbbell|obliques|abs,forearm
cable_russian_twist|Giro ruso en polea|Cable Russian twist|core|cable|obliques|abs
rope_crunch|Crunch con cuerda en polea de pie|Standing rope crunch|core|cable|abs|obliques
zercher_squat|Sentadilla Zercher|Zercher squat|quads|barbell|quads,glute_max|adductors,hamstrings,lower_back,abs
box_squat|Sentadilla al cajón|Box squat|quads|barbell|quads,glute_max|adductors,hamstrings,lower_back
db_squat|Sentadilla con mancuernas|Dumbbell squat|quads|dumbbell|quads,glute_max|adductors,hamstrings,lower_back,forearm
plie_squat|Sentadilla sumo con mancuerna|Plié dumbbell squat|quads|dumbbell|quads,adductors,glute_max|hamstrings
narrow_leg_press|Prensa con pies juntos|Narrow-stance leg press|quads|machine|quads|glute_max,adductors
smith_split_squat|Sentadilla dividida en multipower|Smith machine split squat|quads|smith|quads,glute_max|adductors,hamstrings,glute_med|u
barbell_lunge|Zancadas con barra|Barbell lunge|quads|barbell|quads,glute_max|hamstrings,adductors,glute_med
split_squat|Sentadilla dividida|Split squat|quads|dumbbell|quads,glute_max|adductors,hamstrings,glute_med|u
wide_stance_squat|Sentadilla con postura ancha|Wide-stance squat|quads|barbell|quads,glute_max,adductors|hamstrings,lower_back
lying_machine_squat|Sentadilla tumbada en máquina|Lying machine squat|quads|machine|quads,glute_max|hamstrings,adductors
leverage_deadlift|Peso muerto en máquina|Machine deadlift|back|machine|glute_max,hamstrings,lower_back|quads,traps_upper,forearm
glute_ham_raise|Elevación glúteo-isquio|Glute-ham raise|hamstrings|machine|hamstrings|glute_max,lower_back,calves
reverse_hyperextension|Hiperextensión inversa|Reverse hyperextension|glutes|machine|glute_max|hamstrings,lower_back
standing_leg_curl|Curl femoral de pie|Standing leg curl|hamstrings|machine|hamstrings|calves|u
barbell_glute_bridge|Puente de glúteo con barra|Barbell glute bridge|glutes|barbell|glute_max|hamstrings,glute_med,quads
standing_barbell_calf_raise|Gemelos de pie con barra|Standing barbell calf raise|calves|barbell|calves|
standing_db_calf_raise|Gemelos de pie con mancuernas|Standing dumbbell calf raise|calves|dumbbell|calves|
barbell_seated_calf_raise|Gemelos sentado con barra|Barbell seated calf raise|calves|barbell|calves|
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
