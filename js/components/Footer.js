function Footer() {
  const { nomePainel, textoRodape } = VIP_CONFIG;
  return (
    <footer className="border-t border-slate-200 bg-[#f2f7fb]">
      <div className="mx-auto max-w-[90rem] px-4 py-6 text-sm text-slate-500 sm:px-6">
        <p className="font-medium text-slate-700">{nomePainel}</p>
        <p className="mt-1">{textoRodape}</p>
      </div>
    </footer>
  );
}
