// Cartões "Votação" e "Eleitorado": a composição dos votos e do comparecimento, para qualquer eleição.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
import { fmt, pct } from "./formato.js";

const linha = (rotulo, n, total, { cor = "", nivel = 0, forte = false } = {}) =>
  `<div class="vt-linha n${nivel}${forte ? " forte" : ""}"><span class="vt-rot">${cor ? `<i class="vt-cor ${cor}"></i>` : ""}${esc(rotulo)}</span><span class="vt-n">${fmt(n)}</span><span class="vt-p">${pct(total ? (n / total) * 100 : 0)}</span></div>`;

/** Votação: nominais (válidos, anulados, anulados sub judice), em branco e nulos; em eleição proporcional, também os votos na legenda. */
export function cardVotacao(d, { proporcional = false } = {}) {
  const v = d.votos;
  if (!v) return "";
  const total = v.total;
  const seg = (n, cor) => `<i class="${cor}" style="width:${total ? (n / total) * 100 : 0}%"></i>`;
  const barra = `<div class="vt-barra" role="img" aria-label="Composição dos votos">${seg(v.validos, "validos")}${seg(v.anulados, "anulados")}${seg(v.anuladosSubJudice, "subjudice")}${seg(v.brancos, "brancos")}${seg(v.nulos, "nulos")}</div>`;
  const nominais = proporcional ? "Candidatos e legendas" : "Nominais";
  const legenda = proporcional
    ? `${linha("Nominais", v.nominaisValidos, total, { nivel: 2 })}${linha("Na legenda", v.legenda, total, { nivel: 2 })}` : "";
  return `<section class="card votacao"><h2>Votação</h2>${barra}<p class="muted">${fmt(total)} votos</p>
    ${linha(nominais, v.nominais, total, { forte: true })}${linha("Válidos", v.validos, total, { cor: "validos", nivel: 1 })}${legenda}
    ${linha("Anulados", v.anulados, total, { cor: "anulados", nivel: 1 })}${linha("Anulados sub judice", v.anuladosSubJudice, total, { cor: "subjudice", nivel: 1 })}
    ${linha("Em branco", v.brancos, total, { cor: "brancos" })}${linha("Nulos", v.nulos, total, { cor: "nulos" })}</section>`;
}

/** Eleitorado: aptos, aptos nas seções já totalizadas, comparecimento e abstenção. */
export function cardEleitorado(d) {
  const e = d.eleitorado;
  if (!e) return "";
  const base = e.apuradas;
  const seg = (n, cor) => `<i class="${cor}" style="width:${base ? (n / base) * 100 : 0}%"></i>`;
  return `<section class="card votacao"><h2>Eleitorado</h2><div class="vt-barra" role="img" aria-label="Comparecimento e abstenção">${seg(e.comparecimento, "validos")}${seg(e.abstencao, "abstencao")}</div>
    <p class="muted">comparecimento × abstenção, nas seções já totalizadas</p>
    ${linha("Eleitorado apto", e.apto, e.apto, { forte: true })}${linha("Apto das seções totalizadas", base, e.apto)}
    ${linha("Comparecimento", e.comparecimento, base, { cor: "validos", nivel: 1 })}${linha("Abstenção", e.abstencao, base, { cor: "abstencao", nivel: 1 })}</section>`;
}

export const cartoesVotacao = (d, opcoes) => `<div class="grade2">${cardVotacao(d, opcoes)}${cardEleitorado(d)}</div>`;
