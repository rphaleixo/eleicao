// Tela "Comparar turnos": quadro, barras e mapa de Lula, Flávio Bolsonaro, outros e não voto no 1º e no 2º turno.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { viewBoxDoEstado } from "./geo.js";
import { caixaZoom } from "./zoomMapa.js";
import { LINHAS, MEDIDAS, CATEGORIAS_LIDER, naoVoto, votosDe, compararLinhas, percentual, valorDeOrdem } from "./comparacao.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sinal = (n, f = fmt) => (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n));
const pp = (n) => `${sinal(n, (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} pp`;
const seg = (attr, atual, opcoes) => `<div class="seg mini seg-rolavel" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;
const corLinha = (k) => ({ lula: corPartido("PT"), flavio: corPartido("PL"), outros: "#8a94a6", naovoto: "#5b6577" }[k]);
const classeDelta = (n) => (n > 0 ? "cmp-sobe" : n < 0 ? "cmp-desce" : "");
const seta = (n) => (n > 0 ? "▲" : n < 0 ? "▼" : "•");

export function controlesComparacao(c, { municipios }) {
  const ufs = `<option value="BR">Brasil</option>${Object.entries(UFS).filter(([u]) => u !== "ZZ").sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([u, n]) => `<option value="${u}"${u === c.uf ? " selected" : ""}>${esc(n)}</option>`).join("")}<option value="ZZ"${c.uf === "ZZ" ? " selected" : ""}>Exterior</option>`;
  const muns = c.uf === "BR" || c.uf === "ZZ" ? "" : `<label class="f-sel"><span>Município</span><select data-ct-mun aria-label="Município"><option value="">Todo o estado</option>${municipios.map((m) => `<option value="${m.cod}"${m.cod === c.mun ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>`;
  return `<div class="geo-ctl"><div class="geo-linha geo-selects"><label class="f-sel"><span>Onde</span><select data-ct-uf aria-label="Estado">${ufs}</select></label>${muns}</div>
    <div class="geo-linha"><span class="gp-leg">Percentuais sobre</span>${seg("data-ct-base", c.base, [["aptos", "Eleitores aptos"], ["validos", "Votos válidos"]])}</div>
    <div class="geo-linha"><span class="gp-leg">Mapa: quem</span>${seg("data-ct-linha", c.linha, LINHAS)}</div>
    <div class="geo-linha"><span class="gp-leg">Mapa: o que mostrar</span>${seg("data-ct-medida", c.medida, MEDIDAS)}</div></div>`;
}

const bloco = (rotulo, v, p) => `<div class="cmp-col"><small class="muted">${rotulo}</small>${v == null ? `<span class="muted">—</span>` : `<b>${fmt(v)}</b><span>${p == null ? "" : pct(p)}</span>`}</div>`;

/** O quadro principal: uma faixa por linha (Lula, Flávio, outros, não voto) com 1º turno, 2º turno e variação em votos e em pontos percentuais. */
export function quadroComparacao(l1, l2, { base, ondeNome, status2 }) {
  const itens = compararLinhas(l1, l2, base).map((r) => {
    const nv = r.chave === "naovoto" && base === "validos" ? ` <small class="muted" title="Abstenções, brancos e nulos não são votos válidos: o % é sobre os eleitores aptos">(% dos aptos)</small>` : "";
    const delta = r.dv == null ? `<div class="cmp-col"><small class="muted">Variação</small><span class="muted">—</span></div>`
      : `<div class="cmp-col ${classeDelta(r.dv)}"><small class="muted">Variação</small><b>${seta(r.dv)} ${sinal(r.dv)}</b><span>${r.dp == null ? "" : pp(r.dp)}</span></div>`;
    return `<div class="cmp-item"><div class="cmp-nome"><i class="cmp-dot" style="background:${corLinha(r.chave)}"></i>${esc(r.nome)}${nv}</div>
      <div class="cmp-cols">${bloco("1º turno", r.v1, r.p1)}${r.semNoTurno2 ? `<div class="cmp-col"><small class="muted">2º turno</small><span class="muted">sem candidato</span></div>` : bloco("2º turno", r.v2, r.p2)}${delta}</div></div>`;
  }).join("");
  const dAptos = l1 && l2 ? l2.aptos - l1.aptos : null;
  return `<div class="cmp-cabeca"><span><b>1º turno</b> · 04/10 · ${l1 ? pct(l1.pct) : "—"} apurado</span><span><b>2º turno</b> · 25/10 · ${l2 ? pct(l2.pct) : "ainda sem dados"} apurado</span></div>
    <div class="cmp-lista">${itens}<div class="cmp-item cmp-total"><div class="cmp-nome">Eleitores aptos</div><div class="cmp-cols">${bloco("1º turno", l1?.aptos ?? null, null)}${bloco("2º turno", l2?.aptos ?? null, null)}<div class="cmp-col ${dAptos != null ? classeDelta(dAptos) : ""}"><small class="muted">Variação</small>${dAptos == null ? `<span class="muted">—</span>` : `<b>${sinal(dAptos)}</b>`}</div></div></div></div>
    <p class="muted nota">${esc(ondeNome)}. ${status2 ?? ""} Não voto = abstenções + brancos + nulos. Variação = 2º turno menos 1º turno. Os eleitores aptos são os das seções apuradas em cada turno.</p>`;
}

/** Duas barras empilhadas (1º e 2º turno) com a composição de cada turno sobre os eleitores aptos. */
export function barrasComposicao(l1, l2) {
  const barra = (l, nome) => {
    if (!l || !l.aptos) return `<div class="cmp-linha"><span class="cmp-turno">${nome}</span><div class="cmp-barra vazia"><span class="muted">sem dados ainda</span></div></div>`;
    const seg = LINHAS.map(([k]) => ({ k, v: votosDe(l, k) })).filter((s) => s.v > 0);
    return `<div class="cmp-linha"><span class="cmp-turno">${nome}</span><div class="cmp-barra" role="img" aria-label="${esc(nome)}: ${seg.map((s) => `${LINHAS.find(([k]) => k === s.k)[1]} ${pct((s.v / l.aptos) * 100)}`).join(", ")}">${seg.map((s) => `<i style="width:${(s.v / l.aptos) * 100}%;background:${corLinha(s.k)}" title="${esc(LINHAS.find(([k]) => k === s.k)[1])}: ${fmt(s.v)} · ${pct((s.v / l.aptos) * 100)}"></i>`).join("")}</div></div>`;
  };
  return `<div class="cmp-barras">${barra(l1, "1º turno")}${barra(l2, "2º turno")}<ul class="geo-legenda">${LINHAS.map(([k, n]) => `<li><i class="gm-leg" style="background:${corLinha(k)}"></i>${esc(n)}</li>`).join("")}</ul></div>`;
}

/** O mapa dos municípios, pintado pela linha e pela medida escolhidas. */
export function mapaComparacao(malha, itens, { medida, classe, selecionado, uf, municipiosDaUf, municipioIbge }) {
  const porIbge = new Map(itens.map((i) => [i.ibge, i])), nosUf = uf && uf !== "BR" ? new Set(municipiosDaUf.map((m) => m.ibge)) : null;
  const caminhos = [...malha.caminhos].map(([ibge, d]) => {
    const i = porIbge.get(ibge), v = i?.valor;
    const c = nosUf && !nosUf.has(ibge) ? "co" : v == null ? "cx" : `c${classe(v)}`;
    const dica = i ? `${i.nome} · ${v == null ? "sem dado dos dois turnos" : medida === "lider" ? CATEGORIAS_LIDER[v] : medida === "votos" ? sinal(v) : medida === "pp" ? pp(v) : pct(v)}${v != null && i.l2 && i.l2.pct < 100 ? ` · 2º turno ${pct(i.l2.pct)} apurado` : ""}` : "";
    return `<path class="gm ${c}${ibge === selecionado ? " sel" : ""}" data-ct-ibge="${ibge}" d="${d}"${dica ? ` aria-label="${esc(dica)}"` : ""}>${dica ? `<title>${esc(dica)}</title>` : ""}</path>`;
  }).join("");
  const vb = municipioIbge ? viewBoxDoEstado(malha, [municipioIbge]) : nosUf ? viewBoxDoEstado(malha, municipiosDaUf.map((m) => m.ibge).filter(Boolean)) : malha.viewBox;
  const modo = medida === "lider" ? "lider" : medida === "pp" || medida === "votos" ? "acima" : "taxa";
  return caixaZoom(`<svg class="mapa-geo gm-${modo}" data-zoom="turnos" viewBox="${vb}" role="group" aria-label="Mapa de comparação entre os turnos"><g transform="scale(0.0001,-0.0001)">${caminhos}</g></svg>`);
}

export function legendaComparacao({ cortes }, medida, nomeLinha, { semDado }) {
  const f = medida === "pp" ? (v) => pp(v) : medida === "votos" ? (v) => sinal(Math.round(v)) : (v) => pct(v);
  let rotulos;
  if (medida === "lider") rotulos = CATEGORIAS_LIDER;
  else if (!cortes.length) rotulos = [];
  else if (medida === "pp" || medida === "votos") rotulos = [`${f(cortes[0])} ou menos`, `${f(cortes[0])} a ${f(cortes[1])}`, "perto de zero", `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  else rotulos = [`menos de ${f(cortes[0])}`, `${f(cortes[0])} a ${f(cortes[1])}`, `${f(cortes[1])} a ${f(cortes[2])}`, `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  const nota = medida === "lider" ? "Cor = quem teve mais votos no município em cada turno (Lula, Flávio ou, no 1º turno, outro candidato)."
    : medida === "pp" || medida === "votos" ? `Cor = variação de ${esc(nomeLinha)} entre o 1º e o 2º turno (${medida === "pp" ? "pontos percentuais" : "votos"}). Laranja = subiu; verde-azulado = caiu.`
    : `Cor = % de ${esc(nomeLinha)} no ${medida === "p1" ? "1º" : "2º"} turno.`;
  return `<ul class="geo-legenda gm-${medida === "lider" ? "lider" : medida === "pp" || medida === "votos" ? "acima" : "taxa"}">${rotulos.map((r, i) => `<li><i class="gm-leg c${i}"></i>${esc(r)}</li>`).join("")}${semDado ? `<li><i class="gm-leg cx"></i>sem dado nos dois turnos (${fmt(semDado)})</li>` : ""}</ul><p class="muted nota">${nota}</p>`;
}

export function fichaComparacao(i, base, { ufNome }) {
  if (!i) return `<p class="muted dica-mapa">Toque em um município para ver os números dele.</p>`;
  return `<div class="geo-ficha"><h3>${esc(i.nome)} <span class="muted">${esc(ufNome)}</span></h3>${quadroComparacao(i.l1, i.l2, { base, ondeNome: i.nome, status2: "" })}</div>`;
}

export function tabelaExtremos(itens, { medida, dir, linhaNome }) {
  const fmtV = (v) => (medida === "pp" ? pp(v) : medida === "votos" ? sinal(Math.round(v)) : pct(v));
  const linhas = itens.map((i, k) => `<tr data-ct-ibge="${i.ibge}" role="button" tabindex="0"><td>${k + 1}</td><td><b>${esc(i.nome)}</b> <small class="muted">${esc(i.uf)}</small></td><td>${fmt(i.l1?.aptos ?? 0)}</td><td class="${medida === "pp" || medida === "votos" ? classeDelta(i.valor) : ""}"><b>${fmtV(i.valor)}</b></td></tr>`).join("");
  return `<div class="tab-scroll"><table class="geo-rank"><tr><th>#</th><th>Município</th><th>Eleitores</th><th>${esc(linhaNome)}</th></tr>${linhas}</table></div>`;
}

export const ORDENS_PAIS = [["aptos", "Eleitores aptos"], ["p1:lula", "% de Lula no 1º turno"], ["p2:lula", "% de Lula no 2º turno"], ["dp:lula", "Variação de Lula"], ["p2:flavio", "% de Flávio no 2º turno"], ["dp:flavio", "Variação de Flávio"], ["dp:naovoto", "Variação do não voto"]];
const pc = (n) => (n == null ? "—" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%");

/** Uma faixa de país (ou de cidade): eleitores, e Lula, Flávio e não voto no 1º e no 2º turno, com a variação em pontos. */
function faixaPais(nome, l1, l2, base, { abrir, id, parcial, sub }) {
  const col = (chave, rotulo) => {
    const a = percentual(l1, chave, base), b = percentual(l2, chave, base), d = a != null && b != null ? b - a : null;
    return `<div class="cmp-col"><small class="muted">${rotulo}</small><b>1º ${pc(a)}</b><b>2º ${pc(b)}</b><span class="${d == null ? "" : classeDelta(d)}">${d == null ? "" : pp(d)}</span></div>`;
  };
  const cab = `<div class="cmp-nome">${abrir != null ? `<button type="button" class="cmp-pais" data-ct-pais="${esc(id)}" aria-expanded="${abrir}">${abrir ? "▾" : "▸"} ${esc(nome)}</button>` : esc(nome)} <small class="muted">${fmt(l1?.aptos ?? 0)} aptos${sub ? ` · ${esc(sub)}` : ""}${parcial ? " · 2º turno parcial" : ""}</small></div>`;
  return `${cab}<div class="cmp-cols">${col("lula", "Lula")}${col("flavio", "Flávio")}${col("naovoto", "Não voto")}</div>`;
}

/** Exterior por país: lista ordenável; tocar em um país mostra as cidades dele. */
export function exteriorPorPais(paises, { base, ordem, abertos, limite }) {
  const ord = paises.slice().sort((a, b) => valorDeOrdem(b, ordem, base) - valorDeOrdem(a, ordem, base) || a.pais.localeCompare(b.pais, "pt-BR"));
  const itens = ord.slice(0, limite).map((g) => {
    const aberto = abertos.has(g.pais);
    const cidades = aberto ? `<div class="cmp-cidades">${g.cidades.filter((c) => c.l1).sort((a, b) => b.l1.aptos - a.l1.aptos).map((c) => `<div class="cmp-cidade">${faixaPais(c.nome, c.l1, c.l2, base, {})}</div>`).join("")}</div>` : "";
    return `<div class="cmp-item">${faixaPais(g.pais, g.l1, g.l2, base, { abrir: aberto, id: g.pais, parcial: g.parcial2, sub: g.cidades.length > 1 ? `${g.cidades.length} cidades` : g.cidades[0].nome })}${cidades}</div>`;
  }).join("");
  return `<div class="geo-linha"><span class="gp-leg">Ordenar por</span>${seg("data-ct-ordem-pais", ordem, ORDENS_PAIS)}</div><div class="cmp-lista">${itens}</div>${ord.length > limite ? `<button type="button" class="btn-mais" data-ct-mais-paises>Mostrar mais países (${ord.length - limite})</button>` : ""}`;
}
