// Um card por estado com o resultado (dois primeiros), a % de apuração e a abstenção.
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { ordenarCandidatos } from "./ranking.js";
import { UFS } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TEXTO = { n: "Não iniciada", p: "Em andamento", f: "Finalizada" };
export const nomeLocal = (uf) => (uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

/** Abstenção (%) das seções já apuradas, a partir do arquivo de acompanhamento do estado. */
export function abstencaoDe(u) {
  if (!u) return null;
  const votantes = u.comparecimento + u.abstencao;
  return votantes > 0 ? (u.abstencao / votantes) * 100 : null;
}

function situacao(d) {
  if (!d) return "";
  if (d.definido === "e") return `<span class="badge">Eleito</span>`;
  if (d.definido === "s") return `<span class="badge">2º turno</span>`;
  return "";
}

/**
 * @param {string} uf sigla (ou ZZ)
 * @param {object|null|undefined} d resultado normalizado do cargo no estado (undefined = carregando)
 * @param {object|undefined} u andamento do estado (acompanhamento)
 */
export function cardEstado(uf, d, u) {
  const apurado = u?.pct ?? d?.pctSecoes ?? 0;
  const abst = abstencaoDe(u);
  const top = d ? ordenarCandidatos(d.candidatos).slice(0, 2) : [];
  const lider = top[0] && top[0].votos > 0 ? top[0] : null;
  const cor = lider ? corPartido(lider.partido) : "var(--abst)";
  const and = u?.andamento ?? d?.andamento ?? "n";
  const linha = (c) => `<li style="--cor:${corPartido(c.partido)}"><span class="cu-marca"></span>
      <span class="cu-quem"><b>${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span></span>
      <span class="cu-num"><strong>${pct(c.pct)}</strong><small>${fmt(c.votos)} votos</small></span></li>`;
  const duelo = top.length && d.votosValidos > 0
    ? `<span class="cu-duelo" role="img" aria-label="${esc(top.map((c) => `${c.nome} ${pct(c.pct)}`).join(", "))}">${top.map((c) => `<i style="width:${Math.min(100, c.pct)}%;background:${corPartido(c.partido)}"></i>`).join("")}</span>`
    : `<span class="cu-duelo vazio"></span>`;
  const corpo = d === undefined ? `<p class="muted cu-aviso">Carregando…</p>`
    : !top.length ? `<p class="muted cu-aviso">${d ? "Sem candidatos" : "Resultado indisponível"}</p>`
    : `<ul class="cu-cands">${top.map(linha).join("")}</ul>${duelo}`;
  return `<li><button type="button" class="card-uf" data-uf="${uf}" style="--cor:${cor}" aria-label="${esc(nomeLocal(uf))}: ver detalhes">
    <span class="cu-topo"><span class="sigla">${uf === "ZZ" ? "EX" : uf}</span><span class="cu-nome-uf"><b>${esc(nomeLocal(uf))}</b>${situacao(d)}</span>
      <span class="cu-apurado"><strong>${pct(apurado)}</strong><small><i class="ponto ${and === "f" ? "f" : and === "p" ? "p" : "n"}" title="${TEXTO[and] ?? TEXTO.n}"></i>apurado</small></span></span>
    <i class="cu-barra"><i style="width:${Math.min(100, apurado)}%"></i></i>
    ${corpo}
    <span class="cu-rodape"><span><small>Abstenção</small><b>${abst == null ? "–" : pct(abst)}</b></span>
      <span><small>Votos válidos</small><b>${d ? fmt(d.votosValidos) : "–"}</b></span><span><small>Eleitores</small><b>${u?.eleitores ? fmt(u.eleitores) : "–"}</b></span></span></button></li>`;
}

export const gradeCards = (cards) => `<ul class="cards-estados">${cards.join("")}</ul>`;
