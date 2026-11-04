window.Obs = window.Obs || {};

Obs.formato = (function () {
  function numero(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  }

  function plural(n, singular, pluralTxt) {
    return `${numero(n)} ${n === 1 ? singular : pluralTxt}`;
  }

  return { numero, plural };
})();
