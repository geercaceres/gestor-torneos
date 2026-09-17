import './globals.css';
export const metadata = {
 title:'Tournament Manager',
 description:'Schedules, results, brackets, and administration for sports tournaments.',
 openGraph:{title:'Tournament Manager',description:'Follow the tournament schedule and results.',type:'website',locale:'en_US'},
 twitter:{card:'summary',title:'Tournament Manager',description:'Tournament schedules and results.'}
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
