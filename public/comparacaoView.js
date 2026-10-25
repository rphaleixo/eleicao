// Tela "Comparar turnos": quadro, barras e mapa de Lula, Flávio Bolsonaro, outros e não voto no 1º e no 2º turno.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { viewBoxDoEstado } from "./geo.js";
import { caixaZoom } from "./zoomMapa.js";
import { faixaPremissas } from "./ajuste.js";
import { avisoDadosIniciais, REGIOES } from "./marcha.js";
import { opcoesDeLugar, valorRegiao } from "./lugares.js";
import { LINHAS, linhasDaBase, MEDIDAS, CATEGORIAS_LIDER, naoVoto, votosDe, compararLinhas, percentual, valorDeOrdem } from "./comparacao.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sinal = (n, f = fmt) => (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n));
const pp = (n) => `${sinal(n, (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} pp`;
const seg = (attr, atual, opcoes) => `<div class="seg mini seg-rolavel" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;
const corLinha = (k) => ({ lula: corPartido("PT"), flavio: corPartido("PL"), outros: "#8a94a6", naovoto: "#5b6577" }[k]);
const classeDelta = (n) => (n > 0 ? "cmp-sobe" : n < 0 ? "cmp-desce" : "");
const seta = (n) => (n > 0 ? "▲" : n < 0 ? "▼" : "•");

const abas = (attr, atual, opcoes) => `<div class="el-abas" role="group">${opcoes.map(([k, n]) => `<button type="button" class="el-aba" ${attr}="${k}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;

/** Faixa de premissas fixa (design system, PremissasFixas): onde, base e mapa à vista; todos os controles no painel "Ajustar". */
export function controlesComparacao(c, { municipios }) {
  const regiao = c.regiao && REGIOES[c.regiao] ? c.regiao : "";
  const ufs = opcoesDeLugar({ selecionado: regiao ? valorRegiao(regiao) : c.uf });
  const semMun = c.uf === "BR" || c.uf === "ZZ" || !!regiao;
  const muns = semMun ? "" : `<label class="el-campo">Município<select data-ct-mun aria-label="Município"><option value="">Todo o estado</option>${municipios.map((m) => `<option value="${m.cod}"${m.cod === c.mun ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>`;
  const onde = regiao ? REGIOES[regiao].nome : c.uf === "BR" ? "Brasil" : c.uf === "ZZ" ? "Exterior" : `${c.uf} · ${c.mun ? (municipios.find((m) => m.cod === c.mun)?.nome ?? "Município") : "Todo o estado"}`;
  const baseNome = c.base === "validos" ? "Votos válidos" : "Eleitores aptos";
  const mapaNome = `${linhasDaBase(c.base).find(([k]) => k === c.linha)?.[1] ?? ""} · ${MEDIDAS.find(([k]) => k === c.medida)?.[1] ?? ""}`;
  const corpo = `<div class="el-campos"><label class="el-campo">Onde<select data-ct-uf aria-label="Onde">${ufs}</select></label>${muns}</div>
      <div><span class="el-apoio">Percentuais sobre</span>${abas("data-ct-base", c.base, [["validos", "Votos válidos"], ["aptos", "Eleitores aptos"]])}</div>
      <div><span class="el-apoio">Mapa: quem</span>${abas("data-ct-linha", c.linha, linhasDaBase(c.base))}</div>
      <div><span class="el-apoio">Mapa: o que mostrar</span>${abas("data-ct-medida", c.medida, MEDIDAS)}</div>`;
  return faixaPremissas("data-ct-premissas", [["Onde", onde], ["Base", baseNome], ["Mapa", mapaNome]], corpo, c.premissas);
}

const ptBr = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COR_LADO = { lula: "var(--lado-a)", flavio: "var(--lado-b)", outros: "var(--ausencia)", naovoto: "var(--sem-cor)" };
const NOME_CURTO = { lula: "Lula", flavio: "Flávio Bolsonaro" };

/**
 * Bloco Duelo (design system): faixa de vantagem no alto e uma linha de 44px por candidato com 1º turno, 2º turno e variação em pontos.
 * Todos os % de candidatos são sobre votos válidos (só candidatos); a base "Eleitores aptos" mostra o não voto como linha à parte.
 * Sem dados no 2º turno, a faixa descreve o 1º turno e as colunas do 2º mostram traço.
 */
export function quadroComparacao(l1, l2, { base, ondeNome, status2 }) {
  const tem2 = !!l2 && l2.aptos > 0 && l2.pct > 0 && (l2.lula + l2.flavio + l2.outros) > 0;
  const linhas = compararLinhas(l1, tem2 ? l2 : null, base).filter((r) => r.chave !== "naovoto" || base === "aptos");
  const p = (l, k) => percentual(l, k, base);
  const dif = (l) => (l ? p(l, "lula") - p(l, "flavio") : null);
  const m1 = dif(l1), m2 = tem2 ? dif(l2) : null;
  const refe = tem2 ? m2 : m1;
  const lider = refe == null ? null : refe >= 0 ? "lula" : "flavio", outro = lider === "lula" ? "flavio" : "lula";
  const inicial = tem2 && l2.pct < 5; // poucas urnas: nada de "lidera" nem de faixa em destaque
  let vantagem = "";
  if (lider) {
    const sinalL = lider === "lula" ? 1 : -1, ant = m1 == null ? null : sinalL * m1, agora = Math.abs(refe);
    const parcial = tem2 && l2.pct < 100 ? ` · parcial, ${pct(l2.pct)} apurado` : "";
    const detalhe = tem2
      ? `No 1º turno, ${ant >= 0 ? NOME_CURTO[lider] : NOME_CURTO[outro]} estava ${ptBr(Math.abs(ant))} p.p. à frente · ${ant < 0 ? `▲ virou ${ptBr(Math.abs(agora - ant))} p.p. a favor de ${NOME_CURTO[lider]}` : `${agora - ant >= 0 ? "▲ ampliou" : "▼ reduziu"} ${ptBr(Math.abs(agora - ant))} p.p.`}${parcial}`
      : "2º turno ainda sem dados apurados";
    vantagem = inicial
      ? `${avisoDadosIniciais(l2.pct)}<div class="el-duelo__vantagem el-duelo__vantagem--inicial"><b>+${ptBr(agora)} p.p.</b><p><strong>${NOME_CURTO[lider]}</strong> na frente por enquanto sobre ${NOME_CURTO[outro]}<small>${detalhe}</small></p></div>`
      : `<div class="el-duelo__vantagem" style="--cor:${COR_LADO[lider]}"><b>+${ptBr(agora)} p.p.</b><p><strong>${NOME_CURTO[lider]}</strong> lidera${tem2 ? "" : " no 1º turno"} sobre ${NOME_CURTO[outro]}<small>${detalhe}</small></p></div>`;
  }
  const votos = (v) => `<span class="el-duelo__votos"><br>${v == null ? "" : fmt(v)}</span>`;
  const celula = (pc, v) => (pc == null ? `<span class="el-duelo__sem">—</span>${votos(null)}` : `${pct(pc)}${votos(v)}`);
  const corpo = linhas.map((r) => {
    const eLider = r.chave === lider && !inicial;
    const delta = r.dp == null ? "—" : `<span class="${r.dp > 0 ? "el-delta--mais" : r.dp < 0 ? "el-delta--menos" : ""}">${r.dp > 0 ? "▲" : r.dp < 0 ? "▼" : "•"} ${sinal(r.dp, ptBr)}</span>`;
    const c2 = r.semNoTurno2 ? `<span class="el-duelo__sem">—</span>${votos(null)}` : celula(tem2 ? r.p2 : null, tem2 ? r.v2 : null);
    return `<div class="el-duelo__linha${eLider ? " el-duelo__linha--lider" : ""}" style="--cor:${COR_LADO[r.chave]}"><span><span class="el-duelo__nome">${esc(r.nome)}${eLider ? `<small class="el-duelo__lidera">lidera</small>` : ""}</span></span><span>${celula(r.p1, r.v1)}</span><span>${c2}</span><span>${r.semNoTurno2 ? "—" : delta}</span></div>`;
  }).join("");
  const baseTxt = base === "validos" ? "Percentuais dos candidatos sobre os votos válidos (só candidatos)." : "Percentuais sobre os eleitores aptos das seções apuradas; o não voto soma abstenções, brancos e nulos.";
  return `<section class="el-duelo"><header class="el-duelo__topo"><h3>${esc(ondeNome)}</h3><span>1º turno ${l1 ? pct(l1.pct) : "—"} · 2º turno ${tem2 ? `${pct(l2.pct)} apurado` : "ainda sem dados"}</span></header>${vantagem}
    <div class="el-duelo__tabela"><div class="el-duelo__linha el-duelo__linha--cab"><span>Candidato</span><span>1º turno</span><span>2º turno</span><span>Variação${tem2 && l2.pct < 100 ? "<small>parcial</small>" : ""}</span></div>${corpo}</div></section>
    <p class="muted nota">${status2 ?? ""} ${baseTxt} Variação em pontos percentuais: 2º turno menos 1º turno.</p>`;
}

/**
 * Duas barras empilhadas (1º e 2º turno). Base "aptos": candidatos e não voto sobre os eleitores aptos (soma 100% com o não voto).
 * Base "validos": só Lula, Flávio e outros sobre os votos válidos (soma 100%); nenhum elemento mostra não voto.
 */
export function barrasComposicao(l1, l2, base = "aptos") {
  const linhas = linhasDaBase(base), den = (l) => (base === "aptos" ? l.aptos : l.lula + l.flavio + l.outros);
  const barra = (l, nome) => {
    if (!l || !den(l)) return `<div class="cmp-linha"><span class="cmp-turno">${nome}</span><div class="cmp-barra vazia"><span class="muted">sem dados ainda</span></div></div>`;
    const seg = linhas.map(([k]) => ({ k, v: votosDe(l, k) })).filter((s) => s.v > 0), total = den(l);
    return `<div class="cmp-linha"><span class="cmp-turno">${nome}</span><div class="cmp-barra" role="img" aria-label="${esc(nome)}: ${seg.map((s) => `${linhas.find(([k]) => k === s.k)[1]} ${pct((s.v / total) * 100)}`).join(", ")}">${seg.map((s) => `<i style="width:${(s.v / total) * 100}%;background:${corLinha(s.k)}" title="${esc(linhas.find(([k]) => k === s.k)[1])}: ${pct((s.v / total) * 100)}"></i>`).join("")}</div></div>`;
  };
  return `<div class="cmp-barras">${barra(l1, "1º turno")}${barra(l2, "2º turno")}<ul class="geo-legenda">${linhas.map(([k, n]) => `<li><i class="gm-leg" style="background:${corLinha(k)}"></i>${esc(n)}</li>`).join("")}</ul></div>`;
}

/** O mapa dos municípios, pintado pela linha e pela medida escolhidas. */
export function mapaComparacao(malha, itens, { medida, classe, selecionado, uf, municipiosDaUf, municipioIbge }) {
  const porIbge = new Map(itens.map((i) => [i.ibge, i])), nosUf = uf && uf !== "BR" ? new Set(municipiosDaUf.map((m) => m.ibge)) : null;
  const caminhos = [...malha.caminhos].map(([ibge, d]) => {
    const i = porIbge.get(ibge), v = i?.valor;
    const c = nosUf && !nosUf.has(ibge) ? "co" : v == null ? "cx" : `c${classe(v)}`;
    const dica = i ? `${i.nome} · ${v == null ? "sem dado dos dois turnos" : medida === "lider" ? CATEGORIAS_LIDER[v] : medida === "votos" ? sinal(v) : medida === "pp" ? pp(v) : pct(v)}${v != null && i.l2 && i.l2.pct < 100 ? ` · 2º turno ${pct(i.l2.pct)} apurado` : ""}` : "";
    return `<path class="gm ${c}${ibge === selecionado ? " sel" : ""}" data-ct-ibge="${ibge}" d="${d}"${dica ? ` aria-label="${esc(dica)}"` : ""}>${dica ? `<title>${esc(dica)}</title>` : ""}</path>`;
  }).join("");
  const vb = municipioIbge ? viewBoxDoEstado(malha, [municipioIbge]) : nosUf ? viewBoxDoEstado(malha, municipiosDaUf.map((m) => m.ibge).filter(Boolean)) : malha.viewBox;
  const modo = medida === "lider" ? "lider" : medida === "pp" || medida === "votos" ? "acima" : "taxa";
  return caixaZoom(`<svg class="mapa-geo gm-${modo}" data-zoom="turnos" viewBox="${vb}" role="group" aria-label="Mapa de comparação entre os turnos"><g transform="scale(0.0001,-0.0001)">${caminhos}</g></svg>`);
}

export function legendaComparacao({ cortes }, medida, nomeLinha, { semDado }) {
  const f = medida === "pp" ? (v) => pp(v) : medida === "votos" ? (v) => sinal(Math.round(v)) : (v) => pct(v);
  let rotulos;
  if (medida === "lider") rotulos = CATEGORIAS_LIDER;
  else if (!cortes.length) rotulos = [];
  else if (medida === "pp" || medida === "votos") rotulos = [`${f(cortes[0])} ou menos`, `${f(cortes[0])} a ${f(cortes[1])}`, "perto de zero", `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  else rotulos = [`menos de ${f(cortes[0])}`, `${f(cortes[0])} a ${f(cortes[1])}`, `${f(cortes[1])} a ${f(cortes[2])}`, `${f(cortes[2])} a ${f(cortes[3])}`, `${f(cortes[3])} ou mais`];
  const nota = medida === "lider" ? "Cor = quem teve mais votos no município em cada turno (Lula, Flávio ou, no 1º turno, outro candidato)."
    : medida === "pp" || medida === "votos" ? `Cor = variação de ${esc(nomeLinha)} entre o 1º e o 2º turno (${medida === "pp" ? "pontos percentuais" : "votos"}). Laranja = subiu; verde-azulado = caiu.`
    : `Cor = % de ${esc(nomeLinha)} no ${medida === "p1" ? "1º" : "2º"} turno.`;
  return `<ul class="geo-legenda gm-${medida === "lider" ? "lider" : medida === "pp" || medida === "votos" ? "acima" : "taxa"}">${rotulos.map((r, i) => `<li><i class="gm-leg c${i}"></i>${esc(r)}</li>`).join("")}${semDado ? `<li><i class="gm-leg cx"></i>sem dado nos dois turnos (${fmt(semDado)})</li>` : ""}</ul><p class="muted nota">${nota}</p>`;
}

export function fichaComparacao(i, base, { ufNome }) {
  if (!i) return `<p class="muted dica-mapa">Toque em um município para ver os números dele.</p>`;
  return `<div class="geo-ficha"><h3>${esc(i.nome)} <span class="muted">${esc(ufNome)}</span></h3>${quadroComparacao(i.l1, i.l2, { base, ondeNome: i.nome, status2: "" })}</div>`;
}

export function tabelaExtremos(itens, { medida, dir, linhaNome }) {
  const fmtV = (v) => (medida === "pp" ? pp(v) : medida === "votos" ? sinal(Math.round(v)) : pct(v));
  const linhas = itens.map((i, k) => `<tr data-ct-ibge="${i.ibge}" role="button" tabindex="0"><td>${k + 1}</td><td><b>${esc(i.nome)}</b> <small class="muted">${esc(i.uf)}</small></td><td>${fmt(i.l1?.aptos ?? 0)}</td><td class="${medida === "pp" || medida === "votos" ? classeDelta(i.valor) : ""}"><b>${fmtV(i.valor)}</b></td></tr>`).join("");
  return `<div class="tab-scroll"><table class="geo-rank"><tr><th>#</th><th>Município</th><th>Eleitores</th><th>${esc(linhaNome)}</th></tr>${linhas}</table></div>`;
}

export const ORDENS_PAIS = [["aptos", "Eleitores aptos"], ["p1:lula", "% de Lula no 1º turno"], ["p2:lula", "% de Lula no 2º turno"], ["dp:lula", "Variação de Lula"], ["p2:flavio", "% de Flávio no 2º turno"], ["dp:flavio", "Variação de Flávio"], ["dp:naovoto", "Variação do não voto"]];
const pc = (n) => (n == null ? "—" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%");

/** Uma faixa de país (ou de cidade): eleitores, e Lula, Flávio e não voto no 1º e no 2º turno, com a variação em pontos. */
function faixaPais(nome, l1, l2, base, { abrir, id, parcial, sub }) {
  const col = (chave, rotulo) => {
    const a = percentual(l1, chave, base), b = percentual(l2, chave, base), d = a != null && b != null ? b - a : null;
    return `<div class="cmp-col"><small class="muted">${rotulo}</small><b>1º ${pc(a)}</b><b>2º ${pc(b)}</b><span class="${d == null ? "" : classeDelta(d)}">${d == null ? "" : pp(d)}</span></div>`;
  };
  const cab = `<div class="cmp-nome">${abrir != null ? `<button type="button" class="cmp-pais" data-ct-pais="${esc(id)}" aria-expanded="${abrir}">${abrir ? "▾" : "▸"} ${esc(nome)}</button>` : esc(nome)} <small class="muted">${fmt(l1?.aptos ?? 0)} aptos${sub ? ` · ${esc(sub)}` : ""}${parcial ? " · 2º turno parcial" : ""}</small></div>`;
  return `${cab}<div class="cmp-cols">${col("lula", "Lula")}${col("flavio", "Flávio")}${base === "aptos" ? col("naovoto", "Não voto") : col("outros", "Outros")}</div>`;
}

/** Exterior por país: lista ordenável; tocar em um país mostra as cidades dele. */
export function exteriorPorPais(paises, { base, ordem, abertos, limite }) {
  const ord = paises.slice().sort((a, b) => valorDeOrdem(b, ordem, base) - valorDeOrdem(a, ordem, base) || a.pais.localeCompare(b.pais, "pt-BR"));
  const itens = ord.slice(0, limite).map((g) => {
    const aberto = abertos.has(g.pais);
    const cidades = aberto ? `<div class="cmp-cidades">${g.cidades.filter((c) => c.l1).sort((a, b) => b.l1.aptos - a.l1.aptos).map((c) => `<div class="cmp-cidade">${faixaPais(c.nome, c.l1, c.l2, base, {})}</div>`).join("")}</div>` : "";
    return `<div class="cmp-item">${faixaPais(g.pais, g.l1, g.l2, base, { abrir: aberto, id: g.pais, parcial: g.parcial2, sub: g.cidades.length > 1 ? `${g.cidades.length} cidades` : g.cidades[0].nome })}${cidades}</div>`;
  }).join("");
  return `<div class="geo-linha"><span class="gp-leg">Ordenar por</span>${seg("data-ct-ordem-pais", ordem, base === "aptos" ? ORDENS_PAIS : ORDENS_PAIS.filter(([k]) => !k.endsWith(":naovoto")))}</div><div class="cmp-lista">${itens}</div>${ord.length > limite ? `<button type="button" class="btn-mais" data-ct-mais-paises>Mostrar mais países (${ord.length - limite})</button>` : ""}`;
}
