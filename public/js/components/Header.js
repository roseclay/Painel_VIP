function Header() {
  const { nomePainel, titulo } = VIP_CONFIG;
  return (
    <header className="border-b border-slate-200 bg-[#f2f7fb]">
      <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <a
            href="./"
            aria-label="Voltar para a página inicial"
            className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:h-20 sm:w-32"
          >
            <img src="assets/vip-logo.svg" alt="VIP" className="h-full w-full object-contain" />
          </a>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: '#1B5FBF' }}>
              {nomePainel}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{titulo}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
