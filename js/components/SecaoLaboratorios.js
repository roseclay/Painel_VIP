function finalidadesDoLab(l) {
  return [l.ensino && 'Ensino', l.pesquisa && 'Pesquisa', l.extensao && 'Extensão'].filter(Boolean);
}

// Foto que some sozinha se o arquivo não existir no servidor de imagens.
function Foto({ url, className = '' }) {
  if (!url) return null;
  return <img src={url} alt="" loading="lazy" className={className} onError={(e) => e.currentTarget.remove()} />;
}

function CartaoLaboratorio({ lab, aoAbrir }) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(lab.id)}
      className="flex flex-col gap-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-600"
    >
      <Foto url={lab.foto} className="-mx-4 -mt-4 mb-1.5 h-36 w-[calc(100%+2rem)] max-w-none bg-slate-100 object-cover" />
      <h4 className="text-base font-semibold text-slate-900">
        {lab.nome}
        {lab.sigla && <span className="font-normal text-slate-500"> ({lab.sigla})</span>}
      </h4>
      <p className="text-[13px] text-slate-500">
        📍 {lab.local}
        {lab.sala && ` · Sala ${lab.sala}`} · {lab.instituicao}
      </p>
      {lab.descricao && <p className="line-clamp-2 text-[13px] text-slate-500">{lab.descricao}</p>}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {lab.equipamentos} equip.
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{lab.tipo}</span>
        {finalidadesDoLab(lab).map((f) => (
          <span key={f} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            {f}
          </span>
        ))}
      </div>
    </button>
  );
}

function SecaoLaboratorios({ filtros, aoAbrirLab }) {
  const { useState, useEffect } = React;
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [multiusuario, setMultiusuario] = useState(false);
  const [labs, setLabs] = useState(null);
  const [erro, setErro] = useState(null);

  // Espera o usuário parar de digitar antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    let cancelado = false;
    const params = paramsDosFiltros(filtros);
    if (buscaAplicada) params.set('q', buscaAplicada);
    if (multiusuario) params.set('multiusuario', '1');
    Obs.api
      .obter('/api/labs', params)
      .then((dados) => !cancelado && (setLabs(dados), setErro(null)))
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
  }, [filtros, buscaAplicada, multiusuario]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, área, equipamento, sala, pavilhão…"
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600">
          <input type="checkbox" checked={multiusuario} onChange={(e) => setMultiusuario(e.target.checked)} className="accent-slate-800" />
          Multiusuário
        </label>
      </div>

      {erro ? (
        <EstadoVazio titulo="Não foi possível carregar os laboratórios." descricao={erro} />
      ) : !labs ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {Obs.formato.plural(labs.length, 'laboratório encontrado', 'laboratórios encontrados')}
          </p>
          {labs.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {labs.map((l) => (
                <CartaoLaboratorio key={l.id} lab={l} aoAbrir={aoAbrirLab} />
              ))}
            </div>
          ) : (
            <EstadoVazio titulo="Nenhum laboratório encontrado com esses filtros." />
          )}
        </>
      )}
    </div>
  );
}
