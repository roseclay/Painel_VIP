// Catálogo estático usado no GitHub Pages. Ele combina os recortes públicos do VIP e
// do PNIPE no navegador; nenhuma credencial ou dado privado do backup é publicado.
window.Obs = window.Obs || {};

Obs.demo = (function () {
  // Grandes áreas apresentadas no mesmo vocabulário do painel da SNCT.
  // A classificação é derivada dos textos de área, técnica e descrição
  // porque VIP e PNIPE não usam uma taxonomia única neste campo.
  const temas = [
    ['agrarias', 'Ciências Agrárias', /agr[aá]r|agro|agric|solo|animal|veterin|alimento|pesca|aquic|zootec/i],
    ['biologicas', 'Ciências Biológicas', /biolog|biodivers|ecolog|bot[aâ]nic|zoolog|fauna|flora|gen[eé]tic|microbiol/i],
    ['saude', 'Ciências da Saúde', /sa[uú]de|medic|farm[aá]|odont|enferm|epidemi|imun|fisiolog|nutri/i],
    ['exatas', 'Ciências Exatas e da Terra', /qu[ií]mic|f[ií]sic|matem[aá]t|geolog|geof[ií]sic|ocean|meteor|estat[ií]st/i],
    ['humanas', 'Ciências Humanas', /human|educa|hist[oó]r|filosof|sociolog|antropolog|psicolog|geograf/i],
    ['sociais', 'Ciências Sociais Aplicadas', /direito|econom|administra|comunica|arquitet|urban|planejamento|turismo/i],
    ['engenharias', 'Engenharias', /engenh|tecnolog|computa|rob[oó]t|automa|materia|ind[uú]str|constru|energia|solar|e[oó]lic|petr[oó]leo|g[aá]s/i],
    ['letras_artes', 'Linguística, Letras e Artes', /lingu[ií]st|letras|literat|arte|m[uú]sic|design|voz|performance/i],
    ['multidisciplinar', 'Multidisciplinar', /multidisciplin|interdisciplin|sustent|ambient/i],
  ];
  let cache;
  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const lista = (s) => [...new Set(String(s || '').split(/[;\n|]+/).map((v) => v.trim()).filter((v) => v.length > 2))];
  const textoBusca = (i) => [i.nome, i.sigla, i.instituicao, i.instituicao_nome, i.cidade, i.descricao,
    i.areas, i.tecnicas, i.modelo, i.marca, i.laboratorio, i.contato, i.denominacoes].filter(Boolean).join(' ');
  const tema = (item) => temas.find(([, , re]) => re.test(textoBusca(item)))?.[0] || 'outros';
  const status = (valor) => valor === false || /^(i|inativo|false|0)$/i.test(String(valor || '')) ? 'I' : 'A';

  const palavrasLigacao = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  function tokensDoNome(nome) {
    return normalizar(nome).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter((token) => token && !palavrasLigacao.has(token));
  }

  function pontuacaoNome(origem, candidato) {
    const a = tokensDoNome(origem);
    const b = tokensDoNome(candidato);
    if (!a.length || !b.length) return 0;
    const usados = new Set();
    let correspondencias = 0;
    for (const token of a) {
      const indice = b.findIndex((outro, i) => !usados.has(i) && (
        token === outro || (token.length === 1 && outro[0] === token) || (outro.length === 1 && token[0] === outro)
      ));
      if (indice >= 0) {
        usados.add(indice);
        correspondencias += 1;
      }
    }
    const primeiroCompativel = a[0] === b[0] || (a[0][0] === b[0][0] && Math.min(a[0].length, b[0].length) <= 2);
    const ultimoCompativel = a[a.length - 1] === b[b.length - 1];
    if (!primeiroCompativel || !ultimoCompativel || correspondencias < 2) return 0;
    return 0.55 * (correspondencias / Math.max(a.length, b.length))
      + 0.45 * (correspondencias / Math.min(a.length, b.length));
  }

  function perfilDoContato(item, pesquisadores) {
    const nome = normalizar(item.contato);
    if (!nome) return item;
    let pesquisador = pesquisadores.porNome.get(nome);
    if (!pesquisador) {
      const candidatos = pesquisadores.lista
        .filter((p) => !item.instituicao || p.instituicao === item.instituicao)
        .map((p) => ({ pesquisador: p, pontos: pontuacaoNome(item.contato, p.nome) }))
        .sort((a, b) => b.pontos - a.pontos);
      const melhor = candidatos[0];
      const segundo = candidatos[1];
      // Aceita somente correspondência forte, exclusiva e dentro da mesma instituição.
      if (melhor?.pontos >= 0.75 && (!segundo || melhor.pontos - segundo.pontos >= 0.08)) {
        pesquisador = melhor.pesquisador;
      }
    }
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
    const pesquisadores = {
      lista: pesquisadoresLista || [],
      porNome: new Map((pesquisadoresLista || []).map((p) => [normalizar(p.nome), p])),
    };
    const labsPnipe = new Map(pnipe.laboratorios.map((l) => [String(l.id), l]));
    const contagemEquip = new Map();
    pnipe.equipamentos.forEach((e) => contagemEquip.set(String(e.lab), (contagemEquip.get(String(e.lab)) || 0) + 1));

    const laboratoriosPnipe = pnipe.laboratorios.map((l) => preparar({
      id: `pnipe:lab:${l.id}`, id_origem: String(l.id), fonte: 'pnipe', tipo: 'laboratorio', status: 'A',
      laboratorio_id: String(l.id),
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
      ...l, id: `vip:lab:${l.id}`, id_origem: String(l.id), laboratorio_id: String(l.id), fonte: 'vip', tipo: 'laboratorio',
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
        laboratorios: 0, equipamentos: 0, vip: 0, pnipe: 0, cidades: new Set(), areas: new Map(), grandesAreas: new Map(),
      };
      atual[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
      atual[item.fonte]++;
      if (item.cidade) atual.cidades.add(item.cidade);
      (item.areas_lista || []).forEach((area) => atual.areas.set(area, (atual.areas.get(area) || 0) + 1));
      if (item.tipo === 'laboratorio') {
        const valor = item.tema || 'outros';
        const rotulo = temas.find(([chave]) => chave === valor)?.[1] || 'Outras áreas';
        const grandeArea = atual.grandesAreas.get(valor) || { valor, rotulo, total: 0 };
        grandeArea.total += 1;
        atual.grandesAreas.set(valor, grandeArea);
      }
      mapa.set(item.instituicao, atual);
    });
    return [...mapa.values()].map(({ cidades, areas, grandesAreas, ...item }) => ({
      ...item, cidades: [...cidades].sort(),
      areas: [...areas].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area]) => area),
      temas: [...grandesAreas.values()].sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
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
    const laboratorio = params.get('laboratorio') || '';
    const cidade = normalizar(params.get('cidade') || '');
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
      if (laboratorio && String(item.laboratorio_id || '') !== laboratorio) return false;
      if (cidade && normalizar(item.cidade) !== cidade) return false;
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
    const municipiosPorNome = new Map();
    itens.forEach((item) => {
      if (!item.cidade) return;
      const chave = normalizar(item.cidade);
      const atual = municipiosPorNome.get(chave) || { cidade: item.cidade, total: 0, laboratorios: 0, equipamentos: 0 };
      atual.total += 1;
      atual[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos'] += 1;
      municipiosPorNome.set(chave, atual);
    });
    const municipios = [...municipiosPorNome.values()];
    const laboratorios = itens.filter((i) => i.tipo === 'laboratorio').length;
    const equipamentos = itens.length - laboratorios;
    return {
      total: itens.length, exibidos: Math.min(limite, itens.length), itens: itens.slice(0, limite), pontos, municipios,
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
