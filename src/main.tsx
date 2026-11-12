import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ensureCatalog } from './data/db';
import './styles.css';

ensureCatalog().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
