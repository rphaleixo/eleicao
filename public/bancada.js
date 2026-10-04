// Bancada do Senado em 2027: os 54 senadores que a eleição de hoje renova + os 27 que seguem no mandato (até 2031).
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { UFS } from "./config.js";

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
    Object.assign(doUf(uf), { apurado: d.pctSecoes, vagas, confirmados: lideres.filter((c) => c.sit === "eleito").length });
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

export const AGRUPAMENTOS = { partido: "Por partido", estado: "Por estado", tabela: "Tabela" };

function seletorAgrupamento(agrup) {
  return `<div class="seg mini" role="group" aria-label="Agrupar bancada">${Object.entries(AGRUPAMENTOS).map(([k, n]) => `<button type="button" data-agrup-bancada="${k}" aria-pressed="${k === agrup}">${n}</button>`).join("")}</div>`;
}

/** Situação da apuração do estado para a bancada: definida (todos confirmados), projeção ou sem votos. */
export function situacaoUf(u) {
  const proj = u.eleitos.length;
  if (proj && u.confirmados >= (u.vagas || 2)) return "definida";
  return proj ? "projeção" : "sem votos";
}

function porPartido(b) {
  const max = Math.max(1, ...b.linhas.map((l) => l.total));
  return `<ul class="bancada-partidos">${b.linhas.map((l) => `<li style="--cor:${corPartido(l.rotulo)}"><span class="chip" style="--cor:${corPartido(l.rotulo)}">${esc(l.rotulo)}</span>
    <span class="bp-barra" title="${l.eleitos} eleitos em 2026 + ${l.mantem} eleitos em 2022"><i class="e26" style="width:${(l.eleitos / max) * 100}%"></i><i class="e22" style="width:${(l.mantem / max) * 100}%"></i></span>
    <span class="bp-total"><strong>${l.total}</strong><small>${pct((l.total / 81) * 100)}</small></span></li>`).join("")}</ul>
    <p class="legenda-plenario"><span><i class="bp-leg e26"></i>Eleitos em 2026 (projeção)</span><span><i class="bp-leg e22"></i>Eleitos em 2022</span></p>`;
}

/** Um card por estado, com os 3 senadores de 2027 em destaque: o eleito em 2022 e os 2 mais votados em 2026. */
function porEstado(b) {
  const linha = (tag, classe, nome, rotulo) => `<li class="bc-linha ${classe}" style="--cor:${corPartido(rotulo)}"><span class="bc-marca"></span><span class="bc-quem"><small>${tag}</small><b>${esc(nome)}</b></span><span class="chip" style="--cor:${corPartido(rotulo)}">${esc(rotulo)}</span></li>`;
  const vazio = (tag) => `<li class="bc-linha vazia"><span class="bc-marca"></span><span class="bc-quem"><small>${tag}</small><b>Aguardando apuração</b></span></li>`;
  return `<ul class="bancada-cards">${b.porUf.map((u) => {
    const antigo = u.mantem ? linha("Eleito em 2022", "c22", u.mantem.nome, u.mantem.rotulo) : vazio("Eleito em 2022");
    const novos = [0, 1].map((i) => { const e = u.eleitos[i]; return e ? linha(e.confirmado ? "Eleito em 2026 ✓" : "Mais votado em 2026", e.confirmado ? "c26 ok" : "c26", e.nome, e.rotulo) : vazio("Eleição de 2026"); }).join("");
    return `<li class="bc"><div class="bc-topo"><span class="sigla">${esc(u.uf)}</span><b>${esc(UFS[u.uf] ?? u.uf)}</b><span class="bc-apurado">${u.apurado != null ? pct(u.apurado) : "–"}</span></div><ul class="bc-nomes">${antigo}${novos}</ul></li>`;
  }).join("")}</ul>
  <p class="legenda-plenario"><span><i class="bp-leg e22"></i>Eleito em 2022 (mandato até 2031)</span><span><i class="bp-leg e26"></i>Mais votados em 2026 (projeção)</span></p>`;
}

/** Tabela por estado: vagas, apuração, situação e a bancada de 2027 por partido/federação (os 3 senadores do estado). */
function tabelaEstados(b) {
  const linhas = b.porUf.map((u) => {
    const cont = new Map();
    for (const rotulo of [u.mantem?.rotulo, ...u.eleitos.map((e) => e.rotulo)].filter(Boolean)) cont.set(rotulo, (cont.get(rotulo) ?? 0) + 1);
    const chips = [...cont.entries()].sort((x, y) => y[1] - x[1]).map(([r, n]) => `<span class="chip" style="--cor:${corPartido(r)}">${esc(r)} ${n}</span>`).join(" ");
    const sit = situacaoUf(u);
    return `<tr><td class="uf-nome">${esc(UFS[u.uf] ?? u.uf)}</td><td>${u.vagas ?? 2}</td><td><span class="mini-barra"><i style="width:${Math.min(100, u.apurado ?? 0)}%"></i></span>${pct(u.apurado ?? 0)}</td>
      <td>${sit === "definida" ? `<span class="selo-sit eleito"><i aria-hidden="true">✓</i>definida</span>` : sit}</td><td style="text-align:left;white-space:normal">${chips || "–"}</td></tr>`;
  }).join("");
  return `<div class="tab-scroll"><table><tr><th>Estado</th><th>Vagas</th><th>Apurado</th><th>Situação</th><th style="text-align:right">Senadores em 2027 por partido/federação</th></tr>${linhas}</table></div>
    <p class="muted">Cada estado tem 3 senadores em 2027: o eleito em 2022 mais os 2 eleitos agora (projeção: os 2 mais votados).</p>`;
}

export function telaBancada(b, { versao = "", carregando = false, agrupamento = "partido", filtros = "", totais = null, status = "" } = {}) {
  const t = totais ?? b;
  if (carregando) return `<section class="card"><h2>Bancada do Senado em 2027</h2><p class="muted">Carregando a lista de senadores em exercício…</p></section>`;
  const corpo = agrupamento === "estado" ? porEstado(b) : agrupamento === "tabela" ? tabelaEstados(b) : porPartido(b);
  return `<section class="card"><div class="titulo-cadeiras"><h2>Bancada em 2027</h2><span><strong>${t.totalMantem + t.totalEleitos}</strong> <span class="muted">de 81</span></span></div>
    ${status}
    ${plenario(t)}
    <p class="muted">${t.totalEleitos} dos 54 eleitos hoje projetados + ${t.totalMantem} eleitos em 2022. Maioria: ${MAIORIA_SENADO}.${t.linhas[0] ? ` Maior bancada: <strong>${esc(t.linhas[0].rotulo)}</strong> (${t.linhas[0].total}).` : ""}</p>
    <div class="bancada-topo">${seletorAgrupamento(agrupamento)}</div>
    ${agrupamento !== "partido" ? filtros : ""}
    ${corpo}
    <p class="muted nota">Projeção: os 2 mais votados de cada estado, com os votos contados até agora. Federações somam os partidos que as formam.${versao ? ` Senadores em exercício: Senado Federal (${esc(versao)}).` : ""}</p></section>`;
}
