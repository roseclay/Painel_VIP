// Correlação entre o banco do VIP e os dados públicos do PNIPE (MCTI). Dados de /api/pnipe.
const RELACOES_PNIPE = {
  equivalente: { rotulo: 'Equivalente', cor: '#1baf7a' },
  parcial: { rotulo: 'Parcial', cor: '#eda100' },
  so_pnipe: { rotulo: 'Só PNIPE', cor: '#4a3aa7' },
  so_vip: { rotulo: 'Só VIP', cor: '#2a78d6' },
};
const GRAUS_PNIPE = {
  igual: { rotulo: 'Mesmo laboratório', cor: '#1baf7a' },
  centro: { rotulo: 'Centro (localização no VIP)', cor: '#2a78d6' },
  parcial: { rotulo: 'Correspondência parcial', cor: '#eda100' },
  sem: { rotulo: 'Sem correspondência', cor: '#898781' },
};

function Etiqueta({ cor, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      {children}
    </span>
  );
}

// Barrinha de percentual de preenchimento; "—" quando o campo não existe naquele banco.
function Preenchimento({ valor }) {
  if (valor === null || valor === undefined) return <span className="text-slate-300">—</span>;
  const pct = Math.round(valor * 100);
  return (
    <div className="flex items-center gap-2" title={`${pct}% dos registros preenchidos`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: Obs.cores.primaria }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-600">{pct}%</span>
    </div>
  );
}

function CorrelacaoPnipe({ aoAbrirTabela }) {
  const { useState, useEffect } = React;
  const F = Obs.formato;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [entidade, setEntidade] = useState('laboratorio');
  const [relacao, setRelacao] = useState('');

  useEffect(() => {
    Obs.api.obter('/api/pnipe').then(setDados).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <EstadoVazio titulo="Não foi possível carregar a correlação com o PNIPE." descricao={erro} />;
  if (!dados) return <p className="text-sm text-slate-500">Carregando dados do PNIPE…</p>;

  const corr = dados.correspondencias[0];
  const noVip = dados.instituicoes.filter((i) => i.vip);
  const comPar = corr ? corr.itens.filter((i) => i.grau !== 'sem').length : 0;
  const indicadores = [
    { rotulo: 'Instituições do PNIPE no VIP', valor: `${noVip.length} de ${dados.instituicoes.length}` },
    corr && { rotulo: `Laboratórios ${corr.instituicao} no PNIPE`, valor: F.numero(corr.resumo.pnipe.laboratorios) },
    corr && { rotulo: `Laboratórios ${corr.instituicao} no VIP`, valor: F.numero(corr.resumo.vip.laboratorios) },
    corr && { rotulo: 'Labs do PNIPE com par no VIP', valor: `${comPar} de ${corr.itens.length}` },
    corr && { rotulo: 'Equip. do PNIPE com modelo no VIP', valor: `${corr.resumo.equip_com_modelo_no_vip} de ${corr.resumo.pnipe.equipamentos}` },
  ].filter(Boolean);

  const ent = dados.dicionario.entidades.find((e) => e.chave === entidade);
  const campos = ent.campos.filter((c) => !relacao || c.relacao === relacao);
  const contagem = (r) => ent.campos.filter((c) => c.relacao === r).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{i.rotulo}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{i.valor}</p>
          </div>
        ))}
      </div>

      <Cartao
        titulo="Como os dois bancos se encaixam"
        descricao="O PNIPE tem três níveis: instituição, laboratório e equipamento. O VIP detalha mais: entre a instituição e o laboratório há campus e localização."
        nota={`Fonte: ${dados.fonte}. Planilha convertida em ${new Date(dados.gerado_em + 'T12:00:00').toLocaleDateString('pt-BR')}.`}
      >
        <div className="divide-y divide-slate-100">
          {dados.dicionario.entidades.map((e) => (
            <div key={e.chave} className="grid gap-3 py-3 md:grid-cols-[11rem_9rem_minmax(0,1fr)] md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PNIPE</p>
                <p className="text-sm font-medium text-slate-800">{e.pnipe}</p>
              </div>
              <div className="text-xs text-slate-500 md:pt-5">
                <span className="hidden md:inline">⟷ </span>
                {{ instituicao: 'liga pelo CNPJ', laboratorio: 'liga pelo nome (manual)', equipamento: 'liga pelo modelo' }[e.chave]}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">VIP</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {e.vip.map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && <span className="text-slate-400">→</span>}
                      <ChipTabela nome={t} aoAbrir={aoAbrirTabela} />
                    </React.Fragment>
                  ))}
                </div>
                <p className="mt-1.5 text-sm text-slate-500">{e.nota}</p>
              </div>
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao
        titulo="Instituições"
        descricao="As oito instituições do recorte do PNIPE, ligadas ao cadastro do VIP pelo CNPJ."
        nota="PNIPE: os equipamentos entre parênteses são os ativos. VIP: só laboratórios e equipamentos ativos."
      >
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-semibold sm:pl-0">Instituição</th>
                <th className="px-2 py-2 font-semibold">No VIP</th>
                <th className="px-2 py-2 text-right font-semibold">Labs PNIPE</th>
                <th className="px-2 py-2 text-right font-semibold">Equip. PNIPE</th>
                <th className="px-2 py-2 text-right font-semibold">Labs VIP</th>
                <th className="px-4 py-2 text-right font-semibold sm:pr-0">Equip. VIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dados.instituicoes.map((i) => (
                <tr key={i.sigla}>
                  <td className="px-4 py-2 sm:pl-0">
                    <p className="font-medium text-slate-800">{i.sigla}</p>
                    <p className="text-xs text-slate-500">{i.nome}{i.cnpjs.length > 1 ? ` · ${i.cnpjs.length} CNPJs` : ''}</p>
                  </td>
                  <td className="px-2 py-2">
                    {i.vip ? <Etiqueta cor="#1baf7a">Cadastrada</Etiqueta> : <Etiqueta cor="#898781">Não cadastrada</Etiqueta>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{F.numero(i.pnipe.laboratorios)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {F.numero(i.pnipe.equipamentos)} <span className="text-xs text-slate-400">({F.numero(i.pnipe.equipamentos_ativos)})</span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{i.vip ? F.numero(i.vip.laboratorios) : '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums sm:pr-0">{i.vip ? F.numero(i.vip.equipamentos) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao
        titulo="Dicionário de campos"
        descricao="Cada campo publicado pelo PNIPE e a coluna correspondente no VIP, com o percentual de registros preenchidos em cada banco."
        nota="Preenchimento do PNIPE: as 8 instituições do recorte. Preenchimento do VIP: registros ativos. No VIP, ano 1900 e fabricante “Não Informado” contam como vazios."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {dados.dicionario.entidades.map((e) => (
            <button
              key={e.chave}
              type="button"
              onClick={() => setEntidade(e.chave)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                entidade === e.chave ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {e.nome}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
          {Object.entries(RELACOES_PNIPE).map(([chave, r]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setRelacao(relacao === chave ? '' : chave)}
              aria-pressed={relacao === chave}
              className={`rounded-full ${relacao && relacao !== chave ? 'opacity-40' : ''}`}
              title={dados.dicionario.relacoes[chave]}
            >
              <Etiqueta cor={r.cor}>
                {r.rotulo} <span className="tabular-nums text-slate-400">{contagem(chave)}</span>
              </Etiqueta>
            </button>
          ))}
        </div>

        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-semibold sm:pl-0">Campo PNIPE</th>
                <th className="px-2 py-2 font-semibold">Coluna VIP</th>
                <th className="px-2 py-2 font-semibold">Relação</th>
                <th className="px-2 py-2 font-semibold">PNIPE</th>
                <th className="px-2 py-2 font-semibold">VIP</th>
                <th className="px-4 py-2 font-semibold sm:pr-0">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campos.map((c, i) => {
                const tabela = c.vip && c.vip.split(/[.\s]/)[0];
                const coluna = c.vip && c.vip.includes('.') ? c.vip.split('.')[1] : null;
                return (
                  <tr key={i} className="align-top">
                    <td className="px-4 py-2 sm:pl-0">{c.pnipe ? <code className="text-slate-800">{c.pnipe}</code> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-2">
                      {c.vip ? (
                        <button type="button" onClick={() => aoAbrirTabela(tabela)} className="text-left hover:text-blue-700" title={`Abrir ${tabela}`}>
                          <code className="break-all text-slate-800">{coluna || c.vip}</code>
                          {coluna && <span className="block text-xs text-slate-400">{tabela}</span>}
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2"><Etiqueta cor={RELACOES_PNIPE[c.relacao].cor}>{RELACOES_PNIPE[c.relacao].rotulo}</Etiqueta></td>
                    <td className="px-2 py-2"><Preenchimento valor={c.preenchimento_pnipe} /></td>
                    <td className="px-2 py-2"><Preenchimento valor={c.preenchimento_vip} /></td>
                    <td className="px-4 py-2 text-xs text-slate-500 sm:pr-0">{c.nota}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Cartao>

      {corr && (
        <Cartao
          titulo={`${corr.instituicao}: laboratório a laboratório`}
          descricao={`Os ${corr.itens.length} laboratórios que a ${corr.instituicao} publicou no PNIPE e onde eles estão no VIP. A correspondência foi feita à mão; os modelos em comum servem de confirmação.`}
          nota={`${F.plural(corr.resumo.vip_sem_par.laboratorios, 'laboratório', 'laboratórios')} do VIP (${F.plural(corr.resumo.vip_sem_par.equipamentos, 'equipamento', 'equipamentos')}) não têm par no PNIPE. Para mudar uma correspondência, edite dados/correspondencia_pnipe_vip.json.`}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(GRAUS_PNIPE).map(([g, info]) => (
              <Etiqueta key={g} cor={info.cor}>
                {info.rotulo} <span className="tabular-nums text-slate-400">{corr.resumo.por_grau[g] || 0}</span>
              </Etiqueta>
            ))}
          </div>
          <ul className="divide-y divide-slate-100">
            {corr.itens.map((item) => (
              <li key={item.pnipe.id} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Etiqueta cor={GRAUS_PNIPE[item.grau].cor}>{GRAUS_PNIPE[item.grau].rotulo}</Etiqueta>
                    <span className="text-xs text-slate-500">{F.plural(item.pnipe.equipamentos, 'equipamento', 'equipamentos')} no PNIPE</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {item.pnipe.url ? (
                      <a href={item.pnipe.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 hover:underline">
                        {item.pnipe.nome}
                      </a>
                    ) : (
                      item.pnipe.nome
                    )}
                    {item.pnipe.sigla && <span className="ml-1.5 font-normal text-slate-400">{item.pnipe.sigla}</span>}
                  </p>
                  {item.nota && <p className="mt-0.5 text-xs text-slate-500">{item.nota}</p>}
                </div>
                <div className="min-w-0 text-sm">
                  {item.vip.length ? (
                    <ul className="space-y-1">
                      {item.vip.map((v) => (
                        <li key={v.tipo + v.id}>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {v.tipo === 'local' ? 'Localização' : 'Espaço físico'}
                          </span>{' '}
                          <span className="text-slate-800">{v.nome}</span>
                          <span className="text-xs text-slate-500">
                            {' · '}
                            {v.tipo === 'local' && `${F.plural(v.laboratorios, 'espaço', 'espaços')}, `}
                            {F.plural(v.equipamentos, 'equipamento', 'equipamentos')}
                            {v.local && ` · ${v.local}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">Não encontrado no VIP.</p>
                  )}
                  {item.modelos.length > 0 && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-medium text-blue-700">
                        {F.plural(item.modelos.length, 'modelo em comum', 'modelos em comum')}
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {item.modelos.map((m, i) => (
                          <li key={i}>
                            {m.nome} <code className="text-slate-500">{m.modelo}</code> → {m.vip_lab_nome}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
