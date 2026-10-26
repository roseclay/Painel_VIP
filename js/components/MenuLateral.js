function MenuLateral({ secoes, ativa, aoSelecionar }) {
  return (
    <nav aria-label="Painéis">
      <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
        Painéis
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {secoes.map((s) => {
          const selecionada = ativa === s.chave;
          return (
            <li key={s.chave} className="shrink-0">
              <button
                type="button"
                aria-current={selecionada ? 'page' : undefined}
                onClick={() => aoSelecionar(s.chave)}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg lg:whitespace-normal px-3 py-2 text-left text-sm font-medium transition-colors ${
                  selecionada
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:bg-transparent'
                }`}
              >
                <span className={`w-4 text-xs tabular-nums ${selecionada ? 'text-slate-300' : 'text-slate-400'}`}>
                  {s.numero}
                </span>
                {s.rotulo}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
