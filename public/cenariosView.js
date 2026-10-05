// Tela da aba "E se…": escolha do cenário, antes e depois da bancada, onde muda e quem entra e sai.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { plenarioCamara } from "./camara.js";
import { CENARIOS } from "./cenarios.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const chip = (rotulo) => `<span class="chip" style="--cor:${corPartido(rotulo)}">${esc(rotulo)}</span>`;

export const seletorCenarios = (atual) => `<div class="seg mini seg-rolavel" role="group" aria-label="Cenário">${Object.entries(CENARIOS).map(([k, c]) => `<button type="button" data-cenario="${k}" aria-pressed="${k === atual}">${esc(c.titulo)}</button>`).join("")}</div>`;

function tabelaBancada(cmp, comSenado) {
  const linhas = cmp.linhas.filter((l) => l.antes || l.depois || l.senado).map((l) => `<tr${l.delta ? ' class="cn-mudou"' : ""}><td>${chip(l.rotulo)}</td><td>${l.antes}</td><td><b>${l.depois}</b></td>
    <td><span class="cn-delta ${l.delta > 0 ? "mais" : l.delta < 0 ? "menos" : ""}">${sinal(l.delta)}</span></td><td class="cn-qe" title="Estados em que o grupo atingiu o quociente eleitoral. Hoje: ${esc(l.ufsQeAntes.join(", ") || "nenhum")}. Cenário: ${esc(l.ufsQeDepois.join(", ") || "nenhum")}.">${l.ufsQeAntes.length}${l.ufsQeAntes.length !== l.ufsQeDepois.length ? ` → <b>${l.ufsQeDepois.length}</b>` : ""}</td>${comSenado ? `<td>${l.senado}</td><td><b>${l.congresso}</b></td>` : ""}</tr>`).join("");
  return `<div class="tab-scroll"><table class="cn-tabela"><tr><th>Grupo</th><th title="Cadeiras na Câmara hoje">Hoje</th><th title="Cadeiras na Câmara no cenário">Cenário</th><th>Δ</th><th title="Em quantos estados o grupo atingiu o quociente eleitoral (votos ≥ QE): hoje → cenário">Atingiu QE</th>${comSenado ? "<th title=\"Senadores em 2027, sem mudança\">Senado</th><th title=\"Câmara no cenário + Senado\">Congresso</th>" : ""}</tr>${linhas}</table></div>`;
}

/**
 * @param {string} id cenário escolhido
 * @param {{cmp:object, mudancas:object[], candidatos:{entram:object[],saem:object[]}, comSenado:boolean}|null} r resultado calculado (null enquanto carrega)
 */
export function telaCenario(id, r) {
  const c = CENARIOS[id] ?? CENARIOS["psol-pt"];
  const topo = `<section class="card"><h2>E se…</h2><p class="muted">Cenários hipotéticos sobre a bancada, calculados com os votos do 1º turno. Servem para pensar o “e se”: não são resultados oficiais.</p>${seletorCenarios(id)}</section>`;
  if (!r) return `${topo}<section class="card"><p class="muted">Carregando os 27 estados…</p></section>`;
  const { cmp, mudancas, candidatos, comSenado } = r;
  const grupo = c.uniao ? cmp.linhas.find((l) => l.rotulo === c.uniao.rotulo) : null;
  const trocas = candidatos.entram.length;
  const tiles = c.uniao
    ? `<div class="pp-tiles pp-tiles-peq"><div class="pp-tile eleito"><strong>${grupo?.depois ?? 0}</strong><span>cadeiras da federação unida</span><small>hoje: ${grupo?.antes ?? 0} (${sinal(grupo?.delta ?? 0)})</small></div><div class="pp-tile"><strong>${mudancas.length}</strong><span>estados mudam</span></div><div class="pp-tile"><strong>${trocas}</strong><span>deputados trocam de lugar</span></div></div>`
    : `<div class="pp-tiles pp-tiles-peq"><div class="pp-tile eleito"><strong>${trocas}</strong><span>cadeiras mudam de mãos</span></div><div class="pp-tile"><strong>${mudancas.length}</strong><span>estados mudam</span></div><div class="pp-tile"><strong>${cmp.totalDepois}</strong><span>cadeiras no total</span></div></div>`;
  const plen = `<div class="cn-plenarios"><p class="cn-rotulo">Hoje</p>${plenarioCamara(cmp.nacionalAntes)}<p class="cn-rotulo">No cenário</p>${plenarioCamara(cmp.nacionalDepois)}</div>`;
  const onde = mudancas.length
    ? `<ul class="cn-estados">${mudancas.map((m) => `<li><b>${m.uf}</b> <span class="muted">${esc(UFS[m.uf])}</span><span class="cn-mud">${m.mudancas.map((x) => `<span class="cn-delta ${x.delta > 0 ? "mais" : "menos"}" title="${esc(x.rotulo)}">${chip(x.rotulo)} ${sinal(x.delta)}</span>`).join("")}</span></li>`).join("")}</ul>`
    : `<p class="muted">Nenhum estado muda no cenário.</p>`;
  const lista = (itens) => itens.length ? `<ul class="cn-cands">${itens.map((x) => `<li data-sq="${esc(x.id)}" role="button" tabindex="0"><b>${esc(x.nome)}</b> ${chip(x.partido)} <span class="muted">${x.uf} · ${fmt(x.votos)} votos</span></li>`).join("")}</ul>` : `<p class="muted">Ninguém.</p>`;
  return `${topo}
    <section class="card"><h2>${esc(c.pergunta)}</h2><p class="muted">${esc(c.descricao)}</p>${tiles}${plen}</section>
    <section class="card"><h2>Bancada da Câmara${comSenado ? " e do Congresso" : ""}</h2>${tabelaBancada(cmp, comSenado)}${comSenado ? `<p class="muted nota">Os senadores de 2027 (27 de 2022 e os 54 eleitos agora) não mudam nos cenários: o Senado não tem quociente nem federações.</p>` : ""}</section>
    <section class="card"><h2>Onde muda</h2>${onde}</section>
    <section class="card"><h2>Quem entra e quem sai</h2><div class="cn-duas"><div><h3>Passam a ser eleitos <span class="pp-n">${candidatos.entram.length}</span></h3>${lista(candidatos.entram)}</div><div><h3>Deixam de ser eleitos <span class="pp-n">${candidatos.saem.length}</span></h3>${lista(candidatos.saem)}</div></div></section>`;
}
