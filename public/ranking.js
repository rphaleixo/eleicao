// Ranking das eleições majoritárias: os 3 primeiros em destaque e os demais numa lista compacta (sem foto).
import { urlFoto } from "./tse.js";
import { corPartido } from "./cores.js";
import { seloSit, classeSit } from "./situacao.js";
import { listaCandidatos, rotuloBase } from "./base.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
import { fmt, pct } from "./formato.js";

/** Mais votados primeiro; empate (inclusive antes da apuração) em ordem alfabética. */
export const ordenarCandidatos = (candidatos) => candidatos.slice().sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));

function selo(c) {
  const sit = seloSit(c);
  if (sit) return sit;
  return !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "";
}

const ICONE = { __naovoto: "∅", __abstencao: "–", __nulos: "✕", __brancos: "○" };
const fotoSintetica = (c, classe) => `<span class="foto ${classe} foto-sint" aria-hidden="true">${ICONE[c.id] ?? "•"}</span>`;

function pódio(c, i, aba, uf) {
  if (c.sintetico) return `<li class="pod pod-${i + 1} sintetico"><span class="pod-pos">${i + 1}º</span>${fotoSintetica(c, "pod-foto")}
    <b class="pod-nome">${esc(c.nome)}</b><small class="muted">${esc(c.descricao)}</small>
    <strong class="pod-pct">${pct(c.pct)}</strong><small class="pod-votos">${fmt(c.votos)}</small></li>`;
  return `<li class="pod pod-${i + 1}${classeSit(c)}" style="--cor:${corPartido(c.partido)}" data-sq="${esc(c.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
    <span class="pod-pos">${i + 1}º</span>
    <img class="foto pod-foto" loading="lazy" alt="" src="${urlFoto(aba, uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
    <b class="pod-nome">${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>
    <strong class="pod-pct">${pct(c.pct)}</strong><small class="pod-votos">${fmt(c.votos)}</small>${selo(c)}</li>`;
}

function linha(c, i, max) {
  if (c.sintetico) return `<li class="cr sintetico"><span class="pos">${i + 1}</span><span class="cr-nome"><b>${esc(c.nome)}</b><span class="muted">${esc(c.descricao)}</span></span>
    <span class="cr-pct">${pct(c.pct)}</span><span class="cr-votos">${fmt(c.votos)}</span><span class="cr-barra"><i style="width:${max ? (c.votos / max) * 100 : 0}%"></i></span></li>`;
  return `<li class="cr${classeSit(c)}" style="--cor:${corPartido(c.partido)}" data-sq="${esc(c.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
    <span class="pos">${i + 1}</span><span class="cr-nome"><b>${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>${selo(c)}</span>
    <span class="cr-pct">${pct(c.pct)}</span><span class="cr-votos">${fmt(c.votos)}</span><span class="cr-barra"><i style="width:${max ? (c.votos / max) * 100 : 0}%"></i></span></li>`;
}

/**
 * @param {object} d resultado normalizado
 * @param {{aba:string, uf:string, limite?:number, vagas?:number}} o
 */
export function rankingMajoritario(d, { aba, uf, limite = 40, vagas = d.vagas || 1 }) {
  const todos = ordenarCandidatos(listaCandidatos(d));
  if (!todos.length) return `<p class="muted">Sem candidatos neste arquivo.</p>`;
  const topo = todos.slice(0, 3), resto = todos.slice(3, limite);
  const max = Math.max(1, todos[0].votos);
  const corte = aba === "senador" && vagas > 1 ? vagas : 0; // senador: duas vagas
  const itens = resto.map((c, i) => linha(c, i + 3, max) + (corte && i + 3 === corte - 1 && todos.length > corte ? `<li class="linha-corte" role="presentation">posição de eleito (${vagas} vagas)</li>` : "")).join("");
  const corteNoTopo = corte && corte <= 3 && todos.length > corte ? `<p class="linha-corte">Os ${corte} primeiros ocupam as vagas de senador.</p>` : "";
  return `<ol class="podio">${topo.map((c, i) => pódio(c, i, aba, uf)).join("")}</ol>${corteNoTopo}
    ${resto.length ? `<ol class="lista-compacta" start="4">${itens}</ol>` : ""}${todos.length > limite ? `<p class="muted">Mostrando os ${limite} primeiros de ${fmt(todos.length)} candidatos.</p>` : ""}`;
}
