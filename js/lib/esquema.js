window.Obs = window.Obs || {};

// Organiza o mapa do banco: domínios, níveis de dependência e árvore de hierarquia.
Obs.esquema = (function () {
  // O prefixo da tabela (antes do "_") indica o módulo a que ela pertence.
  const DOMINIOS = [
    { chave: 'locais', nome: 'Instituições e locais', cor: '#2a78d6', prefixos: ['INS', 'CAM', 'UO', 'TUO', 'CRS', 'LOC', 'LOCI'] },
    { chave: 'espacos', nome: 'Espaços físicos', cor: '#1baf7a', prefixos: ['EPF', 'EPFC', 'EPFI', 'EPFP', 'TEPF'] },
    { chave: 'equipamentos', nome: 'Equipamentos', cor: '#eb6834', prefixos: ['EQP', 'EQPI', 'FAB', 'MAR', 'AFC'] },
    { chave: 'pessoas', nome: 'Pessoas e acesso', cor: '#4a3aa7', prefixos: ['PES', 'TVC', 'USU', 'UC', 'NIV', 'FUN', 'ACL', 'APU'] },
    { chave: 'parcerias', nome: 'Parcerias', cor: '#eda100', prefixos: ['PAR', 'PEPF', 'PEQP', 'PINS', 'HPPES'] },
    { chave: 'sistema', nome: 'Sistema', cor: '#898781', prefixos: [] },
  ];

  function dominioDe(tabela) {
    const prefixo = tabela.split('_')[0].toUpperCase();
    return DOMINIOS.find((d) => d.prefixos.includes(prefixo)) || DOMINIOS[DOMINIOS.length - 1];
  }

  // Referências à tabela de usuários são, na maioria, de auditoria (quem criou/alterou) e ligam
  // quase todas as tabelas a ela; ficam fora da hierarquia para não achatar a estrutura.
  const TABELA_TRANSVERSAL = 'USU_Usuario';

  function montar(esquema) {
    const nomes = esquema.tabelas.map((t) => t.nome);
    const porNome = Object.fromEntries(esquema.tabelas.map((t) => [t.nome, t]));
    const todas = esquema.relacionamentos.filter((r) => r.filha !== r.pai);
    const estruturais = todas.filter((r) => r.pai !== TABELA_TRANSVERSAL);

    // Tabela que ninguém referencia e cujo único vínculo é com usuários (ex.: logs de acesso e de
    // auditoria) é "filha" de usuários; sem isso ela ficaria solta no nível 0.
    const soDeUsuario = new Set(
      nomes.filter(
        (t) =>
          !estruturais.some((r) => r.filha === t) &&
          !todas.some((r) => r.pai === t) &&
          todas.some((r) => r.filha === t && r.pai === TABELA_TRANSVERSAL),
      ),
    );
    const paisDe = (t) =>
      soDeUsuario.has(t) ? [TABELA_TRANSVERSAL] : [...new Set(estruturais.filter((r) => r.filha === t).map((r) => r.pai))];

    // Nível = distância até uma tabela que não depende de nenhuma outra.
    const nivel = {};
    function calcular(t, visitando = new Set()) {
      if (nivel[t] !== undefined) return nivel[t];
      if (visitando.has(t)) return 0;
      visitando.add(t);
      const pais = paisDe(t);
      nivel[t] = pais.length ? 1 + Math.max(...pais.map((p) => calcular(p, visitando))) : 0;
      return nivel[t];
    }
    nomes.forEach((t) => calcular(t));

    // Pai principal = o pai mais "profundo" (ex.: equipamento fica sob o espaço físico, não sob o fabricante).
    const paiPrincipal = {};
    nomes.forEach((t) => {
      const pais = paisDe(t);
      if (pais.length) paiPrincipal[t] = pais.reduce((a, b) => (nivel[b] > nivel[a] ? b : a));
    });
    const filhosNaArvore = {};
    Object.entries(paiPrincipal).forEach(([filha, pai]) => {
      (filhosNaArvore[pai] ||= []).push(filha);
    });
    Object.values(filhosNaArvore).forEach((l) => l.sort((a, b) => a.localeCompare(b)));

    const temFilhos = (t) => (filhosNaArvore[t] || []).length > 0;
    const raizes = nomes.filter((t) => !paiPrincipal[t] && temFilhos(t)).sort((a, b) => a.localeCompare(b));
    const referenciadasApenas = nomes.filter((t) => !paiPrincipal[t] && !temFilhos(t) && estruturais.some((r) => r.pai === t));
    const isoladas = nomes.filter((t) => !todas.some((r) => r.pai === t || r.filha === t));

    const niveis = [];
    nomes.forEach((t) => (niveis[nivel[t]] ||= []).push(t));
    niveis.forEach((l) => l.sort((a, b) => a.localeCompare(b)));

    return {
      porNome, nivel, niveis, paiPrincipal, filhosNaArvore, raizes, referenciadasApenas, isoladas,
      // Relações de uma tabela (todas, inclusive as de auditoria).
      referencia: (t) => todas.filter((r) => r.filha === t),
      referenciadaPor: (t) => todas.filter((r) => r.pai === t),
      // Como a tabela se liga ao pai principal na árvore.
      colunaDoPai: (t) => (todas.find((r) => r.filha === t && r.pai === paiPrincipal[t]) || {}).coluna,
      outrosPais: (t) => paisDe(t).filter((p) => p !== paiPrincipal[t]),
    };
  }

  return { DOMINIOS, dominioDe, montar };
})();
