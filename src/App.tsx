import { BarChart3, CalendarDays, Dumbbell, History, User } from 'lucide-react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider, useT } from './lib/settings';
import { DayScreen } from './screens/DayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { KpiScreen } from './screens/KpiScreen';
import { MesocycleHistoryScreen } from './screens/MesocycleHistoryScreen';
import { MesocycleWizard } from './screens/MesocycleWizard';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TrainScreen } from './screens/TrainScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';

function Shell() {
  const t = useT();
  const { pathname } = useLocation();
  // Durante el entreno se oculta la navegación para dejar toda la pantalla al registro.
  const hideTabs = pathname.startsWith('/workout/') || pathname.startsWith('/meso/new');
  return (
    <div className={`app${hideTabs ? '' : ' with-tabs'}`}>
      <Routes>
        <Route path="/" element={<RoutineScreen />} />
        <Route path="/meso/new" element={<MesocycleWizard />} />
        <Route path="/day/:dayId" element={<DayScreen />} />
        <Route path="/train" element={<TrainScreen />} />
        <Route path="/workout/:workoutId" element={<WorkoutScreen />} />
        <Route path="/summary/:workoutId" element={<SummaryScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history/:mesocycleId" element={<MesocycleHistoryScreen />} />
        <Route path="/kpis" element={<KpiScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<RoutineScreen />} />
      </Routes>
      {!hideTabs && (
        <div className="tabbar">
          <nav>
            <NavLink to="/" end>
              <CalendarDays />
              {t('tabRoutine')}
            </NavLink>
            <NavLink to="/train">
              <Dumbbell />
              {t('tabTrain')}
            </NavLink>
            <NavLink to="/history">
              <History />
              {t('tabHistory')}
            </NavLink>
            <NavLink to="/kpis">
              <BarChart3 />
              {t('tabKpis')}
            </NavLink>
            <NavLink to="/profile">
              <User />
              {t('tabProfile')}
            </NavLink>
          </nav>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </SettingsProvider>
  );
}
