// Árvore de hierarquia do VIP com uma linha ligando cada coluna ao campo correspondente do PNIPE.
// À esquerda a árvore (com as colunas ligadas sob cada tabela); à direita os campos do PNIPE, cada grupo
// alinhado à tabela principal dele; as linhas são um SVG por cima, recalculado quando o tamanho muda.

// Tabela do VIP na altura da qual cada grupo do PNIPE começa.
const ANCORA_DO_GRUPO = { instituicao: 'INS_Instituicao', laboratorio: 'EPF_Espaco_Fisico', equipamento: 'EQP_Equipamento' };

// "Tabela.coluna" liga na coluna; nome de tabela (ou "LOC_Localizacao → CAM_Campus") liga na linha da tabela.
const ancoraVip = (vip) => (vip.includes('.') ? vip : vip.match(/^[A-Za-z_]+/)[0]);

function ArvoreComPnipe({ mapa, aoAbrir, dicionario }) {
  const { useRef, useState, useLayoutEffect, useMemo } = React;
  const caixa = useRef(null);
  const colunaDireita = useRef(null);
  const arvore = useRef(null);
  const grupos = useRef({});
  const [layout, setLayout] = useState({ tops: {}, linhas: [], altura: 0 });
  const [foco, setFoco] = useState(null);
  const [largo, setLargo] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  // Pares campo PNIPE ↔ coluna/tabela VIP (só equivalentes e parciais, e só tabelas que existem no banco).
  const ligacoes = useMemo(
    () =>
      dicionario.entidades
        .flatMap((e) =>
          e.campos
            .filter((c) => c.pnipe && c.vip)
            .map((c) => ({ id: `${e.chave}:${c.pnipe}`, entidade: e.chave, ancora: ancoraVip(c.vip), relacao: c.relacao })),
        )
        .filter((l) => mapa.porNome[l.ancora.split('.')[0]]),
    [dicionario, mapa],
  );

  const indice = useMemo(() => {
    const colunasPorTabela = {};
    const tabelas = {};
    for (const l of ligacoes) {
      if (l.ancora.includes('.')) {
        const [t, coluna] = l.ancora.split('.');
        const lista = (colunasPorTabela[t] ||= []);
        let item = lista.find((x) => x.coluna === coluna);
        if (!item) lista.push((item = { coluna, ids: [], relacao: l.relacao }));
        item.ids.push(l.id);
      } else {
        (tabelas[l.ancora] ||= []).push(l.id);
      }
    }
    return { colunasPorTabela, tabelas };
  }, [ligacoes]);

  const ativo = (ids) => !foco || ids.some((id) => foco.includes(id));
  const ligacao = { ...indice, focar: setFoco, ativo };

  useLayoutEffect(() => {
    const medir = () => {
      const box = caixa.current;
      if (!box) return;
      const ehLargo = window.matchMedia('(min-width: 1024px)').matches;
      setLargo(ehLargo);
      if (!ehLargo) {
        setLayout({ tops: {}, linhas: [], altura: 0 });
        return;
      }
      const b = box.getBoundingClientRect();
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        return { right: r.right - b.left, top: r.top - b.top, meio: r.top - b.top + r.height / 2 };
      };

      // Cada grupo começa na altura da sua tabela-âncora, sem sobrepor o grupo anterior.
      const tops = {};
      let fundo = 0;
      for (const e of dicionario.entidades) {
        const g = grupos.current[e.chave];
        if (!g) continue;
        const ancora = box.querySelector(`[data-tabela="${ANCORA_DO_GRUPO[e.chave]}"]`);
        const top = Math.max(ancora ? rel(ancora).top : 0, fundo ? fundo + 16 : 0);
        tops[e.chave] = top;
        fundo = top + g.offsetHeight;
      }

      const xDireita = colunaDireita.current.getBoundingClientRect().left - b.left;
      const linhas = ligacoes
        .map((l) => {
          const g = grupos.current[l.entidade];
          const alvo = g && g.querySelector(`[data-pnipe="${CSS.escape(l.id)}"]`);
          const ehColuna = l.ancora.includes('.');
          const origem = box.querySelector(ehColuna ? `[data-vip="${CSS.escape(l.ancora)}"]` : `[data-tabela="${CSS.escape(l.ancora)}"]`);
          if (!alvo || !origem) return null;
          // Linha de tabela: sai depois do último texto da linha ("via …") para não cortá-lo.
          const x1 = ehColuna ? rel(origem).right : rel(origem.lastElementChild).right;
          const y1 = ehColuna ? rel(origem).meio : rel(origem.firstElementChild).meio;
          return { id: l.id, relacao: l.relacao, x1: x1 + 4, y1, x2: xDireita - 2, y2: tops[l.entidade] + alvo.offsetTop + alvo.offsetHeight / 2 };
        })
        .filter(Boolean);
      setLayout({ tops, linhas, altura: fundo });
    };

    // Mede de novo sempre que a árvore ou a caixa mudam de tamanho. Isso cobre também o Tailwind via CDN,
    // que gera as classes do grid só depois da primeira renderização.
    let quadro = 0;
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(medir);
    };
    agendar();
    const observador = new ResizeObserver(agendar);
    observador.observe(caixa.current);
    observador.observe(arvore.current);
    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
    };
  }, [ligacoes, dicionario]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {['equivalente', 'parcial', 'so_pnipe'].map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ backgroundColor: RELACOES_PNIPE[r].cor }} />
            {RELACOES_PNIPE[r].rotulo}
          </span>
        ))}
        <span className="text-slate-400">· passe o mouse numa coluna ou num campo para destacar a ligação</span>
      </div>

      <div ref={caixa} className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_6rem_16rem]">
        <div ref={arvore} className="min-w-0">
          <ArvoreHierarquia mapa={mapa} aoAbrir={aoAbrir} ligacao={ligacao} />
        </div>
        <div aria-hidden="true" className="hidden lg:block" />
        <div ref={colunaDireita} className="relative mt-6 lg:mt-0" style={largo ? { minHeight: layout.altura } : undefined}>
          {dicionario.entidades.map((e) => (
            <div
              key={e.chave}
              ref={(el) => (grupos.current[e.chave] = el)}
              className={`${largo ? 'absolute inset-x-0' : 'mb-4'} rounded-xl border border-slate-200 bg-slate-50 p-3`}
              style={largo ? { top: layout.tops[e.chave] || 0 } : undefined}
            >
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">PNIPE · {e.nome}</p>
              <ul className="flex flex-col items-start gap-0.5">
                {e.campos
                  .filter((c) => c.pnipe)
                  .map((c) => {
                    const id = `${e.chave}:${c.pnipe}`;
                    return (
                      <li
                        key={id}
                        data-pnipe={id}
                        onMouseEnter={() => setFoco([id])}
                        onMouseLeave={() => setFoco(null)}
                        title={c.nota || RELACOES_PNIPE[c.relacao].rotulo}
                        className={`inline-flex cursor-default items-center gap-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs transition-opacity ${
                          ativo([id]) ? '' : 'opacity-30'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: RELACOES_PNIPE[c.relacao].cor }} />
                        <code className="text-slate-700">{c.pnipe}</code>
                        {c.relacao === 'so_pnipe' && <span className="text-slate-400">sem par</span>}
                        {c.relacao !== 'so_pnipe' && !c.vip && <span className="text-slate-400">calculado no VIP</span>}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>

        {largo && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {layout.linhas.map((l) => {
              const meio = (l.x1 + l.x2) / 2;
              const destacada = foco && foco.includes(l.id);
              const visivel = !foco || destacada;
              const cor = RELACOES_PNIPE[l.relacao].cor;
              return (
                <g key={l.id} opacity={visivel ? 0.9 : 0.1}>
                  <path
                    d={`M${l.x1},${l.y1} C${meio},${l.y1} ${meio},${l.y2} ${l.x2},${l.y2}`}
                    fill="none"
                    stroke={cor}
                    strokeWidth={destacada ? 2.5 : 1.25}
                  />
                  <circle cx={l.x1} cy={l.y1} r="2.5" fill={cor} />
                  <circle cx={l.x2} cy={l.y2} r="2.5" fill={cor} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
