const FILTROS_VITRINE_VAZIOS = { fonte: 'todos', tipo: 'todos', instituicao: '', tema: '', q: '' };

function paramsDaVitrine(filtros) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => valor && valor !== 'todos' && params.set(chave, valor));
  if (filtros.fonte && filtros.fonte !== 'todos') params.set('fonte', filtros.fonte);
  if (filtros.tipo && filtros.tipo !== 'todos') params.set('tipo', filtros.tipo);
  params.set('limite', '180');
  return params;
}

function GrupoBotoes({ titulo, valor, opcoes, aoMudar }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={valor === opcao.valor}
            onClick={() => aoMudar(opcao.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              valor === opcao.valor
                ? 'border-[#57269b] bg-[#57269b] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#57269b] hover:text-[#57269b]'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FiltroVitrine({ filtros, opcoes, aoMudar }) {
  const mudar = (chave, valor) => aoMudar({ ...filtros, [chave]: valor });
  const ativo = Object.entries(filtros).some(([chave, valor]) => valor && !['fonte', 'tipo'].includes(chave))
    || filtros.fonte !== 'todos' || filtros.tipo !== 'todos';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Filtros da vitrine">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1.25fr]">
        <GrupoBotoes
          titulo="Fonte dos dados"
          valor={filtros.fonte}
          aoMudar={(valor) => mudar('fonte', valor)}
          opcoes={[{ valor: 'todos', rotulo: 'VIP + PNIPE' }, { valor: 'vip', rotulo: 'VIP' }, { valor: 'pnipe', rotulo: 'PNIPE' }]}
        />
        <GrupoBotoes
          titulo="O que deseja encontrar"
          valor={filtros.tipo}
          aoMudar={(valor) => mudar('tipo', valor)}
          opcoes={[{ valor: 'todos', rotulo: 'Tudo' }, { valor: 'laboratorio', rotulo: 'Laboratórios' }, { valor: 'equipamento', rotulo: 'Equipamentos' }]}
        />
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Busca livre</span>
          <input
            type="search"
            value={filtros.q}
            onChange={(e) => mudar('q', e.target.value)}
            placeholder="Nome, equipamento, técnica ou palavra-chave"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#57269b] focus:ring-2 focus:ring-purple-100"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
        <label>
          <span className="sr-only">Instituição</span>
          <select aria-label="Instituição" value={filtros.instituicao} onChange={(e) => mudar('instituicao', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
            <option value="">Todas as instituições</option>
            {(opcoes.instituicoes || []).map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Área temática</span>
          <select aria-label="Área temática" value={filtros.tema} onChange={(e) => mudar('tema', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
            <option value="">Todas as áreas temáticas</option>
            {(opcoes.temas || []).map((tema) => <option key={tema.valor} value={tema.valor}>{tema.rotulo}</option>)}
          </select>
        </label>
        {ativo && <button type="button" onClick={() => aoMudar(FILTROS_VITRINE_VAZIOS)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#57269b] hover:bg-purple-50">Limpar filtros</button>}
      </div>
    </section>
  );
}
