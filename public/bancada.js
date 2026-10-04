// Bancada do Senado em 2027: os 54 senadores que a eleição de hoje renova + os 27 que seguem no mandato (até 2031).
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** Chave para comparar siglas escritas de jeitos diferentes ("PC do B", "PCdoB", "UNIÃO"). */
export const chaveSigla = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const MAIORIA_SENADO = 41;

/** Partido -> federação a que pertence (as federações são nacionais), lida dos resultados do TSE. */
export function mapaFederacoes(resultados) {
  const mapa = new Map();
  for (const d of resultados.filter(Boolean)) for (const p of d.partidos ?? []) {
    if (!p.federacao) continue;
    const rotulo = p.sigla.split("/").map((x) => x.trim()).join(" / ");
    for (const parte of p.sigla.split("/")) mapa.set(chaveSigla(parte), rotulo);
  }
  return mapa;
}

/** @returns {{linhas: object[], totalMantem: number, totalEleitos: number, confirmados: number, vagasPendentes: number}} */
export function montarBancada({ mandatos, resultados }) {
  const mapa = mapaFederacoes(resultados.map((x) => x.d));
  const rotuloDe = (sigla) => (/^S\/?PARTIDO$/i.test(chaveSigla(sigla)) || !sigla ? "Sem partido" : mapa.get(chaveSigla(sigla)) ?? sigla);
  const linhas = new Map();
  const porUf = new Map(); // uf -> { mantem: senador que segue no mandato, eleitos: os 2 mais votados }
  const doUf = (uf) => porUf.get(uf) ?? (porUf.set(uf, { uf, mantem: null, eleitos: [] }), porUf.get(uf));
  const linha = (rotulo) => linhas.get(rotulo) ?? (linhas.set(rotulo, { rotulo, mantem: 0, eleitos: 0, confirmados: 0, total: 0, mantemQuem: [], eleitosQuem: [] }), linhas.get(rotulo));
  for (const s of mandatos) { const l = linha(rotuloDe(s.partido)); l.mantem++; l.mantemQuem.push(s); doUf(s.uf).mantem = { ...s, rotulo: rotuloDe(s.partido) }; }
  let totalEleitos = 0, confirmados = 0;
  for (const { uf, d } of resultados) {
    if (!d) continue;
    const vagas = d.vagas || 2;
    const lideres = d.candidatos.filter((c) => c.votos > 0 && c.elegivel).sort((a, b) => b.votos - a.votos).slice(0, vagas);
    for (const c of lideres) {
      const l = linha(rotuloDe(c.partido)); l.eleitos++; totalEleitos++;
      if (c.sit === "eleito") { l.confirmados++; confirmados++; }
      l.eleitosQuem.push({ uf, nome: c.nome, confirmado: c.sit === "eleito" });
      doUf(uf).eleitos.push({ nome: c.nome, rotulo: l.rotulo, confirmado: c.sit === "eleito" });
    }
  }
  const lista = [...linhas.values()].map((l) => ({ ...l, total: l.mantem + l.eleitos })).sort((a, b) => b.total - a.total || b.eleitos - a.eleitos || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  return { linhas: lista, porUf: [...porUf.values()].sort((a, b) => a.uf.localeCompare(b.uf)), totalMantem: mandatos.length, totalEleitos, confirmados, vagasPendentes: 54 - totalEleitos };
}

/** Os 81 lugares do plenário numa faixa compacta: cheio = eleito hoje, vazado = segue no mandato, tracejado = sem projeção. */
export function plenario(b) {
  const q = (classe, cor, titulo) => `<i class="${classe}" style="--cor:${cor}" title="${esc(titulo)}"></i>`;
  const cheios = b.linhas.flatMap((l) => [
    ...Array.from({ length: l.eleitos }, () => q("pl-eleito", corPartido(l.rotulo), `${l.rotulo}: eleito em 2026`)),
    ...Array.from({ length: l.mantem }, () => q("pl-mantem", corPartido(l.rotulo), `${l.rotulo}: eleito em 2022, mandato até 2031`)),
  ]);
  const vagas = Array.from({ length: Math.max(0, 81 - cheios.length) }, () => `<i class="pl-vaga" title="Vaga ainda sem projeção"></i>`);
  return `<div class="plenario" role="img" aria-label="Plenário do Senado: ${cheios.length} de 81 lugares projetados">${cheios.join("")}${vagas.join("")}</div>`;
}

export const AGRUPAMENTOS = { partido: "Por partido", estado: "Por estado" };

function seletorAgrupamento(agrup) {
  return `<div class="seg mini" role="group" aria-label="Agrupar bancada">${Object.entries(AGRUPAMENTOS).map(([k, n]) => `<button type="button" data-agrup-bancada="${k}" aria-pressed="${k === agrup}">${n}</button>`).join("")}</div>`;
}

/** Uma linha por partido/federação: barra com os eleitos em 2026 (cheio) e os de 2022 (claro). */
function porPartido(b) {
  const max = Math.max(1, ...b.linhas.map((l) => l.total));
  return `<ul class="bancada-partidos">${b.linhas.map((l) => `<li style="--cor:${corPartido(l.rotulo)}"><span class="chip" style="--cor:${corPartido(l.rotulo)}">${esc(l.rotulo)}</span>
    <span class="bp-barra" title="${l.eleitos} eleitos em 2026 + ${l.mantem} eleitos em 2022"><i class="e26" style="width:${(l.eleitos / max) * 100}%"></i><i class="e22" style="width:${(l.mantem / max) * 100}%"></i></span>
    <span class="bp-total"><strong>${l.total}</strong><small>${pct((l.total / 81) * 100)}</small></span></li>`).join("")}</ul>
    <p class="legenda-plenario"><span><i class="bp-leg e26"></i>Eleitos em 2026 (projeção)</span><span><i class="bp-leg e22"></i>Eleitos em 2022</span></p>`;
}

/** Uma linha por estado: o senador eleito em 2022 e os 2 mais votados em 2026, em siglas de partido. */
function porEstado(b) {
  const chip = (rotulo, classe, titulo) => `<span class="chip ${classe}" style="--cor:${corPartido(rotulo)}" title="${esc(titulo)}">${esc(rotulo)}</span>`;
  return `<ul class="bancada-estados">${b.porUf.map((u) => {
    const antigo = u.mantem ? chip(u.mantem.rotulo, "c22", `${u.mantem.nome}: eleito em 2022`) : "";
    const novos = u.eleitos.map((e) => chip(e.rotulo, e.confirmado ? "c26 ok" : "c26", `${e.nome}: ${e.confirmado ? "eleito" : "mais votado"} em 2026`)).join("");
    const nomes = [u.mantem?.nome, ...u.eleitos.map((e) => e.nome)].filter(Boolean).map(esc).join(" · ");
    return `<li><span class="sigla">${esc(u.uf)}</span><span class="be-chips">${antigo}${novos}${u.eleitos.length < 2 ? `<span class="chip c26 vazio">…</span>`.repeat(2 - u.eleitos.length) : ""}</span><small class="nomes-uf" title="${nomes}">${nomes}</small></li>`;
  }).join("")}</ul>
  <p class="legenda-plenario"><span><i class="bp-leg e22"></i>Eleito em 2022</span><span><i class="bp-leg e26"></i>Mais votados em 2026</span></p>`;
}

export function telaBancada(b, { versao = "", carregando = false, agrupamento = "partido" } = {}) {
  if (carregando) return `<section class="card"><h2>Bancada do Senado em 2027</h2><p class="muted">Carregando a lista de senadores em exercício…</p></section>`;
  const maior = b.linhas[0];
  return `<section class="card"><div class="titulo-cadeiras"><h2>Bancada em 2027</h2><span><strong>${b.totalMantem + b.totalEleitos}</strong> <span class="muted">de 81</span></span></div>
    ${plenario(b)}
    <p class="muted">${b.totalEleitos} dos 54 eleitos hoje projetados + ${b.totalMantem} eleitos em 2022. Maioria: ${MAIORIA_SENADO}.${maior ? ` Maior bancada: <strong>${esc(maior.rotulo)}</strong> (${maior.total}).` : ""}</p>
    <div class="bancada-topo">${seletorAgrupamento(agrupamento)}</div>
    ${agrupamento === "estado" ? porEstado(b) : porPartido(b)}
    <p class="muted nota">Projeção: os 2 mais votados de cada estado, com os votos contados até agora. Federações somam os partidos que as formam.${versao ? ` Senadores em exercício: Senado Federal (${esc(versao)}).` : ""}</p></section>`;
}
