// Chip de tabela: bolinha da cor do domínio + nome + nº de registros. Clicável.
function ChipTabela({ nome, linhas, aoAbrir }) {
  const dominio = Obs.esquema.dominioDe(nome);
  return (
    <button
      type="button"
      onClick={() => aoAbrir(nome)}
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-sm hover:border-blue-600"
      title={dominio.nome}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dominio.cor }} />
      <span className="truncate font-medium text-slate-800">{nome}</span>
      {linhas !== undefined && <span className="shrink-0 text-xs tabular-nums text-slate-500">{Obs.formato.numero(linhas)}</span>}
    </button>
  );
}

// Um nó da árvore e, recursivamente, as tabelas que dependem dele.
function NoArvore({ nome, mapa, aoAbrir }) {
  const filhos = mapa.filhosNaArvore[nome] || [];
  const coluna = mapa.colunaDoPai(nome);
  const outros = mapa.outrosPais(nome);
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
        <ChipTabela nome={nome} linhas={mapa.porNome[nome].linhas} aoAbrir={aoAbrir} />
        {coluna && <span className="text-xs text-slate-500">via <code className="text-slate-600">{coluna}</code></span>}
        {outros.length > 0 && <span className="text-xs text-slate-400">também depende de {outros.join(', ')}</span>}
      </div>
      {filhos.length > 0 && (
        <ul className="ml-3 border-l border-slate-200 pl-4">
          {filhos.map((f) => (
            <NoArvore key={f} nome={f} mapa={mapa} aoAbrir={aoAbrir} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ArvoreHierarquia({ mapa, aoAbrir }) {
  return (
    <div className="space-y-5">
      {mapa.raizes.map((r) => (
        <ul key={r}>
          <NoArvore nome={r} mapa={mapa} aoAbrir={aoAbrir} />
        </ul>
      ))}
    </div>
  );
}
