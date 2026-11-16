// Mapa municipal adaptado do componente utilizado no eixo temático de Energia.
// O contorno da Bahia é o mesmo; aqui a intensidade representa a quantidade de
// laboratórios e equipamentos do VIP/PNIPE em cada município.
function MapaVitrine({ pontos, municipios: resumoMunicipios, aoAbrirMunicipio }) {
  const { useEffect, useMemo, useRef, useState } = React;
  const [geojson, setGeojson] = useState(null);
  const [erro, setErro] = useState(null);
  const [municipioSelecionado, setMunicipioSelecionado] = useState(null);
  const [municipioEmFoco, setMunicipioEmFoco] = useState(null);
  const [visao, setVisao] = useState({ x: 0, y: 0, largura: 720, altura: 760 });
  const refSvg = useRef(null);
  const arraste = useRef(null);

  useEffect(() => {
    let cancelado = false;
    fetch('dados/territorio_relacionado.json')
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`Falha ao carregar o mapa (HTTP ${resposta.status})`);
        return resposta.json();
      })
      .then((dados) => { if (!cancelado) setGeojson(dados); })
      .catch((e) => { if (!cancelado) setErro(e?.message || String(e)); });
    return () => { cancelado = true; };
  }, []);

  const mapa = useMemo(() => {
    if (!geojson?.features) return null;
    const normalizar = (valor) => String(valor || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const largura = 720;
    const altura = 760;
    const margem = 12;
    const coordenadas = [];
    function visitar(lista) {
      if (typeof lista?.[0] === 'number') coordenadas.push(lista);
      else (lista || []).forEach(visitar);
    }
    geojson.features.forEach((feature) => visitar(feature.geometry.coordinates));
    const longitudes = coordenadas.map((p) => p[0]);
    const latitudes = coordenadas.map((p) => p[1]);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const escala = Math.min((largura - margem * 2) / (maxLon - minLon), (altura - margem * 2) / (maxLat - minLat));
    const dx = (largura - (maxLon - minLon) * escala) / 2;
    const dy = (altura - (maxLat - minLat) * escala) / 2;
    const projetar = ([lon, lat]) => [dx + (lon - minLon) * escala, dy + (maxLat - lat) * escala];
    const caminhoAnel = (anel) => `${anel.map((p, i) => {
      const [x, y] = projetar(p);
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ')} Z`;
    const caminhoGeometria = (geometria) => {
      const poligonos = geometria.type === 'MultiPolygon' ? geometria.coordinates : [geometria.coordinates];
      return poligonos.flatMap((poligono) => poligono.map(caminhoAnel)).join(' ');
    };
    function centroAnel(anel) {
      const pts = anel.map(projetar);
      let area2 = 0;
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < pts.length - 1; i += 1) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        const cruzado = x1 * y2 - x2 * y1;
        area2 += cruzado;
        sx += (x1 + x2) * cruzado;
        sy += (y1 + y2) * cruzado;
      }
      if (Math.abs(area2) < 0.001) {
        const soma = pts.reduce(([x, y], p) => [x + p[0], y + p[1]], [0, 0]);
        return { x: soma[0] / pts.length, y: soma[1] / pts.length, area: 0 };
      }
      return { x: sx / (3 * area2), y: sy / (3 * area2), area: Math.abs(area2 / 2) };
    }
    function centroGeometria(geometria) {
      const poligonos = geometria.type === 'MultiPolygon' ? geometria.coordinates : [geometria.coordinates];
      return poligonos.map((poligono) => centroAnel(poligono[0])).sort((a, b) => b.area - a.area)[0];
    }

    const porCidade = new Map();
    const baseMunicipios = resumoMunicipios?.length ? resumoMunicipios : (pontos || []);
    for (const ponto of baseMunicipios) {
      const chave = normalizar(ponto.cidade || ponto.nome);
      if (!chave) continue;
      const atual = porCidade.get(chave) || { total: 0, laboratorios: 0, equipamentos: 0 };
      atual.total += Number(ponto.total) || 0;
      atual.laboratorios += Number(ponto.laboratorios) || 0;
      atual.equipamentos += Number(ponto.equipamentos) || 0;
      porCidade.set(chave, atual);
    }

    const municipios = geojson.features.map((feature) => {
      const contagem = porCidade.get(normalizar(feature.properties.name)) || { total: 0, laboratorios: 0, equipamentos: 0 };
      return {
        id: feature.properties.id,
        nome: feature.properties.name,
        territorio: feature.properties.territorio_identidade,
        caminho: caminhoGeometria(feature.geometry),
        centro: centroGeometria(feature.geometry),
        ...contagem,
      };
    }).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
    const maximo = Math.max(0, ...municipios.map((m) => m.total));

    // Mantém a mesma estratégia do mapa de Energia para reduzir colisões entre rótulos.
    const caixas = [];
    for (const municipio of municipios.filter((m) => m.total > 0)) {
      const larguraRotulo = Math.max(34, municipio.nome.length * 5.8);
      const opcoes = [
        { dx: 6, dy: -7, ancora: 'start' }, { dx: 6, dy: 13, ancora: 'start' },
        { dx: -6, dy: -7, ancora: 'end' }, { dx: -6, dy: 13, ancora: 'end' },
        ...[-21, 27, -35, 41, -49, 55, -63, 69].flatMap((y) => [
          { dx: 8, dy: y, ancora: 'start' }, { dx: -8, dy: y, ancora: 'end' },
        ]),
      ];
      let escolhida = opcoes[0];
      for (const opcao of opcoes) {
        const x = municipio.centro.x + opcao.dx;
        const y = municipio.centro.y + opcao.dy;
        const esquerda = opcao.ancora === 'end' ? x - larguraRotulo : x;
        const caixa = { esquerda, direita: esquerda + larguraRotulo, topo: y - 13, base: y + 2 };
        const dentro = caixa.esquerda >= 2 && caixa.direita <= largura - 2 && caixa.topo >= 2 && caixa.base <= altura - 2;
        const colide = caixas.some((outra) => caixa.esquerda < outra.direita + 3 && caixa.direita + 3 > outra.esquerda
          && caixa.topo < outra.base + 2 && caixa.base + 2 > outra.topo);
        if (dentro && !colide) {
          escolhida = opcao;
          caixas.push(caixa);
          break;
        }
      }
      municipio.rotulo = { x: municipio.centro.x + escolhida.dx, y: municipio.centro.y + escolhida.dy, ancora: escolhida.ancora };
    }
    const comInfraestrutura = municipios.filter((m) => m.total > 0);
    return {
      largura, altura, municipios, comInfraestrutura, maximo,
      totalRegistros: comInfraestrutura.reduce((soma, m) => soma + m.total, 0),
    };
  }, [geojson, pontos, resumoMunicipios]);

  if (erro) return <EstadoVazio titulo="Não foi possível carregar o mapa" descricao={erro} />;
  if (!mapa) return <EstadoVazio titulo="Carregando mapa da Bahia…" />;

  const municipioAtivo = municipioEmFoco || municipioSelecionado;
  const nivelZoom = mapa.largura / visao.largura;
  function limitarVisao(proxima) {
    const largura = Math.max(mapa.largura / 8, Math.min(mapa.largura, proxima.largura));
    const altura = largura * (mapa.altura / mapa.largura);
    return {
      x: Math.max(0, Math.min(mapa.largura - largura, proxima.x)),
      y: Math.max(0, Math.min(mapa.altura - altura, proxima.y)),
      largura, altura,
    };
  }
  function mudarZoom(fator) {
    setVisao((atual) => {
      const focoX = atual.x + atual.largura / 2;
      const focoY = atual.y + atual.altura / 2;
      const largura = atual.largura / fator;
      const proporcao = largura / atual.largura;
      return limitarVisao({ x: focoX - (focoX - atual.x) * proporcao, y: focoY - (focoY - atual.y) * proporcao, largura });
    });
  }
  function iniciarArraste(evento) {
    if (nivelZoom <= 1 || evento.button !== 0) return;
    arraste.current = { x: evento.clientX, y: evento.clientY, visao: { ...visao }, pointerId: evento.pointerId, capturado: false };
  }
  function mover(evento) {
    if (!arraste.current || !refSvg.current) return;
    const caixa = refSvg.current.getBoundingClientRect();
    if (!arraste.current.capturado) {
      refSvg.current.setPointerCapture(arraste.current.pointerId);
      arraste.current.capturado = true;
    }
    const inicial = arraste.current.visao;
    setVisao(limitarVisao({
      ...inicial,
      x: inicial.x - ((evento.clientX - arraste.current.x) / caixa.width) * inicial.largura,
      y: inicial.y - ((evento.clientY - arraste.current.y) / caixa.height) * inicial.altura,
    }));
  }
  function terminar(evento) {
    if (!arraste.current) return;
    if (arraste.current.capturado && evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    arraste.current = null;
  }
  function corMunicipio(total) {
    if (!total) return '#e2e8f0';
    const t = 0.25 + 0.75 * Math.sqrt(total / Math.max(1, mapa.maximo));
    const inicio = [230, 240, 253];
    const fim = [13, 54, 107];
    return `rgb(${inicio.map((v, i) => Math.round(v + (fim[i] - v) * t)).join(',')})`;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#57269b]">Painel 4</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Mapa da infraestrutura</h2>
        <p className="mt-1 text-sm text-slate-500">{Obs.formato.numero(mapa.totalRegistros)} registros em {Obs.formato.numero(mapa.comInfraestrutura.length)} municípios baianos, considerando os filtros selecionados.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
          <div className="absolute right-4 top-4 z-10 flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-sm">
            <button type="button" onClick={() => mudarZoom(1.5)} disabled={nivelZoom >= 7.99} aria-label="Ampliar mapa" className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-xl disabled:opacity-40">+</button>
            <button type="button" onClick={() => mudarZoom(1 / 1.5)} disabled={nivelZoom <= 1.01} aria-label="Reduzir mapa" className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-xl disabled:opacity-40">−</button>
            <span className="flex h-9 min-w-12 items-center justify-center px-2 text-xs font-semibold text-slate-600">{nivelZoom.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×</span>
          </div>
          <svg ref={refSvg} viewBox={`${visao.x} ${visao.y} ${visao.largura} ${visao.altura}`} role="img" aria-label="Mapa da infraestrutura por município da Bahia"
            className={`mx-auto h-auto max-h-[70vh] w-full select-none ${nivelZoom > 1 ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={iniciarArraste} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar}>
            {mapa.municipios.map((m) => {
              const ativo = municipioAtivo?.id === m.id;
              return <path key={m.id} d={m.caminho} fill={corMunicipio(m.total)} fillRule="evenodd"
                stroke={ativo ? '#0f172a' : '#ffffff'} strokeWidth={ativo ? 1.8 : 0.55} vectorEffect="non-scaling-stroke"
                tabIndex={m.total ? 0 : undefined} className={m.total ? 'cursor-pointer transition-opacity hover:opacity-75 focus:outline-none' : ''}
                aria-label={`${m.nome}: ${m.total} registros`} onMouseEnter={() => m.total && setMunicipioEmFoco(m)} onMouseLeave={() => m.total && setMunicipioEmFoco(null)}
                onFocus={() => m.total && setMunicipioEmFoco(m)} onBlur={() => m.total && setMunicipioEmFoco(null)} onClick={() => m.total && setMunicipioSelecionado(m)}>
                <title>{`${m.nome} — ${m.territorio} — ${m.total} registros`}</title>
              </path>;
            })}
            <g aria-label="Municípios com infraestrutura">
              {[...mapa.comInfraestrutura].reverse().map((m) => <g key={`rotulo-${m.id}`} className="cursor-pointer"
                onMouseEnter={() => setMunicipioEmFoco(m)} onMouseLeave={() => setMunicipioEmFoco(null)} onClick={() => setMunicipioSelecionado(m)}>
                <line x1={m.centro.x} y1={m.centro.y} x2={m.rotulo.x + (m.rotulo.ancora === 'start' ? -2 : 2)} y2={m.rotulo.y - 3} stroke="#475569" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                <circle cx={m.centro.x} cy={m.centro.y} r="3.2" fill="#0f172a" stroke="#fff" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                <text x={m.rotulo.x} y={m.rotulo.y} textAnchor={m.rotulo.ancora} fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" className="text-[10px] font-semibold">{m.nome}</text>
              </g>)}
            </g>
          </svg>
        </div>
        <aside>
          <div className="mb-4 min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Município</p>
            {municipioAtivo ? <><p className="mt-1 font-semibold text-slate-900">{municipioAtivo.nome}</p><p className="text-sm text-slate-600">{municipioAtivo.territorio}</p><p className="mt-1 text-sm font-medium text-blue-800">{Obs.formato.numero(municipioAtivo.laboratorios)} laboratórios · {Obs.formato.numero(municipioAtivo.equipamentos)} equipamentos</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <button type="button" disabled={!municipioAtivo.laboratorios} onClick={() => aoAbrirMunicipio?.(municipioAtivo.nome, 'laboratorios')} className="rounded-lg bg-[#57269b] px-3 py-2 text-xs font-bold text-white hover:bg-[#451d7d] disabled:cursor-not-allowed disabled:opacity-40">Ver laboratórios ({Obs.formato.numero(municipioAtivo.laboratorios)})</button>
                <button type="button" disabled={!municipioAtivo.equipamentos} onClick={() => aoAbrirMunicipio?.(municipioAtivo.nome, 'equipamentos')} className="rounded-lg border border-[#57269b] bg-white px-3 py-2 text-xs font-bold text-[#57269b] hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40">Ver equipamentos ({Obs.formato.numero(municipioAtivo.equipamentos)})</button>
              </div></>
              : <p className="mt-1 text-sm text-slate-600">Passe o cursor ou toque em um município.</p>}
          </div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Quantidade de registros</h3>
          <div className="h-3 rounded-full bg-gradient-to-r from-[#e6f0fd] to-[#0d366b]" aria-hidden="true" />
          <div className="mt-1 flex justify-between text-xs text-slate-500"><span>1</span><span>{Obs.formato.numero(mapa.maximo)}</span></div>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-200" /> Sem registros</p>
          <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Municípios com mais infraestrutura</h3>
          <ol className="space-y-1.5">{mapa.comInfraestrutura.slice(0, 10).map((m, i) => <li key={m.id}><button type="button" onClick={() => setMunicipioSelecionado(m)} onMouseEnter={() => setMunicipioEmFoco(m)} onMouseLeave={() => setMunicipioEmFoco(null)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-50"><span className="w-5 text-right text-slate-400">{i + 1}</span><span className="min-w-0 flex-1 truncate">{m.nome}</span><span className="font-semibold text-slate-900">{Obs.formato.numero(m.total)}</span></button></li>)}</ol>
        </aside>
      </div>
    </section>
  );
}
