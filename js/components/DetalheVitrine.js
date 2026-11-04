function LinhaDetalhe({ rotulo, valor }) {
  if (valueIsEmpty(valor)) return null;
  return <div className="grid gap-1 border-b border-slate-100 py-2.5 sm:grid-cols-[10rem_1fr]"><dt className="text-sm font-medium text-slate-500">{rotulo}</dt><dd className="whitespace-pre-line text-sm text-slate-800">{String(valor)}</dd></div>;
}

function valueIsEmpty(valor) { return valor === null || valor === undefined || valor === '' || valor === false; }

function DetalheVitrine({ item, aoFechar }) {
  const { useEffect } = React;
  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [aoFechar]);
  const campos = [
    ['Fonte', item.fonte === 'pnipe' ? 'PNIPE / MCTI' : 'VIP'], ['Tipo', item.tipo === 'laboratorio' ? 'Laboratório' : 'Equipamento'],
    ['Instituição', [item.instituicao, item.instituicao_nome].filter(Boolean).join(' — ')], ['Laboratório', item.laboratorio],
    ['Cidade', [item.cidade, item.estado].filter(Boolean).join(' — ')], ['Endereço', item.endereco],
    ['Áreas de atuação', item.areas], ['Técnicas', item.tecnicas], ['Descrição', item.descricao],
    ['Fabricante', item.marca], ['Modelo', item.modelo], ['Ano de aquisição', item.ano], ['Quantidade', item.quantidade],
    ['Outras denominações', item.denominacoes], ['Parâmetros', item.parametros], ['Campus', item.campus],
    ['Local', item.local], ['Sala', item.sala], ['Capacidade', item.capacidade],
    ['Contato', item.contato], ['Telefone', item.telefone], ['E-mail', item.email], ['Website', item.website],
    ['Uso compartilhado', item.compartilhado ? 'Sim' : null], ['Equipamentos vinculados', item.equipamentos],
  ];
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <article role="dialog" aria-modal="true" aria-labelledby="detalhe-vitrine-titulo" className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {item.imagem && <img src={item.imagem} alt="" className="h-56 w-full bg-slate-100 object-cover" onError={(e) => e.currentTarget.remove()} />}
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><SeloFonte fonte={item.fonte} /><h2 id="detalhe-vitrine-titulo" className="mt-3 text-2xl font-bold text-slate-900">{item.nome}</h2></div><button type="button" onClick={aoFechar} aria-label="Fechar" className="h-10 w-10 shrink-0 rounded-full bg-slate-100 text-xl hover:bg-slate-200">×</button></div>
          <dl className="mt-5">{campos.map(([rotulo, valor]) => <LinhaDetalhe key={rotulo} rotulo={rotulo} valor={valor} />)}</dl>
          {(item.url || item.website) && <a href={item.url || (/^https?:/i.test(item.website) ? item.website : `https://${item.website}`)} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-xl bg-[#57269b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#451d7d]">Consultar registro de origem ↗</a>}
        </div>
      </article>
    </div>
  );
}
