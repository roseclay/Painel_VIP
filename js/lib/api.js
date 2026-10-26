window.Obs = window.Obs || {};

Obs.api = (function () {
  async function obter(caminho, params) {
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
