// Aba "Marcha da apuração": andamento da contagem, comparecimento e abstenção, regiões e estados.
import { UFS } from "./config.js";
import { linhaEvolucao } from "./graficos.js";
import { corPartido } from "./cores.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const pct = (n, c = 1) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }) + "%";

export const REGIOES = {
  norte: { nome: "Norte", ufs: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"] },
  nordeste: { nome: "Nordeste", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  centroeste: { nome: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"] },
  sudeste: { nome: "Sudeste", ufs: ["ES", "MG", "RJ", "SP"] },
  sul: { nome: "Sul", ufs: ["PR", "RS", "SC"] },
};
export const SERIES = { f: "Presidente", e: "Estaduais" };
const TEXTO_SITUACAO = { n: "Não iniciada", p: "Em andamento", f: "Finalizada" };

/** Soma as seções e o eleitorado de vários estados (ou usa o próprio estado). */
export function agregar(itens) {
  const t = { ts: 0, st: 0, eleitores: 0, comparecimento: 0, abstencao: 0 };
  for (const u of itens) {
    if (!u) continue;
    t.ts += u.ts; t.st += u.st; t.eleitores += u.eleitores; t.comparecimento += u.comparecimento; t.abstencao += u.abstencao;
  }
  const votantes = t.comparecimento + t.abstencao;
  return { ...t, pct: t.ts ? (t.st / t.ts) * 100 : 0, pctComp: votantes ? (t.comparecimento / votantes) * 100 : 0, pctAbst: votantes ? (t.abstencao / votantes) * 100 : 0 };
}
const doEstado = (u) => (u ? agregar([u]) : null);

const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_SITUACAO[a] ?? TEXTO_SITUACAO.n}</span>`;
const barra = (v) => `<span class="mini-barra"><i style="width:${Math.min(100, v)}%"></i></span>`;
const mi = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : fmt(n));

function controleSerie(serie) {
  return `<div class="seg" role="group" aria-label="Qual apuração mostrar">${Object.entries(SERIES).map(([k, n]) =>
    `<button type="button" data-serie="${k}" aria-pressed="${k === serie}">${n}</button>`).join("")}</div>
    <p class="muted seg-dica">${serie === "f" ? "Eleição presidencial (urnas de todo o país)." : "Governador, Senador e Deputados."}</p>`;
}

function cardProgresso(titulo, a, u, andamento, quando) {
  return `<section class="card"><div class="prog-topo"><div><h2>${esc(titulo)}</h2>${selo(andamento)}</div><div class="prog-pct">${pct(a.pct, 2)}<small> das urnas</small></div></div>
    <div class="barra-prog"><i style="width:${Math.min(100, a.pct)}%"></i></div>
    <p class="muted">${a.ts ? `${fmt(a.st)} de ${fmt(a.ts)} seções apuradas` : ""}${quando ? ` · totalização do TSE: ${esc(quando)}` : ""}</p></section>`;
}

function cardEvolucao(titulo, h, serie, chave) {
  const largura = Math.max(300, Math.min(640, (typeof document === "undefined" ? 400 : document.documentElement.clientWidth) - 56));
  return `<section class="card"><h2>${esc(titulo)}</h2>${linhaEvolucao(h, (p) => p[serie]?.[chave], { largura, altura: 200, rotulo: titulo })}
    <p class="muted">% de seções apuradas ao longo do tempo (registro a cada minuto).</p></section>`;
}

function cardComparecimento(titulo, a) {
  const vazio = !a.comparecimento && !a.abstencao;
  const corpo = vazio
    ? `<p class="muted">Os números aparecem quando as primeiras seções forem apuradas.</p>`
    : `<div class="barra-dupla" role="img" aria-label="Comparecimento ${pct(a.pctComp)}, abstenção ${pct(a.pctAbst)}"><i class="comp" style="width:${a.pctComp}%"></i><i class="abst" style="width:${a.pctAbst}%"></i></div>
       <div class="duplo-legenda"><div><span><i class="pt comp"></i>Comparecimento</span><strong>${pct(a.pctComp)}</strong><small class="muted">${fmt(a.comparecimento)} eleitores</small></div>
       <div><span><i class="pt abst"></i>Abstenção</span><strong>${pct(a.pctAbst)}</strong><small class="muted">${fmt(a.abstencao)} eleitores</small></div></div>`;
  return `<section class="card"><h2>${esc(titulo)}</h2>${corpo}<p class="muted">Eleitorado total: ${fmt(a.eleitores)}. Os percentuais consideram só as seções já apuradas.</p></section>`;
}

function cardRegioes(ac, regiao) {
  const linhas = Object.entries(REGIOES).map(([k, r]) => {
    const a = agregar(r.ufs.map((u) => ac.ufs[u.toLowerCase()]));
    return `<tr class="clicavel ${regiao === k ? "ativa" : ""}" data-regiao="${k}"><td class="uf-nome">${r.nome}<small class="muted">${r.ufs.length} estados · ${mi(a.eleitores)}</small></td>
      <td class="com-barra">${pct(a.pct)}${barra(a.pct)}</td><td>${a.comparecimento || a.abstencao ? pct(a.pctComp) : "–"}</td><td>${a.comparecimento || a.abstencao ? pct(a.pctAbst) : "–"}</td></tr>`;
  }).join("");
  return `<section class="card"><h2>Por região</h2><div class="tab-scroll"><table class="compacta"><tr><th>Região</th><th>Apurado</th><th>Comp.</th><th>Abst.</th></tr>${linhas}</table></div>
    <p class="muted">Toque em uma região para filtrar as tabelas de estados abaixo.</p></section>`;
}

const ufsDaRegiao = (regiao) => (regiao ? REGIOES[regiao].ufs : Object.keys(UFS)).slice().sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));

function cardTabelaComparecimento(ac, regiao) {
  const linhas = ufsDaRegiao(regiao).map((uf) => {
    const a = doEstado(ac.ufs[uf.toLowerCase()]);
    const tem = a && (a.comparecimento || a.abstencao);
    return `<tr class="clicavel" data-uf="${uf}"><td class="uf-nome">${esc(UFS[uf])}<small class="muted">${a ? mi(a.eleitores) : "–"} eleitores</small></td>
      <td>${tem ? pct(a.pctComp) : "–"}</td><td>${tem ? pct(a.pctAbst) : "–"}</td></tr>`;
  }).join("");
  return `<section class="card"><h2>Comparecimento e abstenção por estado</h2><div class="tab-scroll"><table class="compacta"><tr><th>Estado</th><th>Comparecimento</th><th>Abstenção</th></tr>${linhas}</table></div></section>`;
}

function cardTabelaApuracao(ac, regiao) {
  const linhas = ufsDaRegiao(regiao).map((uf) => {
    const u = ac.ufs[uf.toLowerCase()];
    const a = doEstado(u);
    return `<tr class="clicavel" data-uf="${uf}"><td class="uf-nome">${esc(UFS[uf])}<small class="muted">${a ? `${fmt(a.st)} de ${fmt(a.ts)} seções` : "–"}</small>${selo(u?.andamento)}</td>
      <td class="com-barra">${pct(a?.pct ?? 0)}${barra(a?.pct ?? 0)}</td><td class="seta" aria-hidden="true">›</td></tr>`;
  }).join("");
  return `<section class="card"><h2>Apuração por estado</h2><div class="tab-scroll"><table class="compacta"><tr><th>Estado</th><th>Apurado</th><th></th></tr>${linhas}</table></div>
    <p class="muted">Toque em um estado para ver o detalhamento da eleição.</p></section>`;
}

function lideres(titulo, aba, d, vagas = 3) {
  if (!d) return `<section class="card"><h2>${esc(titulo)}</h2><p class="muted">Dados indisponíveis no momento.</p></section>`;
  const top = d.candidatos.filter((c) => c.votos > 0).slice(0, vagas);
  const itens = top.length
    ? top.map((c, i) => `<li><span class="pos">${i + 1}</span><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span><span class="lid-nome">${esc(c.nome)}</span><strong>${pct(c.pct, 2)}</strong></li>`).join("")
    : `<li class="muted">Sem votos apurados ainda.</li>`;
  return `<section class="card"><div class="lid-topo"><h2>${esc(titulo)}</h2><button type="button" class="link" data-ir="${aba}">Ver completo ›</button></div><ol class="lideres">${itens}</ol></section>`;
}

function detalheEstado(v, estado) {
  const { uf, serie } = estado, k = uf.toLowerCase();
  const un = (ac) => ac.ufs[k];
  const a = doEstado(un(serie === "f" ? v.f : v.e));
  const ac = serie === "f" ? v.f : v.e;
  const outros = ["presidente", "governador", "senador", "dep-federal", "dep-estadual"];
  const nomes = { presidente: "Presidente", governador: "Governador", senador: "Senador", "dep-federal": "Dep. Federal", "dep-estadual": "Dep. Estadual" };
  const d = v.detalhe ?? {};
  return `<button type="button" class="voltar" data-voltar>‹ Voltar ao Brasil</button>
    ${controleSerie(serie)}
    ${cardProgresso(UFS[uf], a, un(ac), un(ac)?.andamento, [un(ac)?.dt, un(ac)?.ht].filter(Boolean).join(" "))}
    ${cardEvolucao(`Evolução da apuração: ${UFS[uf]}`, v.h, serie, k)}
    ${cardComparecimento(`Comparecimento e abstenção: ${UFS[uf]}`, a)}
    ${lideres(`Governador: ${UFS[uf]}`, "governador", d.gov)}${lideres(`Senador: ${UFS[uf]}`, "senador", d.sen)}${lideres(`Presidente em ${UFS[uf]}`, "presidente", d.pres)}
    <section class="card"><h2>Ver eleição em ${esc(UFS[uf])}</h2><div class="atalhos">${outros.map((o) => `<button type="button" data-ir="${o}">${nomes[o]}</button>`).join("")}</div></section>`;
}

export function telaMarcha(v, estado) {
  if (estado.uf !== "BR") return detalheEstado(v, estado);
  const { serie, regiao } = estado;
  const ac = serie === "f" ? v.f : v.e;
  const br = ac.ufs.br;
  const todos = agregar(Object.keys(UFS).map((u) => ac.ufs[u.toLowerCase()]));
  const brasil = br ? { ...todos, ts: br.ts || todos.ts, st: br.st ?? todos.st, pct: br.pct } : todos;
  return `${controleSerie(serie)}
    ${cardProgresso("Brasil", brasil, br, br?.andamento, [br?.dt, br?.ht].filter(Boolean).join(" "))}
    ${cardEvolucao("Evolução da apuração no Brasil", v.h, serie, "br")}
    ${cardComparecimento("Comparecimento e abstenção no Brasil", todos)}
    ${cardRegioes(ac, regiao)}
    ${regiao ? `<p class="filtro-ativo">Mostrando só a região ${REGIOES[regiao].nome}. <button type="button" class="link" data-regiao="">Limpar</button></p>` : ""}
    ${cardTabelaApuracao(ac, regiao)}
    ${cardTabelaComparecimento(ac, regiao)}`;
}
