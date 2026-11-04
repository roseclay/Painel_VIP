function MapaVitrine({ pontos }) {
  const { useEffect, useRef } = React;
  const elemento = useRef(null);
  const mapa = useRef(null);

  useEffect(() => {
    if (!elemento.current || !window.L) return undefined;
    if (mapa.current) mapa.current.remove();
    const instancia = L.map(elemento.current, { scrollWheelZoom: false }).setView([-12.7, -41.7], 6);
    mapa.current = instancia;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(instancia);
    const limites = [];
    pontos.forEach((ponto) => {
      const posicao = [ponto.latitude, ponto.longitude];
      limites.push(posicao);
      L.circleMarker(posicao, {
        radius: Math.min(13, 6 + Math.log2(Math.max(1, ponto.total))),
        color: ponto.fonte === 'vip' ? '#57269b' : '#087f8c',
        fillOpacity: 0.75,
        weight: 1.5,
      }).addTo(instancia).bindPopup(`<strong>${String(ponto.nome).replace(/[<>]/g, '')}</strong><br>${ponto.instituicao} · ${ponto.total} registro(s) · ${ponto.fonte.toUpperCase()}`);
    });
    if (limites.length) instancia.fitBounds(limites, { padding: [24, 24], maxZoom: 12 });
    window.setTimeout(() => instancia.invalidateSize(), 50);
    return () => { instancia.remove(); mapa.current = null; };
  }, [pontos]);

  if (!window.L) return <EstadoVazio titulo="Mapa indisponível." descricao="Não foi possível carregar a biblioteca cartográfica." />;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
        <div><h2 className="text-xl font-bold text-slate-900">Distribuição territorial</h2><p className="mt-1 text-sm text-slate-500">{pontos.length} registros com coordenadas geográficas, atualizados conforme os filtros.</p></div>
        <div className="flex gap-3 text-xs"><span className="font-semibold text-[#57269b]">● VIP</span><span className="font-semibold text-[#087f8c]">● PNIPE</span></div>
      </div>
      <div ref={elemento} className="h-[32rem] w-full bg-slate-100" role="img" aria-label="Mapa da distribuição dos laboratórios e equipamentos" />
    </section>
  );
}
