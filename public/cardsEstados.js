// Um card por estado com o resultado (dois primeiros), a % de apuração e a abstenção.
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { ordenarCandidatos } from "./ranking.js";
import { UFS } from "./config.js";
import { urlFoto } from "./tse.js";

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
 * @param {string} cargo cargo mostrado (define a pasta das fotos): "governador" ou "presidente"
 */
export function cardEstado(uf, d, u, cargo = "governador") {
  const apurado = u?.pct ?? d?.pctSecoes ?? 0;
  const abst = abstencaoDe(u);
  const top = d ? ordenarCandidatos(d.candidatos).slice(0, 2) : [];
  const and = u?.andamento ?? d?.andamento ?? "n";
  const linha = (c) => {
    const cor = corPartido(c.partido);
    return `<li style="--cor:${cor}"><img class="foto cu-foto" loading="lazy" alt="" src="${urlFoto(cargo, uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <span class="cu-corpo"><span class="cu-linha1"><span class="cu-quem"><b title="${esc(c.nome)}">${esc(c.nome)}</b><i class="cu-num-cand">${esc(c.numero)}</i></span><span class="chip" style="--cor:${cor}">${esc(c.partido)}</span></span>
        <span class="cu-trilho"><i style="width:${Math.min(100, c.pct)}%"></i></span>
        <span class="cu-linha2"><strong>${pct(c.pct)}</strong><small>${fmt(c.votos)} votos</small></span></span></li>`;
  };
  const corpo = d === undefined ? `<p class="muted cu-aviso">Carregando…</p>`
    : !top.length ? `<p class="muted cu-aviso">${d ? "Sem candidatos" : "Resultado indisponível"}</p>`
    : `<ul class="cu-cands">${top.map(linha).join("")}</ul>`;
  const metricas = [abst == null ? "" : `Abstenção ${pct(abst)}`, u?.eleitores ? `${fmt(u.eleitores)} eleitores` : ""].filter(Boolean).join(" · ");
  return `<li><button type="button" class="card-uf" data-uf="${uf}" aria-label="${esc(nomeLocal(uf))}: ver apuração completa">
    <span class="cu-topo"><span class="sigla">${uf === "ZZ" ? "EX" : uf}</span><span class="cu-nome-uf"><b>${esc(nomeLocal(uf))}</b>${situacao(d)}</span>
      <span class="cu-pilula ${and}" title="${TEXTO[and] ?? TEXTO.n}"><i class="ponto ${and === "f" ? "f" : and === "p" ? "p" : "n"}"></i>${pct(apurado)}</span></span>
    ${corpo}
    <span class="cu-rodape"><small>${metricas}</small><span class="cu-ver">Ver apuração completa <i aria-hidden="true">→</i></span></span></button></li>`;
}

export const gradeCards = (cards) => `<ul class="cards-estados">${cards.join("")}</ul>`;
