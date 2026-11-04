function valueIsEmpty(valor) { return valor === null || valor === undefined || valor === '' || valor === false; }

function valorLegivel(valor) {
  if (Array.isArray(valor)) return valor.map((v) => typeof v === 'object' ? Object.values(v).filter(Boolean).join(': ') : v).join('\n');
  if (valor && typeof valor === 'object') return Object.entries(valor).map(([k, v]) => `${k}: ${v}`).join('\n');
  return String(valor);
}

function LinhaDetalhe({ rotulo, valor }) {
  if (valueIsEmpty(valor)) return null;
  return <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-semibold text-slate-500">{rotulo}</dt><dd className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{valorLegivel(valor)}</dd></div>;
}

function Etiquetas({ titulo, itens, cor = 'purple' }) {
  if (!itens?.length) return null;
  const classe = cor === 'cyan' ? 'bg-cyan-50 text-cyan-800' : 'bg-purple-50 text-purple-800';
  return <section><h3 className="text-sm font-bold text-slate-800">{titulo}</h3><div className="mt-2 flex flex-wrap gap-2">{itens.map((item) => <span key={item} className={`rounded-full px-2.5 py-1 text-xs ${classe}`}>{item}</span>)}</div></section>;
}

function FormularioContato({ item }) {
  const { useState } = React;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState(`Olá, gostaria de obter informações sobre ${item.nome}.`);
  if (!item.email) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Este registro ainda não possui e-mail público. Utilize o telefone informado ou consulte o registro de origem.</p>;
  const enviar = (evento) => {
    evento.preventDefault();
    const assunto = `Interesse na infraestrutura: ${item.nome}`;
    const corpo = `${mensagem}\n\nNome: ${nome}\nE-mail para retorno: ${email}\nFonte consultada: ${item.fonte.toUpperCase()}`;
    window.location.href = `mailto:${item.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  };
  return <form onSubmit={enviar} className="grid gap-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="mb-1 block text-xs font-semibold text-slate-600">Seu nome</span><input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label><span className="mb-1 block text-xs font-semibold text-slate-600">Seu e-mail</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
    </div>
    <label><span className="mb-1 block text-xs font-semibold text-slate-600">Mensagem</span><textarea required rows="4" value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
    <button type="submit" className="justify-self-start rounded-xl bg-[#57269b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#451d7d]">Preparar mensagem por e-mail →</button>
    <p className="text-xs text-slate-500">O formulário abre seu aplicativo de e-mail com a mensagem pronta; nada é enviado sem sua confirmação.</p>
  </form>;
}

function PainelDetalhe({ item, aoVoltar }) {
  if (!item) return null;
  const baseObservatorio = VIP_CONFIG.observatorioBase.replace(/\/$/, '');
  const perfilUrl = item.pesquisador_id ? `${baseObservatorio}/perfil.html?id=${encodeURIComponent(item.pesquisador_id)}` : null;
  const fotoPesquisador = item.pesquisador_foto ? `${baseObservatorio}/${item.pesquisador_foto.replace(/^\//, '')}` : null;
  const campos = [
    ['Fonte', item.fonte === 'pnipe' ? 'PNIPE / MCTI' : 'VIP'],
    ['Tipo', item.tipo === 'laboratorio' ? 'Laboratório' : 'Equipamento'],
    ['Situação do equipamento', item.tipo === 'equipamento' ? (item.status === 'I' ? 'Inativo' : 'Ativo') : null],
    ['Instituição', [item.instituicao, item.instituicao_nome].filter(Boolean).join(' — ')],
    ['Laboratório', item.laboratorio], ['Cidade', [item.cidade, item.estado].filter(Boolean).join(' — ')],
    ['Endereço', item.endereco], ['Descrição', item.descricao], ['Fabricante / marca', item.marca],
    ['Modelo', item.modelo], ['Ano de aquisição', item.ano], ['Quantidade', item.quantidade],
    ['Outras denominações', item.denominacoes], ['Parâmetros', item.parametros], ['Campus', item.campus],
    ['Local', item.local], ['Sala', item.sala], ['Capacidade', item.capacidade],
    ['Uso compartilhado', item.compartilhado ? 'Sim' : null], ['Equipamentos vinculados', item.equipamentos],
  ];
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-5 sm:p-7">
      <button type="button" onClick={aoVoltar} className="mb-5 text-sm font-bold text-[#57269b] hover:underline">← Voltar ao painel</button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div><div className="flex flex-wrap items-center gap-2"><SeloFonte fonte={item.fonte} /><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.status === 'I' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.status === 'I' ? 'Inativo' : 'Ativo'}</span></div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Painel {item.tipo === 'equipamento' ? 'Equipamento' : 'Laboratório'}</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{item.nome}</h2>
          <p className="mt-2 font-semibold text-[#57269b]">{item.instituicao}{item.laboratorio ? ` · ${item.laboratorio}` : ''}</p>
          {item.descricao && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">{item.descricao}</p>}
        </div>
        {item.imagem && <img src={item.imagem} alt="" className="h-52 w-full rounded-2xl bg-slate-100 object-cover" onError={(e) => e.currentTarget.remove()} />}
      </div>
    </div>
    <div className="grid gap-8 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <div className="space-y-7">
        <section><h3 className="text-lg font-bold text-slate-900">Informações técnicas</h3><dl className="mt-2">{campos.map(([rotulo, valor]) => <LinhaDetalhe key={rotulo} rotulo={rotulo} valor={valor} />)}</dl></section>
        <div className="grid gap-5 md:grid-cols-2"><Etiquetas titulo="Áreas de atuação" itens={item.areas_lista} /><Etiquetas titulo="Principais técnicas" itens={item.tecnicas_lista} cor="cyan" /></div>
        {(item.url || item.website) && <a href={item.url || (/^https?:/i.test(item.website) ? item.website : `https://${item.website}`)} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl border border-[#57269b] px-4 py-2.5 text-sm font-bold text-[#57269b] hover:bg-purple-50">Consultar registro de origem ↗</a>}
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl bg-slate-50 p-5"><h3 className="text-lg font-bold text-slate-900">Contato</h3>
          {item.contato && <p className="mt-3 font-bold text-slate-800">{item.contato}</p>}
          {item.telefone && <p className="mt-2 text-sm text-slate-600">📞 {item.telefone}</p>}
          {item.email && <p className="mt-1 break-all text-sm text-slate-600">✉ {item.email}</p>}
          {perfilUrl && <a href={perfilUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-purple-100 bg-white p-3 text-sm font-bold text-[#57269b] hover:border-purple-300">
            {fotoPesquisador ? <img src={fotoPesquisador} alt="" className="h-12 w-12 rounded-full bg-slate-100 object-cover" onError={(e) => e.currentTarget.remove()} /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">CT&I</span>}
            <span>Conheça o perfil no Observatório →</span></a>}
        </section>
        <section className="rounded-2xl border border-slate-200 p-5"><h3 className="text-lg font-bold text-slate-900">Solicitar contato</h3><p className="mb-4 mt-1 text-sm text-slate-500">Conte brevemente como pretende utilizar esta infraestrutura.</p><FormularioContato item={item} /></section>
      </aside>
    </div>
  </article>;
}

// Mantém o nome antigo disponível para integrações existentes, mas agora renderiza uma página,
// não uma janela sobreposta.
const DetalheVitrine = PainelDetalhe;
