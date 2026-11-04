function Header() {
  const { nomePainel, titulo } = VIP_CONFIG;
  return (
    <header className="border-b border-slate-200 bg-[#f2f7fb]">
      <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <a
            href="./"
            aria-label="Voltar para a página inicial"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1B5FBF] text-xl font-extrabold tracking-wide text-white sm:h-20 sm:w-20 sm:text-2xl"
          >
            VIP
          </a>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: '#1B5FBF' }}>
              {nomePainel}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{titulo}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Encontre laboratórios, equipamentos, competências e possibilidades de uso compartilhado.
              Consulte o VIP e o PNIPE em conjunto ou separadamente, sempre com a origem identificada.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
