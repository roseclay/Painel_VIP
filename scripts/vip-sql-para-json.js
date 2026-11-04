const fs = require('fs');
const path = require('path');

function argumento(nome, padrao) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : padrao;
}

const entrada = path.resolve(argumento('input', path.join(__dirname, '..', 'vipdb_bkp.sql')));
const saida = path.resolve(argumento('output', path.join(__dirname, '..', 'public', 'dados', 'vip.json')));
const pnipePath = path.resolve(argumento('pnipe', path.join(__dirname, '..', 'dados', 'pnipe.json')));
const pesquisadoresPath = argumento('pesquisadores', '');
const pesquisadoresSaida = path.resolve(argumento('pesquisadores-output', path.join(__dirname, '..', 'public', 'dados', 'pesquisadores.json')));
const imgBase = String(argumento('img-base', 'https://vip.uesc.br/storage/uesc')).replace(/\/$/, '');

const tabelasNecessarias = new Set([
  'INS_Instituicao', 'CAM_Campus', 'LOC_Localizacao', 'TEPF_Tipo_EspFisico',
  'EPF_Espaco_Fisico', 'FAB_Fabricante', 'MAR_Marca', 'EQP_Equipamento',
  'USU_Usuario', 'PES_Pessoa', 'EPFP_EspFisico_Pessoa',
  'EPFI_EspFisico_Imagem', 'EQPI_Equipamento_Imagem',
]);

function lerValor(lista, inicio) {
  let i = inicio;
  while (/\s/.test(lista[i] || '')) i++;
  const prefixoN = lista[i] === 'N' && lista[i + 1] === "'";
  if (prefixoN || lista[i] === "'") {
    if (prefixoN) i++;
    i++;
    let valor = '';
    while (i < lista.length) {
      if (lista[i] === "'" && lista[i + 1] === "'") {
        valor += "'";
        i += 2;
      } else if (lista[i] === "'") {
        i++;
        break;
      } else {
        valor += lista[i++];
      }
    }
    while (/\s/.test(lista[i] || '')) i++;
    return { valor, proximo: lista[i] === ',' ? i + 1 : i };
  }
  const fim = lista.indexOf(',', i);
  const proximo = fim < 0 ? lista.length : fim + 1;
  const bruto = lista.slice(i, fim < 0 ? lista.length : fim).trim();
  return { valor: /^null$/i.test(bruto) ? null : bruto, proximo };
}

function lerValores(lista) {
  const valores = [];
  let i = 0;
  while (i < lista.length) {
    const lido = lerValor(lista, i);
    valores.push(lido.valor);
    if (lido.proximo <= i) break;
    i = lido.proximo;
  }
  return valores;
}

function extrairTabelas(sql) {
  const tabelas = new Map();
  const linhas = sql.split(/\r?\n/);
  const re = /^INSERT INTO \[dbo\]\.\[([^\]]+)\] \((.*)\) VALUES \((.*)\)$/;
  for (const linha of linhas) {
    const match = linha.match(re);
    if (!match || !tabelasNecessarias.has(match[1])) continue;
    const colunas = [...match[2].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    const valores = lerValores(match[3]);
    const registro = Object.fromEntries(colunas.map((coluna, i) => [coluna, valores[i] ?? null]));
    if (!tabelas.has(match[1])) tabelas.set(match[1], []);
    tabelas.get(match[1]).push(registro);
  }
  return Object.fromEntries(tabelas);
}

const texto = (valor) => {
  const limpo = valor == null ? '' : String(valor).trim();
  return limpo || null;
};
const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};
const normalizar = (valor) => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const indexar = (linhas, chave) => new Map((linhas || []).map((linha) => [String(linha[chave]), linha]));
const primeiraAtiva = (linhas, fk, id, status) => (linhas || []).find((linha) => String(linha[fk]) === String(id) && (!status || linha[status] === 'A'));

function pesquisadoresPublicos() {
  if (!pesquisadoresPath) return [];
  const arquivoPesquisadores = path.resolve(pesquisadoresPath);
  const fonte = JSON.parse(fs.readFileSync(arquivoPesquisadores, 'utf8'));
  const raizPesquisadores = path.dirname(path.dirname(arquivoPesquisadores));
  const linhas = Array.isArray(fonte) ? fonte : (fonte.data || []);
  const publicos = linhas.map((p) => ({
    id: texto(p.id), nome: texto(p.name || p.nome), instituicao: texto(p['SIGLA IA'] || p.instituicao),
    cidade: texto(p.city || p.cidade),
    foto: p.id && fs.existsSync(path.join(raizPesquisadores, 'assets', 'carousel', `${p.id}.webp`)) ? `assets/carousel/${p.id}.webp` : null,
  })).filter((p) => p.id && p.nome);
  fs.mkdirSync(path.dirname(pesquisadoresSaida), { recursive: true });
  fs.writeFileSync(pesquisadoresSaida, `${JSON.stringify(publicos)}\n`);
  return publicos;
}

function centroidesPnipe() {
  const dados = JSON.parse(fs.readFileSync(pnipePath, 'utf8'));
  const agrupar = (chave) => {
    const grupos = new Map();
    for (const lab of dados.laboratorios || []) {
      if (!Number.isFinite(lab.latitude) || !Number.isFinite(lab.longitude)) continue;
      const valor = normalizar(lab[chave]);
      if (!valor) continue;
      const grupo = grupos.get(valor) || { latitude: 0, longitude: 0, total: 0 };
      grupo.latitude += lab.latitude;
      grupo.longitude += lab.longitude;
      grupo.total++;
      grupos.set(valor, grupo);
    }
    return new Map([...grupos].map(([k, v]) => [k, { latitude: v.latitude / v.total, longitude: v.longitude / v.total }]));
  };
  return { porInstituicao: agrupar('sigla_instituicao'), porCidade: agrupar('cidade') };
}

function principalResponsavel(dados, epf, usuarios, pessoas) {
  let pessoa;
  let usuario;
  if (epf.epf_cd_usuario_responsavel) {
    usuario = usuarios.get(String(epf.epf_cd_usuario_responsavel));
    pessoa = usuario && pessoas.get(String(usuario.usu_cd_pessoa));
  }
  if (!pessoa) {
    const vinculo = (dados.EPFP_EspFisico_Pessoa || []).find((v) => String(v.epfp_cd_epf) === String(epf.epf_cd_espfisico) && v.epfp_st_responsavel === 'S');
    pessoa = vinculo && pessoas.get(String(vinculo.epfp_cd_pessoa));
  }
  return pessoa ? {
    nome: texto(pessoa.pes_nm_pessoa), telefone: texto(pessoa.pes_tel_contato),
    email: texto(usuario && usuario.usu_ds_email), lattes: texto(pessoa.pes_lattes),
  } : {};
}

function gerar() {
  if (!fs.existsSync(entrada)) throw new Error(`Dump não encontrado: ${entrada}`);
  const dados = extrairTabelas(fs.readFileSync(entrada, 'utf8'));
  const pesquisadores = pesquisadoresPublicos();
  const pesquisadorPorNome = new Map(pesquisadores.map((p) => [normalizar(p.nome), p]));
  const centroides = centroidesPnipe();

  const instituicoes = indexar(dados.INS_Instituicao, 'ins_cd_instituicao');
  const campi = indexar(dados.CAM_Campus, 'cam_cd_campus');
  const locais = indexar(dados.LOC_Localizacao, 'loc_cd_localizacao');
  const tipos = indexar(dados.TEPF_Tipo_EspFisico, 'tepf_cd_tipo_espaco_fisico');
  const fabricantes = indexar(dados.FAB_Fabricante, 'fab_cd_fabricante');
  const marcas = indexar(dados.MAR_Marca, 'mar_id');
  const usuarios = indexar(dados.USU_Usuario, 'usu_cd_usuario');
  const pessoas = indexar(dados.PES_Pessoa, 'pes_cd_pessoa');
  const epfs = indexar(dados.EPF_Espaco_Fisico, 'epf_cd_espfisico');
  const equipamentosPorLab = new Map();
  for (const eqp of dados.EQP_Equipamento || []) {
    const chave = String(eqp.eqp_cd_espaco_fisico);
    if (!equipamentosPorLab.has(chave)) equipamentosPorLab.set(chave, []);
    equipamentosPorLab.get(chave).push(eqp);
  }

  const contextoLab = (epf) => {
    const local = locais.get(String(epf.epf_cd_localizacao)) || {};
    const campus = campi.get(String(local.loc_cd_campus)) || {};
    const instituicao = instituicoes.get(String(campus.cam_cd_instituicao)) || {};
    const sigla = texto(instituicao.ins_sg_instituicao) || 'VIP';
    const cidade = texto(campus.cam_nm_cidade);
    const coord = centroides.porInstituicao.get(normalizar(sigla)) || centroides.porCidade.get(normalizar(cidade)) || {};
    const responsavel = principalResponsavel(dados, epf, usuarios, pessoas);
    const perfil = pesquisadorPorNome.get(normalizar(responsavel.nome));
    return { local, campus, instituicao, sigla, cidade, coord, responsavel, perfil };
  };

  const laboratorios = (dados.EPF_Espaco_Fisico || []).filter((epf) => epf.epf_status === 'A').map((epf) => {
    const c = contextoLab(epf);
    const foto = primeiraAtiva(dados.EPFI_EspFisico_Imagem, 'epfi_cd_epf', epf.epf_cd_espfisico, 'epfi_status');
    return {
      id: String(epf.epf_cd_espfisico), nome: texto(epf.epf_nm_espfisico), sigla: texto(epf.epf_sg_espfisico),
      descricao: texto(epf.epf_ds_espfisico), areas: texto(epf.epf_ds_areas), tecnicas: texto(epf.epf_ds_atividades),
      palavras_chave: texto(epf.epf_ds_palavras_chave), status: epf.epf_status, subtipo: texto((tipos.get(String(epf.epf_cd_tipo_epf)) || {}).tepf_nm_tipo_epf),
      instituicao: c.sigla, instituicao_nome: texto(c.instituicao.ins_nm_nome), campus: texto(c.campus.cam_nm_campus),
      local: texto(c.local.loc_nm_localizacao), sala: texto(epf.epf_cd_sala), cidade: c.cidade, estado: texto(c.campus.cam_sg_estado),
      endereco: [c.campus.cam_ds_endereco, c.campus.cam_ds_complemento, c.campus.cam_nm_bairro, c.campus.cam_nu_cep].map(texto).filter(Boolean).join(', ') || null,
      latitude: c.coord.latitude, longitude: c.coord.longitude, capacidade: numero(epf.epf_nu_capacidade),
      compartilhado: epf.epf_st_multiusuario === 'S', ensino: epf.epf_st_ensino === 'S', pesquisa: epf.epf_st_pesquisa === 'S', extensao: epf.epf_st_extensao === 'S',
      contato: c.responsavel.nome, telefone: texto(epf.epf_tel_contato) || c.responsavel.telefone,
      email: c.responsavel.email || texto(c.campus.cam_email), website: texto(epf.epf_website), lattes: c.responsavel.lattes,
      pesquisador_id: c.perfil?.id || null, pesquisador_nome: c.perfil?.nome || null,
      imagem: foto?.epfi_nm_hash ? `${imgBase}/epf/${encodeURIComponent(foto.epfi_nm_hash)}` : null,
      equipamentos: (equipamentosPorLab.get(String(epf.epf_cd_espfisico)) || []).length,
    };
  }).filter((lab) => lab.nome);

  const laboratoriosAtivos = new Set(laboratorios.map((lab) => lab.id));
  const laboratoriosPorId = new Map(laboratorios.map((lab) => [lab.id, lab]));
  const equipamentos = (dados.EQP_Equipamento || []).filter((eqp) => laboratoriosAtivos.has(String(eqp.eqp_cd_espaco_fisico))).map((eqp) => {
    const lab = laboratoriosPorId.get(String(eqp.eqp_cd_espaco_fisico));
    const foto = primeiraAtiva(dados.EQPI_Equipamento_Imagem, 'eqpi_cd_eqp', eqp.eqp_cd_equipamento, 'eqpi_status');
    const fabricante = fabricantes.get(String(eqp.eqp_cd_fabricante)) || {};
    const marca = marcas.get(String(eqp.eqp_cd_marca)) || {};
    return {
      id: String(eqp.eqp_cd_equipamento), nome: texto(eqp.eqp_nm_equipamento), sigla: texto(eqp.eqp_sigla),
      descricao: texto(eqp.eqp_ds_descricao), modelo: texto(eqp.eqp_ds_modelo), marca: texto(marca.mar_nome) || texto(fabricante.fab_nm_fabricante),
      ano: numero(eqp.eqp_nu_ano_aquisicao) > 1900 ? numero(eqp.eqp_nu_ano_aquisicao) : null,
      quantidade: numero(eqp.eqp_quantidade), status: eqp.eqp_status, denominacoes: texto(eqp.eqp_outras_denominacoes),
      codigo: texto(eqp.eqp_cod_codigo), tombo: texto(eqp.eqp_nu_tombo), website: texto(eqp.eqp_link_site_fabricante),
      laboratorio_id: lab.id, laboratorio: lab.nome, instituicao: lab.instituicao, instituicao_nome: lab.instituicao_nome,
      cidade: lab.cidade, estado: lab.estado, latitude: lab.latitude, longitude: lab.longitude,
      areas: lab.areas, tecnicas: lab.tecnicas, compartilhado: lab.compartilhado,
      contato: lab.contato, telefone: lab.telefone, email: lab.email, lattes: lab.lattes,
      pesquisador_id: lab.pesquisador_id, pesquisador_nome: lab.pesquisador_nome,
      imagem: foto?.eqpi_nm_hash ? `${imgBase}/eqp/${encodeURIComponent(foto.eqpi_nm_hash)}` : null,
    };
  }).filter((eqp) => eqp.nome);

  const publicacao = {
    fonte: 'Backup integral do VIP (recorte público)', gerado_em: new Date().toISOString(),
    privacidade: 'Exporta somente campos necessários à vitrine; credenciais, CPF e nascimento foram excluídos.',
    laboratorios, equipamentos,
  };
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, `${JSON.stringify(publicacao)}\n`);
  console.log(JSON.stringify({
    saida, laboratorios: laboratorios.length, equipamentos: equipamentos.length,
    ativos: equipamentos.filter((e) => e.status === 'A').length,
    inativos: equipamentos.filter((e) => e.status === 'I').length,
    pesquisadores: pesquisadores.length,
    vinculos: [...laboratorios, ...equipamentos].filter((i) => i.pesquisador_id).length,
  }, null, 2));
}

gerar();
