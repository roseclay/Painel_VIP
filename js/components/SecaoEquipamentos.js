function SecaoEquipamentos({ resumo }) {
  const itens = (lista) => lista.map((i) => ({ chave: i.nome, rotulo: i.nome, valor: i.total }));
  const vazio = <EstadoVazio titulo="Sem dados para os filtros selecionados." />;

  return (
    <div className="space-y-6">
      <Indicadores kpi={resumo.kpi} />

      <div>
        <TituloGrupo>Equipamentos</TituloGrupo>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          <Cartao
            titulo="Aquisições por ano"
            descricao="Equipamentos com ano de aquisição informado."
            nota="Registros sem ano de aquisição não aparecem neste gráfico."
          >
            {resumo.porAno.length ? (
              <GraficoColunas itens={resumo.porAno.map((a) => ({ chave: a.ano, rotulo: String(a.ano), valor: a.total }))} />
            ) : (
              vazio
            )}
          </Cartao>
          <Cartao
            titulo="Principais fabricantes"
            descricao="Fabricantes com mais equipamentos cadastrados."
            nota="Equipamentos sem fabricante informado ficam de fora."
          >
            {resumo.topFabricantes.length ? <BarraLista itens={itens(resumo.topFabricantes)} /> : vazio}
          </Cartao>
        </div>
      </div>

      <div>
        <TituloGrupo>Cursos</TituloGrupo>
        <Cartao titulo="Cursos mais atendidos" descricao="Cursos vinculados ao maior número de laboratórios.">
          {resumo.topCursos.length ? <BarraLista itens={itens(resumo.topCursos)} /> : vazio}
        </Cartao>
      </div>
    </div>
  );
}
