export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {
    fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
    colors: { ink: '#0B1030', brand: '#3B5BFF', violet: '#7C4DFF', mint: '#14B87E', lav: '#F3F2FF',
      muted: 'var(--muted)', brandfg: 'var(--brandfg)', mintfg: 'var(--mintfg)', amberfg: 'var(--amberfg)', redfg: 'var(--redfg)', cyanfg: 'var(--cyanfg)', skyfg: 'var(--skyfg)', violetfg: 'var(--violetfg)',
      mintfill: 'var(--mintfill)', amberfill: 'var(--amberfill)', redfill: 'var(--redfill)' } } },
  plugins: [],
}
