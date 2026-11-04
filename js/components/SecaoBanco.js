function SecaoBanco() {
  const { useState, useEffect, useMemo } = React;
  const F = Obs.formato;
  const [esquema, setEsquema] = useState(null);
  const [erro, setErro] = useState(null);
  const [aberta, setAberta] = useState(null);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('estrutura');
  // Ligação da árvore com os campos do PNIPE (dicionário vem de /api/pnipe, carregado sob demanda).
  const [ligarPnipe, setLigarPnipe] = useState(true);
  const [dicionario, setDicionario] = useState(null);
  const [erroPnipe, setErroPnipe] = useState(null);

  useEffect(() => {
    Obs.api.obter('/api/esquema').then(setEsquema).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!ligarPnipe || dicionario || erroPnipe) return;
    Obs.api.obter('/api/pnipe').then((d) => setDicionario(d.dicionario)).catch((e) => setErroPnipe(e.message));
  }, [ligarPnipe, dicionario, erroPnipe]);

  const mapa = useMemo(() => (esquema ? Obs.esquema.montar(esquema) : null), [esquema]);

  if (erro) return <EstadoVazio titulo="Não foi possível carregar a estrutura do banco." descricao={erro} />;
  if (!mapa) return <p className="text-sm text-slate-500">Carregando estrutura do banco…</p>;

  // Abre o detalhe só de tabelas que existem no banco (a correlação pode citar nomes compostos).
  const abrirTabela = (nome) => mapa.porNome[nome] && setAberta(nome);
  const abas = [
    { chave: 'estrutura', rotulo: 'Estrutura do VIP' },
    { chave: 'pnipe', rotulo: 'Correlação VIP × PNIPE' },
  ];
  const seletorAbas = (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-flex" role="tablist">
      {abas.map((a) => (
        <button
          key={a.chave}
          type="button"
          role="tab"
          aria-selected={aba === a.chave}
          onClick={() => setAba(a.chave)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${aba === a.chave ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );

  if (aba === 'pnipe') {
    return (
      <div className="space-y-6">
        {seletorAbas}
        <CorrelacaoPnipe aoAbrirTabela={abrirTabela} />
        {aberta && <DetalheTabela nome={aberta} mapa={mapa} aoAbrir={setAberta} aoFechar={() => setAberta(null)} />}
      </div>
    );
  }

  const tabelas = esquema.tabelas;
  const indicadores = [
    { rotulo: 'Tabelas', valor: F.numero(tabelas.length) },
    { rotulo: 'Colunas', valor: F.numero(tabelas.reduce((s, t) => s + t.colunas.length, 0)) },
    { rotulo: 'Relacionamentos', valor: F.numero(esquema.relacionamentos.length) },
    { rotulo: 'Registros', valor: F.numero(tabelas.reduce((s, t) => s + t.linhas, 0)) },
    { rotulo: 'Views', valor: F.numero(esquema.views.length) },
  ];

  const termo = busca.trim().toLowerCase();
  const visiveis = tabelas.filter(
    (t) => !termo || t.nome.toLowerCase().includes(termo) || t.colunas.some((c) => c.nome.toLowerCase().includes(termo)),
  );

  return (
    <div className="space-y-6">
      {seletorAbas}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{i.rotulo}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{i.valor}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-600">
        {Obs.esquema.DOMINIOS.map((d) => (
          <span key={d.chave} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
            {d.nome}
          </span>
        ))}
        <span className="text-slate-400">· o número ao lado do nome é a quantidade de registros; clique numa tabela para ver os detalhes</span>
      </div>

      <div>
        <TituloGrupo>Hierarquia</TituloGrupo>
        <Cartao
          titulo="Árvore de dependências"
          descricao={
            ligarPnipe
              ? 'Cada tabela aparece abaixo daquela de que mais depende. Sob cada tabela, as colunas que têm par no PNIPE; a linha leva ao campo correspondente.'
              : 'Cada tabela aparece abaixo daquela de que mais depende. Ex.: instituição → campus → local → espaço físico → equipamento.'
          }
          nota="As ligações com a tabela de usuários (quem criou ou alterou cada registro) ficam fora da árvore; aparecem no detalhe de cada tabela."
          acoes={
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={ligarPnipe} onChange={(e) => setLigarPnipe(e.target.checked)} className="h-4 w-4 accent-slate-800" />
              Ligar ao PNIPE
            </label>
          }
        >
          {ligarPnipe && erroPnipe && (
            <p className="mb-3 text-sm text-red-700">Não foi possível carregar os campos do PNIPE: {erroPnipe}</p>
          )}
          {ligarPnipe && dicionario ? (
            <ArvoreComPnipe mapa={mapa} aoAbrir={setAberta} dicionario={dicionario} />
          ) : (
            <ArvoreHierarquia mapa={mapa} aoAbrir={setAberta} />
          )}
        </Cartao>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <Cartao titulo="Níveis de dependência" descricao="Nível 0 não depende de nenhuma tabela; cada nível seguinte depende de um anterior.">
          <div className="space-y-3">
            {mapa.niveis.map((lista, n) => (
              <div key={n} className="flex gap-3">
                <span className="mt-1 w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">Nível {n}</span>
                <div className="flex flex-wrap gap-1.5">
                  {lista.map((t) => (
                    <ChipTabela key={t} nome={t} aoAbrir={setAberta} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo="Views" descricao="Consultas salvas no banco e as tabelas que elas leem.">
            {esquema.views.length ? (
              <ul className="space-y-3">
                {esquema.views.map((v) => (
                  <li key={v.nome}>
                    <p className="text-sm font-medium text-slate-800">{v.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {v.tabelas.map((t) => (
                        <ChipTabela key={t} nome={t} aoAbrir={setAberta} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVazio titulo="Nenhuma view cadastrada." />
            )}
          </Cartao>

          {(mapa.isoladas.length > 0 || mapa.referenciadasApenas.length > 0) && (
            <Cartao titulo="Tabelas de apoio" descricao="Tabelas que não entram na árvore.">
              {mapa.referenciadasApenas.length > 0 && (
                <>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Cadastros de domínio (só são consultados por outras tabelas)</p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {mapa.referenciadasApenas.map((t) => (
                      <ChipTabela key={t} nome={t} linhas={mapa.porNome[t].linhas} aoAbrir={setAberta} />
                    ))}
                  </div>
                </>
              )}
              {mapa.isoladas.length > 0 && (
                <>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Sem relacionamentos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mapa.isoladas.map((t) => (
                      <ChipTabela key={t} nome={t} linhas={mapa.porNome[t].linhas} aoAbrir={setAberta} />
                    ))}
                  </div>
                </>
              )}
            </Cartao>
          )}
        </div>
      </div>

      <div>
        <TituloGrupo>Tabelas por domínio</TituloGrupo>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tabela ou coluna…"
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        {Obs.esquema.DOMINIOS.map((d) => {
          const doDominio = visiveis.filter((t) => Obs.esquema.dominioDe(t.nome) === d);
          if (!doDominio.length) return null;
          return (
            <div key={d.chave} className="mb-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
                {d.nome}
                <span className="font-normal text-slate-400">({doDominio.length})</span>
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {doDominio.map((t) => {
                  const fks = t.colunas.filter((c) => c.fk).length;
                  return (
                    <button
                      key={t.nome}
                      type="button"
                      onClick={() => setAberta(t.nome)}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 text-left hover:border-blue-600"
                    >
                      <p className="break-all text-sm font-semibold text-slate-900">{t.nome}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {F.plural(t.linhas, 'registro', 'registros')} · {F.plural(t.colunas.length, 'coluna', 'colunas')} · {F.plural(fks, 'chave estrangeira', 'chaves estrangeiras')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!visiveis.length && <EstadoVazio titulo="Nenhuma tabela encontrada." />}
      </div>

      {aberta && <DetalheTabela nome={aberta} mapa={mapa} aoAbrir={setAberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}
