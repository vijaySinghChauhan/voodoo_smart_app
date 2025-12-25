import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.web';

const rootEl = document.getElementById('root')!;
const root = createRoot(rootEl);

root.render(<App />);