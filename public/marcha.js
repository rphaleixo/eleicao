// Aba "Marcha da apuração": painel único com o andamento do Brasil e a lista de estados.
// Os componentes (heroApuracao, linhaEstado, chipsRegiao...) são reaproveitados nas outras abas.
import { UFS, INICIO_APURACAO } from "./config.js";
import { areaPresenca } from "./graficos.js";
import { urlFoto } from "./tse.js";
import { seloSit, classeSit, seloEleicao } from "./situacao.js";
import { corPartido } from "./cores.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
import { fmt, pct } from "./formato.js";
export const mi = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : fmt(n));

export const REGIOES = {
  norte: { sigla: "N", nome: "Norte", ufs: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"] },
  nordeste: { sigla: "NE", nome: "Nordeste", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  centroeste: { sigla: "CO", nome: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"] },
  sudeste: { sigla: "SE", nome: "Sudeste", ufs: ["ES", "MG", "RJ", "SP"] },
  sul: { sigla: "S", nome: "Sul", ufs: ["PR", "RS", "SC"] },
};
export const nomeEstado = (uf) => (uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);
const TEXTO_SITUACAO = { n: "Não iniciada", p: "Em andamento", f: "Finalizada" };

/** Soma as seções e o eleitorado de vários estados (ou usa o próprio estado). */
export function agregar(itens) {
  const t = { ts: 0, st: 0, eleitores: 0, comparecimento: 0, abstencao: 0 };
  for (const u of itens) {
    if (!u) continue;
    t.ts += u.ts; t.st += u.st; t.eleitores += u.eleitores; t.comparecimento += u.comparecimento; t.abstencao += u.abstencao;
  }
  const votantes = t.comparecimento + t.abstencao;
  return { ...t, pct: t.ts ? (t.st / t.ts) * 100 : 0, pctComp: votantes ? (t.comparecimento / votantes) * 100 : 0, pctAbst: votantes ? (t.abstencao / votantes) * 100 : 0, temPresenca: votantes > 0 };
}
const doEstado = (u) => (u ? agregar([u]) : null);

/** Lista de estados da região escolhida. O exterior (ZZ) é um "estado" só na eleição presidencial. */
export function ufsVisiveis(regiao) {
  const az = (l) => l.slice().sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  if (regiao === "exterior") return ["ZZ"];
  const base = az(regiao && REGIOES[regiao] ? REGIOES[regiao].ufs : Object.keys(UFS));
  return regiao ? base : [...base, "ZZ"];
}

const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_SITUACAO[a] ?? TEXTO_SITUACAO.n}</span>`;

// ---------- componentes reaproveitáveis ----------
const largura = () => Math.max(300, Math.min(640, (typeof document === "undefined" ? 400 : document.documentElement.clientWidth) - 64));

function anel(valor) {
  const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, valor));
  return `<svg class="anel" viewBox="0 0 110 110" role="img" aria-label="${pct(valor)} das urnas apuradas"><circle class="anel-fundo" cx="55" cy="55" r="${r}"/>
    <circle class="anel-valor" cx="55" cy="55" r="${r}" stroke-dasharray="${((p / 100) * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 55 55)"/>
    <text x="55" y="53" text-anchor="middle" class="anel-pct">${pct(valor)}</text>
    <text x="55" y="70" text-anchor="middle" class="anel-leg">das urnas</text></svg>`;
}

/** Gráfico empilhado (presentes e ausentes, em % do eleitorado) com a legenda dos três pedaços. */
export function graficoPresenca({ hist, chave, a, altura = 160, titulo }) {
  const comp = a.eleitores ? (a.comparecimento / a.eleitores) * 100 : 0, aus = a.eleitores ? (a.abstencao / a.eleitores) * 100 : 0;
  return `${areaPresenca(hist, chave, a.eleitores, { largura: largura(), altura, rotulo: titulo, inicio: INICIO_APURACAO, ate: Date.now() })}
    <div class="presenca-leg"><span><i class="pt pres"></i>Presentes <strong>${pct(comp)}</strong></span><span><i class="pt aus"></i>Ausentes <strong>${pct(aus)}</strong></span><span><i class="pt falta"></i>A apurar <strong>${pct(Math.max(0, 100 - comp - aus))}</strong></span></div>`;
}

/** Versão compacta do gráfico de presença: uma barra e a legenda. */
export function barraPresenca(a) {
  const d = divisaoEleitorado(a);
  return `<div class="le-barra hero-barra" role="img" aria-label="Presentes ${pct(d.comp)}, ausentes ${pct(d.aus)}, a apurar ${pct(d.falta)}"><i class="pres" style="width:${d.comp}%"></i><i class="aus" style="width:${d.aus}%"></i></div>${legendaPresenca(a)}`;
}

/** Painel de destaque: anel de progresso, situação e gráfico de presença, tudo num cartão só. */
export function heroApuracao({ titulo, subtitulo = "", a, andamento, quando, extra = "", hist, chave, grafico = true, topo = "" }) {
  return `<section class="card hero">${topo}
    <div class="hero-topo">${anel(a.pct)}<div class="hero-info"><h2>${esc(titulo)}</h2>${subtitulo ? `<p class="hero-sub">${esc(subtitulo)}</p>` : ""}${selo(andamento)}
      <p class="hero-sec"><strong>${fmt(a.st)}</strong> de ${fmt(a.ts)} seções</p>${extra}${quando ? `<p class="hero-sub">TSE: ${esc(quando)}</p>` : ""}</div></div>
    ${grafico === null ? "" : `<div class="hero-grafico">${grafico ? graficoPresenca({ hist, chave, a, titulo: `Comparecimento e abstenção: ${titulo}` }) : barraPresenca(a)}</div>`}</section>`;
}

/** Regiões aceitas na navegação. O exterior só existe na eleição presidencial. */
export const regiaoDe = (uf) => Object.entries(REGIOES).find(([, r]) => r.ufs.includes(uf))?.[0] ?? (uf === "ZZ" ? "exterior" : "");

/**
 * Navegação por região e estado, usada no topo das abas:
 * 1ª linha: Brasil e regiões (com o % apurado); 2ª linha: "Região inteira" e os estados da região escolhida.
 */
export function navegacaoRegional(ac, { regiao, uf, comExterior = true, comEstados = true }) {
  const chip = (attrs, nome, valor, ativo) => `<button type="button" ${attrs} aria-pressed="${ativo}">${nome}${valor == null ? "" : ` <small>${pct(valor)}</small>`}</button>`;
  const linha1 = chip('data-regiao=""', "Brasil", null, regiao === "")
    + Object.entries(REGIOES).map(([k, r]) => chip(`data-regiao="${k}"`, r.nome, agregar(r.ufs.map((u) => ac.ufs[u.toLowerCase()])).pct, regiao === k)).join("")
    + (comExterior && ac.ufs.zz ? chip('data-regiao="exterior"', "Exterior", doEstado(ac.ufs.zz).pct, regiao === "exterior") : "");
  const r = REGIOES[regiao];
  const linha2 = r && comEstados
    ? `<div class="chips chips-estados" role="group" aria-label="Estados de ${esc(r.nome)}">${chip("data-regiao-inteira", "Região inteira", null, uf === "BR")}${r.ufs.slice().sort((x, y) => UFS[x].localeCompare(UFS[y], "pt-BR"))
        .map((u) => chip(`data-nav-uf="${u}"`, esc(UFS[u]), doEstado(ac.ufs[u.toLowerCase()])?.pct ?? 0, uf === u)).join("")}</div>`
    : "";
  return `<nav class="navegacao" aria-label="Navegar por região e estado"><div class="chips" role="group" aria-label="Regiões">${linha1}</div>${linha2}</nav>`;
}

/** Locais do histórico de resultados que formam o recorte escolhido: estado, exterior, região ou Brasil. */
export function locaisResultado(uf, regiao) {
  if (uf !== "BR") return [uf.toLowerCase()];
  if (regiao === "exterior") return ["zz"];
  if (REGIOES[regiao]) return REGIOES[regiao].ufs.map((u) => u.toLowerCase());
  return ["br"];
}

/** Divisão do eleitorado em presentes, ausentes e ainda a apurar (somam 100%). */
export function divisaoEleitorado(a) {
  const comp = a?.eleitores ? (a.comparecimento / a.eleitores) * 100 : 0, aus = a?.eleitores ? (a.abstencao / a.eleitores) * 100 : 0;
  return { comp, aus, falta: Math.max(0, 100 - comp - aus) };
}

export function legendaPresenca(a) {
  const d = divisaoEleitorado(a);
  return `<span class="le-leg"><span><i class="pt pres"></i>Presentes <b>${pct(d.comp)}</b></span><span><i class="pt aus"></i>Ausentes <b>${pct(d.aus)}</b></span><span><i class="pt falta"></i>A apurar <b>${pct(d.falta)}</b></span></span>`;
}

export function linhaEstado(uf, u, aberto = false, painel = "") {
  const a = doEstado(u);
  const estadoCls = u?.andamento === "f" ? "f" : u?.andamento === "p" ? "p" : "n";
  const d = divisaoEleitorado(a);
  return `<li class="${aberto ? "aberto" : ""}"><button type="button" class="linha-estado" data-uf="${uf}" aria-expanded="${aberto}"><span class="sigla">${uf === "ZZ" ? "EX" : uf}</span>
    <span class="le-meio"><span class="le-nome">${esc(nomeEstado(uf))}<i class="ponto ${estadoCls}" title="${TEXTO_SITUACAO[u?.andamento] ?? TEXTO_SITUACAO.n}"></i></span>
      <span class="le-barra" role="img" aria-label="Presentes ${pct(d.comp)}, ausentes ${pct(d.aus)}, a apurar ${pct(d.falta)}"><i class="pres" style="width:${d.comp}%"></i><i class="aus" style="width:${d.aus}%"></i></span>
      ${legendaPresenca(a)}</span>
    <span class="le-pct">${pct(a?.pct ?? 0)}<small>das seções</small></span><span class="seta" aria-hidden="true">${aberto ? "⌃" : "⌄"}</span></button>${aberto ? painel : ""}</li>`;
}

// ---------- resumo do estado (campo expansível) ----------
export function blocoVotos(d) {
  const total = d.votosValidos + d.brancos + d.nulos;
  const parte = (rotulo, n) => `<div><span>${rotulo}</span><strong>${fmt(n)}</strong><small>${pct(total ? (n / total) * 100 : 0)}</small></div>`;
  return `<div class="votos-tipos">${parte("Válidos", d.votosValidos)}${parte("Brancos", d.brancos)}${parte("Nulos", d.nulos)}</div>`;
}

export function cardCargo({ titulo, aba, uf, d }) {
  if (d === undefined) return `<article class="card-cargo"><h3>${esc(titulo)}</h3><p class="muted">Carregando…</p></article>`;
  if (!d) return `<article class="card-cargo"><h3>${esc(titulo)}</h3><p class="muted">Dados indisponíveis no momento.</p></article>`;
  // Mais votados primeiro; sem votos (apuração não começou), ordem alfabética.
  const top = d.candidatos.slice().sort((x, y) => y.votos - x.votos || x.nome.localeCompare(y.nome, "pt-BR")).slice(0, 5);
  const itens = top.length
    ? top.map((c, i) => `<li class="${classeSit(c).trim()}" data-sq="${esc(c.id)}" role="button" tabindex="0" title="Ver ficha do candidato"><span class="pos">${i + 1}</span>
        <img class="foto mini" loading="lazy" alt="" src="${urlFoto(aba, uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
        <span class="cc-nome"><b>${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>${seloSit(c, { curto: true })}</span>
        <span class="cc-votos"><strong>${pct(c.pct)}</strong><small>${fmt(c.votos)}</small></span></li>`).join("")
    : `<li class="vazio muted">Sem candidatos no arquivo do TSE.</li>`;
  return `<article class="card-cargo"><div class="cc-topo"><h3>${esc(titulo)}</h3>${seloEleicao(d) || `<span class="muted">${pct(d.pctSecoes)} apurado</span>`}</div>
    <ol class="cc-lista">${itens}</ol>${blocoVotos(d)}<button type="button" class="link" data-ir="${aba}">Ver completo ›</button></article>`;
}

/** Cartão da bancada de deputados de um estado: partidos/federações com mais cadeiras. */
export function cardBancada({ titulo, cargo, d, dist }) {
  if (d === undefined) return `<article class="card-cargo"><h3>${esc(titulo)}</h3><p class="muted">Carregando…</p></article>`;
  if (!d || !dist) return `<article class="card-cargo"><h3>${esc(titulo)}</h3><p class="muted">Dados indisponíveis no momento.</p></article>`;
  const linhas = dist.linhas.filter((l) => l.vagas > 0).sort((a, b) => b.vagas - a.vagas || b.votos - a.votos).slice(0, 5);
  const ocupadas = dist.linhas.reduce((t, l) => t + l.vagas, 0);
  const itens = linhas.length
    ? linhas.map((l) => `<li><span class="cc-nome"><span class="chip" style="--cor:${corPartido(l.sigla)}">${esc(l.sigla)}</span></span><span class="cc-votos"><strong>${l.vagas} ${l.vagas === 1 ? "cadeira" : "cadeiras"}</strong><small>${pct(l.pctVotos)} dos votos</small></span></li>`).join("")
    : `<li class="vazio muted">Nenhuma cadeira distribuída ainda.</li>`;
  return `<article class="card-cargo card-bancada"><div class="cc-topo"><h3>${esc(titulo)}</h3><span class="muted">${pct(d.pctSecoes)} apurado</span></div>
    <ol class="cc-lista cc-bancada">${itens}</ol><p class="muted cc-rodape">${ocupadas} de ${dist.vagas} vagas ${dist.oficial ? "(resultado oficial)" : "(projeção)"}</p><button type="button" class="link" data-ir="${cargo}">Ver completo ›</button></article>`;
}

export function painelEstado(v, uf) {
  const k = uf.toLowerCase(), u = v.f.ufs[k], a = doEstado(u) ?? agregar([]);
  const est = v.e.ufs[k];
  const d = v.detalhe ?? {};
  const cargos = [["Presidente", "presidente", d.pres]];
  if (uf !== "ZZ") cargos.push(["Governador", "governador", d.gov], ["Senador", "senador", d.sen]);
  const celula = (rotulo, valor, sub = "") => `<div><span>${rotulo}</span><strong>${valor}</strong>${sub ? `<small>${sub}</small>` : ""}</div>`;
  return `<div class="expandido">
    <div class="resumo-estado">${celula("Eleitores aptos", fmt(a.eleitores))}${celula("Compareceram", fmt(a.comparecimento), a.temPresenca ? `${pct(a.pctComp)} dos apurados` : "")}
      ${celula("Abstenções", fmt(a.abstencao), a.temPresenca ? `${pct(a.pctAbst)} dos apurados` : "")}${celula("Seções", `${fmt(a.st)} de ${fmt(a.ts)}`, est && uf !== "ZZ" ? `Estaduais: ${pct(est.pct)}` : "")}</div>
    <div class="carrossel" role="region" aria-label="Resumo das eleições em ${esc(nomeEstado(uf))}">${cargos.map(([titulo, aba, dd]) => cardCargo({ titulo, aba, uf, d: dd })).join("")}</div>
    ${uf === "ZZ" ? "" : `<button type="button" class="link" data-abrir-estado="${uf}">Ver todas as eleições em ${esc(nomeEstado(uf))} ›</button>`}</div>`;
}

function listaOrdenada(v, estado) {
  const ac = v.f, ufs = ufsVisiveis(estado.regiao);
  if (estado.ordem === "pct") ufs.sort((x, y) => (doEstado(ac.ufs[y.toLowerCase()])?.pct ?? 0) - (doEstado(ac.ufs[x.toLowerCase()])?.pct ?? 0));
  return ufs.map((uf) => { const aberto = estado.uf === uf; return linhaEstado(uf, ac.ufs[uf.toLowerCase()], aberto, aberto ? painelEstado(v, uf) : ""); }).join("");
}

// ---------- tela ----------
export function situacaoGeral(lista) {
  const us = lista.filter(Boolean);
  if (us.length && us.every((u) => u.andamento === "f")) return "f";
  return us.some((u) => u.andamento === "p" || u.andamento === "f" || u.st > 0) ? "p" : "n";
}

/** O painel de destaque acompanha a navegação: Brasil, uma região ou o exterior. */
export function escopoDoPainel(v, regiao, uf = "BR") {
  const ac = v.f;
  if (uf !== "BR" && ac.ufs[uf.toLowerCase()]) {
    const u = ac.ufs[uf.toLowerCase()];
    return { titulo: nomeEstado(uf), subtitulo: uf === "ZZ" ? "Voto de brasileiros no exterior" : "Estado", a: doEstado(u), andamento: u.andamento, quando: [u.dt, u.ht].filter(Boolean).join(" "), chave: uf.toLowerCase(), extra: "" };
  }
  if (regiao === "exterior" && ac.ufs.zz) {
    const u = ac.ufs.zz;
    return { titulo: "Exterior", subtitulo: "Voto de brasileiros no exterior", a: doEstado(u), andamento: u.andamento, quando: [u.dt, u.ht].filter(Boolean).join(" "), chave: "zz", extra: "" };
  }
  if (REGIOES[regiao]) {
    const us = REGIOES[regiao].ufs.map((x) => ac.ufs[x.toLowerCase()]);
    return { titulo: REGIOES[regiao].nome, subtitulo: `Região · ${us.length} estados`, a: agregar(us), andamento: situacaoGeral(us), quando: "", chave: REGIOES[regiao].ufs.map((x) => x.toLowerCase()), extra: "" };
  }
  const br = ac.ufs.br, e = v.e.ufs.br;
  const todos = agregar([...Object.keys(UFS).map((u) => ac.ufs[u.toLowerCase()]), ac.ufs.zz]);
  const a = br ? { ...todos, ts: br.ts || todos.ts, st: br.st ?? todos.st, pct: br.pct, eleitores: br.eleitores || todos.eleitores } : todos;
  return { titulo: "Brasil", subtitulo: "Todas as urnas, com o exterior", a, andamento: br?.andamento, quando: [br?.dt, br?.ht].filter(Boolean).join(" "), chave: "br",
    extra: e ? `<p class="hero-sub">Eleições estaduais: ${pct(e.pct)} das seções</p>` : "" };
}

/** Alterna o painel entre o resumo geral (anel e gráfico) e as barras de % apurado por região. */
function controlePainel(painel) {
  return `<div class="seg painel-seg" role="group" aria-label="Visão do painel"><button type="button" data-painel="geral" aria-pressed="${painel !== "regioes"}">Geral</button><button type="button" data-painel="regioes" aria-pressed="${painel === "regioes"}">Por região</button></div>`;
}

function heroRegioes(v, estado, topo, p) {
  const ac = v.f, r = REGIOES[estado.regiao];
  const itens = r
    ? r.ufs.map((u) => ({ nome: UFS[u], a: doEstado(ac.ufs[u.toLowerCase()]) }))
    : [...Object.values(REGIOES).map((g) => ({ nome: g.nome, a: agregar(g.ufs.map((u) => ac.ufs[u.toLowerCase()])) })), ...(ac.ufs.zz ? [{ nome: "Exterior", a: doEstado(ac.ufs.zz) }] : [])];
  itens.sort((x, y) => (y.a?.pct ?? 0) - (x.a?.pct ?? 0));
  const barras = itens.map(({ nome, a }) => `<li><span class="br-nome">${esc(nome)}</span><span class="br-trilho"><i style="width:${Math.min(100, a?.pct ?? 0)}%"></i></span><b>${pct(a?.pct ?? 0)}</b><small>${a ? `${fmt(a.st)} de ${fmt(a.ts)} seções` : "–"}</small></li>`).join("");
  return `<section class="card hero">${topo}<h2>% da apuração por ${r ? "estado" : "região"}</h2>
    <p class="hero-sub">${esc(p.titulo)}: <strong>${pct(p.a.pct)}</strong> · ${fmt(p.a.st)} de ${fmt(p.a.ts)} seções</p>
    <ul class="barras-regiao">${barras}</ul></section>`;
}

export function telaMarcha(v, estado, comNav = true) {
  const p = escopoDoPainel(v, estado.regiao);
  const topo = controlePainel(estado.painel);
  const hero = estado.painel === "regioes" ? heroRegioes(v, estado, topo, p)
    : heroApuracao({ titulo: p.titulo, subtitulo: p.subtitulo, a: p.a, andamento: p.andamento, quando: p.quando, extra: p.extra, hist: v.h, chave: p.chave, topo });
  return `${comNav ? navegacaoRegional(v.f, { regiao: estado.regiao, uf: estado.uf }) : ""}${hero}
    <section class="card estados"><div class="estados-topo"><h2>${estado.regiao ? esc(p.titulo) : "Estados"}</h2>
      <div class="seg mini" role="group" aria-label="Ordenar"><button type="button" data-ordem="az" aria-pressed="${estado.ordem !== "pct"}">A–Z</button><button type="button" data-ordem="pct" aria-pressed="${estado.ordem === "pct"}">% apurado</button></div></div>
      <ul class="lista-estados">${listaOrdenada(v, estado)}</ul>
      <p class="muted nota">Toque em um estado para ver o resumo da situação e das eleições para Presidente, Governador e Senador. Porcentagens de candidatos: votos no candidato ÷ votos válidos.</p></section>`;
}
