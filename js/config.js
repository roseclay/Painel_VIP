// Configuração do painel — edite aqui o nome, o texto do rodapé e a origem dos dados.
window.VIP_CONFIG = {
  nomePainel: 'Observatório de CT&I da Bahia',
  titulo: 'Vitrine de infraestrutura de pesquisa',
  textoRodape: 'Infraestrutura de pesquisa reunida a partir do VIP e da Plataforma Nacional de Infraestrutura de Pesquisa (PNIPE/MCTI).',
  // Perfis oficiais do Observatório usam o identificador Lattes.
  observatorioBase: 'https://observatoriocti.secti.ba.gov.br/simcc',
  // Fotografias públicas são servidas pela API oficial do SIMCC.
  observatorioApiBase: 'https://observatoriocti.secti.ba.gov.br/simcc/api',
  versaoDados: '20261117d',
  // A vitrine publicada usa os catálogos JSON de public/dados e não precisa de banco.
  // Altere para true apenas se houver uma API Node + SQL Server configurada no mesmo host.
  usarApiServidor: false,
  // Vazio = mesma origem do servidor que serve esta página.
  apiBase: '',
};
