import './globals.css';
export const metadata = {
 title:'Gestor de Torneos',
 description:'Programación, resultados, cuadro y administración para torneos deportivos.',
 openGraph:{title:'Gestor de Torneos',description:'Seguí la programación y los resultados del torneo.',type:'website',locale:'es_PY'},
 twitter:{card:'summary',title:'Gestor de Torneos',description:'Programación y resultados del torneo.'}
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="es"><body>{children}</body></html>; }
