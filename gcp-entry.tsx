import {createRoot} from 'react-dom/client';
import {lazy,Suspense} from 'react';
import Home from './app/page';
import './app/globals.css';
const Admin=lazy(()=>import('./app/admin/page'));
const isAdmin=window.location.pathname.startsWith('/admin')||window.location.pathname.startsWith('/caja');
createRoot(document.getElementById('root')!).render(isAdmin?<Suspense fallback={<main className="loading-panel">Cargando administración…</main>}><Admin/></Suspense>:<Home/>);
