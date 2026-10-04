// Deputados federais mais votados: por estado e o top 10 do país.
import { UFS } from "./config.js";
import { urlFoto } from "./tse.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { seloSit, seloProjetado } from "./situacao.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Candidatos de um estado, do mais votado ao menos, com a marca de eleito (oficial) ou eleito na projeção. */
export function votadosDoEstado({ uf, d, dist }, n = Infinity) {
  const projetados = new Set((dist?.eleitos ?? []).map((e) => String(e.id)));
  return d.candidatos
    .filter((c) => c.votos > 0 && c.elegivel)
    .sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, n)
    .map((c) => ({ uf, id: c.id, nome: c.nome, partido: c.partido, votos: c.votos, pct: c.pct, oficial: c.sit === "eleito", projetado: c.sit !== "eleito" && projetados.has(String(c.id)) }));
}

/** Os mais votados do país (soma dos 27 estados: cada deputado concorre em um só). */
export function top10Pais(estados, n = 10) {
  return (estados ?? []).flatMap((e) => votadosDoEstado(e, n)).sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, n);
}

const selo = (c) => (c.oficial ? seloSit({ sit: "eleito" }, { curto: true }) : c.projetado ? seloProjetado({ curto: true }) : "");

const linha = (c, i, comUf, max) => `<li class="dv" style="--cor:${corPartido(c.partido)}" data-sq="${esc(c.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
  <span class="pos">${i + 1}</span><img class="foto mini" loading="lazy" alt="" src="${urlFoto("dep-federal", c.uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
  <span class="dv-quem"><b>${esc(c.nome)}</b><span class="muted">${comUf ? `${esc(UFS[c.uf] ?? c.uf)} · ` : ""}<span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span></span></span>
  <span class="dv-votos"><strong>${fmt(c.votos)}</strong><small>${pct(c.pct)} dos válidos</small>${selo(c)}</span>
  <span class="cr-barra"><i style="width:${max ? (c.votos / max) * 100 : 0}%"></i></span></li>`;

/** Bloco "Top 10 do país". */
export function blocoTop10(estados, status = "") {
  const top = top10Pais(estados);
  const max = top[0]?.votos ?? 0;
  return `<div class="titulo-cadeiras"><h2>Top 10 deputados federais mais votados</h2><span class="muted">no país</span></div>${status}
    ${top.length ? `<ol class="lista-dv">${top.map((c, i) => linha(c, i, true, max)).join("")}</ol>` : `<p class="muted">Ainda sem votos apurados.</p>`}
    <p class="muted nota">Votos nominais de cada candidato, somando o que já foi apurado. % sobre os votos válidos do estado dele.</p>`;
}

/** Cards "Mais votados por estado": os 5 primeiros de cada estado. */
export function cardsMaisVotados(estados, ufs, n = 5) {
  const mapa = new Map((estados ?? []).map((e) => [e.uf, e]));
  const cards = ufs.map((uf) => mapa.get(uf)).filter(Boolean).map((e) => {
    const v = votadosDoEstado(e, n), max = v[0]?.votos ?? 0;
    return `<li class="card-dv"><div class="cd-topo"><b>${esc(UFS[e.uf] ?? e.uf)}</b><span class="muted">${pct(e.d.pctSecoes)} apurado · ${e.dist?.vagas ?? ""} vagas</span></div>
      <ol class="lista-dv">${v.length ? v.map((c, i) => linha(c, i, false, max)).join("") : `<li class="muted">Sem votos apurados.</li>`}</ol></li>`;
  });
  return cards.length ? `<ul class="cards-estados cards-dv">${cards.join("")}</ul>` : `<p class="muted">Nenhum estado com esses filtros.</p>`;
}
