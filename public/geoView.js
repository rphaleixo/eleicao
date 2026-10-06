// Tela da aba Geografia: controles, mapa dos municípios, legenda, ficha do município e tabela.
import { UFS } from "./config.js";
import { fmt, pct } from "./formato.js";
import { caixaZoom } from "./zoomMapa.js";
import { METRICAS, VISOES, MINIMOS, CARGOS_GEO, valorDaVisao, viewBoxDoEstado } from "./geo.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sinal = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
export const NOME_METRICA = { abstencao: "abstenção", brancos: "brancos", nulos: "nulos" };

/** "abstenção", "brancos e nulos", "abstenção, brancos e nulos" (= não voto) */
export function nomeDasMetricas(metricas) {
  const ms = METRICAS.map(([k]) => k).filter((k) => metricas.has(k)).map((k) => NOME_METRICA[k]);
  if (ms.length === 3) return "não voto (abstenção, brancos e nulos)";
  return ms.length > 1 ? `${ms.slice(0, -1).join(", ")} e ${ms.at(-1)}` : ms[0] ?? "";
}

const seg = (attr, atual, opcoes) => `<div class="seg mini seg-rolavel" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;

export function controlesGeo(g, { cargoAtivo }) {
  const chips = METRICAS.map(([k, n]) => `<button type="button" class="geo-chip" data-geo-metrica="${k}" aria-pressed="${g.metricas.has(k)}">${n}</button>`).join("");
  const todas = g.metricas.size === 3;
  const ufs = `<option value="">Brasil</option>${Object.entries(UFS).filter(([u]) => u !== "ZZ").sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([u, n]) => `<option value="${u}"${u === g.uf ? " selected" : ""}>${esc(n)}</option>`).join("")}`;
  const mins = MINIMOS.map(([v, n]) => `<option value="${v}"${v === g.min ? " selected" : ""}>${esc(n)}</option>`).join("");
  return `<div class="geo-ctl"><div class="geo-linha"><span class="gp-leg">Medir</span><div class="geo-chips">${chips}<button type="button" class="geo-chip geo-nv" data-geo-nv aria-pressed="${todas}" title="Soma abstenção, brancos e nulos">Não voto (as três)</button></div></div>
    ${cargoAtivo ? `<div class="geo-linha"><span class="gp-leg">Cargo</span>${seg("data-geo-cargo", g.cargo, CARGOS_GEO)}</div>` : `<p class="muted nota">A abstenção é a mesma em todos os cargos. Escolha brancos ou nulos para comparar por cargo.</p>`}
    <div class="geo-linha"><span class="gp-leg">Mostrar</span>${seg("data-geo-visao", g.visao, VISOES)}</div>
    <div class="geo-linha geo-selects"><label class="f-sel"><span>Estado</span><select data-geo-uf aria-label="Estado">${ufs}</select></label>
      <label class="f-sel"><span>Tamanho do município</span><select data-geo-min aria-label="Tamanho mínimo do município">${mins}</select></label></div></div>`;
}

/** O desenho dos 5.570 municípios; cada um com a classe de cor da visão (c0 a c4) ou sem dado (cx). */
export function mapaGeo(malha, itens, { visao, classe, selecionado, uf, municipiosDaUf, nomeMetrica }) {
  const porIbge = new Map(itens.map((l) => [l.ibge, l])), nosUf = uf ? new Set(municipiosDaUf.map((m) => m.ibge)) : null;
  const caminhos = [...malha.caminhos].map(([ibge, d]) => {
    const l = porIbge.get(ibge), v = l ? valorDaVisao(l, visao) : null;
    const c = nosUf && !nosUf.has(ibge) ? "co" : v == null ? (l?.fora ? "cf" : "cx") : `c${classe(v)}`;
    const dica = l ? `${l.nome} · ${l.valor == null ? "ainda sem dado" : `${pct(l.taxa)} · ${fmt(l.valor)} de ${fmt(l.aptos)}`}` : "";
    return `<path class="gm ${c}${ibge === selecionado ? " sel" : ""}" data-geo-ibge="${ibge}" d="${d}"${dica ? ` aria-label="${esc(dica)}"` : ""}>${dica ? `<title>${esc(dica)}</title>` : ""}</path>`;
  }).join("");
  const vb = uf ? viewBoxDoEstado(malha, municipiosDaUf.map((m) => m.ibge).filter(Boolean)) : malha.viewBox;
  return caixaZoom(`<svg class="mapa-geo gm-${visao}" data-zoom="geo" viewBox="${vb}" role="group" aria-label="Mapa dos municípios: ${esc(nomeMetrica)}"><g transform="scale(0.0001,-0.0001)">${caminhos}</g></svg>`);
}

export function legendaGeo({ cortes }, visao, { semDado, fora }) {
  const f = (v) => (visao === "taxa" ? pct(v) : visao === "pessoas" ? fmt(v) : sinal(v));
  let rotulos;
  if (!cortes.length) rotulos = [];
  else if (visao === "acima") rotulos = [`${f(cortes[0])} ou menos`, `${f(cortes[0])} a ${f(cortes[1])}`, "perto do esperado", `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  else rotulos = [`menos de ${f(cortes[0])}`, `${f(cortes[0])} a ${f(cortes[1])}`, `${f(cortes[1])} a ${f(cortes[2])}`, `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  const itens = rotulos.map((r, i) => `<li><i class="gm-leg c${i}"></i>${esc(r)}</li>`).join("");
  return `<ul class="geo-legenda gm-${visao}">${itens}${semDado ? `<li><i class="gm-leg cx"></i>sem dado carregado (${fmt(semDado)})</li>` : ""}${fora ? `<li><i class="gm-leg cf"></i>abaixo do tamanho escolhido</li>` : ""}</ul>`;
}

export function resumoGeo(c, g, nomeMetrica, total = 0) {
  return `<div class="pp-tiles pp-tiles-peq"><div class="pp-tile"><strong>${fmt(c.totalValor)}</strong><span>pessoas: ${esc(nomeMetrica)}</span></div><div class="pp-tile eleito"><strong>${pct(c.taxaNacional)}</strong><span>dos eleitores aptos${g.uf ? ` em ${esc(UFS[g.uf])}` : " no Brasil"}</span></div><div class="pp-tile"><strong>${fmt(c.municipios)}${total ? ` <small class="muted">de ${fmt(total)}</small>` : ""}</strong><span>municípios com dado</span></div></div>`;
}

const linhaFicha = (nome, valor, base, destaque = false) => `<tr${destaque ? ' class="nv-soma"' : ""}><th>${nome}</th><td>${valor == null ? '<span class="muted">carregando…</span>' : fmt(valor)}</td><td>${valor == null || !base ? "" : pct((valor / base) * 100)}</td></tr>`;

/** A ficha do município: números absolutos e percentuais sobre os eleitores aptos. */
export function fichaGeo(l, { cargoNome, metricas, totalValor, taxaNacional, ufNome, escopo = "do Brasil" }) {
  if (!l) return `<p class="muted dica-mapa">Toque em um município para ver os números dele.</p>`;
  const ms = [...metricas];
  const nv = l.abstencao != null && l.brancos != null && l.nulos != null ? l.abstencao + l.brancos + l.nulos : null;
  const peso = l.valor != null && totalValor ? (l.valor / totalValor) * 100 : null;
  return `<div class="geo-ficha"><h3>${esc(l.nome)} <span class="muted">${esc(ufNome)}</span></h3>
    <table class="geo-tab"><tr><th>Eleitores aptos</th><td>${fmt(l.aptos)}</td><td></td></tr>
    ${l.comparecimento != null ? linhaFicha("Comparecimento", l.comparecimento, l.aptos) : ""}
    ${linhaFicha("Abstenções", l.abstencao, l.aptos)}${linhaFicha(`Brancos <small class="muted">${esc(cargoNome)}</small>`, l.brancos, l.aptos)}${linhaFicha(`Nulos <small class="muted">${esc(cargoNome)}</small>`, l.nulos, l.aptos)}${linhaFicha("Não voto", nv, l.aptos, true)}</table>
    ${peso != null ? `<p class="muted nota">Este município tem ${pct(peso)} de todas as pessoas contadas em ${esc(nomeDasMetricas(new Set(ms)))} ${esc(escopo)} e está ${sinal(Math.round(l.acima))} pessoas ${l.acima >= 0 ? "acima" : "abaixo"} do que a taxa ${esc(escopo)} (${pct(taxaNacional)}) daria para o tamanho dele.</p>` : ""}</div>`;
}

export function tabelaGeo(itens, { visao, pagina, porPagina = 20, selecionado }) {
  const ordenados = itens.filter((l) => valorDaVisao(l, visao) != null).sort((a, b) => valorDaVisao(b, visao) - valorDaVisao(a, visao) || a.nome.localeCompare(b.nome, "pt-BR"));
  const mostra = ordenados.slice(0, pagina * porPagina);
  const linhas = mostra.map((l, i) => `<tr data-geo-ibge="${l.ibge}" role="button" tabindex="0"${l.ibge === selecionado ? ' class="sel"' : ""}><td>${i + 1}</td><td><b>${esc(l.nome)}</b> <small class="muted">${l.uf}</small></td><td>${fmt(l.aptos)}</td><td>${fmt(l.valor)}</td><td>${pct(l.taxa)}</td><td class="${l.acima >= 0 ? "geo-mais" : "geo-menos"}">${sinal(Math.round(l.acima))}</td></tr>`).join("");
  const mais = ordenados.length > mostra.length ? `<button type="button" class="btn-mais" data-geo-mais>Mostrar mais (${fmt(ordenados.length - mostra.length)})</button>` : "";
  const ordem = visao === "pessoas" ? "pessoas" : visao === "acima" ? "pessoas acima da média" : "taxa";
  return `<div class="tab-scroll"><table class="geo-rank"><tr><th>#</th><th>Município</th><th>Eleitores</th><th>Pessoas</th><th>Taxa</th><th title="Pessoas a mais (ou a menos) do que a taxa nacional daria neste município">Acima da média</th></tr>${linhas}</table></div>${mais}<p class="muted nota">Ordenado por ${ordem}, do maior para o menor. Toque em uma linha para ver o município no mapa.</p>`;
}
