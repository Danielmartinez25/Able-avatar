import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TotemApp } from './TotemApp';
import './totem.css';

createRoot(document.getElementById('root')!).render(<StrictMode><TotemApp/></StrictMode>);
