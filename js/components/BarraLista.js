// Barras horizontais feitas à mão (sem lib de charts): rótulo e valor em cima, barra proporcional embaixo.
// `aoClicar` transforma cada linha em botão.
function BarraLista({ itens, aoClicar, formatarTitulo }) {
  const maxValor = Math.max(1, ...itens.map((i) => i.valor));
  const Linha = aoClicar ? 'button' : 'div';
  return (
    <div className="space-y-4">
      {itens.map((item) => {
        const pct = (item.valor / maxValor) * 100;
        return (
          <Linha
            key={item.chave}
            type={aoClicar ? 'button' : undefined}
            onClick={aoClicar ? () => aoClicar(item.chave) : undefined}
            className={`block w-full text-left ${aoClicar ? '-mx-1.5 cursor-pointer rounded-md px-1.5 py-1 hover:bg-slate-50' : ''}`}
            title={formatarTitulo ? formatarTitulo(item) : item.rotulo}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-slate-700">{item.rotulo}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                {Obs.formato.numero(item.valor)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{ width: `${item.valor > 0 ? Math.max(pct, 2) : 0}%`, backgroundColor: Obs.cores.primaria }}
              />
            </div>
          </Linha>
        );
      })}
    </div>
  );
}
