function SecaoVisaoGeral({ resumo, aoAbrirLocal, aoAbrirLab }) {
  const itens = (lista, chave = 'id') =>
    lista.map((i, n) => ({ chave: i[chave] ?? n, rotulo: i.nome, valor: i.total }));

  return (
    <div className="space-y-6">
      <Indicadores kpi={resumo.kpi} />

      <div>
        <TituloGrupo>Laboratórios</TituloGrupo>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          <Cartao titulo="Por tipo de espaço" descricao="Quantidade de espaços ativos em cada tipo.">
            {resumo.porTipo.length ? (
              <BarraLista itens={itens(resumo.porTipo, 'nome')} />
            ) : (
              <EstadoVazio titulo="Sem dados para os filtros selecionados." />
            )}
          </Cartao>
          <Cartao titulo="Por finalidade" descricao="Um laboratório pode atender a mais de uma finalidade.">
            <BarraLista itens={resumo.finalidades.map((f) => ({ chave: f.nome, rotulo: f.nome, valor: f.total }))} />
          </Cartao>
        </div>
      </div>

      <div>
        <TituloGrupo>Infraestrutura</TituloGrupo>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          <Cartao titulo="Laboratórios por localização" descricao="Clique para ver os laboratórios do local.">
            {resumo.porLocal.length ? (
              <BarraLista itens={itens(resumo.porLocal.slice(0, 10))} aoClicar={aoAbrirLocal} />
            ) : (
              <EstadoVazio titulo="Sem dados para os filtros selecionados." />
            )}
          </Cartao>
          <Cartao titulo="Laboratórios com mais equipamentos" descricao="Clique para abrir o laboratório.">
            {resumo.topLabs.length ? (
              <BarraLista itens={itens(resumo.topLabs)} aoClicar={aoAbrirLab} />
            ) : (
              <EstadoVazio titulo="Sem dados para os filtros selecionados." />
            )}
          </Cartao>
        </div>
      </div>
    </div>
  );
}
