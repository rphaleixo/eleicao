// Câmara dos Deputados: os 513 deputados somados dos 27 estados, em visões por partido, por estado, mapa e tabela.
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { UFS } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const MAIORIA_CAMARA = 257;
export const AGRUP_CAMARA = { partido: "Por partido", desempenho: "Desempenho", estado: "Por estado", mapa: "Mapa", tabela: "Tabela", top10: "Top 10 do país", votados: "Mais votados por estado", clausula: "Cláusula de desempenho", eleitos: "Deputados eleitos", barrados: "Barrados (10% do QE)" };

export function seletorAgrupCamara(agrup) {
  return `<div class="seg mini seg-rolavel" role="group" aria-label="Visão da Câmara">${Object.entries(AGRUP_CAMARA).map(([k, nome]) => `<button type="button" data-agrup-camara="${k}" aria-pressed="${k === agrup}">${nome}</button>`).join("")}</div>`;
}

/** Os 513 lugares em uma faixa compacta, um quadrado por cadeira, agrupados por partido/federação; tracejado = ainda sem projeção. */
export function plenarioCamara(n) {
  const cheios = n.partidos.flatMap((p) => Array.from({ length: p.vagas }, () => `<i style="--cor:${corPartido(p.sigla)}" title="${esc(p.sigla)}"></i>`));
  const vagas = Array.from({ length: Math.max(0, n.totalVagas - cheios.length) }, () => `<i class="pl-vaga" title="Vaga ainda sem projeção"></i>`);
  return `<div class="plenario plenario-camara" role="img" aria-label="Câmara: ${cheios.length} de ${n.totalVagas} cadeiras projetadas">${cheios.join("")}${vagas.join("")}</div>`;
}

/** Uma linha por partido/federação: barra (confirmadas em cor cheia, o restante da projeção em cor clara), total e maiores bancadas. */
export function porPartidoCamara(n) {
  const max = Math.max(1, ...n.partidos.map((p) => p.vagas));
  const linhas = n.partidos.map((p) => {
    const maiores = Object.entries(p.porUF).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u, q]) => `${u} ${q}`).join(" · ");
    const proj = p.vagas - p.confirmadas;
    return `<li style="--cor:${corPartido(p.sigla)}"><span class="chip" style="--cor:${corPartido(p.sigla)}">${esc(p.sigla)}</span>
      <span class="bp-barra" title="${p.confirmadas} confirmadas + ${proj} em projeção"><i class="e26" style="width:${(p.confirmadas / max) * 100}%"></i><i class="e22" style="width:${(proj / max) * 100}%"></i></span>
      <span class="bp-total"><strong>${p.vagas}</strong><small>${pct((p.vagas / n.totalVagas) * 100)}</small></span>
      <small class="bc-detalhe">${p.confirmadas ? `${p.confirmadas} confirmada${p.confirmadas === 1 ? "" : "s"} · ` : ""}${fmt(p.votos)} votos${maiores ? ` · maiores: ${esc(maiores)}` : ""}</small></li>`;
  }).join("");
  return `<ul class="bancada-partidos camara-partidos">${linhas}</ul>
    <p class="legenda-plenario"><span><i class="bp-leg e26"></i>Confirmadas pelo TSE</span><span><i class="bp-leg e22"></i>Em projeção</span></p>`;
}

const situacao = (u) => (u.oficial ? "oficial" : "projeção");

/** Um card por estado: vagas, apuração, situação e a bancada projetada por partido/federação. */
export function cardsEstadosCamara(n, ufs) {
  const mapa = new Map(n.ufs.map((u) => [u.uf, u]));
  const cards = ufs.map((uf) => {
    const u = mapa.get(uf);
    if (!u) return "";
    const ban = [...u.bancadas].sort((a, b) => b.vagas - a.vagas || a.sigla.localeCompare(b.sigla, "pt-BR"));
    const ocupadas = ban.reduce((t, b) => t + b.vagas, 0);
    const barra = ban.map((b) => `<i style="width:${(b.vagas / (u.vagas || 1)) * 100}%;background:${corPartido(b.sigla)}" title="${esc(b.sigla)} ${b.vagas}"></i>`).join("");
    const chips = ban.slice(0, 6).map((b) => `<span class="chip" style="--cor:${corPartido(b.sigla)}">${esc(b.sigla)} ${b.vagas}</span>`).join("") + (ban.length > 6 ? `<span class="chip mais">+${ban.length - 6}</span>` : "");
    return `<li><button type="button" class="card-uf card-camara${u.oficial ? " eleicao-eleito" : ""}" data-uf="${uf}" aria-label="${esc(UFS[uf])}: ver deputados">
      <span class="cu-topo"><span class="sigla">${uf}</span><span class="cu-nome-uf"><b>${esc(UFS[uf])}</b>${u.oficial ? `<span class="selo-sit eleito"><i aria-hidden="true">✓</i>oficial</span>` : ""}</span>
        <span class="cu-pilula ${u.oficial ? "f" : "p"}"><i class="ponto ${u.oficial ? "f" : "p"}"></i>${pct(u.pct)}</span></span>
      <span class="cc-vagas"><strong>${ocupadas}</strong> de ${u.vagas} cadeiras <small>(${situacao(u)})</small></span>
      <span class="cc-barra" role="img" aria-label="Cadeiras por partido">${barra}</span>
      <span class="cc-chips">${chips || `<span class="muted">Sem cadeiras distribuídas</span>`}</span>
      <span class="cu-rodape"><small></small><span class="cu-ver">Ver deputados <i aria-hidden="true">→</i></span></span></button></li>`;
  }).join("");
  return `<ul class="cards-estados">${cards}</ul>`;
}

/** Tabela por estado (a mesma de antes): vagas, apuração, situação e cadeiras por partido/federação. */
export function tabelaEstadosCamara(n, ufs) {
  const mapa = new Map(n.ufs.map((u) => [u.uf, u]));
  const linhas = ufs.map((uf) => mapa.get(uf)).filter(Boolean).map((u) => {
    const ban = [...u.bancadas].sort((a, b) => b.vagas - a.vagas).map((x) => `<span class="chip" style="--cor:${corPartido(x.sigla)}">${esc(x.sigla)} ${x.vagas}</span>`).join(" ");
    return `<tr class="clicavel" data-uf="${u.uf}"><td class="uf-nome">${esc(UFS[u.uf])}</td><td>${u.vagas}</td>
      <td><span class="mini-barra"><i style="width:${Math.min(100, u.pct)}%"></i></span>${pct(u.pct)}</td><td>${situacao(u)}</td><td style="text-align:left;white-space:normal">${ban || "–"}</td></tr>`;
  }).join("");
  return `<div class="tab-scroll"><table><tr><th>Estado</th><th>Vagas</th><th>Apurado</th><th>Situação</th><th>Cadeiras por partido/federação</th></tr>${linhas || `<tr><td colspan="5" class="muted" style="text-align:left">Nenhum estado com esses filtros.</td></tr>`}</table></div>`;
}

/** Quem tem a maior bancada em cada estado (cor do mapa); a força da cor segue a apuração. */
export function lideresCamara(n) {
  const out = {};
  for (const u of n.ufs) {
    const topo = [...u.bancadas].sort((a, b) => b.vagas - a.vagas)[0];
    out[u.uf] = topo ? { cor: corPartido(topo.sigla), quem: topo.sigla, apurado: u.pct } : null;
  }
  return out;
}
