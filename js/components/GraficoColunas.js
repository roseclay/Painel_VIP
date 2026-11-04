// Colunas verticais de série única, feitas à mão, com o valor acima de cada coluna.
function GraficoColunas({ itens, altura = 200 }) {
  const maxValor = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="flex items-end gap-1.5 sm:gap-3">
      {itens.map((item) => {
        const h = item.valor > 0 ? Math.max((item.valor / maxValor) * altura, 3) : 0;
        return (
          <div key={item.chave} className="flex min-w-0 flex-1 flex-col items-center" title={`${item.rotulo}: ${item.valor}`}>
            <div className="flex w-full flex-col items-center justify-end" style={{ height: altura + 20 }}>
              <span className="mb-1 text-xs font-semibold tabular-nums text-slate-800">{Obs.formato.numero(item.valor)}</span>
              <div className="w-full max-w-[3.5rem] rounded-t" style={{ height: h, backgroundColor: Obs.cores.primaria }} />
            </div>
            <span className="w-full border-t border-slate-300 pt-1.5 text-center text-[11px] text-slate-600">{item.rotulo}</span>
          </div>
        );
      })}
    </div>
  );
}
