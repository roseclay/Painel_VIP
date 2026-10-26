// Linha de indicadores (KPIs) do resumo, repetida no topo de cada painel baseado no resumo.
function Indicadores({ kpi }) {
  const F = Obs.formato;
  const itens = [
    { rotulo: 'Laboratórios', valor: F.numero(kpi.laboratorios) },
    { rotulo: 'Equipamentos', valor: F.numero(kpi.equipamentos) },
    { rotulo: 'Unidades', valor: F.numero(kpi.unidades) },
    { rotulo: 'Locais', valor: F.numero(kpi.locais) },
    { rotulo: 'Cursos atendidos', valor: F.numero(kpi.cursos) },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{i.rotulo}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{i.valor}</p>
        </div>
      ))}
    </div>
  );
}

function TituloGrupo({ children }) {
  return <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">{children}</h3>;
}
