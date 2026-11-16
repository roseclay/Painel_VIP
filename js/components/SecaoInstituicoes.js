function MiniGraficoGrandesAreas({ instituicao, temas, aoSelecionar }) {
  if (!temas?.length) return <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Não há grandes áreas classificadas para os laboratórios desta instituição.</p>;
  const maximo = Math.max(...temas.map((tema) => tema.total), 1);
  return <div className="mt-4 border-t border-slate-100 pt-4">
    <div className="mb-2 flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-slate-800">Laboratórios por grande área</h4><span className="text-[11px] text-slate-400">Clique para explorar</span></div>
    <div className="space-y-1.5">{temas.map((tema) => <button key={tema.valor} type="button" onClick={() => aoSelecionar(instituicao, tema.valor)}
      aria-label={`${tema.rotulo}: ${tema.total} laboratórios em ${instituicao}`}
      className="group grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200">
      <span className="min-w-0"><span className="block truncate text-xs font-medium text-slate-700 group-hover:text-[#57269b]">{tema.rotulo}</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-gradient-to-r from-[#57269b] to-[#087f8c]" style={{ width: `${Math.max(7, (tema.total / maximo) * 100)}%` }} /></span></span>
      <strong className="text-right text-sm text-slate-900">{Obs.formato.numero(tema.total)}</strong>
    </button>)}</div>
  </div>;
}

function SecaoInstituicoes({ dados, carregando, aoSelecionar, aoSelecionarArea }) {
  if (carregando && !dados) return <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Organizando as instituições…</div>;
  if (!dados) return null;
  return (
    <section className={`space-y-5 transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`} aria-busy={carregando}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#57269b]">Painel 3</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Instituições</h2>
        <p className="mt-1 text-sm text-slate-500">Compare a infraestrutura, a presença territorial e as áreas de atuação registradas no VIP e no PNIPE.</p>
      </div>
      {dados.instituicoes.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {dados.instituicoes.map((item) => <article key={item.sigla} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div><span className="inline-flex rounded-xl bg-gradient-to-br from-[#57269b] to-[#087f8c] px-3 py-2 text-sm font-black text-white">{item.sigla}</span>
              <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">{item.nome}</h3></div>
            <button type="button" onClick={() => aoSelecionar(item.sigla)} className="text-sm font-bold text-[#57269b] hover:underline">Ver itens →</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Laboratórios</p><p className="text-xl font-bold text-slate-900">{Obs.formato.numero(item.laboratorios)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Equipamentos</p><p className="text-xl font-bold text-slate-900">{Obs.formato.numero(item.equipamentos)}</p></div>
          </div>
          <p className="mt-3 text-xs text-slate-500">{item.vip} registros VIP · {item.pnipe} registros PNIPE · {item.cidades.length} cidade(s)</p>
          <MiniGraficoGrandesAreas instituicao={item.sigla} temas={item.temas} aoSelecionar={aoSelecionarArea} />
        </article>)}
      </div> : <EstadoVazio titulo="Nenhuma instituição encontrada." descricao="Tente remover algum filtro para ampliar a consulta." />}
    </section>
  );
}
