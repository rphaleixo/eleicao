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
  const linha = (rotulo) => linhas.get(rotulo) ?? (linhas.set(rotulo, { rotulo, mantem: 0, eleitos: 0, confirmados: 0, total: 0, mantemQuem: [], eleitosQuem: [] }), linhas.get(rotulo));
  for (const s of mandatos) { const l = linha(rotuloDe(s.partido)); l.mantem++; l.mantemQuem.push(s); }
  let totalEleitos = 0, confirmados = 0;
  for (const { uf, d } of resultados) {
    if (!d) continue;
    const vagas = d.vagas || 2;
    const lideres = d.candidatos.filter((c) => c.votos > 0 && c.elegivel).sort((a, b) => b.votos - a.votos).slice(0, vagas);
    for (const c of lideres) {
      const l = linha(rotuloDe(c.partido)); l.eleitos++; totalEleitos++;
      if (c.sit === "eleito") { l.confirmados++; confirmados++; }
      l.eleitosQuem.push({ uf, nome: c.nome, confirmado: c.sit === "eleito" });
    }
  }
  const lista = [...linhas.values()].map((l) => ({ ...l, total: l.mantem + l.eleitos })).sort((a, b) => b.total - a.total || b.eleitos - a.eleitos || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  return { linhas: lista, totalMantem: mandatos.length, totalEleitos, confirmados, vagasPendentes: 54 - totalEleitos };
}

/** Os 81 lugares do plenário, um quadrado por senador: cheio = eleito hoje, vazado = segue no mandato, tracejado = ainda sem projeção. */
export function plenario(b) {
  const q = (classe, rotulo, cor, titulo) => `<i class="${classe}" style="--cor:${cor}" title="${esc(titulo)}"></i>`;
  const cheios = b.linhas.flatMap((l) => [
    ...Array.from({ length: l.eleitos }, () => q("pl-eleito", l.rotulo, corPartido(l.rotulo), `${l.rotulo}: eleito em 2026`)),
    ...Array.from({ length: l.mantem }, () => q("pl-mantem", l.rotulo, corPartido(l.rotulo), `${l.rotulo}: mandato até 2031`)),
  ]);
  const vagas = Array.from({ length: Math.max(0, 81 - cheios.length) }, () => `<i class="pl-vaga" title="Vaga ainda sem projeção"></i>`);
  return `<div class="plenario" role="img" aria-label="Plenário do Senado: ${cheios.length} de 81 lugares projetados">${cheios.join("")}${vagas.join("")}</div>`;
}

export function telaBancada(b, { versao = "", carregando = false } = {}) {
  if (carregando) return `<section class="card"><h2>Bancada do Senado em 2027</h2><p class="muted">Carregando a lista de senadores em exercício…</p></section>`;
  const linhas = b.linhas.map((l) => `<tr><td><span class="chip" style="--cor:${corPartido(l.rotulo)}">${esc(l.rotulo)}</span></td><td>${l.mantem}</td><td>${l.eleitos}${l.confirmados ? ` <small class="muted">(${l.confirmados} ✓)</small>` : ""}</td><td><strong>${l.total}</strong></td><td>${pct((l.total / 81) * 100)}</td></tr>`).join("");
  const maior = b.linhas[0];
  const grupos = b.linhas.filter((l) => l.mantem).map((l) => `<div class="mantem-grupo"><h4><span class="chip" style="--cor:${corPartido(l.rotulo)}">${esc(l.rotulo)}</span> ${l.mantem}</h4><ul>${l.mantemQuem.map((s) => `<li><b>${esc(s.nome)}</b> <span class="muted">${esc(s.uf)}${s.participacao !== "Titular" ? ` · ${esc(s.participacao)} de ${esc(s.titular ?? "—")}` : ""}${/^S\/?PARTIDO$/i.test(chaveSigla(s.partido)) ? "" : ` · ${esc(s.partido)}`}</span></li>`).join("")}</ul></div>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Bancada do Senado em 2027</h2><span><strong>${b.totalMantem + b.totalEleitos}</strong> <span class="muted">de 81 projetados</span></span></div>
    <p class="muted">54 vagas em disputa hoje (2 por estado) + 27 senadores que seguem no mandato até 2031. Maioria absoluta: ${MAIORIA_SENADO} senadores.</p>
    ${plenario(b)}
    <p class="legenda-plenario"><span><i class="pl-eleito"></i>Eleito em 2026 (projeção)</span><span><i class="pl-mantem"></i>Mandato até 2031</span><span><i class="pl-vaga"></i>Sem projeção</span></p>
    ${maior ? `<p class="muted">${b.vagasPendentes > 0 ? `${b.vagasPendentes} das 54 vagas ainda sem votos apurados. ` : ""}Maior bancada: <strong>${esc(maior.rotulo)}</strong>, com ${maior.total}.</p>` : ""}</section>
    <section class="card"><h2>Bancada por partido/federação</h2><div class="tab-scroll"><table><tr><th>Partido / federação</th><th>Mandato até 2031</th><th>Eleitos em 2026</th><th>Total</th><th>% do Senado</th></tr>${linhas}</table></div>
    <p class="muted">Eleitos em 2026: os 2 mais votados de cada estado, com os votos contados até agora (✓ = o TSE já confirmou). Federações somam os partidos que as formam.</p></section>
    <section class="card"><details><summary class="resumo-lista"><h2>Os 27 senadores que seguem no mandato</h2></summary>${grupos}<p class="muted">Eleitos em 2022, mandato até 31/01/2031.${versao ? ` Fonte: Senado Federal (${esc(versao)}).` : ""}</p></details></section>`;
}
