// Aba "Marcha da apuração": painel único com o andamento do Brasil e a lista de estados.
// Os componentes (heroApuracao, linhaEstado, chipsRegiao...) são reaproveitados nas outras abas.
import { UFS } from "./config.js";
import { linhaEvolucao } from "./graficos.js";
import { corPartido } from "./cores.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const pct = (n, c = 1) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }) + "%";
export const mi = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : fmt(n));

export const REGIOES = {
  norte: { nome: "Norte", ufs: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"] },
  nordeste: { nome: "Nordeste", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  centroeste: { nome: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"] },
  sudeste: { nome: "Sudeste", ufs: ["ES", "MG", "RJ", "SP"] },
  sul: { nome: "Sul", ufs: ["PR", "RS", "SC"] },
};
export const SERIES = { f: "Presidente", e: "Estaduais" };
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
export function ufsVisiveis(regiao, serie) {
  const az = (l) => l.slice().sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  if (regiao === "exterior") return serie === "f" ? ["ZZ"] : [];
  const base = az(regiao && REGIOES[regiao] ? REGIOES[regiao].ufs : Object.keys(UFS));
  return !regiao && serie === "f" ? [...base, "ZZ"] : base;
}

const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_SITUACAO[a] ?? TEXTO_SITUACAO.n}</span>`;

// ---------- componentes reaproveitáveis ----------
export function controleSerie(serie) {
  return `<div class="seg" role="group" aria-label="Qual apuração mostrar">${Object.entries(SERIES).map(([k, n]) =>
    `<button type="button" data-serie="${k}" aria-pressed="${k === serie}">${n}</button>`).join("")}</div>`;
}

function anel(valor) {
  const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, valor));
  return `<svg class="anel" viewBox="0 0 110 110" role="img" aria-label="${pct(valor, 2)} das urnas apuradas"><circle class="anel-fundo" cx="55" cy="55" r="${r}"/>
    <circle class="anel-valor" cx="55" cy="55" r="${r}" stroke-dasharray="${((p / 100) * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 55 55)"/>
    <text x="55" y="53" text-anchor="middle" class="anel-pct">${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</text>
    <text x="55" y="70" text-anchor="middle" class="anel-leg">das urnas</text></svg>`;
}

function presenca(a) {
  if (!a.temPresenca) return `<p class="hero-vazio">Comparecimento e abstenção aparecem quando as primeiras seções forem apuradas.</p>`;
  return `<div class="presenca"><div class="barra-dupla" role="img" aria-label="Comparecimento ${pct(a.pctComp)}, abstenção ${pct(a.pctAbst)}"><i class="comp" style="width:${a.pctComp}%"></i><i class="abst" style="width:${a.pctAbst}%"></i></div>
    <div class="presenca-leg"><span><i class="pt comp"></i>Comparecimento <strong>${pct(a.pctComp)}</strong> <small>${mi(a.comparecimento)}</small></span>
    <span><i class="pt abst"></i>Abstenção <strong>${pct(a.pctAbst)}</strong> <small>${mi(a.abstencao)}</small></span></div></div>`;
}

/** Painel de destaque: anel de progresso, situação, gráfico da evolução e presença, tudo num cartão só. */
export function heroApuracao({ titulo, subtitulo = "", a, andamento, quando, hist, serie, chave, topo = "" }) {
  const largura = Math.max(300, Math.min(640, (typeof document === "undefined" ? 400 : document.documentElement.clientWidth) - 64));
  return `<section class="card hero">${topo}
    <div class="hero-topo">${anel(a.pct)}<div class="hero-info"><h2>${esc(titulo)}</h2>${subtitulo ? `<p class="hero-sub">${esc(subtitulo)}</p>` : ""}${selo(andamento)}
      <p class="hero-sec"><strong>${fmt(a.st)}</strong> de ${fmt(a.ts)} seções</p>${quando ? `<p class="hero-sub">TSE: ${esc(quando)}</p>` : ""}</div></div>
    <div class="hero-grafico">${linhaEvolucao(hist, (p) => p[serie]?.[chave], { largura, altura: 150, rotulo: `Evolução da apuração: ${titulo}` })}</div>
    ${presenca(a)}</section>`;
}

export function chipsRegiao(ac, regiao, serie) {
  const chip = (id, nome, valor) => `<button type="button" data-regiao="${id}" aria-pressed="${regiao === id}">${nome}${valor == null ? "" : ` <small>${pct(valor, 0)}</small>`}</button>`;
  const regs = Object.entries(REGIOES).map(([k, r]) => chip(k, r.nome, agregar(r.ufs.map((u) => ac.ufs[u.toLowerCase()])).pct)).join("");
  const ext = serie === "f" && ac.ufs.zz ? chip("exterior", "Exterior", doEstado(ac.ufs.zz).pct) : "";
  return `<div class="chips" role="group" aria-label="Filtrar por região">${chip("", "Todos")}${regs}${ext}</div>`;
}

export function linhaEstado(uf, u) {
  const a = doEstado(u);
  const sigla = uf === "ZZ" ? "EX" : uf;
  const estadoCls = u?.andamento === "f" ? "f" : u?.andamento === "p" ? "p" : "n";
  const pc = a?.pct ?? 0;
  return `<li><button type="button" class="linha-estado" data-uf="${uf}"><span class="sigla">${sigla}</span>
    <span class="le-meio"><span class="le-nome">${esc(nomeEstado(uf))}<i class="ponto ${estadoCls}" title="${TEXTO_SITUACAO[u?.andamento] ?? TEXTO_SITUACAO.n}"></i></span>
      <span class="le-barra"><i style="width:${Math.min(100, pc)}%"></i></span>
      <span class="le-det">${a ? `${fmt(a.st)} de ${fmt(a.ts)} seções` : "–"}${a?.temPresenca ? ` · comp. ${pct(a.pctComp)} · abst. ${pct(a.pctAbst)}` : ""}</span></span>
    <span class="le-pct">${pct(pc)}</span><span class="seta" aria-hidden="true">›</span></button></li>`;
}

function listaOrdenada(ac, regiao, serie, ordem) {
  const ufs = ufsVisiveis(regiao, serie);
  if (ordem === "pct") ufs.sort((x, y) => (doEstado(ac.ufs[y.toLowerCase()])?.pct ?? 0) - (doEstado(ac.ufs[x.toLowerCase()])?.pct ?? 0));
  return ufs.map((uf) => linhaEstado(uf, ac.ufs[uf.toLowerCase()])).join("");
}

// ---------- tela ----------
function lideres(titulo, aba, d) {
  if (!d) return "";
  const top = d.candidatos.filter((c) => c.votos > 0).slice(0, 3);
  const itens = top.length
    ? top.map((c, i) => `<li><span class="pos">${i + 1}</span><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span><span class="lid-nome">${esc(c.nome)}</span><strong>${pct(c.pct, 2)}</strong></li>`).join("")
    : `<li class="muted vazio">Sem votos apurados ainda.</li>`;
  return `<div class="lid-bloco"><div class="lid-topo"><h3>${esc(titulo)}</h3><button type="button" class="link" data-ir="${aba}">Ver completo ›</button></div><ol class="lideres">${itens}</ol></div>`;
}

function detalheEstado(v, estado) {
  const { uf } = estado, ext = uf === "ZZ";
  const serie = ext ? "f" : estado.serie, k = uf.toLowerCase();
  const ac = serie === "f" ? v.f : v.e, u = ac.ufs[k];
  const d = v.detalhe ?? {};
  const cargos = [["presidente", "Presidente"], ["governador", "Governador"], ["senador", "Senador"], ["dep-federal", "Dep. Federal"], ["dep-estadual", "Dep. Estadual"]]
    .filter(([id]) => !ext || id === "presidente");
  const topo = `<div class="hero-nav"><button type="button" class="voltar" data-voltar>‹ Brasil</button>${ext ? "" : controleSerie(serie)}</div>`;
  return `${heroApuracao({ titulo: nomeEstado(uf), subtitulo: ext ? "Votos de brasileiros no exterior (só Presidente)" : SERIES[serie], a: doEstado(u) ?? agregar([]), andamento: u?.andamento, quando: [u?.dt, u?.ht].filter(Boolean).join(" "), hist: v.h, serie, chave: k, topo })}
    <section class="card"><h2>Quem lidera</h2>${ext ? "" : lideres("Governador", "governador", d.gov) + lideres("Senador", "senador", d.sen)}${lideres("Presidente", "presidente", d.pres)}</section>
    <nav class="pills" aria-label="Ver eleição completa">${cargos.map(([id, n]) => `<button type="button" data-ir="${id}">${n} ›</button>`).join("")}</nav>`;
}

export function telaMarcha(v, estado) {
  if (estado.uf !== "BR") return detalheEstado(v, estado);
  const { serie, regiao } = estado;
  const ac = serie === "f" ? v.f : v.e;
  const br = ac.ufs.br;
  const todos = agregar([...Object.keys(UFS).map((u) => ac.ufs[u.toLowerCase()]), serie === "f" ? ac.ufs.zz : null]);
  const brasil = br ? { ...todos, ts: br.ts || todos.ts, st: br.st ?? todos.st, pct: br.pct } : todos;
  const nota = serie === "f" ? "" : `<p class="muted nota">O total é menor que o da eleição presidencial porque o exterior vota só para Presidente.</p>`;
  const hero = heroApuracao({ titulo: "Brasil", subtitulo: SERIES[serie], a: brasil, andamento: br?.andamento, quando: [br?.dt, br?.ht].filter(Boolean).join(" "), hist: v.h, serie, chave: "br", topo: controleSerie(serie) });
  return `${hero}
    <section class="card estados"><div class="estados-topo"><h2>Estados</h2>
      <div class="seg mini" role="group" aria-label="Ordenar"><button type="button" data-ordem="az" aria-pressed="${estado.ordem !== "pct"}">A–Z</button><button type="button" data-ordem="pct" aria-pressed="${estado.ordem === "pct"}">% apurado</button></div></div>
      ${chipsRegiao(ac, regiao, serie)}
      <ul class="lista-estados">${listaOrdenada(ac, regiao, serie, estado.ordem)}</ul>${nota}</section>`;
}
