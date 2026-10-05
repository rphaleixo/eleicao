// Desempenho dos partidos e federações nas eleições proporcionais: votos em candidatos, votos de legenda,
// os 3 mais votados de cada um e, como se fosse mais um partido, o "não voto" (brancos, nulos e abstenções).
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { naoVoto } from "./base.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Percentual sobre uma base (votos válidos do TSE para candidatos e partidos; aptos para o "não voto"). */
const pctDe = (votos, base) => (base > 0 ? (votos / base) * 100 : 0);

/** Soma o "não voto" de vários resultados (cada um precisa ter os eleitores aptos das seções apuradas). */
function somarNaoVoto(lista) {
  const nvs = lista.map(naoVoto).filter(Boolean);
  if (!nvs.length) return null;
  const t = nvs.reduce((s, n) => ({ base: s.base + n.base, brancos: s.brancos + n.brancos, nulos: s.nulos + n.nulos, abstencao: s.abstencao + n.abstencao, soma: s.soma + n.soma }), { base: 0, brancos: 0, nulos: 0, abstencao: 0, soma: 0 });
  return { ...t, pct: pctDe(t.soma, t.base) };
}

/**
 * Desempenho dos partidos em um ou mais estados (um só = a tela do estado; os 27 = o país).
 * @param {{uf:string, d:object}[]} estados
 * @param {{semSubJudice?:boolean}} opcoes sem sub judice: tira os votos e os candidatos sub judice
 */
export function desempenhoPartidos(estados, { semSubJudice = false } = {}) {
  const mapa = new Map();
  let validos = 0;
  for (const { uf, d } of estados) {
    const vd = semSubJudice ? d.votosSemSJ ?? Math.max(0, d.votosValidos - (d.votosSJ || 0)) : d.votosValidos;
    validos += vd || 0;
    for (const p of d.partidos ?? []) {
      const sj = semSubJudice ? p.votosSJ || 0 : 0;
      const m = mapa.get(p.sigla) ?? { sigla: p.sigla, federacao: !!p.federacao, nominais: 0, legenda: 0, candidatos: [] };
      m.nominais += Math.max(0, (p.votosNominais || 0) - sj);
      m.legenda += p.votosLegenda || 0;
      for (const c of p.candidatos) if (!(semSubJudice && c.subJudice)) m.candidatos.push({ id: c.id, nome: c.nome, uf, votos: c.votos, pct: pctDe(c.votos, vd) });
      mapa.set(p.sigla, m);
    }
  }
  const partidos = [...mapa.values()].map((m) => ({
    sigla: m.sigla, federacao: m.federacao, nominais: m.nominais, legenda: m.legenda, total: m.nominais + m.legenda,
    top: m.candidatos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, 3),
  })).filter((p) => p.total > 0).sort((a, b) => b.total - a.total || a.sigla.localeCompare(b.sigla, "pt-BR"));
  return { partidos, validos, naoVoto: somarNaoVoto(estados.map((e) => e.d)), estados: estados.length };
}

const linhaTop = (c, comUf) => `<li data-sq="${esc(c.id)}" role="button" tabindex="0"><span class="dp-nome">${esc(c.nome)}${comUf ? ` <small class="muted">${esc(c.uf)}</small>` : ""}</span><span class="dp-v">${fmt(c.votos)} · ${pct(c.pct)}</span></li>`;

/** O quadro: uma linha por partido (total, candidatos x legenda, top 3), mais o "não voto" como último "partido". */
export function blocoDesempenhoPartidos(r, { titulo = "Desempenho dos partidos", nota = "", comUf = false } = {}) {
  if (!r.partidos.length) return "";
  const itens = r.partidos.map((p) => `<li class="dp-item" style="--cor:${corPartido(p.sigla)}">
    <div class="dp-topo"><span class="chip" style="--cor:${corPartido(p.sigla)}">${esc(p.sigla)}</span><span class="dp-total"><strong>${fmt(p.total)}</strong><small>${pct(pctDe(p.total, r.validos))} dos válidos</small></span></div>
    <div class="dp-duas"><span>Em candidatos <b>${fmt(p.nominais)}</b> <small>${pct(pctDe(p.nominais, r.validos))}</small></span><span>Na legenda <b>${fmt(p.legenda)}</b> <small>${pct(pctDe(p.legenda, r.validos))}</small></span></div>
    <ol class="dp-top">${p.top.map((c) => linhaTop(c, comUf)).join("")}</ol></li>`).join("");
  const n = r.naoVoto;
  const nv = n ? `<li class="dp-item dp-nv"><div class="dp-topo"><span class="chip chip-nv">Não voto</span><span class="dp-total"><strong>${fmt(n.soma)}</strong><small>${pct(n.pct)} dos aptos</small></span></div>
    <div class="dp-duas"><span>Brancos <b>${fmt(n.brancos)}</b> <small>${pct(pctDe(n.brancos, n.base))}</small></span><span>Nulos <b>${fmt(n.nulos)}</b> <small>${pct(pctDe(n.nulos, n.base))}</small></span><span>Abstenções <b>${fmt(n.abstencao)}</b> <small>${pct(pctDe(n.abstencao, n.base))}</small></span></div></li>` : "";
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span class="muted">${r.partidos.length} partidos e federações</span></div>
    ${nota ? `<p class="muted">${nota}</p>` : ""}<ul class="dp-lista">${itens}${nv}</ul></section>`;
}
