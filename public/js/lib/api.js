window.Obs = window.Obs || {};

Obs.api = (function () {
  async function obter(caminho, params) {
    const previewLocal = new URLSearchParams(window.location.search).get('preview') === 'pages';
    if ((window.location.hostname.endsWith('github.io') || previewLocal) && caminho === '/api/vitrine') {
      return Obs.demo.obterVitrine(params || new URLSearchParams());
    }
    const qs = params && [...params.keys()].length ? `?${params}` : '';
    const resposta = await fetch(`${VIP_CONFIG.apiBase}${caminho}${qs}`);
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      throw new Error(corpo.erro || `Falha na requisição (HTTP ${resposta.status})`);
    }
    return resposta.json();
  }

  return { obter };
})();
