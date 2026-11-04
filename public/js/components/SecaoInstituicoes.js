function SecaoInstituicoes({ dados, carregando, aoSelecionar }) {
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
          {item.areas.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.areas.map((area) => <span key={area} className="rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-800">{area}</span>)}</div>}
        </article>)}
      </div> : <EstadoVazio titulo="Nenhuma instituição encontrada." descricao="Tente remover algum filtro para ampliar a consulta." />}
    </section>
  );
}
