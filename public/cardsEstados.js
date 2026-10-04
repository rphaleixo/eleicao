// Um card por estado com o resultado (dois primeiros), a % de apuração e a abstenção.
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { ordenarCandidatos } from "./ranking.js";
import { UFS } from "./config.js";
import { urlFoto } from "./tse.js";
import { seloSit, classeSit, seloEleicao, situacaoEleicao } from "./situacao.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TEXTO = { n: "Não iniciada", p: "Em andamento", f: "Finalizada" };
export const nomeLocal = (uf) => (uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

/** Abstenção (%) das seções já apuradas, a partir do arquivo de acompanhamento do estado. */
export function abstencaoDe(u) {
  if (!u) return null;
  const votantes = u.comparecimento + u.abstencao;
  return votantes > 0 ? (u.abstencao / votantes) * 100 : null;
}

/**
 * @param {string} uf sigla (ou ZZ)
 * @param {object|null|undefined} d resultado normalizado do cargo no estado (undefined = carregando)
 * @param {object|undefined} u andamento do estado (acompanhamento)
 * @param {string} cargo cargo mostrado (define a pasta das fotos): "governador", "senador" ou "presidente"
 * @param {number} total quantos candidatos mostrar (os 2 primeiros em destaque, os demais em linhas compactas)
 */
export function cardEstado(uf, d, u, cargo = "governador", total = 5, extra = "") {
  return cardBase({ chave: `data-uf="${uf}"`, sigla: uf === "ZZ" ? "EX" : uf, nome: nomeLocal(uf), uf, d, u, cargo, total, extra });
}

/** Mesmo card, para uma região (Norte, Nordeste...): clicar filtra a tela pela região. */
export function cardRegiao(id, nome, sigla, d, u, cargo = "presidente", total = 3) {
  return cardBase({ chave: `data-regiao="${id}"`, sigla, nome, uf: "BR", d, u, cargo, total });
}

/** Card de um município: o mesmo formato do de estado; "Ver apuração completa" abre o município na aba do cargo. */
export function cardMunicipio(cod, nome, uf, d, cargo) {
  return cardBase({ chave: `data-ver-mun="${cod}"`, sigla: "", nome, uf, d, u: undefined, cargo, total: 5 });
}

function cardBase({ chave, sigla, nome, uf, d, u, cargo, total, extra = "" }) {
  // Os números do card vêm do mesmo arquivo dos votos mostrados (o do cargo); o acompanhamento só entra se ele faltar.
  const doCargo = d && d.secoesTotal > 0;
  const apurado = doCargo ? d.pctSecoes : u?.pct ?? 0;
  const abst = doCargo ? abstencaoDe({ comparecimento: d.comparecimento, abstencao: d.abstencao }) : abstencaoDe(u);
  const eleitores = doCargo && d.eleitorado?.apto ? d.eleitorado.apto : u?.eleitores;
  const todos = d ? ordenarCandidatos(d.candidatos) : [];
  const top = todos.slice(0, total);
  const and = u?.andamento ?? d?.andamento ?? "n";
  const sit = situacaoEleicao(d);
  const vagas = cargo === "senador" ? d?.vagas || 2 : 1;
  const destaque = (c) => {
    const cor = corPartido(c.partido);
    return `<li class="cu-dest${classeSit(c)}" style="--cor:${cor}"><img class="foto cu-foto" loading="lazy" alt="" src="${urlFoto(cargo, uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <span class="cu-corpo"><span class="cu-linha1"><span class="cu-quem"><b title="${esc(c.nome)}">${esc(c.nome)}</b><i class="cu-num-cand">${esc(c.numero)}</i></span><span class="chip" style="--cor:${cor}">${esc(c.partido)}</span></span>
        <span class="cu-trilho"><i style="width:${Math.min(100, c.pct)}%"></i></span>
        <span class="cu-linha2"><strong>${pct(c.pct)}</strong>${seloSit(c, { curto: true })}<small>${fmt(c.votos)} votos</small></span></span></li>`;
  };
  const menor = (c, i) => `<li class="cu-menor${classeSit(c)}"><span class="pos">${i + 1}</span><span class="cu-quem"><b title="${esc(c.nome)}">${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span></span>${seloSit(c, { curto: true })}<strong>${pct(c.pct)}</strong><small>${fmt(c.votos)}</small></li>`;
  const corpo = d === undefined ? `<p class="muted cu-aviso">Carregando…</p>`
    : !top.length ? `<p class="muted cu-aviso">${d ? "Sem candidatos" : "Resultado indisponível"}</p>`
    : `<ul class="cu-cands">${top.slice(0, 2).map(destaque).join("")}</ul>
       ${top.length > 2 ? `<ol class="cu-resto" start="3">${cargo === "senador" ? `<li class="cu-corte" role="presentation">${vagas} vagas</li>` : ""}${top.slice(2).map((c, i) => menor(c, i + 2)).join("")}</ol>` : ""}`;
  const metricas = [abst == null ? "" : `Abstenção ${pct(abst)}`, eleitores ? `${fmt(eleitores)} eleitores` : ""].filter(Boolean).join(" · ");
  return `<li><button type="button" class="card-uf${sit ? ` eleicao-${sit}` : ""}" ${chave} aria-label="${esc(nome)}: ver apuração completa">
    <span class="cu-topo"><span class="sigla">${esc(sigla)}</span><span class="cu-nome-uf"><b>${esc(nome)}</b>${seloEleicao(d)}</span>
      <span class="cu-pilula ${and}" title="${TEXTO[and] ?? TEXTO.n}"><i class="ponto ${and === "f" ? "f" : and === "p" ? "p" : "n"}"></i>${pct(apurado)}</span></span>
    ${corpo}
    ${extra}
    <span class="cu-rodape"><small>${metricas}</small><span class="cu-ver">Ver apuração completa <i aria-hidden="true">→</i></span></span></button></li>`;
}

export const gradeCards = (cards) => `<ul class="cards-estados">${cards.join("")}</ul>`;

/** Linha "Eleito em 2022" do card do Senado: o senador do estado que não está em disputa hoje. */
export function linha2022(senador) {
  if (!senador) return "";
  const suplente = senador.participacao && senador.participacao !== "Titular" ? ` <small class="muted">(${esc(senador.participacao)}${senador.titular ? ` de ${esc(senador.titular)}` : ""})</small>` : "";
  return `<span class="cu-2022"><small>Eleito em 2022</small><span class="cu-2022-corpo"><b>${esc(senador.nome)}</b><span class="chip" style="--cor:${corPartido(senador.partido)}">${esc(senador.partido)}</span>${suplente}</span></span>`;
}
