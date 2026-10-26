const SECOES = [
  { chave: 'geral', numero: '1', rotulo: 'Visão geral' },
  { chave: 'laboratorios', numero: '2', rotulo: 'Laboratórios' },
  { chave: 'localizacao', numero: '3', rotulo: 'Localização' },
  { chave: 'equipamentos', numero: '4', rotulo: 'Equipamentos' },
  // Mostra a estrutura do banco; não usa os filtros gerais.
  { chave: 'banco', numero: '5', rotulo: 'Mapeamento Banco de Dados' },
];

function secaoDoHash() {
  const chave = window.location.hash.replace('#', '');
  return SECOES.some((s) => s.chave === chave) ? chave : SECOES[0].chave;
}

function App() {
  const { useState, useEffect } = React;
  const [erro, setErro] = useState(null);
  const [opcoes, setOpcoes] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState(secaoDoHash);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [labAberto, setLabAberto] = useState(null);

  useEffect(() => {
    Obs.api.obter('/api/filtros').then(setOpcoes).catch((e) => setErro(e.message));
  }, []);

  // O resumo é refeito sempre que um filtro muda.
  useEffect(() => {
    let cancelado = false;
    Obs.api
      .obter('/api/resumo', paramsDosFiltros(filtros))
      .then((d) => !cancelado && setResumo(d))
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
  }, [filtros]);

  useEffect(() => {
    const aoMudarHash = () => setSecaoAtiva(secaoDoHash());
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, []);

  function selecionarSecao(chave) {
    window.location.hash = chave;
    setSecaoAtiva(chave);
  }

  // Clique num local (gráfico ou cartão): filtra por ele e abre a lista de laboratórios.
  function abrirLocal(id) {
    setFiltros((f) => ({ ...f, local: String(id) }));
    selecionarSecao('laboratorios');
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-medium text-red-700">Não foi possível carregar os dados.</p>
        <p className="mt-1 text-sm text-slate-500">{erro}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!opcoes || !resumo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Carregando dados dos laboratórios…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {secaoAtiva !== 'banco' && <FiltroGlobal opcoes={opcoes} filtros={filtros} aoMudar={setFiltros} />}

        <div className={`${secaoAtiva === 'banco' ? '' : 'mt-5 '}grid gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]`}>
          <MenuLateral secoes={SECOES} ativa={secaoAtiva} aoSelecionar={selecionarSecao} />

          <main>
            {secaoAtiva === 'geral' && <SecaoVisaoGeral resumo={resumo} aoAbrirLocal={abrirLocal} aoAbrirLab={setLabAberto} />}
            {secaoAtiva === 'laboratorios' && <SecaoLaboratorios filtros={filtros} aoAbrirLab={setLabAberto} />}
            {secaoAtiva === 'localizacao' && <SecaoLocalizacao resumo={resumo} aoAbrirLocal={abrirLocal} />}
            {secaoAtiva === 'equipamentos' && <SecaoEquipamentos resumo={resumo} />}
            {secaoAtiva === 'banco' && <SecaoBanco />}
          </main>
        </div>
      </div>

      <Footer />
      {labAberto && <DetalheLaboratorio id={labAberto} aoFechar={() => setLabAberto(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
