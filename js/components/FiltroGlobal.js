// Filtros aplicados a todos os painéis. Valor vazio = sem restrição.
const FILTROS_VAZIOS = { tipo: '', local: '', finalidade: '' };

const FINALIDADES = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'ensino', rotulo: 'Ensino' },
  { valor: 'pesquisa', rotulo: 'Pesquisa' },
  { valor: 'extensao', rotulo: 'Extensão' },
];

function temFiltroAtivo(filtros) {
  return Object.values(filtros).some(Boolean);
}

function paramsDosFiltros(filtros) {
  const p = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => valor && p.set(chave, valor));
  return p;
}

function FiltroGlobal({ opcoes, filtros, aoMudar }) {
  const mudar = (campo) => (valor) => aoMudar({ ...filtros, [campo]: valor });
  const lista = (itens, todos) => [
    { valor: '', rotulo: todos },
    ...itens.map((i) => ({ valor: String(i.id), rotulo: `${i.nome} (${i.total})` })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor titulo="Tipo de espaço" valor={filtros.tipo} opcoes={lista(opcoes.tipos, 'Todos')} aoMudar={mudar('tipo')} />
      <Seletor titulo="Localização" valor={filtros.local} opcoes={lista(opcoes.locais, 'Todas')} aoMudar={mudar('local')} />
      <Seletor titulo="Finalidade" valor={filtros.finalidade} opcoes={FINALIDADES} aoMudar={mudar('finalidade')} />
      {temFiltroAtivo(filtros) && (
        <button
          type="button"
          onClick={() => aoMudar(FILTROS_VAZIOS)}
          className="px-2 py-2 text-sm text-blue-700 hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
