// Tela "Evolução": o gráfico minuto a minuto do resultado de Presidente em tela própria e em tela cheia (componente Evolucao do design system).
// Reaproveita o gráfico da Apuração (linhasResultado): emenda da votação prorrogada, zoom do eixo e leitura do ponto tocado.
import { linhasResultado, serieResultado, nomeCurto, textoDiferenca, zoomLigado } from "./graficos.js";
import { opcoesDeLugar, valorRegiao } from "./lugares.js";
import { REGIOES } from "./marcha.js";
import { UFS } from "./config.js";
import { pct } from "./formato.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hhmm = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export const PERIODOS = [["tudo", "Tudo"], ["hora", "Última hora"], ["15", "Últimos 15 minutos"]];
export const LINHAS_EVO = [["todas", "Candidatos + não voto"], ["candidatos", "Só candidatos"]];
export const EVO_PADRAO = { periodo: "tudo", linhas: "todas" };

/** Início da janela do período, nunca antes do começo da apuração. */
export function inicioDoPeriodo(periodo, agora, inicioApuracao) {
  const janela = periodo === "hora" ? 60 * 60_000 : periodo === "15" ? 15 * 60_000 : 0;
  return janela ? Math.max(inicioApuracao, agora - janela) : inicioApuracao;
}

/** Os locais do histórico de Presidente (a região soma os estados dela) e o nome do lugar. */
export const ondeDaEvolucao = (uf, regiao) => (REGIOES[regiao] ? { nome: REGIOES[regiao].nome, valor: valorRegiao(regiao) } : uf === "BR" ? { nome: "Brasil", valor: "BR" } : uf === "ZZ" ? { nome: "Exterior", valor: "ZZ" } : { nome: UFS[uf] ?? uf, valor: uf });
export const chaveZoomEvolucao = (locais) => `resultado:${[].concat(locais).join(",")}`;

/** Lula primeiro e Flávio Bolsonaro depois; os demais seguem em ordem de votos. */
export function ordemDasLinhas(ids, cands) {
  const peso = (id) => (/^LULA/i.test(cands?.[id]?.n ?? "") ? 0 : /^FL[ÁA]VIO/i.test(cands?.[id]?.n ?? "") ? 1 : 2);
  return ids.map((id, i) => [id, i]).sort((a, b) => peso(a[0]) - peso(b[0]) || a[1] - b[1]).map((x) => x[0]);
}

const campo = (rot, attr, corpo) => `<label class="el-campo">${rot}<select ${attr} aria-label="${rot}">${corpo}</select></label>`;
const visao = (rot, attr, atual, opcoes) => `<div><span class="el-apoio">${rot}</span><div class="el-visao" role="group" aria-label="${rot}">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${esc(k)}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div></div>`;

/** Os cinco filtros: Onde, Base, Período, Linhas e Eixo. */
export function filtrosEvolucao({ uf, regiao, base, evo, locais }) {
  const onde = ondeDaEvolucao(uf, regiao), chave = chaveZoomEvolucao(locais), amp = zoomLigado(chave);
  return `<div class="el-evolucao__filtros">${campo("Onde", "data-evo-onde", opcoesDeLugar({ selecionado: onde.valor }))}
    ${visao("Base", "data-evo-base", base, [["validos", "Votos válidos"], ["totais", "Eleitores aptos"]])}
    ${visao("Período", "data-evo-periodo", evo.periodo, PERIODOS)}
    ${base === "totais" ? visao("Linhas", "data-evo-linhas", evo.linhas, LINHAS_EVO) : ""}
    <div><span class="el-apoio">Eixo</span><div class="el-visao" role="group" aria-label="Eixo vertical do gráfico"><button type="button" data-zoom-grafico="${esc(chave)}" data-zoom="completo" aria-pressed="${!amp}">Eixo completo</button><button type="button" data-zoom-grafico="${esc(chave)}" data-zoom="ampliar" aria-pressed="${amp}">Ampliar</button></div></div></div>`;
}

/** O gráfico grande, com a largura real do quadro (viewBox = largura na tela: o texto fica sempre em 11px ou mais). */
export function graficoEvolucao({ rp, locais, base, evo, largura, altura, agora, inicioApuracao, cor }) {
  const inicio = inicioDoPeriodo(evo.periodo, agora, inicioApuracao);
  if (rp === undefined || rp === null) return `<p class="muted vazio-grafico">${rp === null ? "O histórico por minuto não está disponível agora." : "Carregando o histórico…"}</p>`;
  return linhasResultado(rp, locais, cor, { largura: Math.max(280, Math.round(largura)), altura, inicio, ate: agora, base, semNaoVoto: evo.linhas === "candidatos", comControleZoom: false });
}

/** A leitura padrão (último ponto) e a tabela dos últimos minutos, a alternativa acessível do gráfico. */
export function leituraETabela({ rp, locais, base, evo, h, agora, inicioApuracao }) {
  const inicio = inicioDoPeriodo(evo.periodo, agora, inicioApuracao);
  const S = serieResultado(rp, locais, { inicio, ate: 0, base });
  if (!S) return { leitura: "", tabela: `<p class="muted">Sem pontos neste período.</p>` };
  const { pts, ids, totais, den, pc, pcNv } = S, nv = totais && evo.linhas !== "candidatos";
  const ordem = ordemDasLinhas(ids, rp.cands), nome = (id) => rp.cands?.[id]?.n || id, curto = (id) => nomeCurto(nome(id));
  const ult = pts[pts.length - 1];
  const apurado = (t) => { // % de seções apuradas no minuto: só existe para o Brasil, estados e exterior (a região não tem série própria)
    if (locais.length !== 1) return null;
    let v = null;
    for (const p of h ?? []) { if (p.t * 1000 <= t) v = p.f?.[locais[0]] ?? v; else break; }
    return v;
  };
  const dif = textoDiferenca(ult.r, nome, den(ult.r));
  const leitura = `<time datetime="${new Date(ult.t).toISOString()}">${hhmm(ult.t)}</time>
    <span>${ordem.map((id) => `${esc(curto(id))} <b>${pct(pc(ult.r, id))}</b>`).join(" · ")}${nv ? ` · Não voto <b>${pct(pcNv(ult.r))}</b>` : ""}</span>${dif ? `<span>${esc(dif)}</span>` : ""}`;
  const linhas = pts.slice(-12).reverse().map((p) => {
    const a = apurado(p.t);
    return `<tr><td>${hhmm(p.t)}</td>${ordem.map((id) => `<td>${pct(pc(p.r, id))}</td>`).join("")}${nv ? `<td>${pct(pcNv(p.r))}</td>` : ""}<td>${a == null ? "—" : pct(a)}</td></tr>`;
  }).join("");
  const tabela = `<table class="el-evolucao__tabela"><caption class="el-vh">Últimos minutos: percentual de cada linha e das seções apuradas</caption><thead><tr><th scope="col">Hora</th>${ordem.map((id) => `<th scope="col">${esc(curto(id))}</th>`).join("")}${nv ? `<th scope="col">Não voto</th>` : ""}<th scope="col">Apurado</th></tr></thead><tbody>${linhas}</tbody></table>`;
  return { leitura, tabela };
}

/** A tela inteira (sem a faixa de turno, que vem da página). */
export function telaEvolucao(v, o) {
  const { uf, regiao, base, evo, largura, altura, agora, inicioApuracao, cor } = o;
  const locais = v.locais, onde = ondeDaEvolucao(uf, regiao);
  const g = graficoEvolucao({ rp: v.rp, locais, base, evo, largura, altura, agora, inicioApuracao, cor });
  const { leitura, tabela } = leituraETabela({ rp: v.rp, locais, base, evo, h: v.h, agora, inicioApuracao });
  const nota = base === "totais" ? "% dos eleitores aptos apurados; a linha tracejada é o não voto (abstenções, brancos e nulos)." : "% dos votos válidos de cada candidato; nesta base o não voto não existe.";
  return `<section class="el-evolucao">${filtrosEvolucao({ uf, regiao, base, evo, locais })}
    <section class="el-evolucao__quadro"><div class="el-evolucao__topo"><h2>Evolução do resultado · ${esc(onde.nome)}</h2><button type="button" class="el-botao" data-cheia-abrir>⤢ Tela cheia</button></div>
      <div class="el-evolucao__grafico" data-evo-grafico data-largura="${Math.round(largura)}">${g}</div>
      <div class="el-evolucao__leitura" data-leitura-padrao>${leitura}</div>
      <p class="muted nota">${nota} Toque no gráfico para ver um minuto; a tabela abaixo traz os últimos minutos.</p></section>
    <section class="el-evolucao__quadro">${tabela}</section></section>`;
}

/** O conteúdo do dialog de tela cheia: topo de 52px com título e Fechar, gráfico no resto e os filtros resumidos no rodapé. */
export function telaCheia(v, o) {
  const { uf, regiao, base, evo, largura, altura, agora, inicioApuracao, cor } = o;
  const locais = v.locais, onde = ondeDaEvolucao(uf, regiao);
  const g = graficoEvolucao({ rp: v.rp, locais, base, evo, largura, altura, agora, inicioApuracao, cor });
  const resumo = [`Onde: ${onde.nome}`, `Base: ${base === "totais" ? "Eleitores aptos" : "Votos válidos"}`, `Período: ${PERIODOS.find(([k]) => k === evo.periodo)[1]}`, base === "totais" ? `Linhas: ${LINHAS_EVO.find(([k]) => k === evo.linhas)[1]}` : "", `Eixo: ${zoomLigado(chaveZoomEvolucao(locais)) ? "ampliado" : "completo"}`].filter(Boolean).join(" · ");
  return `<div class="el-cheia__topo"><h2 id="cheia-titulo">Evolução do resultado · ${esc(onde.nome)}</h2><button type="button" class="el-botao" data-cheia-fechar>Fechar</button></div>
    <div class="el-cheia__corpo"><div class="el-evolucao__grafico" data-evo-grafico data-largura="${Math.round(largura)}">${g}</div></div>
    <div class="el-cheia__rodape"><p class="muted cheia-gira">Para ver o gráfico mais largo, gire o aparelho.</p><p class="muted">${esc(resumo)}</p></div>`;
}
