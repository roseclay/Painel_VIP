function Selo({ children, classe }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${classe}`}>{children}</span>;
}

// Janela com a estrutura de uma tabela: colunas, chaves e relações com as outras tabelas.
function DetalheTabela({ nome, mapa, aoAbrir, aoFechar }) {
  const { useEffect } = React;
  const tabela = mapa.porNome[nome];
  const dominio = Obs.esquema.dominioDe(nome);
  const referencia = mapa.referencia(nome);
  const referenciadaPor = mapa.referenciadaPor(nome);

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const celula = 'border-b border-slate-200 px-2 py-1.5';
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-all text-xl font-bold text-slate-900">{nome}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dominio.cor }} />
              {dominio.nome} · {Obs.formato.plural(tabela.linhas, 'registro', 'registros')} · {Obs.formato.plural(tabela.colunas.length, 'coluna', 'colunas')} · nível {mapa.nivel[nome]}
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={aoFechar} className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-lg hover:bg-slate-200">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Depende de ({referencia.length})</h5>
            {referencia.length ? (
              <ul className="space-y-1.5">
                {referencia.map((r) => (
                  <li key={r.restricao + r.coluna} className="flex flex-wrap items-center gap-2 text-sm">
                    <ChipTabela nome={r.pai} aoAbrir={aoAbrir} />
                    <span className="text-xs text-slate-500"><code>{r.coluna}</code> → <code>{r.colunaPai}</code></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Não referencia nenhuma tabela.</p>
            )}
          </div>
          <div>
            <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Referenciada por ({referenciadaPor.length})</h5>
            {referenciadaPor.length ? (
              <ul className="space-y-1.5">
                {referenciadaPor.map((r) => (
                  <li key={r.restricao + r.coluna} className="flex flex-wrap items-center gap-2 text-sm">
                    <ChipTabela nome={r.filha} aoAbrir={aoAbrir} />
                    <span className="text-xs text-slate-500"><code>{r.coluna}</code> → <code>{r.colunaPai}</code></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma tabela depende desta.</p>
            )}
          </div>
        </div>

        <h5 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Colunas</h5>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-slate-500">
                {['Coluna', 'Tipo', 'Nulo', 'Chave', 'Referência'].map((h) => (
                  <th key={h} className="border-b border-slate-200 px-2 py-1.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.colunas.map((c) => (
                <tr key={c.nome} className="align-top">
                  <td className={`${celula} font-medium text-slate-800`}>{c.nome}</td>
                  <td className={`${celula} text-slate-600`}>{c.tipo}</td>
                  <td className={`${celula} text-slate-500`}>{c.nulo ? 'sim' : 'não'}</td>
                  <td className={celula}>
                    <span className="flex gap-1">
                      {c.pk && <Selo classe="bg-amber-100 text-amber-800">PK</Selo>}
                      {c.fk && <Selo classe="bg-blue-100 text-blue-800">FK</Selo>}
                      {c.identity && <Selo classe="bg-slate-100 text-slate-600">auto</Selo>}
                    </span>
                  </td>
                  <td className={celula}>
                    {c.fk && (
                      <button type="button" onClick={() => aoAbrir(c.fk.tabela)} className="text-left text-blue-700 hover:underline">
                        {c.fk.tabela}.{c.fk.coluna}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
