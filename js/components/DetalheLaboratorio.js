function Campo({ rotulo, children }) {
  if (!children) return null;
  return (
    <>
      <dt className="text-slate-500">{rotulo}</dt>
      <dd>{children}</dd>
    </>
  );
}

function BlocoDetalhe({ titulo, children }) {
  return (
    <div className="mt-5">
      <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h5>
      {children}
    </div>
  );
}

// Janela com a ficha do laboratório: localização, informações, cursos e equipamentos.
function DetalheLaboratorio({ id, aoFechar }) {
  const { useState, useEffect } = React;
  const [lab, setLab] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    Obs.api
      .obter(`/api/labs/${id}`)
      .then((d) => !cancelado && setLab(d))
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
  }, [id]);

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const endereco = lab ? [lab.endereco, lab.complemento, lab.bairro].filter(Boolean).join(', ') : '';
  const cidade = lab ? [lab.cidade, lab.estado].filter(Boolean).join(' - ') : '';
  const site = lab && lab.website && (
    <a href={/^https?:/i.test(lab.website) ? lab.website : `//${lab.website}`} target="_blank" rel="noopener" className="text-blue-700 hover:underline">
      {lab.website}
    </a>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              {lab ? lab.nome : 'Carregando…'}
              {lab && lab.sigla && ` (${lab.sigla})`}
            </h2>
            {lab && (
              <p className="text-[13px] text-slate-500">
                {lab.tipo} · {lab.instituicao}
              </p>
            )}
          </div>
          <button type="button" aria-label="Fechar" onClick={aoFechar} className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-lg hover:bg-slate-200">
            ×
          </button>
        </div>

        {erro && <EstadoVazio titulo="Não foi possível carregar o laboratório." descricao={erro} />}

        {lab && (
          <>
            {lab.fotos.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {lab.fotos.map((u) => (
                  <Foto key={u} url={u} className="h-36 shrink-0 rounded-lg bg-slate-100" />
                ))}
              </div>
            )}

            <BlocoDetalhe titulo="Localização">
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
                <Campo rotulo="Instituição">{lab.instituicao_nome}</Campo>
                <Campo rotulo="Campus">{lab.campus}</Campo>
                <Campo rotulo="Local">{lab.local}</Campo>
                <Campo rotulo="Sala">{lab.sala}</Campo>
                <Campo rotulo="Endereço">{endereco}</Campo>
                <Campo rotulo="Cidade">{cidade}</Campo>
                <Campo rotulo="CEP">{lab.cep}</Campo>
              </dl>
              {lab.fotos_local.length > 0 && (
                <div className="mt-2.5 flex gap-2 overflow-x-auto">
                  {lab.fotos_local.map((u) => (
                    <Foto key={u} url={u} className="h-36 shrink-0 rounded-lg bg-slate-100" />
                  ))}
                </div>
              )}
            </BlocoDetalhe>

            <BlocoDetalhe titulo="Informações">
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
                <Campo rotulo="Responsável">{lab.responsavel}</Campo>
                <Campo rotulo="Telefone">{lab.telefone}</Campo>
                <Campo rotulo="Site">{site}</Campo>
                <Campo rotulo="Capacidade">{lab.capacidade ? `${lab.capacidade} pessoas` : ''}</Campo>
                <Campo rotulo="Finalidade">{finalidadesDoLab(lab).join(', ')}</Campo>
                <Campo rotulo="Uso">{lab.multiusuario ? 'Multiusuário' : ''}</Campo>
              </dl>
            </BlocoDetalhe>

            {lab.descricao && (
              <BlocoDetalhe titulo="Descrição">
                <p className="whitespace-pre-line text-sm">{lab.descricao}</p>
              </BlocoDetalhe>
            )}
            {lab.areas && (
              <BlocoDetalhe titulo="Áreas">
                <p className="whitespace-pre-line text-sm">{lab.areas}</p>
              </BlocoDetalhe>
            )}
            {lab.atividades && (
              <BlocoDetalhe titulo="Atividades">
                <p className="whitespace-pre-line text-sm">{lab.atividades}</p>
              </BlocoDetalhe>
            )}

            {lab.cursos.length > 0 && (
              <BlocoDetalhe titulo={`Cursos atendidos (${lab.cursos.length})`}>
                <div className="flex flex-wrap gap-1.5">
                  {lab.cursos.map((c) => (
                    <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      {c}
                    </span>
                  ))}
                </div>
              </BlocoDetalhe>
            )}

            <BlocoDetalhe titulo={`Equipamentos (${lab.equipamentos.length})`}>
              {lab.equipamentos.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-slate-500">
                        {['', 'Equipamento', 'Fabricante', 'Modelo', 'Qtd.', 'Ano'].map((h, i) => (
                          <th key={i} className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lab.equipamentos.map((e) => (
                        <tr key={e.id} className="align-top">
                          <td className="border-b border-slate-200 px-2 py-1.5">
                            <Foto url={e.foto} className="h-11 w-11 rounded-md bg-slate-100 object-cover" />
                          </td>
                          <td className="border-b border-slate-200 px-2 py-1.5">
                            {e.nome}
                            {e.sigla && ` (${e.sigla})`}
                          </td>
                          <td className="border-b border-slate-200 px-2 py-1.5">{e.fabricante === 'Não Informado' ? '' : e.fabricante}</td>
                          <td className="border-b border-slate-200 px-2 py-1.5">{e.modelo}</td>
                          <td className="border-b border-slate-200 px-2 py-1.5">{e.quantidade}</td>
                          <td className="border-b border-slate-200 px-2 py-1.5">{e.ano}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum equipamento cadastrado.</p>
              )}
            </BlocoDetalhe>
          </>
        )}
      </div>
    </div>
  );
}
