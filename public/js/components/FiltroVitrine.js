const FILTROS_VITRINE_VAZIOS = { fonte: 'todos', instituicao: '', tema: '', area: '', tecnica: '', status: '', cidade: '', laboratorio: '', laboratorioNome: '', q: '' };

function paramsDaVitrine(filtros, tipo = 'todos') {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => chave !== 'laboratorioNome' && valor && valor !== 'todos' && params.set(chave, valor));
  if (filtros.fonte && filtros.fonte !== 'todos') params.set('fonte', filtros.fonte);
  if (tipo && tipo !== 'todos') params.set('tipo', tipo);
  params.set('limite', '240');
  return params;
}

function GrupoBotoes({ titulo, valor, opcoes, aoMudar }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <button key={opcao.valor} type="button" aria-pressed={valor === opcao.valor} onClick={() => aoMudar(opcao.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${valor === opcao.valor
              ? 'border-[#57269b] bg-[#57269b] text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-[#57269b] hover:text-[#57269b]'}`}>
            {opcao.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function instituicaoObjeto(valor) {
  return typeof valor === 'string' ? { sigla: valor, nome: valor } : valor;
}

function IconeInstituicao({ sigla, selecionada }) {
  const paleta = ['#57269b', '#087f8c', '#1b5fbf', '#a23b72', '#166534', '#9a3412', '#334155', '#6d28d9'];
  const indice = [...String(sigla)].reduce((soma, letra) => soma + letra.charCodeAt(0), 0) % paleta.length;
  const arquivos = { IFBA: 'ifba.png', IFBAIANO: 'ifbaiano.png', UEFS: 'uefs.png', UESB: 'uesb.png', UESC: 'uesc.png', UFBA: 'ufba.png', UFSB: 'ufsb.png', UNEB: 'uneb.png' };
  const arquivo = arquivos[sigla];
  return <span className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl text-[10px] font-black tracking-tight text-white shadow-sm ${selecionada ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-[#57269b]' : ''}`}
    style={{ background: paleta[indice] }}><span>{sigla.slice(0, 6)}</span>{arquivo && <img src={`assets/instituicoes/${arquivo}`} alt="" className="absolute inset-0 h-full w-full bg-white object-contain p-1" onError={(e) => e.currentTarget.remove()} />}</span>;
}

function FaixaInstituicoes({ valor, instituicoes, aoMudar }) {
  const itens = (instituicoes || []).map(instituicaoObjeto);
  return (
    <fieldset className="min-w-0 border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <legend className="text-sm font-bold text-slate-800">Instituições</legend>
        <span className="text-xs text-slate-500">{itens.length} instituições</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => aoMudar('')} aria-pressed={!valor}
          className={`flex min-h-[7.5rem] min-w-[7rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition ${!valor ? 'border-[#57269b] bg-[#57269b] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-200'}`}>
          <IconeInstituicao sigla="BA" selecionada={!valor} /><strong>Todas</strong><span className={`text-[10px] leading-tight ${!valor ? 'text-white/80' : 'text-slate-400'}`}>Instituições</span>
        </button>
        {itens.map((item) => {
          const selecionada = valor === item.sigla;
          return <button key={item.sigla} type="button" onClick={() => aoMudar(selecionada ? '' : item.sigla)} aria-pressed={selecionada} title={item.nome}
            className={`flex min-h-[7.5rem] min-w-[7rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition ${selecionada ? 'border-[#57269b] bg-[#57269b] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-200'}`}>
            <IconeInstituicao sigla={item.sigla} selecionada={selecionada} /><strong>{item.sigla}</strong><span className={`line-clamp-2 text-[10px] leading-tight ${selecionada ? 'text-white/80' : 'text-slate-400'}`}>{item.nome}</span>
          </button>;
        })}
      </div>
    </fieldset>
  );
}

function SeletorFiltro({ rotulo, valor, opcoes, placeholder, aoMudar }) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{rotulo}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)} className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
        <option value="">{placeholder}</option>
        {(opcoes || []).map((opcao) => {
          const item = typeof opcao === 'string' ? { valor: opcao, rotulo: opcao } : opcao;
          return <option key={item.valor} value={item.valor}>{item.rotulo || item.valor}{item.total ? ` (${item.total})` : ''}</option>;
        })}
      </select>
    </label>
  );
}

function FiltroVitrine({ filtros, opcoes, aoMudar, mostrarSituacao }) {
  const mudar = (chave, valor) => aoMudar({ ...filtros, [chave]: valor });
  const ativo = Object.values(filtros).some((valor) => valor && valor !== 'todos');
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Filtros da vitrine">
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(20rem,1fr)]">
        <GrupoBotoes titulo="Fonte dos dados" valor={filtros.fonte} aoMudar={(valor) => mudar('fonte', valor)}
          opcoes={[{ valor: 'todos', rotulo: 'VIP + PNIPE' }, { valor: 'vip', rotulo: 'VIP' }, { valor: 'pnipe', rotulo: 'PNIPE' }]} />
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Busca livre</span>
          <input type="search" value={filtros.q} onChange={(e) => mudar('q', e.target.value)}
            placeholder="Nome, equipamento, laboratório, técnica ou palavra-chave"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#57269b] focus:ring-2 focus:ring-purple-100" />
        </label>
      </div>
      <FaixaInstituicoes valor={filtros.instituicao} instituicoes={opcoes.instituicoes} aoMudar={(valor) => mudar('instituicao', valor)} />
      {filtros.cidade && <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">Município: {filtros.cidade}</span>
        <button type="button" onClick={() => mudar('cidade', '')} className="rounded-full px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" aria-label={`Remover filtro do município ${filtros.cidade}`}>×</button>
      </div>}
      {filtros.laboratorio && <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <span className="max-w-full truncate rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800">Laboratório: {filtros.laboratorioNome || filtros.laboratorio}</span>
        <button type="button" onClick={() => aoMudar({ ...filtros, laboratorio: '', laboratorioNome: '' })} className="rounded-full px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" aria-label="Remover filtro do laboratório">×</button>
      </div>}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <GrupoBotoes titulo="Filtre por grande área" valor={filtros.tema} aoMudar={(valor) => mudar('tema', valor)}
          opcoes={[{ valor: '', rotulo: 'Todas as áreas' }, ...(opcoes.temas || [])]} />
      </div>
      <div className={`mt-4 grid gap-3 ${mostrarSituacao ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <SeletorFiltro rotulo="Área de atuação" valor={filtros.area} opcoes={opcoes.areas} placeholder="Todas as áreas" aoMudar={(valor) => mudar('area', valor)} />
        <SeletorFiltro rotulo="Técnica principal" valor={filtros.tecnica} opcoes={opcoes.tecnicas} placeholder="Todas as técnicas" aoMudar={(valor) => mudar('tecnica', valor)} />
        {mostrarSituacao && <SeletorFiltro rotulo="Situação do equipamento" valor={filtros.status}
          opcoes={[{ valor: 'ativo', rotulo: 'Ativo' }, { valor: 'inativo', rotulo: 'Inativo' }]}
          placeholder="Ativos e inativos" aoMudar={(valor) => mudar('status', valor)} />}
      </div>
      {ativo && <div className="mt-4 flex justify-end"><button type="button" onClick={() => aoMudar(FILTROS_VITRINE_VAZIOS)}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-[#57269b] hover:bg-purple-50">Limpar todos os filtros</button></div>}
    </section>
  );
}
