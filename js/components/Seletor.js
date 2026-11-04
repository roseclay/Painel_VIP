// Lista suspensa no formato dos filtros do observatório: rótulo pequeno em cima, valor em destaque.
function Seletor({ titulo, valor, opcoes, aoMudar }) {
  return (
    <label className="relative block min-w-[11rem] rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:border-slate-300">
      <span className="block text-xs text-slate-500">{titulo}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="block w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-sm font-semibold text-slate-900 outline-none"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 fill-slate-400"
        aria-hidden="true"
      >
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
      </svg>
    </label>
  );
}
