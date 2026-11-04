const SECOES = [
  { chave: 'laboratorios', numero: '1', rotulo: 'Laboratórios' },
  { chave: 'equipamentos', numero: '2', rotulo: 'Equipamentos' },
  { chave: 'instituicoes', numero: '3', rotulo: 'Instituições' },
  { chave: 'mapa', numero: '4', rotulo: 'Mapa' },
];

function secaoDoHash() {
  const chave = window.location.hash.replace('#', '').split('/')[0];
  return SECOES.some((s) => s.chave === chave) ? chave : 'laboratorios';
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
    const aoMudarHash = async () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('detalhe/')) {
        const [, fonte, tipo, idCodificado] = hash.split('/');
        const id = decodeURIComponent(idCodificado || '');
        setSecaoAtiva(tipo === 'equipamento' ? 'equipamentos' : 'laboratorios');
        if (Obs.demo?.carregar) {
          const catalogo = await Obs.demo.carregar();
          setItemAberto(catalogo.find((item) => item.fonte === fonte && item.tipo === tipo && String(item.id_origem) === id) || null);
        }
      } else {
        setItemAberto(null);
        setSecaoAtiva(secaoDoHash());
      }
    };
    window.addEventListener('hashchange', aoMudarHash);
    aoMudarHash();
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const tipo = secaoAtiva === 'laboratorios' ? 'laboratorio' : secaoAtiva === 'equipamentos' ? 'equipamento' : 'todos';
    const atraso = window.setTimeout(() => {
      setCarregando(true);
      setErro(null);
      Obs.api.obter('/api/vitrine', paramsDaVitrine(filtros, tipo))
        .then((resultado) => { if (!cancelado) setDados(resultado); })
        .catch((e) => { if (!cancelado) setErro(e.message); })
        .finally(() => { if (!cancelado) setCarregando(false); });
    }, filtros.q ? 220 : 0);
    return () => { cancelado = true; window.clearTimeout(atraso); };
  }, [filtros, secaoAtiva]);

  function selecionarSecao(chave) {
    setItemAberto(null);
    if (chave !== 'equipamentos') setFiltros((atuais) => ({ ...atuais, status: '' }));
    window.location.hash = chave;
    setSecaoAtiva(chave);
  }

  function abrirItem(item) {
    setItemAberto(item);
    window.history.pushState({}, '', `#detalhe/${item.fonte}/${item.tipo}/${encodeURIComponent(item.id_origem)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function voltarDoDetalhe() {
    setItemAberto(null);
    window.location.hash = secaoAtiva;
  }

  function selecionarInstituicao(sigla) {
    setFiltros({ ...filtros, instituicao: sigla });
    selecionarSecao('laboratorios');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#30206d] via-[#57269b] to-[#0b7f8c] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-100">Conhecimento · infraestrutura · cooperação</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-4xl">Conheça a infraestrutura que impulsiona a ciência na Bahia</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-purple-50 sm:text-base">Uma porta de entrada para descobrir laboratórios, equipamentos e competências, comparar VIP e PNIPE e encontrar oportunidades de uso compartilhado.</p>
        </div>

        {itemAberto ? <PainelDetalhe item={itemAberto} aoVoltar={voltarDoDetalhe} /> : <>
          <FiltroVitrine filtros={filtros} opcoes={dados?.filtros || {}} aoMudar={setFiltros} mostrarSituacao={secaoAtiva === 'equipamentos'} />
          <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
            <MenuLateral secoes={SECOES} ativa={secaoAtiva} aoSelecionar={selecionarSecao} />
            <main className="min-w-0">
              {erro && <EstadoVazio titulo="Não foi possível consultar a vitrine." descricao={erro} />}
              {!erro && secaoAtiva === 'laboratorios' && <SecaoVitrine dados={dados} carregando={carregando} aoAbrir={abrirItem} tipo="laboratorio" />}
              {!erro && secaoAtiva === 'equipamentos' && <SecaoVitrine dados={dados} carregando={carregando} aoAbrir={abrirItem} tipo="equipamento" />}
              {!erro && secaoAtiva === 'instituicoes' && <SecaoInstituicoes dados={dados} carregando={carregando} aoSelecionar={selecionarInstituicao} />}
              {!erro && secaoAtiva === 'mapa' && (dados ? <MapaVitrine pontos={dados.pontos || []} /> : <p className="text-sm text-slate-500">Carregando mapa…</p>)}
            </main>
          </div>
        </>}
      </div>
      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
