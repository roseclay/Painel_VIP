function Cartao({ titulo, descricao, acoes, nota, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
        </div>
        {acoes}
      </div>
      {children}
      {nota && <p className="mt-4 text-xs text-slate-500">{nota}</p>}
    </section>
  );
}
