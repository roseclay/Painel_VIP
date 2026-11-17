function SecaoUsuarios({ dados, carregando, aoAbrirLaboratorio }) {
  if (carregando && !dados?.usuarios) return <EstadoVazio titulo="Carregando usuários…" />;
  if (!dados?.usuarios?.length) return <EstadoVazio titulo="Nenhum usuário encontrado" descricao="Tente remover um dos filtros ou buscar outro nome." />;

  const perfilBase = VIP_CONFIG.observatorioBase.replace(/\/$/, '');
  const fotosBase = (VIP_CONFIG.observatorioFotosBase || perfilBase).replace(/\/$/, '');
  const rotuloFonte = (fonte) => fonte === 'vip+pnipe' ? 'VIP + PNIPE' : String(fonte || '').toUpperCase();
  const iniciais = (nome) => String(nome || '').split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();

  return (
    <section>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#57269b]">Painel 5</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Usuários</h2>
        <p className="mt-1 text-sm text-slate-500">Pessoas vinculadas aos laboratórios do VIP e do PNIPE, com identificação de usuários e coordenadores.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Coordenadores', dados.kpi?.coordenadores], ['Usuários', dados.kpi?.usuarios],
            ['Laboratórios vinculados', dados.kpi?.laboratorios], ['Instituições', dados.kpi?.instituicoes],
          ].map(([rotulo, total]) => <div key={rotulo} className="rounded-xl bg-slate-50 px-3 py-2.5"><strong className="block text-xl text-slate-900">{Obs.formato.numero(total || 0)}</strong><span className="text-xs text-slate-500">{rotulo}</span></div>)}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600"><strong className="text-slate-900">{Obs.formato.numero(dados.total)}</strong> pessoas encontradas</p>
        {carregando && <span className="text-xs font-medium text-[#57269b]">Atualizando…</span>}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {dados.usuarios.map((usuario) => {
          const perfilUrl = usuario.pesquisador_lattes_id ? `${perfilBase}/researcher?lattes_id=${encodeURIComponent(usuario.pesquisador_lattes_id)}` : null;
          const fotoUrl = usuario.pesquisador_foto ? `${fotosBase}/${usuario.pesquisador_foto.replace(/^\//, '')}` : null;
          const labs = usuario.laboratorios || [];
          return <article key={usuario.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#57269b] to-[#087f8c] text-base font-black text-white">
                {fotoUrl ? <img src={fotoUrl} alt="" className="h-full w-full object-cover" onError={(e) => e.currentTarget.remove()} /> : iniciais(usuario.nome)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${usuario.papel === 'coordenador' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{usuario.papel === 'coordenador' ? 'Coordenador(a)' : 'Usuário(a)'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{rotuloFonte(usuario.fonte)}</span>
                </div>
                <h3 className="mt-1.5 text-lg font-bold leading-tight text-slate-900">{usuario.nome}</h3>
                <p className="mt-1 text-sm font-semibold text-[#57269b]">{(usuario.instituicoes || []).map((i) => i.sigla).join(' · ')}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Laboratórios vinculados ({labs.length})</p>
              {labs.length ? <ul className="mt-2 space-y-1.5">{labs.slice(0, 4).map((lab) => <li key={`${lab.fonte}:${lab.id}`}>
                <button type="button" onClick={() => aoAbrirLaboratorio?.(lab)} className="flex w-full items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-purple-50 hover:text-[#57269b]">
                  <span className="min-w-0 flex-1 leading-snug">{lab.nome}</span><span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{lab.fonte}</span>
                </button>
              </li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nenhum laboratório específico informado na base.</p>}
              {labs.length > 4 && <p className="mt-2 text-xs font-medium text-slate-500">+ {labs.length - 4} laboratório(s)</p>}
            </div>

            {perfilUrl && <a href={perfilUrl} className="mt-4 inline-flex items-center rounded-xl border border-[#57269b] px-3 py-2 text-xs font-bold text-[#57269b] hover:bg-purple-50">Ver perfil no Observatório ↗</a>}
          </article>;
        })}
      </div>
    </section>
  );
}
