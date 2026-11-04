function SeloFonte({ fonte }) {
  const pnipe = fonte === 'pnipe';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${pnipe ? 'bg-cyan-50 text-cyan-800' : 'bg-purple-50 text-purple-800'}`}>{pnipe ? 'PNIPE' : 'VIP'}</span>;
}

function CartaoVitrine({ item, aoAbrir }) {
  const imagem = item.imagem && <img src={item.imagem} alt="" loading="lazy" className="h-24 w-28 shrink-0 rounded-xl bg-slate-100 object-cover" onError={(e) => e.currentTarget.remove()} />;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
      <div className="flex gap-3">
        {imagem}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><SeloFonte fonte={item.fonte} /><span className="text-xs font-medium text-slate-400">{item.tipo === 'laboratorio' ? 'Laboratório' : 'Equipamento'}</span></div>
          <h3 className="mt-2 line-clamp-3 text-base font-bold leading-snug text-slate-900">{item.nome}</h3>
          <p className="mt-1 text-sm font-semibold text-[#57269b]">{item.instituicao}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.descricao || item.areas || item.tecnicas || item.laboratorio || 'Informações detalhadas disponíveis na ficha.'}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
        {item.cidade && <span className="rounded-full bg-slate-100 px-2 py-1">📍 {item.cidade}</span>}
        {item.compartilhado && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Uso compartilhado</span>}
        {item.equipamentos > 0 && <span className="rounded-full bg-slate-100 px-2 py-1">{item.equipamentos} equipamentos</span>}
        {item.modelo && <span className="rounded-full bg-slate-100 px-2 py-1">{item.modelo}</span>}
      </div>
      <button type="button" onClick={() => aoAbrir(item)} className="mt-auto pt-4 text-left text-sm font-bold text-[#57269b] hover:underline">Ver mais →</button>
    </article>
  );
}

function SecaoVitrine({ dados, carregando, aoAbrir }) {
  if (carregando && !dados) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Organizando a vitrine tecnológica…</div>;
  if (!dados) return null;
  const indicadores = [
    ['Laboratórios', dados.kpi.laboratorios], ['Equipamentos', dados.kpi.equipamentos],
    ['Instituições', dados.kpi.instituicoes], ['Fontes consultadas', dados.kpi.fontes],
  ];
  return (
    <div className={`space-y-5 transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`} aria-busy={carregando}>
      {(dados.avisos || []).map((aviso) => <p key={aviso} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{aviso}</p>)}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(([rotulo, valor]) => <div key={rotulo} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{rotulo}</p><p className="mt-1 text-2xl font-bold text-slate-900">{Obs.formato.numero(valor)}</p></div>)}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-900">Infraestrutura para conhecer e compartilhar</h2><p className="mt-1 text-sm text-slate-500">{Obs.formato.numero(dados.total)} resultados · {Obs.formato.numero(dados.porFonte.vip)} do VIP · {Obs.formato.numero(dados.porFonte.pnipe)} do PNIPE</p></div>
        {dados.exibidos < dados.total && <p className="text-xs text-slate-500">Exibindo os primeiros {dados.exibidos} resultados. Refine os filtros para localizar itens específicos.</p>}
      </div>
      {dados.itens.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{dados.itens.map((item) => <CartaoVitrine key={item.id} item={item} aoAbrir={aoAbrir} />)}</div> : <EstadoVazio titulo="Nenhuma infraestrutura encontrada." descricao="Tente remover algum filtro ou usar outro termo de busca." />}
    </div>
  );
}
