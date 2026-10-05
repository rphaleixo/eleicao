// Cláusula de desempenho (Emenda Constitucional 97/2017) para as eleições de 2026.
// O partido (ou federação, que conta como um só) precisa cumprir UMA das duas condições:
//   A) ao menos 2,5% dos votos válidos para a Câmara, em todo o país, com pelo menos 1,5% em cada uma de 9 UFs (um terço das 27); ou
//   B) ao menos 13 deputados federais eleitos, distribuídos em pelo menos 9 UFs.
// Quem não cumpre perde o acesso ao Fundo Partidário e ao tempo gratuito de rádio e TV.
import { corPartido } from "./cores.js";
import { distribuirEstado } from "./proporcional.js";
import { semSubJudice } from "./base.js";
import { fmt, pct } from "./formato.js";

export const REGRA = { pctNacional: 2.5, pctPorUf: 1.5, ufsMin: 9, deputados: 13 };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FOLGA_COMPARECIMENTO = 1.25; // as seções que faltam podem ter comparecimento até 25% acima do já apurado

/**
 * Votos válidos que ainda podem entrar em um estado: os eleitores das seções não apuradas, no ritmo (com folga) de votos válidos por
 * eleitor já apurado. Com a totalização final, nada mais entra. É um teto generoso, para só dar "não atingiu" quando não há como reverter.
 */
export function votosRestantes(d, dist) {
  if (dist?.oficial || d?.totalizacaoFinal) return 0;
  const te = d?.eleitorado?.apto || 0, est = d?.eleitorado?.apuradas || 0, falta = Math.max(0, te - est);
  if (!te) return dist?.votosValidos || 0; // sem dados de eleitorado: assume que pode entrar outro tanto
  if (!falta) return 0;
  if (!est || !dist?.votosValidos) return falta; // sem apuração ainda: qualquer coisa pode acontecer
  return Math.min(falta, falta * (dist.votosValidos / est) * FOLGA_COMPARECIMENTO);
}

/**
 * Resultado de cada partido/federação frente à cláusula, a partir dos estados já distribuídos.
 * Status: "atingiu" (cumpre hoje), "nao" (totalização final sem cumprir, ou impossível mesmo recebendo todos os votos que faltam)
 * ou "andamento" (ainda pode cumprir).
 * @param {{uf:string, d:object, dist:{votosValidos:number, oficial:boolean, linhas:{id:string, sigla:string, votos:number, pctVotos:number, vagas:number}[]}}[]} estados
 */
export function calcularClausula(estados, regra = REGRA) {
  const mapa = new Map();
  let validos = 0, oficiais = 0, validosMax = 0;
  const restantes = new Map(); // uf -> votos válidos que ainda podem entrar
  for (const { uf, d, dist } of estados ?? []) {
    validos += dist.votosValidos || 0;
    if (dist.oficial) oficiais++;
    const r = votosRestantes(d, dist); restantes.set(uf, r); validosMax += (dist.votosValidos || 0) + r;
    for (const l of dist.linhas) {
      const p = mapa.get(l.sigla) ?? { sigla: l.sigla, votos: 0, deputados: 0, ufsPct: 0, ufsEleito: 0, porUf: [] };
      p.votos += l.votos; p.deputados += l.vagas;
      if (l.pctVotos >= regra.pctPorUf) p.ufsPct++;
      if (l.vagas >= 1) p.ufsEleito++;
      p.porUf.push({ uf, d, dist, id: l.id, votos: l.votos, vagas: l.vagas });
      mapa.set(l.sigla, p);
    }
  }
  const total = (estados ?? []).length;
  const final = total > 0 && oficiais === total;
  const sj = semSubJudice();
  const partidos = [...mapa.values()].filter((p) => p.votos > 0).map((p) => {
    const pctNac = validos ? (p.votos / validos) * 100 : 0;
    const viaVotos = pctNac >= regra.pctNacional && p.ufsPct >= regra.ufsMin;
    const viaCadeiras = p.deputados >= regra.deputados && p.ufsEleito >= regra.ufsMin;
    const atingiu = viaVotos || viaCadeiras;
    // Máximo possível: o partido recebe todos os votos que ainda faltam em cada estado.
    let maxVotos = 0, maxUfsPct = 0, maxDeputados = 0, maxUfsEleito = 0;
    if (!atingiu && !final) {
      for (const x of p.porUf) {
        const r = restantes.get(x.uf) ?? 0, valido = x.dist.votosValidos || 0;
        maxVotos += x.votos + r;
        if (((x.votos + r) / (valido + r || 1)) * 100 >= regra.pctPorUf) maxUfsPct++;
        const vagasMax = r > 0 && x.d?.partidos ? (distribuirEstado(x.d, "2026", 0, sj, { [x.id]: r }).linhas.find((l) => l.id === x.id)?.vagas ?? x.vagas) : x.vagas;
        maxDeputados += Math.max(vagasMax, x.vagas); if (Math.max(vagasMax, x.vagas) >= 1) maxUfsEleito++;
      }
    }
    const maxPctNac = validosMax ? (maxVotos / validosMax) * 100 : 0;
    const podeVotos = maxPctNac >= regra.pctNacional && maxUfsPct >= regra.ufsMin;
    const podeCadeiras = maxDeputados >= regra.deputados && maxUfsEleito >= regra.ufsMin;
    const inviavel = !atingiu && !final && !podeVotos && !podeCadeiras;
    return { ...p, porUf: undefined, pctNac, viaVotos, viaCadeiras, atingiu, inviavel, maxPctNac, maxDeputados, maxUfsPct, maxUfsEleito,
      status: atingiu ? "atingiu" : final || inviavel ? "nao" : "andamento" };
  }).sort((a, b) => Number(b.atingiu) - Number(a.atingiu) || b.deputados - a.deputados || b.votos - a.votos);
  return { partidos, validos, ufs: total, oficiais, final };
}

export const TEXTO_STATUS = { atingiu: "Atingiu", nao: "Não atingiu", andamento: "Ainda não atingiu" };

const meta = (rotulo, valor, alvo, texto, ok) => `<div class="cl-meta${ok ? " ok" : ""}"><div class="cl-linha"><span>${rotulo}</span><b>${texto}</b></div>
  <div class="cl-barra"><i style="width:${Math.min(100, alvo ? (valor / alvo) * 100 : 0)}%"></i></div></div>`;

/** Um card por partido/federação: resultado, os dois caminhos da regra e o status. */
export function cardClausula(p, final, regra = REGRA) {
  const nomeStatus = p.status === "atingiu" ? (final ? "Atingiu" : "Atingindo na projeção") : TEXTO_STATUS[p.status];
  return `<li class="card-cl ${p.status}" style="--cor:${corPartido(p.sigla)}">
    <div class="cl-topo"><span class="chip" style="--cor:${corPartido(p.sigla)}">${esc(p.sigla)}</span><span class="selo-cl ${p.status}">${p.status === "atingiu" ? "✓ " : ""}${nomeStatus}</span></div>
    ${p.inviavel ? `<p class="cl-motivo">Mesmo recebendo todos os votos que ainda faltam, o máximo possível é ${pct(p.maxPctNac)} dos votos válidos, com ${regra.pctPorUf.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% ou mais em ${p.maxUfsPct} UF${p.maxUfsPct === 1 ? "" : "s"} (precisa de ${regra.ufsMin}), ou ${p.maxDeputados} deputado${p.maxDeputados === 1 ? "" : "s"} em ${p.maxUfsEleito} UF${p.maxUfsEleito === 1 ? "" : "s"} (precisa de ${regra.deputados} em ${regra.ufsMin}): não há como atingir a cláusula.</p>` : ""}
    <p class="cl-res"><b>${fmt(p.deputados)}</b> deputado${p.deputados === 1 ? "" : "s"} · <b>${pct(p.pctNac)}</b> dos votos válidos · ${fmt(p.votos)} votos</p>
    <p class="cl-caminho">Caminho 1: votos${p.viaVotos ? " ✓" : ""}</p>
    ${meta("Votos válidos no país", p.pctNac, regra.pctNacional, `${pct(p.pctNac)} de ${pct(regra.pctNacional)}`, p.pctNac >= regra.pctNacional)}
    ${meta(`UFs com ${pct(regra.pctPorUf)} ou mais`, p.ufsPct, regra.ufsMin, `${p.ufsPct} de ${regra.ufsMin}`, p.ufsPct >= regra.ufsMin)}
    <p class="cl-caminho">Caminho 2: cadeiras${p.viaCadeiras ? " ✓" : ""}</p>
    ${meta("Deputados federais eleitos", p.deputados, regra.deputados, `${p.deputados} de ${regra.deputados}`, p.deputados >= regra.deputados)}
    ${meta("UFs com deputado eleito", p.ufsEleito, regra.ufsMin, `${p.ufsEleito} de ${regra.ufsMin}`, p.ufsEleito >= regra.ufsMin)}</li>`;
}

/** Conteúdo da aba (vai dentro do cartão da Câmara): explicação da regra, resumo e os cards (filtrados por status). */
export function blocoClausula(c, filtro = "todos", seletor = "", status = "") {
  const regra = REGRA;
  const n = (s) => c.partidos.filter((p) => p.status === s).length;
  const lista = c.partidos.filter((p) => filtro === "todos" || (filtro === "atingiu" ? p.status === "atingiu" : filtro === "nao" ? p.status === "nao" : p.status === "andamento"));
  return `<div class="bloco-cl"><h2>Cláusula de desempenho</h2>${status}
    <p class="muted">Para ter acesso ao Fundo Partidário e ao tempo gratuito de rádio e TV, o partido (ou a federação, que conta como um só) precisa cumprir uma das duas condições nestas eleições:</p>
    <ul class="cl-regra"><li><b>Votos:</b> ao menos ${pct(regra.pctNacional)} dos votos válidos para a Câmara no país, com pelo menos ${pct(regra.pctPorUf)} em cada uma de ${regra.ufsMin} UFs (um terço das 27: nove estados ou oito estados e o Distrito Federal).</li>
      <li><b>Cadeiras:</b> ao menos ${regra.deputados} deputados federais eleitos, distribuídos em pelo menos ${regra.ufsMin} UFs.</li></ul>
    <p class="muted nota">A cláusula é medida sobre votos válidos para a Câmara, por regra legal: o seletor de base não altera estes números.</p>
    <p class="cl-resumo"><b>${n("atingiu")}</b> atingiram${c.final ? "" : " na projeção"} · <b>${n("nao")}</b> não atingiram${c.final ? "" : " (sem chance matemática)"} · <b>${n("andamento")}</b> ainda podem atingir · ${c.oficiais} de ${c.ufs} estados com totalização final.</p>
    ${c.final ? "" : `<p class="muted">Enquanto a apuração não termina, é uma projeção com os votos contados até agora: o resultado de cada partido ainda muda. Regra da Emenda Constitucional 97/2017.</p>`}
    <p class="muted nota">Federações (Cidadania-PSDB, PSOL-Rede, PT-PCdoB-PV, PRD-Solidariedade, União-PP) contam como uma única agremiação.</p>
    ${seletor}${lista.length ? `<ul class="cards-estados cards-cl">${lista.map((p) => cardClausula(p, c.final)).join("")}</ul>` : `<p class="muted">Nenhum partido neste grupo.</p>`}</div>`;
}
