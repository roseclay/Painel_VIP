function SecaoLocalizacao({ resumo, aoAbrirLocal }) {
  const F = Obs.formato;
  return (
    <div className="space-y-6">
      <Indicadores kpi={resumo.kpi} />
      <div>
        <TituloGrupo>Locais</TituloGrupo>
        {resumo.porLocal.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {resumo.porLocal.map((l) => {
              const endereco = [l.endereco, l.bairro].filter(Boolean).join(', ');
              const cidade = [l.cidade, l.estado].filter(Boolean).join(' - ');
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => aoAbrirLocal(l.id)}
                  className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-600"
                >
                  <h4 className="text-[15px] font-semibold text-slate-900">{l.nome}</h4>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {l.instituicao} · {l.campus}
                  </p>
                  <p className="text-[13px] text-slate-500">📍 {[endereco, cidade].filter(Boolean).join(' · ')}</p>
                  <div className="mt-3 flex gap-5">
                    <div>
                      <p className="text-xl font-semibold text-slate-900">{F.numero(l.total)}</p>
                      <p className="text-xs text-slate-500">laboratórios</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-slate-900">{F.numero(l.equipamentos)}</p>
                      <p className="text-xs text-slate-500">equipamentos</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EstadoVazio titulo="Sem dados para os filtros selecionados." />
        )}
      </div>
    </div>
  );
}
