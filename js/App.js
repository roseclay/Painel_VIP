const SECOES = [
  { chave: 'vitrine', numero: '1', rotulo: 'Explorar a vitrine' },
  { chave: 'mapa', numero: '2', rotulo: 'Mapa da infraestrutura' },
];

function secaoDoHash() {
  const chave = window.location.hash.replace('#', '');
  return SECOES.some((s) => s.chave === chave) ? chave : 'vitrine';
}

function App() {
  const { useState, useEffect } = React;
  const [secaoAtiva, setSecaoAtiva] = useState(secaoDoHash);
  const [filtros, setFiltros] = useState(FILTROS_VITRINE_VAZIOS);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [itemAberto, setItemAberto] = useState(null);

  useEffect(() => {
    const aoMudarHash = () => setSecaoAtiva(secaoDoHash());
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const atraso = window.setTimeout(() => {
      setCarregando(true);
      setErro(null);
      Obs.api.obter('/api/vitrine', paramsDaVitrine(filtros))
        .then((resultado) => { if (!cancelado) setDados(resultado); })
        .catch((e) => { if (!cancelado) setErro(e.message); })
        .finally(() => { if (!cancelado) setCarregando(false); });
    }, filtros.q ? 250 : 0);
    return () => { cancelado = true; window.clearTimeout(atraso); };
  }, [filtros]);

  function selecionarSecao(chave) {
    window.location.hash = chave;
    setSecaoAtiva(chave);
  }

  const abrirItem = (item) => setItemAberto(item);
  const detalheVip = itemAberto?.fonte === 'vip' && itemAberto?.tipo === 'laboratorio';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#30206d] via-[#57269b] to-[#0b7f8c] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-100">Conhecimento · infraestrutura · cooperação</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-4xl">Conheça a infraestrutura que impulsiona a ciência na Bahia</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-purple-50 sm:text-base">Uma porta de entrada para descobrir laboratórios, equipamentos e competências, comparar as fontes e encontrar oportunidades de compartilhamento.</p>
        </div>

        <FiltroVitrine filtros={filtros} opcoes={dados?.filtros || {}} aoMudar={setFiltros} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
          <MenuLateral secoes={SECOES} ativa={secaoAtiva} aoSelecionar={selecionarSecao} />
          <main>
            {erro && <EstadoVazio titulo="Não foi possível consultar a vitrine." descricao={erro} />}
            {!erro && secaoAtiva === 'vitrine' && <SecaoVitrine dados={dados} carregando={carregando} aoAbrir={abrirItem} />}
            {!erro && secaoAtiva === 'mapa' && (dados ? <MapaVitrine pontos={dados.pontos || []} /> : <p className="text-sm text-slate-500">Carregando mapa…</p>)}
          </main>
        </div>
      </div>
      <Footer />
      {itemAberto && detalheVip && <DetalheLaboratorio id={itemAberto.id_origem} aoFechar={() => setItemAberto(null)} />}
      {itemAberto && !detalheVip && <DetalheVitrine item={itemAberto} aoFechar={() => setItemAberto(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
