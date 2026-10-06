// Tela "Nulos": números digitados nos votos nulos, em ranking, mapa (locais de votação e zonas) e tabela de zonas.
import { fmt, pct } from "./formato.js";
import { viewBoxDoEstado } from "./geo.js";
import { caixaZoom } from "./zoomMapa.js";
import { CARGOS_NULOS, CORES_NUMERO, COR_OUTROS, rotuloNumero, corPorParticipacao } from "./nulos.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const seg = (attr, atual, opcoes) => `<div class="seg mini seg-rolavel" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;

export function controlesNulos(n, { mapa, municipios }) {
  const topo = mapa.topo[n.cargo];
  const numeros = `<option value="">O mais frequente em cada ponto</option>${topo.map((d) => `<option value="${esc(d)}"${d === n.numero ? " selected" : ""}>${esc(d)} · ${esc(rotuloNumero(d, n.cargo, mapa.nomes).texto)}</option>`).join("")}`;
  const muns = `<option value="">Todo o estado</option>${municipios.map((m) => `<option value="${m.cod}"${m.cod === n.mun ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}`;
  return `<div class="geo-ctl"><div class="geo-linha"><span class="gp-leg">Cargo</span>${seg("data-nl-cargo", n.cargo, CARGOS_NULOS)}</div>
    <div class="geo-linha"><span class="gp-leg">No mapa</span>${seg("data-nl-visao", n.visao, [["locais", "Locais de votação"], ["zonas", "Zonas eleitorais"]])}</div>
    <div class="geo-linha geo-selects"><label class="f-sel"><span>Número</span><select data-nl-numero aria-label="Número digitado">${numeros}</select></label>
      <label class="f-sel"><span>Município</span><select data-nl-mun aria-label="Município">${muns}</select></label></div></div>`;
}

export function resumoNulos(r, cargoNome) {
  return `<div class="pp-tiles pp-tiles-peq"><div class="pp-tile"><strong>${fmt(r.total)}</strong><span>nulos digitados · ${esc(cargoNome)}</span></div>
    <div class="pp-tile"><strong>${pct(r.total ? (r.zero / r.total) * 100 : 0)}</strong><span>só zeros (nulo proposital)</span></div>
    <div class="pp-tile eleito"><strong>${pct(r.total ? ((r.semCandidato + r.numeroErrado) / r.total) * 100 : 0)}</strong><span>número de partido sem candidato ou com dígito errado</span></div></div>`;
}

export function rankingNulos(r, { titulo, nota }) {
  const max = Math.max(1, ...r.itens.map((i) => i.qtd));
  const linhas = r.itens.map((i, k) => `<li class="gp-linha" style="--cor:${k < CORES_NUMERO.length ? CORES_NUMERO[k] : COR_OUTROS}">
    <span class="gp-rotulo"><b>${esc(i.dig)}</b> <small class="muted">${esc(i.texto)}</small></span>
    <span class="gp-valor">${fmt(i.qtd)} · ${pct(i.pct)}</span><span class="gp-trilho"><i style="width:${Math.max(0.4, (i.qtd / max) * 100)}%"></i></span></li>`).join("");
  const rep = r.repeticao.length ? `<h3>Nulos por repetição (mesmo candidato nos dois votos)</h3><ul class="gp-barras">${r.repeticao.map((i) => `<li class="gp-linha" style="--cor:#8e5bd6"><span class="gp-rotulo"><b>${esc(i.dig)}</b> <small class="muted">${esc(i.texto)}</small></span><span class="gp-valor">${fmt(i.qtd)}</span></li>`).join("")}</ul>` : "";
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span class="muted">${fmt(r.total)} nulos digitados</span></div>${nota ? `<p class="muted">${nota}</p>` : ""}<ul class="gp-barras">${linhas}</ul>${rep}</section>`;
}

/** O mapa: os municípios ao fundo e um círculo por local de votação (ou zona), com cor e tamanho conforme a visão. */
export function mapaNulos(malha, pontos, { numero, selecionado, municipioIbge, topoNumeros }) {
  const vb = municipioIbge ? viewBoxDoEstado(malha, [municipioIbge]) : malha.viewBox;
  const larg = Number(vb.trim().split(/\s+/)[2]) || 3;
  const valor = (p) => (numero ? p.qtd : p.n);
  const max = Math.max(1, ...pontos.map(valor)), maxShare = Math.max(0.0001, ...pontos.map((p) => p.share));
  const fundo = [...malha.caminhos].map(([ibge, d]) => `<path class="nm-mun${ibge === municipioIbge ? " sel" : ""}" d="${d}"/>`).join("");
  const rBase = larg * 0.0045 * 10000; // raio máximo, em unidades do desenho (1/10.000 de grau)
  const circulos = pontos.slice().sort((a, b) => valor(b) - valor(a)).map((p) => {
    const r = rBase * (0.3 + 0.7 * Math.sqrt(valor(p) / max)) * (p.tipo === "zona" ? 1.6 : 1);
    const cor = numero ? corPorParticipacao(p.share, maxShare) : p.cor;
    const top = p.top3.map(([d, q]) => `${d}: ${fmt(q)}`).join(" · ");
    return `<circle class="nm-pt${p.id === selecionado ? " sel" : ""}" data-nl-ponto="${esc(p.id)}" cx="${(p.lo * 10000).toFixed(0)}" cy="${(p.la * 10000).toFixed(0)}" r="${r.toFixed(0)}" data-r0="${r.toFixed(0)}" fill="${cor}"><title>${esc(p.nome)} · ${fmt(p.n)} nulos · ${esc(top)}</title></circle>`;
  }).join("");
  return caixaZoom(`<svg class="mapa-geo" data-zoom="nulos" viewBox="${vb}" role="group" aria-label="Mapa de nulos digitados"><g transform="scale(0.0001,-0.0001)">${fundo}${circulos}</g></svg>`);
}

export function legendaNulos({ numero, topo, nomes, cargo, maxShare }) {
  if (numero) return `<p class="muted nota">Tamanho do círculo = quantos votos nulos digitaram ${esc(numero)}. Cor, do claro ao escuro = % dos nulos daquele ponto que são ${esc(numero)} (até ${pct(maxShare)}).</p>`;
  const itens = topo.slice(0, CORES_NUMERO.length).map((d, k) => `<li><i class="gm-leg" style="background:${CORES_NUMERO[k]}"></i>${esc(d)} <small class="muted">${esc(rotuloNumero(d, cargo, nomes).texto)}</small></li>`).join("");
  return `<ul class="geo-legenda">${itens}<li><i class="gm-leg" style="background:${COR_OUTROS}"></i>outro número</li></ul><p class="muted nota">Cor = o número mais digitado nos nulos daquele ponto. Tamanho = total de nulos digitados.</p>`;
}

export function fichaNulos(p, { cargoNome, nomes, cargo }) {
  if (!p) return `<p class="muted dica-mapa">Toque em um círculo para ver os nulos daquele ponto.</p>`;
  const linhas = p.top3.map(([d, q]) => { const r = rotuloNumero(d, cargo, nomes); return `<tr><th><b>${esc(d)}</b> <small class="muted">${esc(r.texto)}</small></th><td>${fmt(q)}</td><td>${pct(p.n ? (q / p.n) * 100 : 0)}</td></tr>`; }).join("");
  return `<div class="geo-ficha"><h3>${esc(p.nome)}</h3><p class="muted">${esc(p.mn)}${p.tipo === "local" ? ` · zona ${Number(p.z)}${p.bairro ? ` · ${esc(p.bairro)}` : ""}` : ""} · ${fmt(p.u)} urnas</p>
    <table class="geo-tab"><tr><th>Nulos digitados (${esc(cargoNome)})</th><td>${fmt(p.n)}</td><td>${fmt(p.u ? p.n / p.u : 0)} por urna</td></tr>${linhas}</table></div>`;
}

export function tabelaZonas(zonas, { numero, limite }) {
  const linhas = zonas.slice(0, limite).map((z, i) => `<tr data-nl-ponto="${esc(z.id)}" role="button" tabindex="0"><td>${i + 1}</td><td><b>Zona ${Number(z.z)}</b> <small class="muted">${esc(z.mn)}</small></td><td>${fmt(z.u)}</td><td>${fmt(z.n)}</td><td>${numero ? pct(z.share) : fmt(z.n / z.u)}</td><td class="nl-top">${z.top3.map(([d, q]) => `${esc(d)} ${pct(z.n ? (q / z.n) * 100 : 0)}`).join(" · ")}</td></tr>`).join("");
  return `<div class="tab-scroll"><table class="geo-rank"><tr><th>#</th><th>Zona</th><th>Urnas</th><th>Nulos</th><th>${numero ? `% de ${esc(numero)}` : "Por urna"}</th><th>Mais digitados</th></tr>${linhas}</table></div>`;
}
