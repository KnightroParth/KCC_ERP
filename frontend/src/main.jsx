import { createRoot } from 'react-dom/client';

import RootApp from './RootApp';

// Fade out the static splash before React takes over
const splash = document.getElementById('kcc-splash');
if (splash) {
  splash.classList.add('kcc-done');
  setTimeout(() => {
    const root = createRoot(document.getElementById('root'));
    root.render(<RootApp />);
  }, 350); // matches the CSS transition duration
} else {
  const root = createRoot(document.getElementById('root'));
  root.render(<RootApp />);
}
