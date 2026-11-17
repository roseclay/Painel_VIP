const fs = require('fs');
const path = require('path');

function argumento(nome, padrao) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1] : padrao;
}

const entrada = path.resolve(argumento('input', path.join(__dirname, '..', 'public', 'dados', 'usuarios.json')));
const apiBase = String(argumento('api', 'https://observatoriocti.secti.ba.gov.br/simcc/api')).replace(/\/$/, '');
const concorrencia = Math.max(1, Math.min(12, Number(argumento('concurrency', '6')) || 6));

const normalizar = (valor) => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function consultar(nome, tentativa = 1) {
  try {
    const resposta = await fetch(`${apiBase}/researcherName?name=${encodeURIComponent(nome)}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    if (tentativa < 3) return consultar(nome, tentativa + 1);
    console.warn(`Não foi possível consultar ${nome}: ${erro.message}`);
    return [];
  }
}

function correspondenciaSegura(usuario, candidatos) {
  const nome = normalizar(usuario.nome);
  const siglas = new Set((usuario.instituicoes || []).map((item) => normalizar(item.sigla)));
  const exatos = candidatos.filter((candidato) => normalizar(candidato.name) === nome
    && siglas.has(normalizar(candidato.institution?.acronym)));
  const unicos = new Map(exatos.filter((candidato) => candidato.lattes_id)
    .map((candidato) => [String(candidato.lattes_id), candidato]));
  return unicos.size === 1 ? [...unicos.values()][0] : null;
}

async function executar() {
  const documento = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const usuarios = documento.usuarios || [];
  let cursor = 0;
  let adicionados = 0;

  async function trabalhador() {
    while (cursor < usuarios.length) {
      const indice = cursor++;
      const usuario = usuarios[indice];
      if (usuario.pesquisador_lattes_id && usuario.pesquisador_nome) continue;
      const perfil = correspondenciaSegura(usuario, await consultar(usuario.nome));
      if (!perfil) continue;
      usuario.pesquisador_id = perfil.id || null;
      usuario.pesquisador_nome = perfil.name || null;
      usuario.pesquisador_lattes_id = perfil.lattes_id || null;
      adicionados += 1;
    }
  }

  await Promise.all(Array.from({ length: concorrencia }, () => trabalhador()));
  documento.perfis_observatorio = usuarios.filter((usuario) => usuario.pesquisador_lattes_id && usuario.pesquisador_nome).length;
  fs.writeFileSync(entrada, `${JSON.stringify(documento)}\n`);
  console.log(JSON.stringify({ usuarios: usuarios.length, adicionados, perfis_observatorio: documento.perfis_observatorio }, null, 2));
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
