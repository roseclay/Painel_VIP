// Adaptador exclusivo do preview estático no GitHub Pages. No servidor normal, a API Node
// continua sendo usada e este arquivo não interfere no funcionamento da aplicação.
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
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const textoBusca = (i) => [i.nome, i.sigla, i.instituicao, i.cidade, i.descricao, i.areas, i.tecnicas, i.modelo, i.marca, i.laboratorio].filter(Boolean).join(' ');
  const tema = (item) => temas.find(([, , re]) => re.test(textoBusca(item)))?.[0] || 'outros';

  async function carregar() {
    if (cache) return cache;
    const resposta = await fetch('dados/pnipe.json');
    if (!resposta.ok) throw new Error('Não foi possível carregar os dados demonstrativos do PNIPE.');
    const pnipe = await resposta.json();
    const labs = new Map(pnipe.laboratorios.map((l) => [String(l.id), l]));
    const laboratorios = pnipe.laboratorios.map((l) => ({
      id: `pnipe:lab:${l.id}`, id_origem: String(l.id), fonte: 'pnipe', tipo: 'laboratorio',
      nome: l.nome, sigla: l.sigla, instituicao: l.sigla_instituicao, instituicao_nome: l.instituicao_nome,
      cidade: l.cidade, estado: l.estado, descricao: l.descricao, areas: l.areas, tecnicas: l.tecnicas,
      compartilhado: l.compartilhado, compartilhamento: l.compartilhamento,
      latitude: l.latitude, longitude: l.longitude, imagem: l.imagem, url: l.url,
      endereco: [l.logradouro, l.numero, l.complemento, l.bairro, l.cep].filter(Boolean).join(', '),
      contato: l.contato, telefone: l.telefone, email: l.email, website: l.website,
      equipamentos: pnipe.equipamentos.filter((e) => String(e.lab) === String(l.id)).length,
    }));
    const equipamentos = pnipe.equipamentos.map((e) => {
      const lab = labs.get(String(e.lab)) || {};
      return {
        id: `pnipe:equip:${e.id}`, id_origem: String(e.id), fonte: 'pnipe', tipo: 'equipamento',
        nome: e.nome, sigla: e.sigla, instituicao: e.sigla_instituicao, cidade: e.cidade || lab.cidade,
        estado: e.estado || lab.estado, descricao: e.descricao, tecnicas: e.tecnicas,
        marca: e.marca, modelo: e.modelo, ano: e.ano, ativo: e.ativo, multiusuario: e.multiusuario,
        compartilhado: e.compartilhado, compartilhamento: e.compartilhamento,
        laboratorio: e.laboratorio_nome || lab.nome, laboratorio_id: String(e.lab),
        latitude: lab.latitude, longitude: lab.longitude, imagem: e.imagem, url: e.url,
        contato: e.contato, telefone: e.telefone, email: e.email, website: e.website,
        denominacoes: e.denominacoes, parametros: e.parametros,
      };
    });
    cache = [...laboratorios, ...equipamentos].map((item) => ({ ...item, tema: tema(item) }));
    return cache;
  }

  async function obterVitrine(params) {
    const fonte = params.get('fonte') || 'todos';
    const tipo = params.get('tipo') || 'todos';
    const instituicao = (params.get('instituicao') || '').toUpperCase();
    const temaSelecionado = params.get('tema') || '';
    const busca = normalizar(params.get('q') || '');
    const limite = Math.min(500, Math.max(24, Number(params.get('limite')) || 120));
    const catalogo = await carregar();
    const instituicoes = [...new Set(catalogo.map((i) => i.instituicao).filter(Boolean))].sort();
    let itens = fonte === 'vip' ? [] : catalogo.filter((item) => {
      if (tipo !== 'todos' && item.tipo !== tipo) return false;
      if (instituicao && item.instituicao !== instituicao) return false;
      if (temaSelecionado && item.tema !== temaSelecionado) return false;
      return !busca || normalizar(textoBusca(item)).includes(busca);
    });
    itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const pontosPorLocal = new Map();
    itens.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)).forEach((item) => {
      const chave = `${item.latitude.toFixed(6)}:${item.longitude.toFixed(6)}:${item.instituicao}`;
      const ponto = pontosPorLocal.get(chave) || { id: chave, nome: item.laboratorio || item.nome,
        instituicao: item.instituicao, cidade: item.cidade, latitude: item.latitude, longitude: item.longitude,
        total: 0, laboratorios: 0, equipamentos: 0, fonte: 'pnipe' };
      ponto.total++;
      ponto[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
      pontosPorLocal.set(chave, ponto);
    });
    const laboratorios = itens.filter((i) => i.tipo === 'laboratorio').length;
    const equipamentos = itens.length - laboratorios;
    return {
      total: itens.length, exibidos: Math.min(limite, itens.length), itens: itens.slice(0, limite),
      pontos: [...pontosPorLocal.values()],
      kpi: { laboratorios, equipamentos, fontes: itens.length ? 1 : 0, instituicoes: new Set(itens.map((i) => i.instituicao)).size },
      porFonte: { vip: 0, pnipe: itens.length },
      filtros: { instituicoes, temas: temas.map(([valor, rotulo]) => ({ valor, rotulo })).concat({ valor: 'outros', rotulo: 'Outras áreas' }) },
      avisos: ['Preview para validação: exibe os dados reais do PNIPE. A conexão ao banco VIP será habilitada somente no ambiente de servidor.'],
    };
  }

  return { obterVitrine };
})();
