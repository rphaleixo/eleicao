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
  const itens = d === undefined ? `<li class="muted">Carregando…</li>`
    : !top.length ? `<li class="muted">${d ? "Sem candidatos" : "Resultado indisponível"}</li>`
    : top.map((c) => `<li><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span><span class="cu-nome">${esc(c.nome)}</span><strong>${pct(c.pct)}</strong></li>`).join("");
  return `<li><button type="button" class="card-uf" data-uf="${uf}" style="--cor:${cor}" aria-label="${esc(nomeLocal(uf))}: ver detalhes">
    <span class="cu-topo"><span class="sigla">${uf === "ZZ" ? "EX" : uf}</span><b>${esc(nomeLocal(uf))}</b>${situacao(d)}<i class="ponto ${and === "f" ? "f" : and === "p" ? "p" : "n"}" title="${TEXTO[and] ?? TEXTO.n}"></i></span>
    <ul class="cu-cands">${itens}</ul>
    <span class="cu-metricas"><span class="cu-metrica"><small>Apurado</small><b>${pct(apurado)}</b><i class="cu-barra"><i style="width:${Math.min(100, apurado)}%"></i></i></span>
      <span class="cu-metrica"><small>Abstenção</small><b>${abst == null ? "–" : pct(abst)}</b>${u?.eleitores ? `<small class="cu-eleit">${fmt(u.eleitores)} eleitores</small>` : ""}</span></span></button></li>`;
}

export const gradeCards = (cards) => `<ul class="cards-estados">${cards.join("")}</ul>`;
