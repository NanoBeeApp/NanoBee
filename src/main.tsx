// App entry: mounts the React tree and loads the design-system styles.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens/fonts.css';
import './styles/tokens/colors.css';
import './styles/tokens/typography.css';
import './styles/tokens/effects.css';
import './styles/base.css';
import './styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
