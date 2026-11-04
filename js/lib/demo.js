// Catálogo estático usado no GitHub Pages. Ele combina os recortes públicos do VIP e
// do PNIPE no navegador; nenhuma credencial ou dado privado do backup é publicado.
window.Obs = window.Obs || {};

Obs.demo = (function () {
  const temas = [
    ['biologia', 'Biologia e biodiversidade', /biolog|biodivers|ecolog|bot[aâ]nic|zoolog|fauna|flora|ambient/i],
    ['saude', 'Saúde e ciências da vida', /sa[uú]de|medic|farm[aá]|odont|enferm|epidemi|imun|bioqu[ií]m/i],
    ['agro', 'Ciências agrárias', /agr[aá]r|agro|agric|solo|animal|veterin|alimento|pesca|aquic/i],
    ['engenharia', 'Engenharia e tecnologia', /engenh|tecnolog|computa|rob[oó]t|automa|materia|ind[uú]str|constru/i],
    ['energia', 'Energia e sustentabilidade', /energia|solar|e[oó]lic|sustent|combust|petr[oó]leo|g[aá]s|carbono/i],
    ['exatas', 'Ciências exatas e da Terra', /qu[ií]mic|f[ií]sic|matem[aá]t|geolog|geof[ií]sic|ocean|meteor/i],
    ['humanas', 'Humanidades e ciências sociais', /human|sociais|educa|hist[oó]r|cultur|arte|m[uú]sic|lingu|direito|econom/i],
  ];
  let cache;
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const lista = (s) => [...new Set(String(s || '').split(/[;\n|]+/).map((v) => v.trim()).filter((v) => v.length > 2))];
  const textoBusca = (i) => [i.nome, i.sigla, i.instituicao, i.instituicao_nome, i.cidade, i.descricao,
    i.areas, i.tecnicas, i.modelo, i.marca, i.laboratorio, i.contato, i.denominacoes].filter(Boolean).join(' ');
  const tema = (item) => temas.find(([, , re]) => re.test(textoBusca(item)))?.[0] || 'outros';
  const status = (valor) => valor === false || /^(i|inativo|false|0)$/i.test(String(valor || '')) ? 'I' : 'A';

  function perfilDoContato(item, pesquisadores) {
    const nome = normalizar(item.contato);
    if (!nome) return item;
    const pesquisador = pesquisadores.get(nome);
    if (!pesquisador) return item;
    return { ...item, pesquisador_id: pesquisador.id, pesquisador_nome: pesquisador.nome,
      pesquisador_foto: pesquisador.foto, pesquisador_instituicao: pesquisador.instituicao };
  }

  function preparar(item, pesquisadores) {
    const pronto = {
      ...item,
      tema: tema(item),
      status: status(item.status ?? item.ativo),
      areas_lista: lista(item.areas),
      tecnicas_lista: lista(item.tecnicas),
    };
    return perfilDoContato(pronto, pesquisadores);
  }

  async function carregar() {
    if (cache) return cache;
    const [pnipeResposta, vipResposta, pesquisadoresResposta] = await Promise.all([
      fetch('dados/pnipe.json'), fetch('dados/vip.json'), fetch('dados/pesquisadores.json').catch(() => null),
    ]);
    if (!pnipeResposta.ok) throw new Error('Não foi possível carregar os dados do PNIPE.');
    if (!vipResposta.ok) throw new Error('Não foi possível carregar os dados do VIP.');
    const [pnipe, vip, pesquisadoresLista] = await Promise.all([
      pnipeResposta.json(), vipResposta.json(),
      pesquisadoresResposta?.ok ? pesquisadoresResposta.json() : Promise.resolve([]),
    ]);
    const pesquisadores = new Map((pesquisadoresLista || []).map((p) => [normalizar(p.nome), p]));
    const labsPnipe = new Map(pnipe.laboratorios.map((l) => [String(l.id), l]));
    const contagemEquip = new Map();
    pnipe.equipamentos.forEach((e) => contagemEquip.set(String(e.lab), (contagemEquip.get(String(e.lab)) || 0) + 1));

    const laboratoriosPnipe = pnipe.laboratorios.map((l) => preparar({
      id: `pnipe:lab:${l.id}`, id_origem: String(l.id), fonte: 'pnipe', tipo: 'laboratorio', status: 'A',
      nome: l.nome, sigla: l.sigla, instituicao: l.sigla_instituicao, instituicao_nome: l.instituicao_nome,
      cidade: l.cidade, estado: l.estado, descricao: l.descricao, areas: l.areas, tecnicas: l.tecnicas,
      compartilhado: l.compartilhado, compartilhamento: l.compartilhamento,
      latitude: l.latitude, longitude: l.longitude, imagem: l.imagem, url: l.url,
      endereco: [l.logradouro, l.numero, l.complemento, l.bairro, l.cep].filter(Boolean).join(', '),
      contato: l.contato, telefone: l.telefone, email: l.email, website: l.website,
      equipamentos: contagemEquip.get(String(l.id)) || 0,
    }, pesquisadores));

    const equipamentosPnipe = pnipe.equipamentos.map((e) => {
      const lab = labsPnipe.get(String(e.lab)) || {};
      return preparar({
        id: `pnipe:equip:${e.id}`, id_origem: String(e.id), fonte: 'pnipe', tipo: 'equipamento',
        nome: e.nome, sigla: e.sigla, instituicao: e.sigla_instituicao, instituicao_nome: lab.instituicao_nome,
        cidade: e.cidade || lab.cidade, estado: e.estado || lab.estado, descricao: e.descricao,
        areas: e.areas || lab.areas, tecnicas: e.tecnicas || lab.tecnicas,
        marca: e.marca, modelo: e.modelo, ano: e.ano, ativo: e.ativo, status: e.ativo,
        multiusuario: e.multiusuario, compartilhado: e.compartilhado, compartilhamento: e.compartilhamento,
        laboratorio: e.laboratorio_nome || lab.nome, laboratorio_id: String(e.lab),
        latitude: lab.latitude, longitude: lab.longitude, imagem: e.imagem, url: e.url,
        contato: e.contato || lab.contato, telefone: e.telefone || lab.telefone,
        email: e.email || lab.email, website: e.website || lab.website,
        denominacoes: e.denominacoes, parametros: e.parametros,
      }, pesquisadores);
    });

    const laboratoriosVip = vip.laboratorios.map((l) => preparar({
      ...l, id: `vip:lab:${l.id}`, id_origem: String(l.id), fonte: 'vip', tipo: 'laboratorio',
    }, pesquisadores));
    const equipamentosVip = vip.equipamentos.map((e) => preparar({
      ...e, id: `vip:equip:${e.id}`, id_origem: String(e.id), fonte: 'vip', tipo: 'equipamento',
    }, pesquisadores));
    cache = [...laboratoriosVip, ...equipamentosVip, ...laboratoriosPnipe, ...equipamentosPnipe];
    return cache;
  }

  function opcoesFrequentes(itens, chave, limite = 160) {
    const contagem = new Map();
    itens.forEach((item) => (item[chave] || []).forEach((valor) => {
      const k = normalizar(valor);
      const atual = contagem.get(k) || { valor, total: 0 };
      atual.total++;
      contagem.set(k, atual);
    }));
    return [...contagem.values()].sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor, 'pt-BR')).slice(0, limite);
  }

  function agregarInstituicoes(itens) {
    const mapa = new Map();
    itens.forEach((item) => {
      if (!item.instituicao) return;
      const atual = mapa.get(item.instituicao) || {
        sigla: item.instituicao, nome: item.instituicao_nome || item.instituicao,
        laboratorios: 0, equipamentos: 0, vip: 0, pnipe: 0, cidades: new Set(), areas: new Map(),
      };
      atual[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
      atual[item.fonte]++;
      if (item.cidade) atual.cidades.add(item.cidade);
      (item.areas_lista || []).forEach((area) => atual.areas.set(area, (atual.areas.get(area) || 0) + 1));
      mapa.set(item.instituicao, atual);
    });
    return [...mapa.values()].map(({ cidades, areas, ...item }) => ({
      ...item, cidades: [...cidades].sort(),
      areas: [...areas].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area]) => area),
    })).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
  }

  async function obterVitrine(params) {
    const fonte = params.get('fonte') || 'todos';
    const tipo = params.get('tipo') || 'todos';
    const instituicao = (params.get('instituicao') || '').toUpperCase();
    const temaSelecionado = params.get('tema') || '';
    const area = normalizar(params.get('area') || '');
    const tecnica = normalizar(params.get('tecnica') || '');
    const situacao = params.get('status') || '';
    const busca = normalizar(params.get('q') || '');
    const limite = Math.min(500, Math.max(24, Number(params.get('limite')) || 180));
    const catalogo = await carregar();
    const baseDaFonte = fonte === 'todos' ? catalogo : catalogo.filter((i) => i.fonte === fonte);
    const instituicoesTodas = agregarInstituicoes(baseDaFonte);
    let itens = baseDaFonte.filter((item) => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false;
      if (instituicao && item.instituicao !== instituicao) return false;
      if (temaSelecionado && item.tema !== temaSelecionado) return false;
      if (area && !item.areas_lista.some((v) => normalizar(v) === area)) return false;
      if (tecnica && !item.tecnicas_lista.some((v) => normalizar(v) === tecnica)) return false;
      if (situacao && item.status !== (situacao === 'inativo' ? 'I' : 'A')) return false;
      return !busca || normalizar(textoBusca(item)).includes(busca);
    });
    itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const pontosPorLocal = new Map();
    itens.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)).forEach((item) => {
      const chave = `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}:${item.instituicao}`;
      const ponto = pontosPorLocal.get(chave) || {
        id: chave, nome: item.laboratorio || item.nome, instituicao: item.instituicao, cidade: item.cidade,
        latitude: item.latitude, longitude: item.longitude, total: 0, laboratorios: 0, equipamentos: 0, fontes: new Set(),
      };
      ponto.total++;
      ponto[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
      ponto.fontes.add(item.fonte);
      pontosPorLocal.set(chave, ponto);
    });
    const pontos = [...pontosPorLocal.values()].map(({ fontes, ...p }) => ({ ...p, fonte: fontes.size > 1 ? 'ambas' : [...fontes][0] }));
    const laboratorios = itens.filter((i) => i.tipo === 'laboratorio').length;
    const equipamentos = itens.length - laboratorios;
    return {
      total: itens.length, exibidos: Math.min(limite, itens.length), itens: itens.slice(0, limite), pontos,
      itemPorId: Object.fromEntries(itens.slice(0, limite).map((i) => [i.id, i])),
      instituicoes: agregarInstituicoes(itens),
      kpi: { laboratorios, equipamentos, fontes: new Set(itens.map((i) => i.fonte)).size, instituicoes: new Set(itens.map((i) => i.instituicao)).size },
      porFonte: { vip: itens.filter((i) => i.fonte === 'vip').length, pnipe: itens.filter((i) => i.fonte === 'pnipe').length },
      filtros: {
        instituicoes: instituicoesTodas,
        temas: temas.map(([valor, rotulo]) => ({ valor, rotulo })).concat({ valor: 'outros', rotulo: 'Outras áreas' }),
        areas: opcoesFrequentes(baseDaFonte, 'areas_lista'), tecnicas: opcoesFrequentes(baseDaFonte, 'tecnicas_lista'),
      },
      avisos: [],
    };
  }

  return { obterVitrine, carregar };
})();
