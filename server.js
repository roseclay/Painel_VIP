const path = require('path');
const fs = require('fs');
const express = require('express');
const sql = require('mssql');

// Carrega .env sem dependência extra (process.loadEnvFile existe no Node >= 20.12)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile) && process.loadEnvFile) process.loadEnvFile(envFile);

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true, trustServerCertificate: false },
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 30000,
};

let poolPromise;
const getPool = () => (poolPromise ??= new sql.ConnectionPool(config).connect().catch((e) => {
  poolPromise = undefined;
  throw e;
}));

const IMG_BASE = (process.env.IMG_BASE || 'https://vip.uesc.br/storage/uesc').replace(/\/$/, '');
const imgUrl = (pasta, hash) => (hash ? `${IMG_BASE}/${pasta}/${encodeURIComponent(hash)}` : null);

const app = express();
// Campos do legado vêm com espaços em branco; normaliza para null
app.set('json replacer', (k, v) => (typeof v === 'string' ? v.trim() || null : v));
app.use(express.static(path.join(__dirname, 'public')));

// Falhas de rede/conexão (o Azure SQL derruba conexões ociosas): recria o pool e tenta mais uma vez.
const erroDeConexao = (e) => ['ESOCKET', 'ECONNCLOSED', 'ETIMEOUT', 'ECONNRESET', 'ENOTOPEN'].includes(e.code)
  || /socket hang up|Connection lost|closed/i.test(e.message);

const wrap = (fn) => async (req, res) => {
  try {
    try {
      await fn(req, res);
    } catch (e) {
      if (!erroDeConexao(e) || res.headersSent) throw e;
      console.warn(`Conexão com o banco falhou (${e.message}); tentando de novo.`);
      const velho = poolPromise;
      poolPromise = undefined;
      velho?.then((p) => p.close()).catch(() => {});
      await fn(req, res);
    }
  } catch (e) {
    console.error(e.message);
    if (!res.headersSent) res.status(500).json({ erro: 'Falha ao consultar o banco de dados.' });
  }
};

const LAB_BASE = `
  FROM EPF_Espaco_Fisico e
  JOIN TEPF_Tipo_EspFisico t ON t.tepf_cd_tipo_espaco_fisico = e.epf_cd_tipo_epf
  JOIN LOC_Localizacao l ON l.loc_cd_localizacao = e.epf_cd_localizacao
  JOIN CAM_Campus c ON c.cam_cd_campus = l.loc_cd_campus
  JOIN INS_Instituicao i ON i.ins_cd_instituicao = c.cam_cd_instituicao
  WHERE e.epf_status = 'A'`;

// Monta o WHERE dos filtros (compartilhado entre a lista e o resumo) e registra os parâmetros em `r`.
function filtrosLab(query, r) {
  const { q, tipo, local, campus, finalidade, multiusuario } = query;
  let where = '';

  const termo = (q || '').trim().slice(0, 100);
  if (termo) {
    r.input('q', sql.VarChar(102), `%${termo}%`);
    where += ` AND (e.epf_nm_espfisico LIKE @q OR e.epf_sg_espfisico LIKE @q OR e.epf_ds_espfisico LIKE @q
      OR e.epf_ds_areas LIKE @q OR e.epf_ds_atividades LIKE @q OR e.epf_ds_palavras_chave LIKE @q
      OR l.loc_nm_localizacao LIKE @q OR e.epf_cd_sala LIKE @q
      OR EXISTS (SELECT 1 FROM EQP_Equipamento q WHERE q.eqp_cd_espaco_fisico = e.epf_cd_espfisico
                 AND q.eqp_status = 'A' AND (q.eqp_nm_equipamento LIKE @q OR q.eqp_outras_denominacoes LIKE @q)))`;
  }
  for (const [nome, valor, col] of [['tipo', tipo, 't.tepf_cd_tipo_espaco_fisico'],
    ['local', local, 'l.loc_cd_localizacao'], ['campus', campus, 'c.cam_cd_campus']]) {
    const n = parseInt(valor, 10);
    if (Number.isInteger(n)) { r.input(nome, sql.Int, n); where += ` AND ${col} = @${nome}`; }
  }
  const col = { ensino: 'epf_st_ensino', pesquisa: 'epf_st_pesquisa', extensao: 'epf_st_extensao' }[finalidade];
  if (col) where += ` AND e.${col} = 'S'`;
  if (multiusuario === '1') where += ` AND e.epf_st_multiusuario = 'S'`;
  return where;
}

// Opções dos filtros
app.get('/api/filtros', wrap(async (req, res) => {
  const pool = await getPool();
  const [tipos, locais, campi] = await Promise.all([
    pool.request().query(`SELECT t.tepf_cd_tipo_espaco_fisico id, t.tepf_nm_tipo_epf nome, COUNT(*) total
      ${LAB_BASE} GROUP BY t.tepf_cd_tipo_espaco_fisico, t.tepf_nm_tipo_epf ORDER BY total DESC`),
    pool.request().query(`SELECT l.loc_cd_localizacao id, l.loc_nm_localizacao nome, COUNT(*) total
      ${LAB_BASE} GROUP BY l.loc_cd_localizacao, l.loc_nm_localizacao ORDER BY total DESC`),
    pool.request().query(`SELECT c.cam_cd_campus id, c.cam_nm_campus nome, i.ins_sg_instituicao instituicao, COUNT(*) total
      ${LAB_BASE} GROUP BY c.cam_cd_campus, c.cam_nm_campus, i.ins_sg_instituicao ORDER BY total DESC`),
  ]);
  res.json({ tipos: tipos.recordset, locais: locais.recordset, campi: campi.recordset });
}));

// Indicadores agregados dos laboratórios que passam nos filtros
app.get('/api/resumo', wrap(async (req, res) => {
  const pool = await getPool();
  const r = pool.request();
  const w = filtrosLab(req.query, r);
  const labs = `SELECT e.epf_cd_espfisico ${LAB_BASE} ${w}`;
  const run = async (sqlText) => (await r.query(sqlText)).recordset;

  const [kpi, porTipo, porLocal, finalidades, topLabs, topFabricantes, porAno, topCursos] = [
    await run(`SELECT
      (SELECT COUNT(*) FROM (${labs}) x) laboratorios,
      (SELECT COUNT(*) FROM EQP_Equipamento q WHERE q.eqp_status = 'A' AND q.eqp_cd_espaco_fisico IN (${labs})) equipamentos,
      (SELECT ISNULL(SUM(q.eqp_quantidade), 0) FROM EQP_Equipamento q WHERE q.eqp_status = 'A' AND q.eqp_cd_espaco_fisico IN (${labs})) unidades,
      (SELECT COUNT(DISTINCT e.epf_cd_localizacao) FROM EPF_Espaco_Fisico e WHERE e.epf_cd_espfisico IN (${labs})) locais,
      (SELECT COUNT(DISTINCT x.epfc_cd_crs) FROM EPFC_EspFisico_Curso x WHERE x.epfc_cd_epf IN (${labs})) cursos`),
    await run(`SELECT t.tepf_nm_tipo_epf nome, COUNT(*) total ${LAB_BASE} ${w} GROUP BY t.tepf_nm_tipo_epf ORDER BY total DESC`),
    await run(`SELECT l.loc_cd_localizacao id, l.loc_nm_localizacao nome, c.cam_nm_campus campus, c.cam_ds_endereco endereco,
        c.cam_nm_bairro bairro, c.cam_nm_cidade cidade, c.cam_sg_estado estado, i.ins_sg_instituicao instituicao,
        COUNT(*) total,
        SUM(ISNULL(ec.n, 0)) equipamentos
      ${LAB_BASE.replace('WHERE', `LEFT JOIN (SELECT eqp_cd_espaco_fisico id, COUNT(*) n FROM EQP_Equipamento
        WHERE eqp_status = 'A' GROUP BY eqp_cd_espaco_fisico) ec ON ec.id = e.epf_cd_espfisico WHERE`)} ${w}
      GROUP BY l.loc_cd_localizacao, l.loc_nm_localizacao, c.cam_nm_campus, c.cam_ds_endereco, c.cam_nm_bairro,
        c.cam_nm_cidade, c.cam_sg_estado, i.ins_sg_instituicao
      ORDER BY total DESC`),
    await run(`SELECT
      SUM(CASE WHEN e.epf_st_ensino = 'S' THEN 1 ELSE 0 END) Ensino,
      SUM(CASE WHEN e.epf_st_pesquisa = 'S' THEN 1 ELSE 0 END) Pesquisa,
      SUM(CASE WHEN e.epf_st_extensao = 'S' THEN 1 ELSE 0 END) Extensão,
      SUM(CASE WHEN e.epf_st_multiusuario = 'S' THEN 1 ELSE 0 END) Multiusuário
      ${LAB_BASE} ${w}`),
    await run(`SELECT TOP 10 e.epf_cd_espfisico id, e.epf_nm_espfisico nome, COUNT(*) total
      FROM EQP_Equipamento q JOIN EPF_Espaco_Fisico e ON e.epf_cd_espfisico = q.eqp_cd_espaco_fisico
      WHERE q.eqp_status = 'A' AND e.epf_cd_espfisico IN (${labs})
      GROUP BY e.epf_cd_espfisico, e.epf_nm_espfisico ORDER BY total DESC`),
    await run(`SELECT TOP 10 f.fab_nm_fabricante nome, COUNT(*) total
      FROM EQP_Equipamento q JOIN FAB_Fabricante f ON f.fab_cd_fabricante = q.eqp_cd_fabricante
      WHERE q.eqp_status = 'A' AND f.fab_nm_fabricante <> 'Não Informado' AND q.eqp_cd_espaco_fisico IN (${labs})
      GROUP BY f.fab_nm_fabricante ORDER BY total DESC`),
    await run(`SELECT q.eqp_nu_ano_aquisicao ano, COUNT(*) total FROM EQP_Equipamento q
      WHERE q.eqp_status = 'A' AND q.eqp_nu_ano_aquisicao > 1900 AND q.eqp_cd_espaco_fisico IN (${labs})
      GROUP BY q.eqp_nu_ano_aquisicao ORDER BY q.eqp_nu_ano_aquisicao`),
    await run(`SELECT TOP 10 r.crs_nm_curso nome, COUNT(*) total FROM EPFC_EspFisico_Curso x
      JOIN CRS_Curso r ON r.crs_cd_curso = x.epfc_cd_crs WHERE x.epfc_cd_epf IN (${labs})
      GROUP BY r.crs_nm_curso ORDER BY total DESC`),
  ];
  const f = finalidades[0] || {};
  res.json({
    kpi: kpi[0], porTipo, porLocal, topLabs, topFabricantes, porAno, topCursos,
    finalidades: Object.entries(f).map(([nome, total]) => ({ nome, total: total || 0 })),
  });
}));

// Estrutura do banco: tabelas, colunas, chaves e relacionamentos (somente metadados, nenhum dado de negócio)
app.get('/api/esquema', wrap(async (req, res) => {
  const pool = await getPool();
  const run = async (q) => (await pool.request().query(q)).recordset;
  const [colunas, linhas, fks, views] = await Promise.all([
    run(`SELECT t.name tabela, c.name coluna, ty.name tipo, c.max_length tam, c.precision prec, c.scale esc,
        c.is_nullable nulo, c.is_identity ident, CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END pk
      FROM sys.tables t
      JOIN sys.columns c ON c.object_id = t.object_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN (SELECT ic.object_id, ic.column_id FROM sys.indexes i
        JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        WHERE i.is_primary_key = 1) pk ON pk.object_id = t.object_id AND pk.column_id = c.column_id
      ORDER BY t.name, c.column_id`),
    run(`SELECT t.name tabela, SUM(p.rows) linhas FROM sys.tables t
      JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1) GROUP BY t.name`),
    run(`SELECT fk.name restricao, OBJECT_NAME(fk.parent_object_id) filha, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) coluna,
        OBJECT_NAME(fk.referenced_object_id) pai, COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) coluna_pai
      FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
      ORDER BY filha, coluna`),
    run(`SELECT v.name nome, d.referenced_entity_name tabela FROM sys.views v
      JOIN sys.schemas s ON s.schema_id = v.schema_id AND s.name = 'dbo'
      LEFT JOIN sys.sql_expression_dependencies d ON d.referencing_id = v.object_id AND d.referenced_entity_name IS NOT NULL
      ORDER BY v.name`),
  ]);

  const tipo = (c) => {
    if (/char|binary/.test(c.tipo)) {
      const n = c.tam === -1 ? 'max' : (c.tipo.startsWith('n') ? c.tam / 2 : c.tam);
      return `${c.tipo}(${n})`;
    }
    return /^(decimal|numeric)$/.test(c.tipo) ? `${c.tipo}(${c.prec},${c.esc})` : c.tipo;
  };
  // SUM de bigint chega como texto; converte para não concatenar ao somar no painel.
  const contagem = Object.fromEntries(linhas.map((l) => [l.tabela, Number(l.linhas)]));
  const porTabela = new Map();
  for (const c of colunas) {
    if (!porTabela.has(c.tabela)) porTabela.set(c.tabela, []);
    const fk = fks.find((f) => f.filha === c.tabela && f.coluna === c.coluna);
    porTabela.get(c.tabela).push({
      nome: c.coluna, tipo: tipo(c), nulo: !!c.nulo, pk: !!c.pk, identity: !!c.ident,
      fk: fk ? { tabela: fk.pai, coluna: fk.coluna_pai } : null,
    });
  }
  const viewsAgrupadas = [...new Set(views.map((v) => v.nome))].map((nome) => ({
    nome, tabelas: [...new Set(views.filter((v) => v.nome === nome && v.tabela).map((v) => v.tabela))],
  }));

  res.json({
    tabelas: [...porTabela].map(([nome, cols]) => ({ nome, linhas: contagem[nome] ?? 0, colunas: cols })),
    relacionamentos: fks.map((f) => ({ restricao: f.restricao, filha: f.filha, coluna: f.coluna, pai: f.pai, colunaPai: f.coluna_pai })),
    views: viewsAgrupadas,
  });
}));

// Correlação com o PNIPE (Plataforma Nacional de Infraestrutura de Pesquisa, MCTI).
// dados/pnipe.json vem de scripts/pnipe-para-json.js; o dicionário e a correspondência são mantidos à mão.
const DADOS = path.join(__dirname, 'dados');
const lerJson = (nome) => JSON.parse(fs.readFileSync(path.join(DADOS, nome), 'utf8'));
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const normModelo = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Tabelas do VIP cujo preenchimento é medido (somente registros ativos) e a coluna de status de cada uma.
const STATUS_DA_TABELA = { INS_Instituicao: 'ins_status', CAM_Campus: 'cam_status', EPF_Espaco_Fisico: 'epf_status', EQP_Equipamento: 'eqp_status' };
// Campos que não são uma coluna simples: conta o registro como preenchido se a expressão não for nula.
const PREENCHIMENTO_ESPECIAL = {
  'EQP_Equipamento.eqp_nu_ano_aquisicao': ['EQP_Equipamento', 'CASE WHEN eqp_nu_ano_aquisicao > 1900 THEN 1 END'],
  'EQP_Equipamento.eqp_cd_fabricante': ['EQP_Equipamento', `CASE WHEN eqp_cd_fabricante NOT IN
    (SELECT fab_cd_fabricante FROM FAB_Fabricante WHERE fab_nm_fabricante = 'Não Informado') THEN 1 END`],
  EPFI_EspFisico_Imagem: ['EPF_Espaco_Fisico', `CASE WHEN EXISTS (SELECT 1 FROM EPFI_EspFisico_Imagem m
    WHERE m.epfi_cd_epf = epf_cd_espfisico AND m.epfi_status = 'A') THEN 1 END`],
  EPFP_EspFisico_Pessoa: ['EPF_Espaco_Fisico', 'CASE WHEN EXISTS (SELECT 1 FROM EPFP_EspFisico_Pessoa p WHERE p.epfp_cd_epf = epf_cd_espfisico) THEN 1 END'],
  EPFC_EspFisico_Curso: ['EPF_Espaco_Fisico', 'CASE WHEN EXISTS (SELECT 1 FROM EPFC_EspFisico_Curso x WHERE x.epfc_cd_epf = epf_cd_espfisico) THEN 1 END'],
  EQPI_Equipamento_Imagem: ['EQP_Equipamento', `CASE WHEN EXISTS (SELECT 1 FROM EQPI_Equipamento_Imagem m
    WHERE m.eqpi_cd_eqp = eqp_cd_equipamento AND m.eqpi_status = 'A') THEN 1 END`],
  PEQP_Parceria_Eqp: ['EQP_Equipamento', 'CASE WHEN EXISTS (SELECT 1 FROM PEQP_Parceria_Eqp x WHERE x.peqp_cd_eqp = eqp_cd_equipamento) THEN 1 END'],
};

// Percentual de registros ativos do VIP com cada campo do dicionário preenchido. Chave = "Tabela.coluna" ou nome da tabela.
async function preenchimentoVip(pool, chaves) {
  const existentes = new Set((await pool.request().query(`SELECT t.name + '.' + c.name nome FROM sys.tables t
    JOIN sys.columns c ON c.object_id = t.object_id`)).recordset.map((r) => r.nome));
  const porTabela = {};
  for (const chave of chaves) {
    const especial = PREENCHIMENTO_ESPECIAL[chave];
    const [tabela, coluna] = especial ? [especial[0]] : chave.split('.');
    // Só colunas simples que existem de fato no banco; o nome entra na SQL entre colchetes.
    if (!STATUS_DA_TABELA[tabela] || (!especial && (!coluna || !existentes.has(chave)))) continue;
    const expr = especial ? especial[1] : `NULLIF(LTRIM(RTRIM(CAST([${coluna}] AS nvarchar(max)))), '')`;
    (porTabela[tabela] ||= []).push([chave, expr]);
  }
  const resultado = {};
  await Promise.all(Object.entries(porTabela).map(async ([tabela, itens]) => {
    // As expressões ficam numa subconsulta porque o SQL Server não aceita subconsulta dentro de COUNT().
    const linha = (await pool.request().query(`SELECT COUNT(*) total, ${itens.map((_, i) => `COUNT(c${i}) c${i}`).join(', ')}
      FROM (SELECT ${itens.map(([, e], i) => `${e} c${i}`).join(', ')}
        FROM [${tabela}] WHERE ${STATUS_DA_TABELA[tabela]} = 'A') x`)).recordset[0];
    itens.forEach(([chave], i) => { resultado[chave] = linha.total ? linha[`c${i}`] / linha.total : null; });
  }));
  return resultado;
}

app.get('/api/pnipe', wrap(async (req, res) => {
  let pnipe, dicionario, correspondencia;
  try {
    [pnipe, dicionario, correspondencia] = ['pnipe.json', 'dicionario_pnipe_vip.json', 'correspondencia_pnipe_vip.json'].map(lerJson);
  } catch (e) {
    console.error(e.message);
    return res.status(404).json({ erro: 'Dados do PNIPE não encontrados. Gere com: node scripts/pnipe-para-json.js' });
  }
  const pool = await getPool();
  const run = async (q) => (await pool.request().query(q)).recordset;
  const chavesVip = dicionario.entidades.flatMap((e) => e.campos.map((c) => c.vip).filter(Boolean));

  const [insts, labs, locais, equipVip, preenchVip] = await Promise.all([
    // Apelido "ins" (e não "i"), porque LAB_BASE já usa "i" para a instituição dentro da subconsulta.
    run(`SELECT ins.ins_cd_instituicao id, ins.ins_sg_instituicao sigla, ins.ins_nu_cnpj cnpj,
        (SELECT COUNT(*) ${LAB_BASE} AND c.cam_cd_instituicao = ins.ins_cd_instituicao) laboratorios,
        (SELECT COUNT(*) ${LAB_BASE.replace('WHERE', 'JOIN EQP_Equipamento q ON q.eqp_cd_espaco_fisico = e.epf_cd_espfisico WHERE')}
          AND q.eqp_status = 'A' AND c.cam_cd_instituicao = ins.ins_cd_instituicao) equipamentos
      FROM INS_Instituicao ins WHERE ins.ins_status = 'A'`),
    run(`SELECT e.epf_cd_espfisico id, e.epf_nm_espfisico nome, l.loc_cd_localizacao local_id, l.loc_nm_localizacao local,
        i.ins_sg_instituicao instituicao,
        (SELECT COUNT(*) FROM EQP_Equipamento q WHERE q.eqp_cd_espaco_fisico = e.epf_cd_espfisico AND q.eqp_status = 'A') equipamentos
      ${LAB_BASE}`),
    run(`SELECT loc_cd_localizacao id, loc_nm_localizacao nome FROM LOC_Localizacao`),
    run(`SELECT q.eqp_nm_equipamento nome, q.eqp_ds_modelo modelo, e.epf_cd_espfisico lab, i.ins_sg_instituicao instituicao
      ${LAB_BASE.replace('WHERE', 'JOIN EQP_Equipamento q ON q.eqp_cd_espaco_fisico = e.epf_cd_espfisico WHERE')}
        AND q.eqp_status = 'A' AND NULLIF(LTRIM(RTRIM(q.eqp_ds_modelo)), '') IS NOT NULL`),
    preenchimentoVip(pool, [...new Set(chavesVip)]),
  ]);

  const labPorId = new Map(labs.map((l) => [l.id, l]));
  const nomeLocal = new Map(locais.map((l) => [l.id, l.nome]));

  const instituicoes = pnipe.instituicoes.map((p) => {
    const v = insts.find((i) => p.cnpjs.includes(soDigitos(i.cnpj)));
    const { sigla, nome, cnpjs, ...numeros } = p;
    return { sigla, nome, cnpjs, pnipe: numeros, vip: v ? { id: v.id, sigla: v.sigla, laboratorios: v.laboratorios, equipamentos: v.equipamentos } : null };
  });

  const correspondencias = Object.entries(correspondencia)
    .filter(([sigla]) => !sigla.startsWith('_'))
    .map(([sigla, itens]) => {
      const labsVip = labs.filter((l) => l.instituicao === sigla);
      // Modelo normalizado → equipamentos do VIP com esse modelo (mínimo 4 caracteres, para evitar "1", "II" etc.).
      const porModelo = new Map();
      for (const q of equipVip.filter((q) => q.instituicao === sigla)) {
        const m = normModelo(q.modelo);
        if (m.length >= 4) (porModelo.get(m) || porModelo.set(m, []).get(m)).push(q);
      }
      const equipPnipe = pnipe.equipamentos.filter((e) => e.sigla_instituicao === sigla);
      const cobertos = new Set();

      const linhas = itens.map((c) => {
        const p = pnipe.laboratorios.find((l) => l.id === c.pnipe);
        const doLab = equipPnipe.filter((e) => e.lab === c.pnipe);
        const vip = [
          ...(c.locais || []).map((id) => {
            const dentro = labsVip.filter((l) => l.local_id === id);
            dentro.forEach((l) => cobertos.add(l.id));
            return { tipo: 'local', id, nome: nomeLocal.get(id) || `Localização ${id}`, laboratorios: dentro.length,
              equipamentos: dentro.reduce((s, l) => s + l.equipamentos, 0) };
          }),
          ...(c.labs || []).map((id) => {
            const l = labPorId.get(id);
            if (l) cobertos.add(id);
            return l ? { tipo: 'laboratorio', id, nome: l.nome, local: l.local, equipamentos: l.equipamentos }
              : { tipo: 'laboratorio', id, nome: `Espaço ${id} (inativo ou removido)`, equipamentos: 0 };
          }),
        ];
        const modelos = doLab.flatMap((e) => (porModelo.get(normModelo(e.modelo)) || []).slice(0, 1).map((q) => ({
          nome: e.nome, modelo: e.modelo, vip_nome: q.nome, vip_lab: q.lab,
          vip_lab_nome: labPorId.get(q.lab)?.nome, vip_local: labPorId.get(q.lab)?.local,
        })));
        return {
          pnipe: p ? { id: p.id, nome: p.nome, sigla: p.sigla, url: p.url, equipamentos: doLab.length } : { id: c.pnipe, nome: `Laboratório ${c.pnipe}`, equipamentos: doLab.length },
          grau: c.grau, nota: c.nota || null, vip, modelos,
        };
      });

      const semPar = labsVip.filter((l) => !cobertos.has(l.id));
      return {
        instituicao: sigla,
        itens: linhas,
        resumo: {
          pnipe: { laboratorios: linhas.length, equipamentos: equipPnipe.length },
          vip: { laboratorios: labsVip.length, equipamentos: labsVip.reduce((s, l) => s + l.equipamentos, 0) },
          por_grau: linhas.reduce((a, l) => ({ ...a, [l.grau]: (a[l.grau] || 0) + 1 }), {}),
          equip_com_modelo_no_vip: equipPnipe.filter((e) => porModelo.has(normModelo(e.modelo))).length,
          vip_sem_par: { laboratorios: semPar.length, equipamentos: semPar.reduce((s, l) => s + l.equipamentos, 0) },
        },
      };
    });

  res.json({
    fonte: pnipe.fonte,
    gerado_em: pnipe.gerado_em,
    instituicoes,
    dicionario: {
      relacoes: dicionario.relacoes,
      entidades: dicionario.entidades.map((ent) => ({
        ...ent,
        campos: ent.campos.map((c) => ({
          ...c,
          preenchimento_pnipe: c.pnipe ? pnipe.preenchimento[ent.chave]?.[c.pnipe_col || c.pnipe] ?? null : null,
          preenchimento_vip: c.vip ? preenchVip[c.vip] ?? null : null,
        })),
      })),
    },
    correspondencias,
  });
}));

// Catálogo público unificado. A origem continua identificada em cada item: os dados são
// apresentados juntos, sem fingir que VIP e PNIPE são a mesma base.
const TEMAS = [
  ['biologia', 'Biologia e biodiversidade', /biolog|biodivers|ecolog|bot[aâ]nic|zoolog|fauna|flora|ambient/i],
  ['saude', 'Saúde e ciências da vida', /sa[uú]de|medic|farm[aá]|odont|enferm|epidemi|imun|bioqu[ií]m/i],
  ['agro', 'Ciências agrárias', /agr[aá]r|agro|agric|solo|animal|veterin|alimento|pesca|aquic/i],
  ['engenharia', 'Engenharia e tecnologia', /engenh|tecnolog|computa|rob[oó]t|automa|materia|ind[uú]str|constru/i],
  ['energia', 'Energia e sustentabilidade', /energia|solar|e[oó]lic|sustent|combust|petr[oó]leo|g[aá]s|carbono/i],
  ['exatas', 'Ciências exatas e da Terra', /qu[ií]mic|f[ií]sic|matem[aá]t|geolog|geof[ií]sic|ocean|meteor/i],
  ['humanas', 'Humanidades e ciências sociais', /human|sociais|educa|hist[oó]r|cultur|arte|m[uú]sic|lingu|direito|econom/i],
];

const textoBusca = (item) => [item.nome, item.sigla, item.instituicao, item.cidade, item.descricao,
  item.areas, item.tecnicas, item.modelo, item.marca, item.laboratorio].filter(Boolean).join(' ');
const temaDoItem = (item) => TEMAS.find(([, , re]) => re.test(textoBusca(item)))?.[0] || 'outros';
const textoNormalizado = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const listaCampo = (s) => [...new Set(String(s || '').split(/[;\n|]+/).map((v) => v.trim()).filter((v) => v.length > 2))];
const prepararItem = (item) => ({ ...item, tema: temaDoItem(item), status: item.status === 'I' || item.ativo === false ? 'I' : 'A',
  areas_lista: listaCampo(item.areas), tecnicas_lista: listaCampo(item.tecnicas) });

function agregarInstituicoes(itens) {
  const mapa = new Map();
  for (const item of itens) {
    if (!item.instituicao) continue;
    const atual = mapa.get(item.instituicao) || { sigla: item.instituicao, nome: item.instituicao_nome || item.instituicao,
      laboratorios: 0, equipamentos: 0, vip: 0, pnipe: 0, cidades: new Set(), areas: new Map() };
    atual[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
    atual[item.fonte]++;
    if (item.cidade) atual.cidades.add(item.cidade);
    (item.areas_lista || []).forEach((area) => atual.areas.set(area, (atual.areas.get(area) || 0) + 1));
    mapa.set(item.instituicao, atual);
  }
  return [...mapa.values()].map(({ cidades, areas, ...item }) => ({ ...item, cidades: [...cidades].sort(),
    areas: [...areas].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area]) => area) })).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
}

function opcoesFrequentes(itens, chave, limite = 160) {
  const contagem = new Map();
  itens.forEach((item) => (item[chave] || []).forEach((valor) => {
    const k = textoNormalizado(valor);
    const atual = contagem.get(k) || { valor, total: 0 };
    atual.total++;
    contagem.set(k, atual);
  }));
  return [...contagem.values()].sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor, 'pt-BR')).slice(0, limite);
}

function catalogoPnipe() {
  const pnipe = lerJson('pnipe.json');
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
  return [...laboratorios, ...equipamentos].map(prepararItem);
}

async function catalogoVip() {
  const pool = await getPool();
  const [labs, equipamentos] = await Promise.all([
    pool.request().query(`SELECT e.epf_cd_espfisico id, e.epf_nm_espfisico nome, e.epf_sg_espfisico sigla,
      e.epf_ds_espfisico descricao, e.epf_ds_areas areas, e.epf_ds_atividades tecnicas,
      e.epf_ds_palavras_chave palavras_chave, e.epf_cd_sala sala, e.epf_nu_capacidade capacidade,
      e.epf_tel_contato telefone, e.epf_website website, c.cam_email email,
      CASE WHEN e.epf_st_multiusuario = 'S' THEN 1 ELSE 0 END multiusuario,
      t.tepf_nm_tipo_epf subtipo, l.loc_nm_localizacao local, c.cam_nm_campus campus,
      c.cam_nm_cidade cidade, c.cam_sg_estado estado, i.ins_sg_instituicao instituicao,
      (SELECT COUNT(*) FROM EQP_Equipamento q WHERE q.eqp_cd_espaco_fisico = e.epf_cd_espfisico AND q.eqp_status = 'A') equipamentos,
      (SELECT TOP 1 m.epfi_nm_hash FROM EPFI_EspFisico_Imagem m WHERE m.epfi_cd_epf = e.epf_cd_espfisico AND m.epfi_status = 'A' ORDER BY m.epfi_cd_img) foto_hash,
      (SELECT TOP 1 p.pes_nm_pessoa FROM USU_Usuario u JOIN PES_Pessoa p ON p.pes_cd_pessoa = u.usu_cd_pessoa
        WHERE u.usu_cd_usuario = e.epf_cd_usuario_responsavel) contato
      ${LAB_BASE}`),
    pool.request().query(`SELECT q.eqp_cd_equipamento id, q.eqp_nm_equipamento nome, q.eqp_sigla sigla,
      q.eqp_outras_denominacoes denominacoes, q.eqp_ds_modelo modelo, q.eqp_ds_descricao descricao, q.eqp_status status,
      q.eqp_nu_ano_aquisicao ano, q.eqp_quantidade quantidade, f.fab_nm_fabricante marca,
      e.epf_cd_espfisico laboratorio_id, e.epf_nm_espfisico laboratorio,
      e.epf_ds_areas areas, e.epf_ds_atividades tecnicas, e.epf_tel_contato telefone, e.epf_website website,
      c.cam_nm_cidade cidade, c.cam_sg_estado estado, c.cam_email email,
      i.ins_sg_instituicao instituicao, i.ins_nm_nome instituicao_nome,
      CASE WHEN e.epf_st_multiusuario = 'S' THEN 1 ELSE 0 END multiusuario,
      (SELECT TOP 1 m.eqpi_nm_hash FROM EQPI_Equipamento_Imagem m WHERE m.eqpi_cd_eqp = q.eqp_cd_equipamento AND m.eqpi_status = 'A' ORDER BY m.eqpi_cd_img) foto_hash,
      (SELECT TOP 1 p.pes_nm_pessoa FROM USU_Usuario u JOIN PES_Pessoa p ON p.pes_cd_pessoa = u.usu_cd_pessoa
        WHERE u.usu_cd_usuario = e.epf_cd_usuario_responsavel) contato
      ${LAB_BASE.replace('WHERE', `JOIN EQP_Equipamento q ON q.eqp_cd_espaco_fisico = e.epf_cd_espfisico
        LEFT JOIN FAB_Fabricante f ON f.fab_cd_fabricante = q.eqp_cd_fabricante WHERE`)}`),
  ]);
  return [
    ...labs.recordset.map(({ foto_hash, ...l }) => ({
      ...l, id: `vip:lab:${l.id}`, id_origem: String(l.id), fonte: 'vip', tipo: 'laboratorio',
      imagem: imgUrl('epf', foto_hash), compartilhado: !!l.multiusuario, status: 'A',
    })),
    ...equipamentos.recordset.map(({ foto_hash, ...e }) => ({
      ...e, id: `vip:equip:${e.id}`, id_origem: String(e.id), fonte: 'vip', tipo: 'equipamento',
      imagem: imgUrl('eqp', foto_hash), compartilhado: !!e.multiusuario,
    })),
  ].map(prepararItem);
}

app.get('/api/vitrine', wrap(async (req, res) => {
  const fonte = ['vip', 'pnipe'].includes(req.query.fonte) ? req.query.fonte : 'todos';
  const tipo = ['laboratorio', 'equipamento'].includes(req.query.tipo) ? req.query.tipo : 'todos';
  const instituicao = String(req.query.instituicao || '').slice(0, 30).toUpperCase();
  const tema = String(req.query.tema || '').slice(0, 40);
  const area = textoNormalizado(String(req.query.area || '').slice(0, 240));
  const tecnica = textoNormalizado(String(req.query.tecnica || '').slice(0, 500));
  const situacao = String(req.query.status || '');
  const busca = textoNormalizado(String(req.query.q || '').slice(0, 120));
  const limite = Math.min(500, Math.max(24, parseInt(req.query.limite, 10) || 120));
  const avisos = [];
  let itens = [];

  if (fonte !== 'vip') itens.push(...catalogoPnipe());
  if (fonte !== 'pnipe') {
    try { itens.push(...await catalogoVip()); }
    catch (e) {
      console.error(`VIP indisponível na vitrine: ${e.message}`);
      avisos.push('A base VIP está temporariamente indisponível; os dados do PNIPE continuam acessíveis.');
    }
  }

  const baseDosFiltros = itens;
  const todasInstituicoes = agregarInstituicoes(baseDosFiltros);
  itens = itens.filter((item) => {
    if (tipo !== 'todos' && item.tipo !== tipo) return false;
    if (instituicao && item.instituicao !== instituicao) return false;
    if (tema && item.tema !== tema) return false;
    if (area && !(item.areas_lista || []).some((v) => textoNormalizado(v) === area)) return false;
    if (tecnica && !(item.tecnicas_lista || []).some((v) => textoNormalizado(v) === tecnica)) return false;
    if (situacao && item.status !== (situacao === 'inativo' ? 'I' : 'A')) return false;
    return !busca || textoNormalizado(textoBusca(item)).includes(busca);
  });
  itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const totalPorTipo = { laboratorios: 0, equipamentos: 0 };
  const totalPorFonte = { vip: 0, pnipe: 0 };
  itens.forEach((item) => {
    totalPorTipo[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
    totalPorFonte[item.fonte]++;
  });
  // Equipamentos de um mesmo laboratório compartilham coordenadas. Agrupar evita milhares de
  // marcadores sobrepostos e faz o mapa representar lugares, não linhas da base.
  const pontosAgrupados = new Map();
  itens.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)).forEach((item) => {
    const chave = `${item.latitude.toFixed(6)}:${item.longitude.toFixed(6)}:${item.instituicao}`;
    const ponto = pontosAgrupados.get(chave) || {
      id: chave, nome: item.laboratorio || item.nome, instituicao: item.instituicao, cidade: item.cidade,
      latitude: item.latitude, longitude: item.longitude, total: 0, laboratorios: 0, equipamentos: 0,
      fontes: new Set(),
    };
    ponto.total++;
    ponto[item.tipo === 'laboratorio' ? 'laboratorios' : 'equipamentos']++;
    ponto.fontes.add(item.fonte);
    pontosAgrupados.set(chave, ponto);
  });
  const pontos = [...pontosAgrupados.values()].map(({ fontes, ...ponto }) => ({
    ...ponto, fonte: fontes.size > 1 ? 'ambas' : [...fontes][0],
  }));

  res.json({
    total: itens.length, exibidos: Math.min(limite, itens.length), itens: itens.slice(0, limite), pontos,
    instituicoes: agregarInstituicoes(itens),
    kpi: { ...totalPorTipo, fontes: Object.values(totalPorFonte).filter(Boolean).length,
      instituicoes: new Set(itens.map((i) => i.instituicao)).size },
    porFonte: totalPorFonte,
    filtros: { instituicoes: todasInstituicoes, temas: TEMAS.map(([valor, rotulo]) => ({ valor, rotulo }))
      .concat({ valor: 'outros', rotulo: 'Outras áreas' }), areas: opcoesFrequentes(baseDosFiltros, 'areas_lista'),
      tecnicas: opcoesFrequentes(baseDosFiltros, 'tecnicas_lista') },
    avisos,
  });
}));

// Busca de laboratórios
app.get('/api/labs', wrap(async (req, res) => {
  const r = (await getPool()).request();
  const where = filtrosLab(req.query, r);
  const out = await r.query(`
    SELECT e.epf_cd_espfisico id, e.epf_nm_espfisico nome, e.epf_sg_espfisico sigla, e.epf_cd_sala sala,
      e.epf_ds_espfisico descricao, e.epf_ds_areas areas, e.epf_nu_capacidade capacidade,
      CASE WHEN e.epf_st_ensino = 'S' THEN 1 ELSE 0 END ensino,
      CASE WHEN e.epf_st_pesquisa = 'S' THEN 1 ELSE 0 END pesquisa,
      CASE WHEN e.epf_st_extensao = 'S' THEN 1 ELSE 0 END extensao,
      CASE WHEN e.epf_st_multiusuario = 'S' THEN 1 ELSE 0 END multiusuario,
      t.tepf_nm_tipo_epf tipo, l.loc_nm_localizacao local, c.cam_nm_campus campus, c.cam_nm_cidade cidade,
      i.ins_sg_instituicao instituicao,
      (SELECT COUNT(*) FROM EQP_Equipamento q WHERE q.eqp_cd_espaco_fisico = e.epf_cd_espfisico AND q.eqp_status = 'A') equipamentos,
      (SELECT TOP 1 m.epfi_nm_hash FROM EPFI_EspFisico_Imagem m WHERE m.epfi_cd_epf = e.epf_cd_espfisico AND m.epfi_status = 'A' ORDER BY m.epfi_cd_img) foto_hash
    ${LAB_BASE} ${where}
    ORDER BY e.epf_nm_espfisico`);
  res.json(out.recordset.map(({ foto_hash, ...l }) => ({ ...l, foto: imgUrl('epf', foto_hash) })));
}));

// Detalhe: infraestrutura e localização
app.get('/api/labs/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ erro: 'ID inválido.' });
  const pool = await getPool();
  const rq = () => pool.request().input('id', sql.Int, id);

  const lab = (await rq().query(`
    SELECT e.epf_cd_espfisico id, e.epf_nm_espfisico nome, e.epf_sg_espfisico sigla, e.epf_cd_sala sala,
      e.epf_ds_espfisico descricao, e.epf_ds_areas areas, e.epf_ds_atividades atividades,
      e.epf_ds_palavras_chave palavras_chave, e.epf_website website, e.epf_tel_contato telefone,
      e.epf_ds_regulamento regulamento, e.epf_nu_capacidade capacidade,
      CASE WHEN e.epf_st_ensino = 'S' THEN 1 ELSE 0 END ensino,
      CASE WHEN e.epf_st_pesquisa = 'S' THEN 1 ELSE 0 END pesquisa,
      CASE WHEN e.epf_st_extensao = 'S' THEN 1 ELSE 0 END extensao,
      CASE WHEN e.epf_st_multiusuario = 'S' THEN 1 ELSE 0 END multiusuario,
      t.tepf_nm_tipo_epf tipo, l.loc_nm_localizacao local, l.loc_url_regulamento url_regulamento_local,
      c.cam_nm_campus campus, c.cam_ds_endereco endereco, c.cam_ds_complemento complemento,
      c.cam_nm_bairro bairro, c.cam_nm_cidade cidade, c.cam_sg_estado estado, c.cam_nu_cep cep,
      i.ins_sg_instituicao instituicao, i.ins_nm_nome instituicao_nome,
      (SELECT TOP 1 p.pes_nm_pessoa FROM USU_Usuario u JOIN PES_Pessoa p ON p.pes_cd_pessoa = u.usu_cd_pessoa
        WHERE u.usu_cd_usuario = e.epf_cd_usuario_responsavel) responsavel
    ${LAB_BASE} AND e.epf_cd_espfisico = @id`)).recordset[0];
  if (!lab) return res.status(404).json({ erro: 'Laboratório não encontrado.' });

  const [equip, cursos, fotos, fotosLocal] = await Promise.all([
    rq().query(`SELECT q.eqp_cd_equipamento id, q.eqp_nm_equipamento nome, q.eqp_sigla sigla,
        q.eqp_ds_modelo modelo, q.eqp_quantidade quantidade, f.fab_nm_fabricante fabricante,
        NULLIF(q.eqp_nu_ano_aquisicao, 1900) ano,
        (SELECT TOP 1 m.eqpi_nm_hash FROM EQPI_Equipamento_Imagem m WHERE m.eqpi_cd_eqp = q.eqp_cd_equipamento AND m.eqpi_status = 'A' ORDER BY m.eqpi_cd_img) foto_hash
      FROM EQP_Equipamento q JOIN FAB_Fabricante f ON f.fab_cd_fabricante = q.eqp_cd_fabricante
      WHERE q.eqp_cd_espaco_fisico = @id AND q.eqp_status = 'A' ORDER BY q.eqp_nm_equipamento`),
    rq().query(`SELECT r.crs_nm_curso nome FROM EPFC_EspFisico_Curso x
      JOIN CRS_Curso r ON r.crs_cd_curso = x.epfc_cd_crs WHERE x.epfc_cd_epf = @id ORDER BY r.crs_nm_curso`),
    rq().query(`SELECT epfi_nm_hash h FROM EPFI_EspFisico_Imagem WHERE epfi_cd_epf = @id AND epfi_status = 'A' ORDER BY epfi_cd_img`),
    rq().query(`SELECT m.loci_nm_hash h FROM LOCI_Localizacao_Imagem m JOIN EPF_Espaco_Fisico e ON e.epf_cd_localizacao = m.loci_cd_localizacao
      WHERE e.epf_cd_espfisico = @id AND m.loci_status = 'A' ORDER BY m.loci_cd_img`),
  ]);
  res.json({
    ...lab,
    fotos: fotos.recordset.map((f) => imgUrl('epf', f.h)),
    fotos_local: fotosLocal.recordset.map((f) => imgUrl('loc', f.h)),
    equipamentos: equip.recordset.map(({ foto_hash, ...e }) => ({ ...e, foto: imgUrl('eqp', foto_hash) })),
    cursos: cursos.recordset.map((c) => c.nome),
  });
}));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Painel VIP em http://localhost:${port}`));
