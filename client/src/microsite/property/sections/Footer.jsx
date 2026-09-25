export default function Footer({ property: p, data = {}, theme }) {
  return (
    <footer className="px-6 py-12 text-center text-sm" style={{ background: theme.primaryColor, color: 'rgba(255,255,255,0.7)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-lg font-semibold text-white">{data.text || p.title}</div>
        <div>{[p.locality, p.city].filter(Boolean).join(', ')}</div>
        <div className="mx-auto mt-5 h-px w-16" style={{ background: `${theme.secondaryColor}55` }} />
        <div className="mt-5 text-xs opacity-70">Powered by RNI Real Estates</div>
      </div>
    </footer>
  );
}
