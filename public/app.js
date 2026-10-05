import { blocoDisputas } from "./segundoTurno.js";
import { blocoComparar, blocoCompararGoverno } from "./comparar.js";
import { telaCompleta as telaCompletaPura } from "./encerramento.js";
import { blocoPartido, desempenhoPartido, listaDePartidos } from "./partidos.js";
import { textoAptos, telaMarcha, regiaoDe, locaisResultado, navegacaoRegional, heroApuracao, escopoDoPainel, cardCargo, cardBancada, situacaoGeral, agregar, REGIOES } from "./marcha.js";
import { agregarResultados } from "./agregado.js";
import { fmt, pct } from "./formato.js";
import { rankingMajoritario } from "./ranking.js";
import { cardEstado, cardRegiao, gradeCards, linha2022, cardMunicipio } from "./cardsEstados.js";
import { montarBancada, telaBancada, situacaoUf } from "./bancada.js";
import { statusProjecao } from "./status.js";
import { barraFiltros, filtrarUfs, filtrosVazios, statusEleicao } from "./filtros.js";
import { aplicarBaseNaView, baseTotal, candidatosReais, getBase, naoVoto, semSubJudice, setBase, setSemSubJudice } from "./base.js";
import { blocoClausula, calcularClausula } from "./clausula.js";
import { barraBusca, buscaVazia, filtrando as buscando, passaBusca } from "./buscaCandidatos.js";
import { blocoTop10, cardsMaisVotados } from "./deputadosVotados.js";
import { seletorAgrupCamara, plenarioCamara, porPartidoCamara, cardsEstadosCamara, tabelaEstadosCamara, lideresCamara, MAIORIA_CAMARA } from "./camara.js";
import { mapaBrasil, legendaMapa, contarLideres, COR_SEGUNDO_TURNO, mapaMunicipal } from "./mapa.js";
import { lerMalha, carregarMunicipios as carregarVotosMunicipais, lerMun, progresso } from "./municipios.js";
import { ordenarCandidatos } from "./ranking.js";
import { faixaDefinicao, legendaSituacao, TEXTO_SIT, situacaoEleicao, seloSit, seloProjetado, rotuloEleito } from "./situacao.js";
import { cartoesVotacao } from "./votacao.js";
import { lerRota, montarRota } from "./rota.js";
import { cargosBarra, barraEstado, folhaEstados, filtrarEstados, vizinho } from "./seletor.js";
import { abrirFicha, iniciarFicha } from "./candidato.js";
import { CONFIG, CARGOS, ABAS, UFS, UFS_GOV, TURNO2, SEGUNDO_TURNO_ABERTO, INICIO_APURACAO } from "./config.js";
import { UFS_GOVERNO_SEGUNDO_TURNO } from "./segundo-turno.js";
import {
  urlsResultado, urlMunicipios, urlAcompanhamento, urlHistorico, urlEventos, urlResultadosGovernador, urlResultadosPresidente, urlFoto,
  buscarJson, buscarPrimeiro, normalizar, lerMunicipios, lerAcompanhamento,
} from "./tse.js";
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { corPartido, ajustarContrasteChips } from "./cores.js";
import { linhaEvolucao, linhasResultado, temTotais } from "./graficos.js";
import { atualizarFaixa } from "./eventos.js";
import { iniciarGraficos, reaplicarGraficos } from "./graficoInterativo.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (d) => d.toLocaleTimeString("pt-BR");
const nomeUF = (uf) => (uf === "BR" ? "Brasil" : uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

/** Base escolhida (válidos ou totais), lembrada neste navegador. */
function baseSalva() { try { return localStorage.getItem("base") === "totais" ? "totais" : "validos"; } catch { return "validos"; } }
const estado = { aba: "andamento", uf: "BR", cargo: "resumo", mun: "", municipios: {}, mostrar: 50, pag: { eleitos: 0, cand: 0, deps: 0 }, view: null, serie: "f", regiao: "", ordem: "az", painel: "geral", visaoSenado: "estados", agrupBancada: "partido", agrupCamara: "partido", visaoEstados: "cards", mapaUf: "", mapaCargo: "governador", munSel: "", filtros: filtrosVazios(), visaoGov: "estados", navAberta: false, busca: buscaVazia(), clausula: "todos", base: baseSalva(), semSJ: false, cmp: { a: "", b: "", ordem: "vantagemA" }, cmpGov: { modo: "top2", pa: "", pb: "", ordem: "margem" }, partido: "", partidoVisao: "maj" };
const memo = { historico: { t: 0, dados: [] }, ultima: null, proxima: 0, erro: "" };

// ---------- navegação (guardada na URL: #/estados/SP/governador/71072) ----------
const guardarUf = (uf) => { try { localStorage.setItem("uf-estados", uf); } catch { /* sem armazenamento */ } };
const ufGuardada = () => { try { const u = localStorage.getItem("uf-estados"); return UFS[u] ? u : ""; } catch { return ""; } };
estado.ufPadrao = ufGuardada() || "SP";
const cargoAtivo = () => (estado.aba === "estados" ? estado.cargo : estado.aba);

function lerHash() {
  Object.assign(estado, lerRota(location.hash, { ufs: UFS, ufPadrao: estado.ufPadrao }));
  if (TURNO2) { // no 2º turno só há Presidente e governo dos estados com disputa: o resto volta ao início
    if (!ABAS.some((a) => a.id === estado.aba)) Object.assign(estado, { aba: "andamento", uf: "BR", cargo: "resumo", mun: "" });
    if (estado.aba === "estados" && !cargosBarra(estado.uf).some(([id]) => id === estado.cargo)) Object.assign(estado, { cargo: "resumo", mun: "" });
    if (estado.mapaCargo === "senador" || (estado.mapaCargo === "governador" && !UFS_GOV.includes(estado.uf))) estado.mapaCargo = "presidente";
    history.replaceState(null, "", montarRota(estado)); // endereço antigo de Senado/deputados vira o início, sem ficar na barra
  }
  if (estado.uf !== "BR" && estado.uf !== "ZZ") estado.regiao = regiaoDe(estado.uf); // a região acompanha o estado da URL
  if (estado.aba === "estados" && location.hash.split("/")[2]) guardarUf(estado.uf); // só guarda o que a pessoa escolheu, não o padrão
}
const gravarHash = () => history.replaceState(null, "", montarRota(estado));
const permiteMun = () => (estado.aba === "presidente" || (estado.aba === "estados" && ["governador", "senador", "presidente"].includes(estado.cargo))) && estado.uf !== "BR" && estado.uf !== "ZZ";

function montarControles() {
  $("abas").innerHTML = ABAS.map((a) => `<button data-aba="${a.id}" aria-current="${a.id === estado.aba}">${a.nome}</button>`).join("");
  document.querySelector(".filtros").hidden = !permiteMun(); // estado e região são escolhidos na navegação do topo; sobra só o município
  $("lbl-mun").hidden = !permiteMun();
  const lista = estado.municipios[estado.uf] || [];
  $("mun").innerHTML = `<option value="">Todo o estado</option>` + lista.map((m) => `<option value="${m.cod}">${esc(m.nome)}</option>`).join("");
  $("mun").value = estado.mun;
}

const chaveRota = () => `${estado.aba}/${estado.uf}/${estado.cargo}/${estado.mun}${estado.aba === "partidos" ? "/" + estado.partido : ""}${estado.aba === "presidente" ? "/" + estado.regiao : ""}${estado.aba === "senadores" ? "/" + estado.visaoSenado : ""}${estado.aba === "governadores" ? "/" + estado.visaoGov : ""}${estado.aba === "estados" && estado.cargo === "mapa" ? "/" + estado.mapaCargo : ""}`; // na aba Presidente a região também muda a carga
const cacheViews = new Map(); // última resposta de cada tela: aparece na hora, e é atualizada em seguida

function mostrarCarregando() {
  estado.view = null;
  renderNavegacao(null);
  $("conteudo").innerHTML = `<section class="card carregando"><div class="barra-carregando"><i></i></div><p class="muted">Carregando${estado.aba === "estados" ? ` ${esc(UFS[estado.uf])}` : ""}…</p></section>`;
}

function navegar(mudanca) {
  Object.assign(estado, mudanca);
  if (estado.aba === "estados" && (estado.uf === "BR" || estado.uf === "ZZ")) estado.uf = estado.ufPadrao;
  if (estado.aba === "camara") estado.uf = "BR";
  if (estado.uf === "ZZ" && estado.aba !== "presidente" && estado.aba !== "andamento") estado.uf = "BR";
  if (mudanca.aba || mudanca.uf || mudanca.cargo) estado.mun = mudanca.mun ?? "";
  if (estado.aba === "estados") { guardarUf(estado.uf); estado.ufPadrao = estado.uf; }
  estado.mostrar = 50; estado.pag = { eleitos: 0, cand: 0, deps: 0 };
  if (mudanca.uf || mudanca.cargo || mudanca.aba) estado.busca = buscaVazia();
  if (mudanca.uf || mudanca.cargo || mudanca.aba) estado.munSel = "";
  gravarHash(); montarControles();
  const guardada = cacheViews.get(chaveRota());
  if (guardada) { estado.view = guardada; render(); } // já vista: mostra na hora e atualiza em seguida
  else if (estado.view?.tipo === "presidente" && estado.aba === "presidente") render(); // tudo o que o painel precisa já está carregado
  else if (estado.aba === "andamento" && estado.view?.tipo === "andamento") { estado.view = { ...estado.view, detalhe: {} }; render(); } // o painel já tem os dados: mostra na hora, os líderes chegam depois
  else mostrarCarregando();
  atualizar();
}

// ---------- dados ----------
async function obter(cargo, uf, mun, turno = CONFIG.turno) {
  const { json } = await buscarPrimeiro(urlsResultado(cargo, uf, mun, turno));
  return normalizar(json);
}
const obterAcompanhamento = async (cargo, turno = CONFIG.turno) => lerAcompanhamento(await buscarJson(urlAcompanhamento(cargo, turno)));

const malhas = new Map();
async function obterMalha(uf) {
  if (!malhas.has(uf)) {
    const r = await fetch(`/api/malha/${uf}`);
    if (!r.ok) throw new Error(`Não foi possível carregar o desenho dos municípios (HTTP ${r.status}).`);
    malhas.set(uf, lerMalha(await r.text()));
  }
  return malhas.get(uf);
}

const memoMandatos = { t: 0, dados: null };
async function obterMandatos() {
  if (memoMandatos.dados && Date.now() - memoMandatos.t < 3600_000) return memoMandatos.dados;
  try { memoMandatos.dados = await buscarJson("/api/senadores-mandato"); memoMandatos.t = Date.now(); } catch { memoMandatos.t = Date.now() - 3000_000; } // nova tentativa em ~10 min
  return memoMandatos.dados ?? { senadores: null }; // null = ainda não pedido; { senadores: null } = falhou
}

const memoRP = new Map();
async function obterResultadosPresidente(locais, cargo = "presidente") {
  const chave = `${cargo}:${locais.join(",")}`;
  const m = memoRP.get(chave);
  if (m && Date.now() - m.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return m.dados;
  let dados = m?.dados ?? null;
  try { dados = await buscarJson(cargo === "governador" ? urlResultadosGovernador(locais) : urlResultadosPresidente(locais)); } catch { /* segue com o que já tinha */ }
  memoRP.set(chave, { t: Date.now(), dados });
  return dados;
}
let memoEventos = { t: 0, dados: null };
async function obterEventos() {
  if (Date.now() - memoEventos.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return memoEventos.dados;
  try { memoEventos = { t: Date.now(), dados: await buscarJson(urlEventos()) }; } catch { memoEventos.t = Date.now(); }
  return memoEventos.dados;
}
async function obterHistorico() {
  if (Date.now() - memo.historico.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return memo.historico.dados;
  try { memo.historico = { t: Date.now(), dados: (await buscarJson(urlHistorico())).pontos ?? [] }; } catch { memo.historico.t = Date.now(); }
  return memo.historico.dados;
}

// Dados pesados (27 estados) são buscados em segundo plano: a tela mostra o principal
// primeiro e se completa quando eles chegam. Devolve o último valor conhecido (ou null).
const segundoPlano = {};
function emSegundoPlano(chave, ttlMs, produtor) {
  const e = (segundoPlano[chave] ??= { t: 0, dados: null, emVoo: false });
  if (!e.emVoo && Date.now() - e.t >= ttlMs) {
    e.emVoo = true;
    produtor().then((d) => { e.dados = d; e.t = Date.now(); }).catch(() => { e.t = Date.now(); })
      .finally(() => { e.emVoo = false; atualizar(); });
  }
  return e.dados;
}

async function panorama(cargo, turno = CONFIG.turno) {
  const ufs = [...(cargo === "governador" ? (turno === 2 ? UFS_GOVERNO_SEGUNDO_TURNO : Object.keys(UFS)) : Object.keys(UFS)), ...(cargo === "presidente" ? ["ZZ"] : [])]; // no 2º turno, só os estados com disputa
  const rs = await Promise.allSettled(ufs.map((uf) => obter(cargo, uf, undefined, turno)));
  return ufs.map((uf, i) => ({ uf, d: rs[i].status === "fulfilled" ? rs[i].value : null }));
}

async function estadosDepEstadual(turno = CONFIG.turno) {
  const lista = (await panorama("dep-estadual", turno)).filter((x) => x.d);
  return lista.map(({ uf, d }) => ({ uf, d, dist: distribuirEstado(d) }));
}

async function estadosDepFederal(turno = CONFIG.turno) {
  const lista = (await panorama("dep-federal", turno)).filter((x) => x.d);
  return lista.map(({ uf, d }) => ({ uf, d, dist: distribuirEstado(d) }));
}

async function detalhesEstado(uf, comDeputados = false) {
  const talvez = (cargo) => obter(cargo, uf).catch(() => null);
  const bancada = async (cargo) => { const d = await talvez(cargo); return d ? { d, dist: distribuirEstado(d) } : null; };
  // No 2º turno só existem Presidente e o governo dos estados com disputa: não buscamos o que não foi publicado (o TSE bloqueia quem gera muitos 404).
  const [pres, gov, sen, depf, depe] = await Promise.all([talvez("presidente"), uf === "ZZ" || !UFS_GOV.includes(uf) ? null : talvez("governador"), uf === "ZZ" || TURNO2 ? null : talvez("senador"),
    comDeputados && !TURNO2 ? bancada("dep-federal") : null, comDeputados && !TURNO2 ? bancada("dep-estadual") : null]);
  return { pres, gov, sen, depf, depe };
}

async function carregarView(rota) {
  const { aba, uf, mun } = rota;
  const hist = obterHistorico();
  if (aba === "andamento") {
    const [f, e, h, eventos] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador"), hist, obterEventos()]);
    // Resumo do estado aberto na lista: busca em segundo plano, sem travar o painel principal.
    const detalhe = uf === "BR" ? {} : emSegundoPlano("det-" + uf, 9000, () => detalhesEstado(uf)) ?? {};
    return { tipo: "andamento", f, e, h, detalhe, eventos };
  }
  if (aba === "estados") {
    const { cargo } = rota;
    const [f, e] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador")]);
    const base = { tipo: "estados", uf, cargo, f, e };
    if (cargo === "mapa") {
      // Desenho dos municípios + votação de cada um (um arquivo por município, carregados aos poucos, sem travar a tela).
      const municipios = estado.municipios[uf] ?? [], cargoMapa = rota.mapaCargo, chave = chaveRota();
      carregarVotosMunicipais({ cargo: cargoMapa, uf, municipios, buscar: (c, u, cod) => obter(c, u, cod), aoProgresso: () => { if (chave === chaveRota()) render(); } });
      return { ...base, malha: await obterMalha(uf).catch((err) => ({ erro: err.message })), cargoMapa };
    }
    if (cargo === "resumo") return { ...base, detalhe: emSegundoPlano("detx-" + uf, 9000, () => detalhesEstado(uf, true)) ?? {} };
    if (CARGOS[cargo].proporcional) { const d = await obter(cargo, uf); return { ...base, d, dist: distribuirEstado(d) }; }
    const [d, rp] = await Promise.all([obter(cargo, uf, mun), cargo === "presidente" ? obterResultadosPresidente(locaisResultado(uf, "")) : cargo === "governador" && !mun ? obterResultadosPresidente([uf.toLowerCase()], "governador") : null]);
    return { ...base, d, rp };
  }
  if (aba === "governadores" || aba === "senadores") {
    const cargo = aba === "governadores" ? "governador" : "senador";
    const lista = emSegundoPlano("pan-" + cargo, CONFIG.atualizarACadaSegundos * 900, () => panorama(cargo));
    const [e, mandatos] = await Promise.all([obterAcompanhamento("governador"), cargo === "senador" ? obterMandatos() : null]);
    return { tipo: "cargo-por-estado", cargo, e, lista, mandatos, visao: rota.visaoSenado };
  }
  if (aba === "partidos") { // resultado geral: sempre o 1º turno completo; o 2º turno, quando existe, só atualiza as disputas que foram a ele
    const ttl = CONFIG.atualizarNacionalACadaSegundos * 1000, pan = CONFIG.atualizarACadaSegundos * 900;
    const seg = SEGUNDO_TURNO_ABERTO || TURNO2; // antes de 25/10 os arquivos do 2º turno não existem
    const [pres, ac1F, ac1E, ac2F, ac2E] = await Promise.all([obter("presidente", "BR", undefined, 1).catch(() => null), obterAcompanhamento("presidente", 1).catch(() => null), obterAcompanhamento("governador", 1).catch(() => null),
      seg ? obterAcompanhamento("presidente", 2).catch(() => null) : null, seg ? obterAcompanhamento("governador", 2).catch(() => null) : null]);
    const final = acFinal(ac1F) && acFinal(ac1E) && (!seg || (acFinal(ac2F) && acFinal(ac2E))); // só para de buscar quando o 1º e, se já começou, o 2º turno terminaram
    return { tipo: "partidos", pres, final, gov: emSegundoPlano("pan-governador-t1", pan, () => panorama("governador", 1)), sen: emSegundoPlano("pan-senador-t1", pan, () => panorama("senador", 1)),
      depf: emSegundoPlano("nacional-t1", ttl, () => estadosDepFederal(1)), depe: emSegundoPlano("nacional-estadual-t1", ttl, () => estadosDepEstadual(1)),
      pres2: seg ? await obter("presidente", "BR", undefined, 2).catch(() => null) : null, gov2: seg ? emSegundoPlano("pan-governador-t2", pan, () => panorama("governador", 2)) : null };
  }
  const acomp = obterAcompanhamento(aba === "camara" ? "dep-federal" : aba);
  if (aba === "presidente") {
    // Os 28 locais (27 estados e exterior) vêm em segundo plano: alimentam as regiões e a lista de estados.
    const lista = emSegundoPlano("pan-presidente", CONFIG.atualizarACadaSegundos * 900, () => panorama("presidente"));
    const [d, du, ac, rp, h] = await Promise.all([obter("presidente", "BR"), uf === "BR" ? null : obter("presidente", uf, mun), acomp, obterResultadosPresidente(locaisResultado(uf, rota.regiao)), hist]);
    return { tipo: "presidente", d, du, duChave: `${uf}/${mun}`, lista, ac, rp, rpLocais: locaisResultado(uf, rota.regiao).join(","), h };
  }
  // Câmara dos Deputados: os 513 deputados somados dos 27 estados.
  const estados = emSegundoPlano("nacional", CONFIG.atualizarNacionalACadaSegundos * 1000, estadosDepFederal);
  const [ac, h] = await Promise.all([acomp, hist]);
  return { tipo: "nacional-prop", nacional: estados ? consolidarNacional(estados) : null, estados, ac, h };
}

// ---------- peças de tela ----------
const TEXTO_ANDAMENTO = { n: "Apuração não iniciada", p: "Apuração em andamento", f: "Totalização finalizada" };
const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_ANDAMENTO[a] ?? ""}</span>`;
const chaveUF = (uf) => (uf === "BR" ? "br" : uf.toLowerCase());

function aviso(texto) { return texto ? `<p class="aviso">${esc(texto)}</p>` : ""; }

function avisosApuracao(d) {
  return [
    !d.divulgaVotos && "O TSE ainda não liberou a divulgação da votação deste cargo. Os votos aparecem zerados por regra do TSE.",
    d.semEleito && "O TSE não atribuiu eleitos neste cargo." + (d.motivosSemEleito.length ? " Motivo: " + d.motivosSemEleito.join("; ") : ""),
  ].filter(Boolean).map(aviso).join("");
}

function blocoProgresso(titulo, d, ac) {
  const p = ac ?? {};
  const pc = d ? d.pctSecoes : p.pct ?? 0;
  const apur = d ? d.secoesApuradas : p.st ?? 0, total = d ? d.secoesTotal : p.ts ?? 0;
  const and = d ? d.andamento : p.andamento;
  const quando = d?.atualizadoEm || [p.dt, p.ht].filter(Boolean).join(" ");
  return `<section class="card">
    <div class="prog-topo"><div><h2>${esc(titulo)}</h2>${selo(and)}</div><div class="prog-pct">${pct(pc)} <small>das seções</small></div></div>
    <div class="barra-prog"><i style="width:${Math.min(100, pc)}%"></i></div>
    <p class="muted">${total ? `${fmt(apur)} de ${fmt(total)} seções apuradas` : ""}${quando ? ` · totalização do TSE: ${esc(quando)}` : ""}</p>
    ${d ? faixaDefinicao(d) + avisosApuracao(d) : ""}</section>`;
}

function blocoResultadoEvolucao(rp, local, final = false, d = null) {
  const largura = Math.max(300, Math.min(640, document.documentElement.clientWidth - 64));
  const grafico = rp === undefined ? `<p class="muted vazio-grafico">Carregando o histórico…</p>`
    : linhasResultado(rp, local, corPartido, { largura, inicio: INICIO_APURACAO, ate: final ? 0 : Date.now(), base: getBase(), excluir: semSubJudice() && d ? d.candidatos.filter((c) => c.subJudice).map((c) => c.id) : [] });
  const primeiro = rp?.pontos?.[0]?.t * 1000;
  const parcial = primeiro && primeiro > INICIO_APURACAO + 5 * 60000 ? ` O registro deste gráfico começou às ${new Date(primeiro).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}, quando o site passou a guardá-lo.` : "";
  return `<section class="card"><h2>Evolução do resultado</h2>${grafico}
    <p class="muted">% ${getBase() === "totais" && temTotais(rp, local, INICIO_APURACAO) ? "dos eleitores aptos apurados (a linha cinza é o “não voto”: brancos, nulos e abstenções)" : "dos votos válidos"} de cada candidato, minuto a minuto. A etiqueta mostra a diferença entre os dois primeiros (em pontos percentuais e em votos). Toque no gráfico para ver um momento.${parcial}</p></section>`;
}

function blocoEvolucao(titulo, hist, serie, chave) {
  return `<section class="card"><h2>${esc(titulo)}</h2>${linhaEvolucao(hist, (p) => p[serie]?.[chave], { rotulo: titulo, inicio: INICIO_APURACAO, ate: Date.now() })}
    <p class="muted">% de seções apuradas ao longo do tempo (registro a cada minuto).</p></section>`;
}

const fotoDe = (aba, uf, c) => `<img class="foto" loading="lazy" alt="" src="${urlFoto(aba, uf, c.id)}" style="--cor:${corPartido(c.partido)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">`;

function itemCandidato({ pos, nome, sub, partido, votos, pctVotos, max, badge = "", foto = "", eleito = false, sq = "" }) {
  const cor = corPartido(partido);
  const ficha = sq ? ` data-sq="${esc(sq)}" role="button" tabindex="0" title="Ver ficha do candidato"` : "";
  return `<div class="rank-item ${foto === null ? "sf" : ""} ${eleito ? "eleito" : ""}" style="--cor:${cor}"${ficha}>
    <span class="pos">${pos}</span>${foto === null ? "" : foto}
    <div><div class="cand-nome">${esc(nome)}${badge}</div><div class="cand-sub"><span class="chip">${esc(partido)}</span>${esc(sub)}</div></div>
    <div class="cand-votos"><strong>${fmt(votos)}</strong><span class="muted">${pctVotos == null ? "" : pct(pctVotos)}</span></div>
    <div class="cand-barra"><i style="width:${max ? (votos / max) * 100 : 0}%"></i></div></div>`;
}

function blocoCadeiras({ titulo, subtitulo, partidos, totalVagas, rotuloTotal, progresso = "" }) {
  const ocupadas = partidos.reduce((s, p) => s + p.vagas, 0);
  const quadrados = partidos.flatMap((p) => Array.from({ length: p.vagas }, () => `<i style="--cor:${corPartido(p.sigla)}" title="${esc(p.sigla)}"></i>`)).join("");
  const vazias = Array.from({ length: Math.max(0, totalVagas - ocupadas) }, () => `<i class="vazia"></i>`).join("");
  const legenda = partidos.filter((p) => p.vagas > 0)
    .map((p) => `<span><i class="pt" style="--cor:${corPartido(p.sigla)}"></i>${esc(p.sigla)}<b>${p.vagas}</b></span>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span><strong>${ocupadas}</strong> <span class="muted">de ${totalVagas} ${esc(rotuloTotal)}</span></span></div>
    ${progresso}<p class="muted">${esc(subtitulo)}</p>
    <div class="waffle" role="img" aria-label="${esc(titulo)}">${quadrados}${vazias}</div>
    <div class="legenda">${legenda || `<span class="muted">Nenhuma cadeira distribuída ainda.</span>`}</div></section>`;
}

const COMO = `<details class="como"><summary>Como as cadeiras são calculadas</summary><ol>
  <li>Quociente eleitoral (QE): votos válidos (candidatos e legendas, sem brancos e nulos) ÷ número de vagas. Fração até 0,5 é desprezada; acima disso, arredonda para cima.</li>
  <li>Quociente partidário (QP): votos do partido ou federação ÷ QE, sem as casas decimais. É o número de cadeiras da primeira etapa.</li>
  <li>Ocupam essas cadeiras os candidatos mais votados da legenda, desde que tenham pelo menos 10% do QE.</li>
  <li>Sobras, 1ª rodada: a cadeira vai, uma a uma, para a maior média (votos ÷ cadeiras já obtidas + 1), só entre partidos e federações com pelo menos 80% do QE, e candidatos com pelo menos 20% do QE.</li>
  <li>Sobras, última rodada: se ainda restarem vagas, todos os partidos e federações que disputaram concorrem pela maior média, sem as exigências de 80% e 20%. Essa é a mudança de 2022 para 2026.</li>
  <li>Se nenhum partido ou federação alcançar o QE, as vagas ficam com os candidatos mais votados (art. 111 do Código Eleitoral).</li>
  <li>Candidatos com voto anulado, anulado sub judice ou convertido em legenda não ocupam vaga.</li></ol>
  <p class="muted">Enquanto a apuração não termina, isto é uma projeção com os votos contados até agora. Na totalização final o site passa a mostrar os eleitos oficiais do TSE.</p></details>`;

function tabelaPartidos(dist, d) {
  const final = d.totalizacaoFinal;
  const linhas = dist.linhas.filter((l) => l.votos > 0 || l.vagas > 0).map((l) => `<tr>
    <td><span class="chip" style="--cor:${corPartido(l.sigla)}">${esc(l.sigla)}</span></td><td>${fmt(l.votos)}</td><td>${pct(getBase() === "totais" && baseTotal(d) ? (l.votos / baseTotal(d)) * 100 : l.pctVotos)}</td>
    <td><strong>${l.vagas}</strong></td><td>${l.qp}</td><td>${l.porQuociente}</td><td>${l.porSobras}</td>${final ? `<td>${l.oficial ?? ""}</td>` : ""}</tr>`).join("");
  // Votos totais: brancos, nulos, abstenções e a soma dos três ("não voto") entram na tabela, sem cadeiras.
  const nv = getBase() === "totais" ? naoVoto(d) : null, colunas = final ? 5 : 4;
  const linhaNv = (nome, desc, votos, p, forte = false) => `<tr class="nv${forte ? " nv-soma" : ""}"><td><span class="chip chip-nv">${nome}</span><small class="muted"> ${desc}</small></td><td>${fmt(votos)}</td><td>${pct(p)}</td><td colspan="${colunas}" class="muted" style="text-align:left">sem cadeiras</td></tr>`;
  const linhasNaoVoto = nv ? `<tr class="nv-sep"><td colspan="${3 + colunas}">Não voto</td></tr>${linhaNv("Brancos", "votos em branco", nv.brancos, nv.pctBrancos)}${linhaNv("Nulos", "votos nulos", nv.nulos, nv.pctNulos)}${linhaNv("Abstenções", "eleitores que faltaram", nv.abstencao, nv.pctAbstencao)}${linhaNv("Não voto", "soma dos três", nv.soma, nv.pctSoma, true)}` : "";
  return `<div class="tab-scroll"><table><tr><th>Partido / federação</th><th>Votos</th><th>% ${getBase() === "totais" ? "dos aptos" : "dos votos"}</th><th>Cadeiras</th><th>QP</th><th>Por quociente</th><th>Por sobras</th>${final ? "<th>Oficial TSE</th>" : ""}</tr>${linhas}${linhasNaoVoto}</table></div>`;
}

const POR_PAGINA = 15;

/** Candidatos eleitos (oficiais ou projetados), do mais votado ao menos votado. */
function dadosEleitos(d, dist) {
  const oficiais = d.candidatos.filter((c) => c.eleito);
  const usaOficial = !semSubJudice() && d.totalizacaoFinal && oficiais.length > 0; // o oficial do TSE inclui os sub judice
  const base = usaOficial
    ? oficiais.map((c) => ({ id: c.id, partido: c.partido, nome: c.nome, votos: c.votos, sub: c.situacao }))
    : [...dist.eleitos].sort((a, b) => b.votos - a.votos).map((e) => ({ id: e.id, partido: e.partido, nome: e.nome, votos: e.votos, sub: e.via === "quociente" ? "quociente" : e.via === "art. 111" ? "art. 111" : `sobra (${e.rodada ?? 1}ª rodada)` }));
  return { usaOficial, base };
}

/** Box dos eleitos: mesma estrutura da lista de todos os candidatos. */
function boxEleitos(d, dist) {
  const { usaOficial, base: completa } = dadosEleitos(d, dist);
  // Os eleitos vêm com a sigla da federação; a busca olha o candidato de verdade (partido, federação, número).
  const busca = estado.busca, porId = new Map(candidatosReais(d).map((c) => [c.id, c]));
  const itens = completa.map((b, i) => ({ ...b, pos: i + 1, selo: usaOficial ? seloSit({ sit: "eleito" }, { curto: true }) : seloProjetado({ curto: true }) }))
    .filter((b) => !buscando(busca) || (porId.has(b.id) && passaBusca(porId.get(b.id), busca)));
  return boxCandidatos({ titulo: "Candidatos eleitos", contagem: `${buscando(busca) ? `${itens.length} na busca · ` : ""}${completa.length} de ${dist.vagas}`,
    nota: usaOficial ? "Resultado oficial do TSE." : "Projeção com os votos contados até agora.", vazio: buscando(busca) ? "Nenhum eleito com essa busca." : "Nenhum candidato eleito ainda.", itens, chave: "eleitos" });
}

/** Lista de candidatos paginada (15 por página, com a paginação dentro do cartão). Eleitos e todos os candidatos usam esta mesma estrutura. */
function boxCandidatos({ titulo, contagem, nota = "", vazio, itens, chave, porPagina = POR_PAGINA, semCartao = false }) {
  const paginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const pag = Math.min(Math.max(0, estado.pag[chave] ?? 0), paginas - 1);
  const ini = pag * porPagina, fatia = itens.slice(ini, ini + porPagina);
  const max = Math.max(1, itens[0]?.votos ?? 1), cargo = cargoAtivo();
  const linhas = fatia.map((b) => `<li class="ce" style="--cor:${corPartido(b.partido)}" data-sq="${esc(b.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
      <span class="pos">${b.pos}</span><img class="foto mini" loading="lazy" alt="" src="${urlFoto(b.cargo ?? cargo, b.uf ?? estado.uf, b.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <span class="ce-nome"><b>${esc(b.nome)}</b><span class="chip" style="--cor:${corPartido(b.partido)}">${esc(b.partido)}</span>${b.selo ?? ""}<small>${esc(b.sub ?? "")}</small></span>
      <span class="ce-votos">${fmt(b.votos)}</span><span class="cr-barra"><i style="width:${(b.votos / max) * 100}%"></i></span></li>`).join("");
  const nav = paginas > 1
    ? `<nav class="paginacao" aria-label="Páginas: ${esc(titulo)}"><button type="button" data-pag-lista="${chave}" data-dir="-1" ${pag === 0 ? "disabled" : ""}>‹ Anteriores</button>
        <span>${ini + 1}–${ini + fatia.length} de ${itens.length}</span><button type="button" data-pag-lista="${chave}" data-dir="1" ${pag >= paginas - 1 ? "disabled" : ""}>Próximos ›</button></nav>` : "";
  const [abre, fecha] = semCartao ? ['<div class="bloco-lista">', "</div>"] : ['<section class="card">', "</section>"];
  return `${abre}<div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span class="muted">${contagem}</span></div>
    ${nota ? `<p class="muted">${nota}</p>` : ""}
    ${itens.length ? `<ol class="lista-eleitos">${linhas}</ol>${nav}` : `<p class="muted">${vazio}</p>`}${fecha}`;
}

/** Todos os candidatos do estado, do mais votado ao menos votado; a posição é a da fila completa, mesmo com a busca ativa. */
function maisVotados(d, rotulo = "Candidatos por votos", projetados = null) {
  const selo = (c) => c.sit ? seloSit(c, { rotulo: rotuloEleito(c), curto: true }) : projetados?.has(c.id) ? seloProjetado({ curto: true }) : !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "";
  const reais = candidatosReais(d), todos = reais.map((c, i) => ({ c, pos: i + 1 }));
  const itens = todos.filter(({ c }) => passaBusca(c, estado.busca)).map(({ c, pos }) => ({ id: c.id, nome: c.nome, partido: c.partido, votos: c.votos, pos, sub: `nº ${c.numero} · ${pct(c.pct)}`, selo: selo(c) }));
  return boxCandidatos({ titulo: rotulo, contagem: buscando(estado.busca) ? `${fmt(itens.length)} na busca · ${fmt(reais.length)} no total` : `${fmt(reais.length)} candidatos`,
    vazio: "Nenhum candidato com essa busca.", itens, chave: "cand" });
}

function carregandoEstados(titulo) {
  return `<section class="card"><h2>${esc(titulo)}</h2><p class="muted">Carregando os 27 estados…</p></section>`;
}

function telaMajoritaria(v) {
  const { d } = v, { uf, mun } = estado, aba = cargoAtivo();
  const local = mun ? `${nomeUF(uf)}, município ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : nomeUF(uf);
  const titulo = aba === "senador" ? `Senador (${d.vagas || 2} vagas): ${local}` : `${CARGOS[aba].nome}: ${local}`;
  const evolucao = !mun && aba === "presidente" ? blocoResultadoEvolucao(v.rp, locaisResultado(uf, ""), d.totalizacaoFinal, d) : !mun && aba === "governador" ? blocoResultadoEvolucao(v.rp, [uf.toLowerCase()], d.totalizacaoFinal, d) : "";
  return `${blocoProgresso(titulo, d, null)}<section class="card"><h2>Candidatos por votos</h2>${rankingMajoritario(d, { aba, uf })}</section>${aba === "governador" && !mun ? blocoCompararEstado(d, uf) : ""}${cartoesVotacao(d)}${evolucao}`;
}

function resumoEstado(v) {
  const { uf } = estado, k = uf.toLowerCase();
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, "", uf);
  const fed = v.f.ufs[k];
  const extra = `<p class="hero-sec">${textoAptos(p.a)}</p>${fed ? `<p class="hero-sub">Presidente: ${pct(fed.pct)} das seções</p>` : ""}`;
  const hero = heroApuracao({ ...p, titulo: UFS[uf], subtitulo: "Eleições estaduais", extra, hist: [], grafico: false });
  const dt = v.detalhe ?? {};
  const cards = [
    cardCargo({ titulo: "Governador", aba: "governador", uf, d: dt.gov }), cardCargo({ titulo: "Senador", aba: "senador", uf, d: dt.sen }),
    cardBancada({ titulo: "Deputados Federais", cargo: "dep-federal", d: dt.depf === undefined ? undefined : dt.depf?.d, dist: dt.depf?.dist }),
    cardBancada({ titulo: "Deputados Estaduais", cargo: "dep-estadual", d: dt.depe === undefined ? undefined : dt.depe?.d, dist: dt.depe?.dist }),
    cardCargo({ titulo: "Presidente no estado", aba: "presidente", uf, d: dt.pres }),
  ];
  return `${hero}<div class="carrossel carrossel-estado" role="region" aria-label="Resumo das eleições em ${esc(UFS[uf])}">${cards.join("")}</div>
    <p class="muted nota-estado">Deslize para ver todas as eleições. Porcentagens de candidatos: votos no candidato ÷ ${getBase() === "totais" ? "eleitores aptos das seções apuradas" : "votos válidos"}.</p>`;
}

function telaMapaMunicipal(v) {
  const { uf } = estado, cargo = v.cargoMapa ?? estado.mapaCargo;
  const seg = `<div class="seg visao-mapa" role="group" aria-label="Eleição no mapa">${[["governador", "Governador"], ["presidente", "Presidente"], ["senador", "Senador"]].filter(([k]) => !TURNO2 || (k === "presidente" || (k === "governador" && UFS_GOV.includes(uf)))).map(([k, n]) => `<button type="button" data-mapa-cargo="${k}" aria-pressed="${k === cargo}">${n}</button>`).join("")}</div>`;
  if (v.malha?.erro) return `${seg}<section class="card">${aviso(v.malha.erro)}</section>`;
  const municipios = estado.municipios[uf] ?? [];
  if (!municipios.length) return `${seg}<section class="card"><p class="muted">A lista de municípios ainda não foi carregada. Tente de novo em instantes.</p></section>`;
  const nomes = new Map(municipios.map((m) => [m.ibge, m.nome]));
  const porIbge = new Map(municipios.map((m) => [m.ibge, m]));
  const lideres = new Map(), contagem = {};
  let semVotos = 0;
  for (const m of municipios) {
    const d = lerMun(cargo, uf, m.cod);
    const topo = d ? ordenarCandidatos(candidatosReais(d))[0] : null;
    if (!topo || topo.votos <= 0) { semVotos++; continue; }
    const l = { cor: corPartido(topo.partido), quem: `${topo.nome} (${topo.partido})`, apurado: d.pctSecoes };
    lideres.set(m.ibge, l); contagem[m.cod] = l;
  }
  const feitos = progresso(cargo, uf, municipios);
  const barra = feitos < municipios.length ? `<div class="progresso-mun"><span>Carregando municípios: ${fmt(feitos)} de ${fmt(municipios.length)}</span><div class="barra-prog"><i style="width:${(feitos / municipios.length) * 100}%"></i></div></div>` : "";
  const sel = estado.munSel && porIbge.has(estado.munSel) ? porIbge.get(estado.munSel) : null;
  const cartao = sel ? `<ul class="cards-estados cartao-mapa">${cardMunicipio(sel.cod, sel.nome, uf, lerMun(cargo, uf, sel.cod) ?? null, cargo)}</ul>` : `<p class="muted dica-mapa">Toque em um município para ver o resultado.</p>`;
  return `${seg}<section class="card"><h2>${esc(CARGOS[cargo].nome)} por município · ${esc(UFS[uf])}</h2>${barra}
    <div class="mapa-area mapa-area-mun">${mapaMunicipal(v.malha, lideres, nomes, estado.munSel)}</div>
    ${legendaMapa(contarLideres(contagem), { semVotos, unidade: ["município", "municípios"], nota: "Cada município tem a cor de quem lidera nele, mais forte quanto mais seções apuradas. Os dados chegam município a município e se atualizam a cada minuto." })}${cartao}</section>`;
}

function telaEstados(v) {
  if (estado.cargo === "mapa") return telaMapaMunicipal(v);
  if (estado.cargo === "resumo") return resumoEstado(v);
  if (CARGOS[estado.cargo].proporcional) return telaProporcionalUF(v);
  return telaMajoritaria(v);
}

function seletorVisao(atributo, visao, opcoes) {
  return `<div class="seg visao-senado" role="group" aria-label="Visão">${opcoes.map(([k, nome]) => `<button type="button" ${atributo}="${k}" aria-pressed="${k === visao}">${nome}</button>`).join("")}</div>`;
}
const seletorSenado = (visao) => seletorVisao("data-visao-senado", visao, [["estados", "Por estado"], ["eleitos", "Resumo nacional"], ["bancada", "Bancada em 2027"]]);
const seletorGovernador = (visao) => seletorVisao("data-visao-gov", visao, [["estados", "Por estado"], ["eleitos", "Resumo nacional"]]);

/** Filtros em vigor: a região vem dos botões do topo (estado.regiao); situação e estado, do bloco. Valem para todas as listas e mapas. */
const filtrosAtuais = () => ({ ...estado.filtros, regiao: estado.regiao });

/** Linha de status de um quadro com projeção, a partir do acompanhamento do TSE (arquivo e hora de Brasília). */
function statusAcompanhamento(ac) {
  const br = ac?.ufs?.br;
  return statusProjecao({ andamento: br?.andamento, pct: br?.pct, quando: ac?.geradoEm });
}

function telaBancadaSenado(v) {
  if (!v.lista || (v.mandatos === null)) return `${seletorSenado("bancada")}${telaBancada(null, { carregando: true })}`;
  if (!v.mandatos?.senadores) return `${seletorSenado("bancada")}<section class="card">${aviso("Não foi possível carregar a lista de senadores em exercício. Tentaremos de novo automaticamente.")}</section>`;
  const b = montarBancada({ mandatos: v.mandatos.senadores, resultados: v.lista });
  // Nas visões por estado e em tabela, os filtros de região, estado e situação valem; na visão por partido a soma é do Senado todo.
  const porEstado = estado.agrupBancada !== "partido";
  let barra = "", bf = b;
  if (porEstado) {
    const f = filtrosAtuais();
    const statusDe = (u) => (situacaoUf(b.porUf.find((x) => x.uf === u) ?? { eleitos: [], confirmados: 0 }) === "definida" ? "definida" : "aberta");
    const mantidos = new Set(filtrarUfs(b.porUf.map((x) => x.uf), f, statusDe));
    bf = { ...b, porUf: b.porUf.filter((x) => mantidos.has(x.uf)) };
    barra = barraFiltros(f, { comSegundo: false });
  }
  return `${seletorSenado("bancada")}${telaBancada(bf, { versao: v.mandatos.versao, agrupamento: estado.agrupBancada, filtros: barra, totais: b, status: statusAcompanhamento(v.e) })}`;
}

/** Governos por partido: em quantos estados cada um elegeu o governador e em quantos chegou ao 2º turno. */
function blocoPartidosGoverno(lista) {
  if (!lista) return "";
  const m = new Map(), vazio = () => ({ eleitos: [], segundos: [] });
  for (const { uf, d } of lista) for (const c of d?.candidatos ?? []) {
    if (c.sit === "eleito") (m.get(c.partido) ?? m.set(c.partido, vazio()).get(c.partido)).eleitos.push(uf);
    else if (c.sit === "segundo") (m.get(c.partido) ?? m.set(c.partido, vazio()).get(c.partido)).segundos.push(uf);
  }
  const linhas = [...m].sort((a, b) => b[1].eleitos.length - a[1].eleitos.length || b[1].segundos.length - a[1].segundos.length || a[0].localeCompare(b[0], "pt-BR"));
  if (!linhas.length) return `<section class="card"><h2>Governos por partido</h2><p class="muted">Nenhum governador definido ainda.</p></section>`;
  const eleitos = linhas.reduce((t, [, x]) => t + x.eleitos.length, 0), segundos = linhas.reduce((t, [, x]) => t + x.segundos.length, 0);
  const ufs = (l, classe) => l.sort().map((u) => `<span class="gp-uf ${classe}">${u}</span>`).join("");
  const itens = linhas.map(([partido, x]) => `<li class="gp-linha" style="--cor:${corPartido(partido)}"><span class="chip" style="--cor:${corPartido(partido)}">${esc(partido)}</span>
    <span class="gp-num"><strong>${x.eleitos.length}</strong><small>${x.eleitos.length === 1 ? "eleito" : "eleitos"}</small></span>
    ${TURNO2 ? "" : `<span class="gp-num seg"><strong>${x.segundos.length}</strong><small>no 2º turno</small></span>`}
    <span class="gp-ufs">${ufs(x.eleitos, "eleito")}${TURNO2 ? "" : ufs(x.segundos, "segundo")}</span></li>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Governos por partido</h2><span class="muted">${eleitos} eleitos${TURNO2 ? "" : ` · ${segundos} em 2º turno`}</span></div>
    <p class="muted">${TURNO2 ? "Estados com governador já definido no 2º turno." : "Em quantos estados cada partido já elegeu o governador e em quantos tem candidato no 2º turno (cada disputa tem dois)."}</p>
    <ul class="gp-lista">${itens}</ul></section>`;
}

function telaCargoPorEstado(v) {
  if (v.cargo === "senador" && estado.visaoSenado === "bancada") return telaBancadaSenado(v);
  if (v.cargo === "senador" && estado.visaoSenado === "eleitos") return `${seletorSenado("eleitos")}${telaEleitos(v, "senador")}`;
  if (v.cargo === "governador" && estado.visaoGov === "eleitos") return `${seletorGovernador("eleitos")}${blocoPartidosGoverno(v.lista)}${telaEleitos(v, "governador")}`;
  const { regiao } = estado, cargo = v.cargo, governador = cargo === "governador";
  const plural = governador ? "Governadores" : "Senadores", singular = governador ? "governador" : "senador";
  const ds = v.lista ? v.lista.map((x) => x.d).filter(Boolean) : [];
  const definidas = ds.filter((d) => situacaoEleicao(d) === "eleito").length, segundoTurno = ds.filter((d) => situacaoEleicao(d) === "segundo").length;
  const resumo = governador ? `${definidas} definido${definidas === 1 ? "" : "s"} · ${segundoTurno} no 2º turno` : `${definidas} eleição${definidas === 1 ? "" : "ões"} definida${definidas === 1 ? "" : "s"}`;
  // Governadores: só os cards. Senadores: o painel geral continua.
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, regiao === "exterior" ? "" : regiao, "BR");
  const hero = governador ? "" : heroApuracao({ ...p, titulo: regiao ? p.titulo : plural, subtitulo: regiao ? p.subtitulo : "2 vagas por estado, 54 no total", extra: v.lista ? `<p class="hero-sub">${resumo}</p>` : "", grafico: false, hist: [] });
  const ufs = (regiao && REGIOES[regiao] ? REGIOES[regiao].ufs : Object.keys(UFS)).filter((u) => !governador || UFS_GOV.includes(u));
  const de2022 = new Map((v.mandatos?.senadores ?? []).map((x) => [x.uf, x]));
  const extra = (u) => (governador ? "" : linha2022(de2022.get(u)));
  const secao = blocoPorEstado({ titulo: `${governador ? "Governador" : "Senador"} por estado`, cargo, lista: v.lista, ac: v.e, ufs, regiao, porPartido: true, maioria: governador, extra,
    nota: `Toque em um estado para ver a disputa completa de ${singular}.${governador ? "" : " Cada estado elege 2 senadores hoje; o terceiro foi eleito em 2022."} Abstenção sobre as seções já apuradas.` });
  return `${governador ? seletorGovernador("estados") : seletorSenado("estados")}${governador && TURNO2 ? blocoDisputas("governador") : ""}${governador ? blocoPartidosGoverno(v.lista) : ""}${governador ? blocoCompararGovernadores(v.lista) : ""}${hero}<section class="card sem-borda">${governador ? `<p class="muted">${v.lista ? resumo : ""}</p>` : ""}${legendaSituacao(governador)}</section>${secao}`;
}

/** Resumo nacional (senadores ou governadores): uma linha por estado com a situação no momento e o % de urnas apuradas. */
function telaEleitos(v, cargo) {
  const senador = cargo === "senador", f = filtrosAtuais();
  const nomePlural = senador ? "Senadores" : "Governadores";
  if (!v.lista) return carregandoEstados(`Resumo nacional · ${nomePlural}`);
  const dDe = (u) => v.lista.find((x) => x.uf === u)?.d ?? null;
  const todas = (senador ? Object.keys(UFS) : UFS_GOV).slice().sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  const ufs = filtrarUfs(todas, f, (u) => statusEleicao(dDe(u)));
  const mini = (c, uf, extra = "") => `<span class="rn-cand" data-sq="${esc(c.id)}" role="button" tabindex="0" style="--cor:${corPartido(c.partido)}" title="Ver ficha do candidato">
    <img class="foto mini" loading="lazy" alt="" src="${urlFoto(cargo, uf, c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
    <span class="rn-nome"><b>${esc(c.nome)}</b><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>${extra}</span></span>`;
  const situacaoDe = (d, uf) => {
    const ordenados = ordenarCandidatos(d.candidatos).filter((c) => c.votos > 0 && c.elegivel);
    const eleitos = ordenados.filter((c) => c.sit === "eleito"), segundos = ordenados.filter((c) => c.sit === "segundo");
    if (!ordenados.length) return { classe: "vazio", selo: `<span class="rn-selo vazio">Sem votos</span>`, corpo: "" };
    if (!senador && segundos.length) return { classe: "segundo", selo: `<span class="rn-selo segundo"><i aria-hidden="true">2º</i>turno</span>`, corpo: segundos.map((c) => mini(c, uf, `<small>${pct(c.pct)}</small>`)).join("") };
    if (eleitos.length) {
      const falta = senador ? (d.vagas || 2) - eleitos.length : 0;
      const lider = falta > 0 ? ordenados.filter((c) => !c.sit).slice(0, falta) : [];
      return { classe: "eleito", selo: `<span class="rn-selo eleito"><i aria-hidden="true">✓</i>${eleitos.length > 1 ? "Eleitos" : "Eleito"}</span>`,
        corpo: eleitos.map((c) => mini(c, uf, `<small>${pct(c.pct)}</small>`)).join("") + (falta > 0 ? `<p class="rn-falta">${falta} vaga${falta > 1 ? "s" : ""} em aberto${lider.length ? " · à frente:" : ""}</p>${lider.map((c) => mini(c, uf, `<small>${pct(c.pct)}</small>`)).join("")}` : "") };
    }
    return { classe: "aberta", selo: `<span class="rn-selo aberta"><i aria-hidden="true">…</i>Em aberto</span>`, corpo: ordenados.slice(0, senador ? d.vagas || 2 : 2).map((c) => mini(c, uf, `<small>${pct(c.pct)}</small>`)).join("") };
  };
  const contagem = { definida: 0, segundo: 0, aberta: 0 };
  const linhas = ufs.map((uf) => {
    const d = dDe(uf);
    if (!d) return "";
    contagem[statusEleicao(d)]++;
    const sit = situacaoDe(d, uf);
    return `<li class="rn-linha ${sit.classe}" data-uf="${uf}" role="button" tabindex="0" title="Ver ${esc(UFS[uf])}">
      <span class="sigla">${uf}</span>
      <span class="rn-estado"><b>${esc(UFS[uf])}</b>${sit.selo}</span>
      <span class="rn-corpo">${sit.corpo}</span>
      <span class="rn-apurado"><strong>${pct(d.pctSecoes)}</strong><small>urnas apuradas</small><span class="mini-barra"><i style="width:${Math.min(100, d.pctSecoes)}%"></i></span></span></li>`;
  }).join("");
  const tile = (n, rotulo, classe) => `<div class="rn-tile ${classe}"><strong>${n}</strong><span>${rotulo}</span></div>`;
  const tiles = `<div class="rn-tiles">${tile(contagem.definida, "definidas", "eleito")}${senador ? "" : tile(contagem.segundo, "2º turno", "segundo")}${tile(contagem.aberta, "em aberto", "aberta")}</div>`;
  return `<section class="card"><div class="titulo-cadeiras"><h2>Resumo nacional · ${nomePlural}</h2><span class="muted">${ufs.length} estados</span></div>
    ${statusAcompanhamento(v.e)}${tiles}
    ${senador ? `<p class="muted">Cada estado elege 2 senadores.</p>` : ""}
    ${barraFiltros(f, { comSegundo: !senador, ufsOk: senador ? null : UFS_GOV })}
    ${linhas ? `<ul class="rn-lista">${linhas}</ul>` : `<p class="muted">Nenhum estado com esses filtros.</p>`}</section>`;
}

/** Comparar candidatos nos governos: os dois mais votados (ou dois partidos) em cada estado. */
function blocoCompararGovernadores(lista) {
  if (!lista) return "";
  const cont = new Map();
  for (const { d } of lista) for (const c of d?.candidatos ?? []) if (c.elegivel && !c.subJudice && c.votos > 0) { const x = cont.get(c.partido) ?? { n: 0, votos: 0 }; x.n++; x.votos += c.votos; cont.set(c.partido, x); }
  const partidos = [...cont].map(([sigla, x]) => ({ sigla, ...x })).sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
  return blocoCompararGoverno({ lista, cmp: estado.cmpGov, partidos });
}

/** Comparar candidatos na página de um estado (governador): dois candidatos escolhidos, com os demais e o não voto. */
function blocoCompararEstado(d, uf) {
  const reais = candidatosReais(d).filter((c) => c.votos > 0);
  if (reais.length < 2) return "";
  const ord = reais.slice().sort((a, b) => b.votos - a.votos);
  const cmp = { a: estado.cmp.a, b: estado.cmp.b, ordem: "az" };
  const h = blocoComparar({ candidatos: ord, local: { rotulo: nomeUF(uf), uf, d }, itens: [], cmp: { a: ord.some((c) => c.id === cmp.a) ? cmp.a : ord[0].id, b: ord.some((c) => c.id === cmp.b) ? cmp.b : ord[1].id, ordem: "az" } });
  return h.replace(/<label class="f-sel cp-ordem">.*?<\/label>/s, ""); // um estado só: sem ordenação
}

/** Bloco "Comparar candidatos" da aba Presidente: Brasil (ou a região) e a lista de estados. */
function blocoCompararPresidente(v, d) {
  const { regiao } = estado;
  if (!d || !v.lista) return "";
  const reais = candidatosReais(d).filter((c) => c.votos > 0);
  const ds = (x) => v.lista.filter((i) => i.d && x(i.uf));
  const doRegiao = REGIOES[regiao] ? (u) => REGIOES[regiao].ufs.includes(u) : regiao === "exterior" ? (u) => u === "ZZ" : () => true;
  const itens = ds(doRegiao);
  const local = REGIOES[regiao] ? { rotulo: REGIOES[regiao].nome, uf: "BR", d: agregarResultados(itens.map((i) => i.d)) } : regiao === "exterior" ? { rotulo: "Exterior", uf: "ZZ", d: v.lista.find((i) => i.uf === "ZZ")?.d } : { rotulo: "Brasil", uf: "BR", d };
  const padrao = reais.slice(0, 2).map((c) => c.id);
  const cmp = { a: estado.cmp.a || padrao[0], b: estado.cmp.b || padrao[1], ordem: estado.cmp.ordem };
  return blocoComparar({ candidatos: reais, local, itens: regiao === "exterior" ? [] : itens, cmp });
}

function telaPresidente(v) {
  const { regiao, uf, mun } = estado;
  const emRegiao = uf === "BR" && REGIOES[regiao];
  const ufsRegiao = emRegiao ? REGIOES[regiao].ufs : null;
  // Resultado do recorte escolhido: Brasil, região (soma dos estados), estado/exterior/município.
  // Estado: usa o arquivo próprio quando já chegou; até lá, o que a lista de estados já trouxe (sem município).
  const doEstado = v.duChave === `${uf}/${mun}` ? v.du : mun ? null : v.lista?.find((x) => x.uf === uf)?.d ?? null;
  let d = uf !== "BR" ? doEstado : v.d, carregando = uf !== "BR" && mun !== "" && !doEstado;
  if (emRegiao) {
    const ds = v.lista ? ufsRegiao.map((u) => v.lista.find((x) => x.uf === u)?.d) : [];
    d = v.lista ? agregarResultados(ds) : null; carregando = !v.lista;
  } else if (uf === "BR" && regiao === "exterior") {
    d = v.lista?.find((x) => x.uf === "ZZ")?.d ?? null; carregando = !v.lista;
  }
  const p = escopoDoPainel({ f: v.ac, e: { ufs: {} } }, uf === "BR" ? regiao : "", uf);
  const nome = mun ? `${nomeUF(uf)}, ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : p.titulo;
  // O painel usa o mesmo arquivo dos votos mostrados (o do cargo), para bater com o site do TSE.
  // O acompanhamento por estado pode estar alguns minutos à frente do arquivo nacional do cargo.
  const doArquivo = d && d.secoesTotal > 0
    ? { ...p, subtitulo: mun ? "Município" : p.subtitulo, a: { ...p.a, st: d.secoesApuradas, ts: d.secoesTotal, pct: d.pctSecoes, ...(d.eleitorado?.apto ? { eleitores: d.eleitorado.apto, comparecimento: d.comparecimento, abstencao: d.abstencao } : {}) },
        andamento: d.andamento, quando: d.atualizadoEm, origem: "Dados do TSE" }
    : p;
  const painel = mun ? { ...doArquivo, extra: "" } : doArquivo;
  const hero = heroApuracao({ ...painel, titulo: nome, hist: v.h, grafico: mun ? null : false });
  const locaisGrafico = locaisResultado(uf, regiao);
  const listaCand = d
    ? `${faixaDefinicao(d)}${avisosApuracao(d)}${rankingMajoritario(d, { aba: "presidente", uf: "BR" })}`
    : `<p class="muted">${carregando ? "Carregando…" : "Resultado indisponível no momento."}</p>`;
  const grafico = mun ? "" : blocoResultadoEvolucao(v.rpLocais === locaisGrafico.join(",") ? v.rp : undefined, locaisGrafico, d?.totalizacaoFinal);
  return `${hero}${TURNO2 && uf === "BR" && !regiao ? blocoDisputas("presidente") : ""}
    <section class="card"><h2>Candidatos por votos</h2>${listaCand}</section>${uf === "BR" ? blocoCompararPresidente(v, v.d) : ""}${d ? cartoesVotacao(d) : ""}${grafico}${quadroPorRegiao(v, uf)}${tabelaPresidentePorEstado(v, uf, emRegiao ? ufsRegiao : null)}`;
}

/**
 * Líder (cor e nome) de cada estado, para colorir o mapa.
 * Com `maioria` (governador), o estado só ganha a cor do partido se o líder tiver mais da metade dos votos válidos (50% + 1);
 * senão a cor é a do 2º turno.
 */
function lideresPorUf(lista, porPartido, maioria = false) {
  const out = {};
  for (const { uf, d } of lista ?? []) {
    const topo = d ? ordenarCandidatos(candidatosReais(d))[0] : null;
    if (!topo || topo.votos <= 0) { out[uf] = null; continue; }
    out[uf] = maioria && topo.votos * 2 <= d.votosValidos
      ? { cor: COR_SEGUNDO_TURNO, quem: "Segundo turno", segundo: true, apurado: d.pctSecoes }
      : { cor: corPartido(topo.partido), quem: porPartido ? topo.partido : topo.nome, apurado: d.pctSecoes };
  }
  return out;
}

/**
 * Seção "por estado" das abas Presidente, Governadores e Senadores: cards ou mapa, com ordenação e filtro por região.
 * @param {{titulo:string, cargo:string, lista:object[]|null, ac:object, ufs:string[], regiao:string, porPartido?:boolean, extra?:(uf:string)=>string, nota?:string, comRegioes?:boolean, exterior?:boolean}} o
 */
function blocoPorEstado({ titulo, cargo, lista, ac, ufs, regiao, porPartido = false, maioria = false, extra = () => "", nota = "", comRegioes = false, exterior = false }) {
  const visao = estado.visaoEstados;
  const seg = (attr, valor, opcoes) => `<div class="seg mini" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === valor}">${n}</button>`).join("")}</div>`;
  const chips = barraFiltros(filtrosAtuais(), { comSegundo: cargo !== "senador", ufsOk: cargo === "governador" ? UFS_GOV : null, ordem: visao === "cards" ? estado.ordem : null });
  const controles = `<div class="estados-topo"><h2>${esc(titulo)}</h2>${seg("data-visao-estados", visao, [["cards", "Cards"], ["mapa", "Mapa"]])}</div>${chips}`;
  if (!lista) return `<section class="card">${controles}<p class="muted">Carregando os estados…</p></section>`;
  const dDe = (u) => lista.find((x) => x.uf === u)?.d ?? null;
  const apurado = (u) => ac.ufs[u.toLowerCase()]?.pct ?? 0;
  const filtrando = !!(estado.regiao || estado.filtros.uf || estado.filtros.status);
  ufs = filtrarUfs(ufs, filtrosAtuais(), (u) => statusEleicao(dDe(u)));
  if (visao === "mapa") {
    const lideres = lideresPorUf(lista, porPartido, maioria);
    const dentro = new Set(ufs);
    const sel = estado.mapaUf && (dentro.has(estado.mapaUf) || estado.mapaUf === "ZZ") ? estado.mapaUf : "";
    const dosEstados = Object.fromEntries(Object.entries(lideres).filter(([u]) => dentro.has(u)));
    const contagem = contarLideres(dosEstados);
    const semVotos = Object.values(dosEstados).filter((l) => !l).length + [...dentro].filter((u) => !(u in lideres)).length;
    const exteriorChip = exterior && ac.ufs.zz && lideres.ZZ !== undefined
      ? `<button type="button" class="chip-exterior${sel === "ZZ" ? " sel" : ""}" data-mapa-uf="ZZ"><i style="background:${lideres.ZZ?.cor ?? "var(--barra)"}"></i>Exterior${lideres.ZZ ? ` · ${esc(lideres.ZZ.quem)}` : ""}</button>` : "";
    const cartao = sel ? `<ul class="cards-estados cartao-mapa">${cardEstado(sel, dDe(sel), ac.ufs[sel.toLowerCase()], cargo, 5, extra(sel))}</ul>` : `<p class="muted dica-mapa">Toque em um estado para ver o resultado.</p>`;
    return `<section class="card">${controles}<div class="mapa-area">${mapaBrasil(lideres, { selecionado: sel, destaque: (regiao && regiao !== "exterior") || filtrando ? dentro : null })}</div>${exteriorChip}
      ${legendaMapa(contagem, { semVotos, nota: maioria ? "Cada estado ganha a cor do partido quando um candidato tem mais de 50% dos votos válidos. Sem essa maioria, a disputa vai ao 2º turno. A cor fica mais forte conforme avança a apuração." : "A cor fica mais forte conforme avança a apuração do estado." })}${cartao}${nota ? `<p class="muted nota">${nota}</p>` : ""}</section>`;
  }
  const ordenados = ufs.slice().sort(estado.ordem === "pct" ? (a, b) => apurado(b) - apurado(a) : (a, b) => (a === "ZZ") - (b === "ZZ") || (UFS[a] ?? "").localeCompare(UFS[b] ?? "", "pt-BR"));
  if (!ordenados.length) return `<section class="card">${controles}<p class="muted">Nenhum estado com esses filtros.</p></section>`;
  return `<section class="card">${controles}${gradeCards(ordenados.map((u) => cardEstado(u, dDe(u), ac.ufs[u.toLowerCase()], cargo, 5, extra(u))))}${nota ? `<p class="muted nota">${nota}</p>` : ""}</section>`;
}

/** Resultado da eleição presidencial em cada região (soma dos estados) e no exterior. */
function quadroPorRegiao(v, uf) {
  if (uf !== "BR") return "";
  if (!v.lista) return carregandoEstados("Resultado por região");
  const dDe = (u) => v.lista.find((x) => x.uf === u)?.d;
  const cards = Object.entries(REGIOES).map(([id, r]) => {
    const us = r.ufs.map((u) => v.ac.ufs[u.toLowerCase()]);
    return cardRegiao(id, r.nome, r.sigla, agregarResultados(r.ufs.map(dDe)), { ...agregar(us), andamento: situacaoGeral(us) });
  });
  if (v.ac.ufs.zz) cards.push(cardRegiao("exterior", "Exterior", "EX", dDe("ZZ") ?? null, { ...agregar([v.ac.ufs.zz]), andamento: v.ac.ufs.zz.andamento }));
  return `<section class="card"><h2>Resultado por região</h2>${gradeCards(cards)}
    <p class="muted nota">Soma dos estados de cada região. Toque em uma região para ver o resultado dela.</p></section>`;
}

function tabelaPresidentePorEstado(v, uf, ufsRegiao) {
  if (uf !== "BR") return "";
  const todos = [...Object.keys(UFS), "ZZ"];
  const ufs = estado.regiao === "exterior" ? ["ZZ"] : ufsRegiao ?? todos;
  return blocoPorEstado({ titulo: "Resultado por estado", cargo: "presidente", lista: v.lista, ac: v.ac, ufs, regiao: estado.regiao, comRegioes: true, exterior: true,
    nota: "Toque em um estado para ver o resultado dele. O resultado final da eleição presidencial é nacional." });
}

function telaProporcionalUF(v) {
  const { d, dist } = v, { uf } = estado, aba = cargoAtivo();
  const quando = d.atualizadoEm ? ` · totalização do TSE: ${esc(d.atualizadoEm)}` : "";
  const progresso = `<div class="prog-mini">${statusProjecao({ andamento: d.andamento, pct: d.pctSecoes, quando: d.atualizadoEm })}
    <div class="barra-prog"><i style="width:${Math.min(100, d.pctSecoes)}%"></i></div>
    <p class="muted">${fmt(d.secoesApuradas)} de ${fmt(d.secoesTotal)} seções apuradas</p>${avisosApuracao(d)}</div>`;
  const cadeiras = blocoCadeiras({
    titulo: `${CARGOS[aba].nome}: ${nomeUF(uf)}`,
    subtitulo: dist.oficial ? "Cadeiras por partido/federação: distribuição oficial do TSE (totalização final)." : `Cadeiras por partido/federação, em projeção. Quociente eleitoral: ${fmt(dist.qe)}${d.qeTse ? ` (TSE: ${fmt(d.qeTse)})` : ""}.`,
    partidos: dist.linhas, totalVagas: dist.vagas, rotuloTotal: "cadeiras", progresso,
  });
  return `${cadeiras}
    ${dist.art111 ? aviso("Nenhum partido ou federação alcançou o quociente eleitoral. Pelo art. 111 do Código Eleitoral, as vagas ficam com os candidatos mais votados.") : ""}
    ${barraBusca(candidatosReais(d), estado.busca, candidatosReais(d).filter((c) => passaBusca(c, estado.busca)).length)}
    ${boxEleitos(d, dist)}
    <section class="card"><h2>Partidos e federações</h2>${tabelaPartidos(dist, d)}${COMO}</section>
    ${cartoesVotacao(d, { proporcional: true })}
    ${maisVotados(d, "Candidatos por votos", new Set(dist.eleitos.map((e) => e.id)))}`;
}

/** Todos os deputados federais eleitos (oficiais ou projetados), do mais votado ao menos votado, com a votação de cada um. */
function listaDeputadosEleitos(estados, ufs, f) {
  const dentro = new Set(ufs), busca = estado.busca;
  const todos = [];
  for (const { uf, d, dist } of estados ?? []) {
    if (!dentro.has(uf)) continue;
    const { usaOficial, base } = dadosEleitos(d, dist), porId = new Map(candidatosReais(d).map((c) => [c.id, c]));
    for (const b of base) {
      const c = porId.get(b.id); if (!c) continue;
      todos.push({ id: b.id, uf, cargo: "dep-federal", nome: b.nome, partido: c.partido, votos: b.votos, c,
        sub: `${UFS[uf]} · ${pct(c.pct)} dos válidos · ${b.sub}`, selo: usaOficial ? seloSit({ sit: "eleito" }, { curto: true }) : seloProjetado({ curto: true }) });
    }
  }
  todos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  todos.forEach((t, i) => { t.pos = i + 1; }); // a posição é a da fila nacional, mesmo com busca e filtros
  const itens = todos.filter((t) => passaBusca(t.c, busca));
  const candidatosBusca = todos.map((t) => t.c);
  return `${barraFiltros(f, { comSegundo: false })}${barraBusca(candidatosBusca, busca, itens.length).replace('<section class="card busca-cand">', '<div class="busca-cand">').replace(/<\/section>$/, "</div>")}
    ${boxCandidatos({ titulo: "Deputados federais eleitos", contagem: `${fmt(itens.length)}${buscando(busca) || todos.length !== 513 ? ` de ${fmt(todos.length)}` : " de 513"}`, nota: "Votos nominais de cada eleito e % dos votos válidos do estado. “Projeção” = eleito pela soma dos votos contados até agora; “eleito” = resultado oficial do TSE.", vazio: "Nenhum deputado com esses filtros.", itens, chave: "deps", porPagina: 25, semCartao: true })}`;
}

/** Aba Partidos: desempenho geral de um partido (majoritárias, deputados e cláusula). */
function telaPartidos(v) {
  const dados = { pres: v.pres, gov: v.gov, sen: v.sen, depf: v.depf, depe: v.depe, pres2: v.pres2, gov2: v.gov2 };
  const partidos = listaDePartidos(dados);
  if (!partidos.length) return `<section class="card"><h2>Partidos</h2><p class="muted">Carregando os resultados…</p></section>`;
  const padrao = v.depf ? (calcularClausulaPadrao(v.depf, partidos)) : partidos[0].sigla;
  const sigla = partidos.some((p) => p.sigla === estado.partido) ? estado.partido : padrao;
  const seletor = `<label class="f-sel pp-seletor"><span>Partido</span><select data-partido aria-label="Escolher partido">${partidos.map((p) => `<option value="${esc(p.sigla)}"${p.sigla === sigla ? " selected" : ""}>${esc(p.sigla)} (${p.n} candidaturas)</option>`).join("")}</select></label>`;
  return blocoPartido(desempenhoPartido(sigla, dados), seletor, estado.partidoVisao);
}
/** O partido que abre por padrão: o de maior bancada federal. */
function calcularClausulaPadrao(depf, partidos) {
  const m = new Map();
  for (const { d, dist } of depf) { const ids = new Set((dist?.eleitos ?? []).map((e) => e.id)); for (const c of d.candidatos) if (ids.has(c.id)) m.set(c.partido, (m.get(c.partido) ?? 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? partidos[0].sigla;
}

function telaNacionalProp(v) {
  const n = v.nacional;
  const p = escopoDoPainel({ f: v.ac, e: { ufs: {} } }, "", "BR");
  const extra = n ? `<p class="hero-sub">${n.total} de ${n.totalVagas} cadeiras projetadas · ${n.confirmadasTotal} confirmadas</p>` : "";
  const hero = heroApuracao({ ...p, titulo: "Câmara dos Deputados", subtitulo: "513 cadeiras, eleitas nos 27 estados", extra, grafico: false, hist: [] });
  if (!n) return `${hero}${carregandoEstados("Câmara dos Deputados: cadeiras por partido/federação")}`;

  const agrup = estado.agrupCamara, f = filtrosAtuais();
  const ordenadas = n.ufs.map((u) => u.uf).sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  const statusDe = (uf) => (n.ufs.find((u) => u.uf === uf)?.oficial ? "definida" : "aberta");
  let ufs = filtrarUfs(ordenadas, f, statusDe);
  if (agrup === "estado" && estado.ordem === "pct") ufs = ufs.slice().sort((a, b) => (n.ufs.find((u) => u.uf === b)?.pct ?? 0) - (n.ufs.find((u) => u.uf === a)?.pct ?? 0));
  const filtros = barraFiltros(f, { comSegundo: false, ordem: agrup === "estado" ? (estado.ordem === "pct" ? "pct" : "az") : null });
  let corpo;
  if (agrup === "estado") {
    corpo = `${filtros}${ufs.length ? cardsEstadosCamara(n, ufs) : `<p class="muted">Nenhum estado com esses filtros.</p>`}`;
  } else if (agrup === "mapa") {
    const lideres = lideresCamara(n), dentro = new Set(ufs);
    const sel = estado.mapaUf && dentro.has(estado.mapaUf) ? estado.mapaUf : "";
    const filtrando = !!(f.regiao || f.uf || f.status);
    const contagem = contarLideres(Object.fromEntries(Object.entries(lideres).filter(([u]) => dentro.has(u))));
    corpo = `${filtros}<div class="mapa-area">${mapaBrasil(lideres, { selecionado: sel, destaque: filtrando ? dentro : null })}</div>
      ${legendaMapa(contagem, { nota: "Cada estado tem a cor do partido ou federação com a maior bancada nele, mais forte quanto mais avançou a apuração." })}
      ${sel ? `<div class="cartao-mapa">${cardsEstadosCamara(n, [sel])}</div>` : `<p class="muted dica-mapa">Toque em um estado para ver a bancada dele.</p>`}`;
  } else if (agrup === "tabela") {
    corpo = `${filtros}${tabelaEstadosCamara(n, ufs)}`;
  } else if (agrup === "eleitos") {
    corpo = getBase() === "totais"
      ? `<p class="muted">A lista de deputados eleitos está disponível na base de votos válidos. Troque a base no seletor abaixo das abas.</p>`
      : listaDeputadosEleitos(v.estados, ufs, f);
  } else if (agrup === "clausula") {
    const seg = seletorVisao("data-clausula", estado.clausula, [["todos", "Todos"], ["atingiu", "Atingiram"], ["andamento", "Ainda podem"], ["nao", "Não atingiram"]]);
    corpo = blocoClausula(calcularClausula(v.estados), estado.clausula, seg, statusAcompanhamento(v.ac));
  } else if (agrup === "top10") {
    corpo = blocoTop10(v.estados, statusAcompanhamento(v.ac));
  } else if (agrup === "votados") {
    const votFiltros = barraFiltros(f, { comSegundo: false, ordem: estado.ordem === "pct" ? "pct" : "az" });
    const ufsV = estado.ordem === "pct" ? ufs.slice().sort((a, b) => (n.ufs.find((u) => u.uf === b)?.pct ?? 0) - (n.ufs.find((u) => u.uf === a)?.pct ?? 0)) : ufs;
    corpo = `${votFiltros}${cardsMaisVotados(v.estados, ufsV)}`;
  } else {
    corpo = porPartidoCamara(n);
  }
  const maior = n.partidos[0];
  const parciais = n.ufs.filter((u) => !u.final).length;
  const evolucao = linhaEvolucao(v.h, (pt) => pt.e?.br, { rotulo: "Evolução da apuração no Brasil", inicio: INICIO_APURACAO, ate: Date.now() });
  return `${hero}
    <section class="card"><div class="titulo-cadeiras"><h2>Câmara em 2027</h2><span><strong>${n.total}</strong> <span class="muted">de ${n.totalVagas}</span></span></div>
      ${statusAcompanhamento(v.ac)}
      ${plenarioCamara(n)}
      <p class="muted">${parciais ? `Previsão: soma dos 27 estados, com ${parciais} ainda sem totalização final.` : "Soma dos 27 estados, resultado oficial do TSE."} Maioria: ${MAIORIA_CAMARA}.${maior ? ` Maior bancada: <strong>${esc(maior.sigla)}</strong> (${maior.vagas}).` : ""}</p>
      <div class="bancada-topo">${seletorAgrupCamara(agrup)}</div>
      ${corpo}
      <p class="muted nota">Previsão = soma das cadeiras de cada estado com os votos contados até agora. Confirmadas = cadeiras de estados já com totalização final (${n.confirmadasTotal} de ${n.totalVagas}). Cada estado elege só os seus deputados: toque em um estado para ver a distribuição detalhada.</p></section>
    <section class="card"><details><summary class="resumo-lista"><h2>Evolução da apuração no Brasil</h2></summary>${evolucao}<p class="muted">% de seções apuradas ao longo do tempo (registro a cada minuto).</p></details></section>
    <section class="card">${COMO}</section>`;
}

// A navegação fica fora do conteúdo: persiste e não perde a rolagem a cada atualização.
/** A região (botões do topo) vale em todas as abas, menos nas visões que somam o país inteiro por partido. */
function usaRegiao() {
  const { aba } = estado;
  if (aba === "andamento" || aba === "presidente" || aba === "governadores") return true;
  if (aba === "senadores") return !(estado.visaoSenado === "bancada" && estado.agrupBancada === "partido");
  if (aba === "camara") return !["partido", "top10", "clausula"].includes(estado.agrupCamara);
  return false;
}
let navAnterior = "", subAnterior = "";
let ultimoAc = null; // andamento por estado mais recente, para a navegação aparecer enquanto a tela carrega
function renderNavegacao(v) {
  ultimoAc = v?.f ?? v?.ac ?? v?.e ?? ultimoAc;
  const nav = usaRegiao() && ultimoAc
    ? navegacaoRegional(ultimoAc, { regiao: estado.regiao, uf: estado.uf, comExterior: estado.aba === "andamento" || estado.aba === "presidente", comEstados: estado.aba === "andamento" || estado.aba === "presidente", aberto: estado.navAberta, soComDados: TURNO2 && (estado.aba === "governadores") }) : "";
  const sub = estado.aba === "estados" ? barraEstado(estado.uf, estado.cargo) : "";
  const preserva = (el, html, anterior) => {
    if (html === anterior) return anterior;
    const rolagem = el.querySelector(".tira, .be-cargos, .chips")?.scrollLeft ?? 0;
    el.innerHTML = html;
    el.querySelectorAll(".tira, .be-cargos, .chips").forEach((c) => { c.scrollLeft = rolagem; });
    return html;
  };
  navAnterior = preserva($("nav"), nav, navAnterior);
  subAnterior = preserva($("sub"), sub, subAnterior);
  $("sub").hidden = !sub;
  // mantém o estado e o cargo escolhidos à vista nas faixas roláveis
  for (const sel of ["#nav .tira [aria-pressed=true]", "#sub [aria-selected=true]"]) document.querySelector(sel)?.scrollIntoView({ inline: "center", block: "nearest" });
}

function render(forcar = false) {
  const v = estado.view;
  if (!v) return;
  if (!forcar && ["SELECT", "INPUT"].includes(document.activeElement?.tagName) && $("conteudo").contains(document.activeElement)) return; // não fecha a lista de estados enquanto ela está aberta
  setBase(estado.base); setSemSubJudice(estado.semSJ); aplicarBaseNaView(v); // todos os % da tela seguem a base e o cenário escolhidos
  if (v.tipo === "nacional-prop" && v.estados) v.nacional = consolidarNacional(v.estados); // cadeiras do país seguem o cenário
  const tela = { andamento: (v) => telaMarcha(v, estado, false), estados: telaEstados, presidente: telaPresidente, "cargo-por-estado": telaCargoPorEstado, "nacional-prop": telaNacionalProp, partidos: telaPartidos }[v.tipo];
  renderNavegacao(v);
  $("conteudo").innerHTML = tela(v);
  reaplicarGraficos($("conteudo"));
  ajustarContrasteChips($("conteudo"));
  if (estado.rolar) { estado.rolar = false; document.querySelector("li.aberto")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

// ---------- atualização automática (a cada 10 segundos) ----------
// Cada tela carrega por conta própria: trocar de visão nunca espera uma carga anterior terminar.
const emVoo = new Set();
/** 2º turno ainda sem arquivos do TSE (antes das 17h de 25/10): mostra as disputas definidas e avisa quando começa. */
function telaAguardandoSegundoTurno() {
  return `<section class="card"><h2>Apuração do 2º turno</h2><p class="muted">O TSE ainda não publicou os resultados do 2º turno. A apuração começa em 25/10/2026, às 17h (Brasília), e esta página passa a mostrar tudo sozinha, atualizando a cada poucos segundos.</p></section>${blocoDisputas()}`;
}

// ---------- fim da apuração: sem mais requisições ----------
const encerradas = new Set(); // telas cujos dados já são os finais
const spCompletos = (chaves) => chaves.every((k) => segundoPlano[k]?.dados != null);

async function atualizar() {
  const chave0 = chaveRota();
  if (encerradas.has(chave0)) return; // apuração encerrada: nada novo a buscar; recarregue ou use "atualizar agora" na barra de status
  obterEventos().then((d) => atualizarFaixa($("faixa"), d)).catch(() => {});
  const chave = chave0;
  if (emVoo.has(chave)) return; // esta tela já está sendo carregada
  emVoo.add(chave);
  const rota = { ...estado };
  try {
    const v = await carregarView(rota);
    cacheViews.set(chave, v);
    if (telaCompletaPura(v, rota, spCompletos)) encerradas.add(chave);
    if (chave === chaveRota()) { estado.view = v; render(); memo.ultima = new Date(); memo.erro = ""; }
  } catch (e) {
    if (chave === chaveRota()) {
      memo.erro = e.message;
      if (!cacheViews.has(chave)) $("conteudo").innerHTML = TURNO2 && /404|não publicado/i.test(e.message) ? telaAguardandoSegundoTurno()
        : `<section class="card">${aviso(`${e.message} Tentaremos de novo automaticamente.`)}<button type="button" class="link" data-tentar>Tentar agora</button></section>`;
    }
  } finally {
    emVoo.delete(chave);
    if (chave === chaveRota()) memo.proxima = Date.now() + CONFIG.atualizarACadaSegundos * 1000;
  }
}

function mostrarStatus() {
  const el = $("status");
  const seg = Math.max(0, Math.ceil((memo.proxima - Date.now()) / 1000));
  el.classList.toggle("erro", !!memo.erro);
  if (encerradas.has(chaveRota()) && memo.ultima) { // apuração encerrada: sem atualização automática
    el.classList.remove("erro");
    el.innerHTML = `Apuração encerrada · atualizado às ${hora(memo.ultima)} · <button type="button" class="link" data-reabrir>atualizar agora</button>`;
    return;
  }
  el.textContent = memo.ultima
    ? `Atualizado às ${hora(memo.ultima)} · próxima em ${seg}s${memo.erro ? " · falha na última tentativa: " + memo.erro : ""}`
    : memo.erro || "Carregando…";
}

async function carregarMunicipios() {
  try { estado.municipios = lerMunicipios(await buscarJson(urlMunicipios())); montarControles(); } catch { /* segue sem a lista */ }
}

// ---------- base dos percentuais (votos válidos x votos totais) ----------
function montarBase() {
  const b = estado.base;
  $("basebar").innerHTML = `<div class="seg mini turno-chave" role="group" aria-label="Turno da eleição">
      <button type="button" data-turno="1" aria-pressed="${!TURNO2}">1º turno</button><button type="button" data-turno="2" aria-pressed="${TURNO2}">2º turno</button></div>
    <div class="seg mini" role="group" aria-label="Base dos percentuais">
      <button type="button" data-base="validos" aria-pressed="${b === "validos"}">Votos válidos</button><button type="button" data-base="totais" aria-pressed="${b === "totais"}">Votos totais</button></div>
    ${b === "validos" ? `<button type="button" class="chave-sj" data-sj aria-pressed="${estado.semSJ}" title="Recalcula o resultado desconsiderando os votos de candidatos com registro sub judice"><i aria-hidden="true"></i>Sem sub judice</button>` : ""}
    ${b === "validos" && estado.semSJ ? `<p class="muted base-nota">Cenário: os votos de candidatos “anulado sub judice” saem da conta. Percentuais, eleitos, 2º turno e cadeiras são recalculados — não é o resultado oficial do TSE, que ainda os inclui.</p>` : ""}
    ${b === "totais" ? `<p class="muted base-nota">Percentuais sobre todos os eleitores aptos das seções apuradas. Brancos, nulos e abstenções entram como “candidatos”; <b>Não voto</b> é a soma dos três.</p>` : ""}`;
}
$("basebar").addEventListener("click", (e) => {
  const tn = e.target.closest("[data-turno]");
  if (tn) { // o turno muda os arquivos do TSE: recarrega a página com ?turno=, mantendo o endereço atual
    if (Number(tn.dataset.turno) === (TURNO2 ? 2 : 1)) return;
    const u = new URL(location.href); u.searchParams.set("turno", tn.dataset.turno); location.href = u.toString(); return;
  }
  if (e.target.closest("[data-sj]")) { estado.semSJ = !estado.semSJ; montarBase(); render(true); return; }
  const bt = e.target.closest("[data-base]");
  if (!bt || bt.dataset.base === estado.base) return;
  estado.base = bt.dataset.base;
  try { localStorage.setItem("base", estado.base); } catch { /* sem armazenamento: vale só nesta visita */ }
  montarBase(); render(true);
});
montarBase();

// ---------- eventos ----------
$("abas").addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b) { estado.regiao = ""; estado.filtros = filtrosVazios(); navegar({ aba: b.dataset.aba, uf: "BR", cargo: "resumo", mun: "" }); window.scrollTo({ top: 0 }); } }); // trocar de aba recomeça do Brasil, sem carregar o estado da aba anterior
$("mun").addEventListener("change", () => navegar({ mun: $("mun").value }));
$("nav").addEventListener("click", (e) => {
  if (e.target.closest("[data-escopo-toggle]")) { estado.navAberta = !estado.navAberta; renderNavegacao(estado.view); return; }
  const fechar = () => { estado.navAberta = false; };
  const reg = e.target.closest("[data-regiao]");
  if (reg) { estado.regiao = reg.dataset.regiao; if (estado.filtros.uf && regiaoDe(estado.filtros.uf) !== estado.regiao) estado.filtros.uf = ""; if (!estado.regiao || !["andamento", "presidente"].includes(estado.aba)) fechar(); navegar({ uf: "BR", mun: "" }); return; }
  if (e.target.closest("[data-regiao-inteira]")) { fechar(); navegar({ uf: "BR", mun: "" }); return; }
  const nav = e.target.closest("[data-nav-uf]");
  if (nav) { fechar(); estado.rolar = true; navegar({ uf: nav.dataset.navUf, mun: "" }); return; }
});
// ---------- seleção de estado: tira, barra fixa e folha de busca ----------
const folha = $("seletor-estado");
function abrirSeletor() {
  folha.innerHTML = folhaEstados(estado.uf, estado.view?.e);
  folha.showModal();
  folha.querySelector("#busca-estado").focus();
}
function escolherEstado(uf) { if (folha.open) folha.close(); navegar({ uf, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
$("sub").addEventListener("click", (e) => {
  if (e.target.closest("[data-abrir-seletor]")) { abrirSeletor(); return; }
  const viz = e.target.closest("[data-vizinho]");
  if (viz) { navegar({ uf: vizinho(estado.uf, Number(viz.dataset.vizinho)), mun: "" }); return; }
  const c = e.target.closest("[data-cargo]");
  if (c) { navegar({ cargo: c.dataset.cargo, mun: "" }); window.scrollTo({ top: Math.min(window.scrollY, document.getElementById("sub").offsetTop), behavior: "smooth" }); }
});
folha.addEventListener("click", (e) => {
  if (e.target === folha || e.target.closest("[data-fechar-seletor]")) { folha.close(); return; }
  const b = e.target.closest("[data-escolher-uf]"); if (b) escolherEstado(b.dataset.escolherUf);
});
folha.addEventListener("input", (e) => {
  if (e.target.id !== "busca-estado") return;
  const texto = e.target.value.trim(), lista = folha.querySelector(".lista-busca");
  const achados = texto ? filtrarEstados(texto) : [];
  lista.hidden = !texto;
  folha.querySelector(".mapa-brasil").hidden = !!texto;
  folha.querySelector(".nome-estado-mapa").hidden = !!texto;
  lista.innerHTML = achados.length
    ? achados.map((u) => `<li><button type="button" data-escolher-uf="${u}"><b>${u}</b> ${esc(UFS[u])}</button></li>`).join("")
    : `<li class="muted">Nenhum estado encontrado.</li>`;
});
const nomeDoMapa = (e) => { const t = e.target.closest?.(".tile"); const el = folha.querySelector("#nome-estado-mapa"); if (t && el) el.textContent = UFS[t.dataset.escolherUf]; };
folha.addEventListener("pointerover", nomeDoMapa); folha.addEventListener("focusin", nomeDoMapa);
folha.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "busca-estado") { const p = folha.querySelector(".lista-busca [data-escolher-uf]"); if (p) escolherEstado(p.dataset.escolherUf); }
});
iniciarFicha();
function apuracaoDe(sq) {
  const fontes = [estado.view?.d, ...Object.values(estado.view?.detalhe ?? {})].filter(Boolean);
  const c = fontes.flatMap((f) => f.candidatos).find((x) => x.id === String(sq));
  return c ? { votos: c.votos, pct: c.pct, situacao: c.sit ? TEXTO_SIT[c.sit] : c.eleito ? c.situacao || "Eleito" : !c.elegivel ? c.situacaoVoto : null } : null;
}
iniciarGraficos($("conteudo"));
$("conteudo").addEventListener("input", (e) => {
  const campo = e.target.closest?.("[data-busca-texto]");
  if (!campo) return;
  const pos = campo.selectionStart;
  estado.busca.texto = campo.value; estado.mostrar = 50; estado.pag = { eleitos: 0, cand: 0, deps: 0 };
  render(true);
  const novo = $("busca-texto"); if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); } // a lista se refaz sem tirar o cursor do campo
});
$("conteudo").addEventListener("change", (e) => {
  const pt = e.target.closest?.("[data-partido]");
  if (pt) { estado.partido = pt.value; gravarHash(); render(true); return; }
  const gEl = e.target.closest?.("[data-cmpg-modo], [data-cmpg-pa], [data-cmpg-pb], [data-cmpg-ordem]");
  if (gEl) {
    if (gEl.matches("[data-cmpg-modo]")) { estado.cmpGov.modo = gEl.value; estado.cmpGov.ordem = gEl.value === "partidos" ? "vantagemA" : "margem"; }
    else if (gEl.matches("[data-cmpg-pa]")) estado.cmpGov.pa = gEl.value;
    else if (gEl.matches("[data-cmpg-pb]")) estado.cmpGov.pb = gEl.value;
    else estado.cmpGov.ordem = gEl.value;
    render(true); return;
  }
  const cmpEl = e.target.closest?.("[data-cmp-a], [data-cmp-b], [data-cmp-ordem]");
  if (cmpEl) {
    if (cmpEl.matches("[data-cmp-a]")) estado.cmp.a = cmpEl.value;
    else if (cmpEl.matches("[data-cmp-b]")) estado.cmp.b = cmpEl.value;
    else estado.cmp.ordem = cmpEl.value;
    render(true); return;
  }
  const bp = e.target.closest?.("[data-busca-partido]");
  if (bp) { estado.busca.partido = bp.value; estado.mostrar = 50; estado.pag = { eleitos: 0, cand: 0, deps: 0 }; render(true); return; }
  const os = e.target.closest?.("[data-ordem-sel]");
  if (os) { estado.ordem = os.value; render(true); return; }
  const fs = e.target.closest?.("[data-f-status]");
  if (fs) { estado.filtros.status = fs.value; render(true); return; }
  const sel = e.target.closest?.("[data-f-uf]");
  if (sel) { estado.filtros.uf = sel.value; if (sel.value && estado.regiao !== regiaoDe(sel.value)) { estado.regiao = regiaoDe(sel.value); navegar({ uf: "BR", mun: "" }); } else render(true); }
});
$("conteudo").addEventListener("keydown", (e) => {
  const mm = e.target.closest?.("[data-mun-ibge]");
  if (mm && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); estado.munSel = estado.munSel === mm.dataset.munIbge ? "" : mm.dataset.munIbge; render(); return; }
  const mp = e.target.closest?.("[data-mapa-uf]");
  if (mp && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); estado.mapaUf = estado.mapaUf === mp.dataset.mapaUf ? "" : mp.dataset.mapaUf; render(); return; }
  const it = e.target.closest?.("[data-sq]");
  if (it && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirFicha(it.dataset.sq, apuracaoDe(it.dataset.sq)); }
});
$("conteudo").addEventListener("click", (e) => {
  if (e.target.closest("[data-busca-limpar]")) { estado.busca = buscaVazia(); estado.mostrar = 50; estado.pag = { eleitos: 0, cand: 0, deps: 0 }; render(true); return; }
  if (e.target.closest("[data-ver-completa]")) { window.scrollTo({ top: 0 }); return; } // o endereço (#/estados/UF/dep-federal) abre a apuração
  const it = e.target.closest("[data-sq]");
  if (it) { abrirFicha(it.dataset.sq, apuracaoDe(it.dataset.sq)); return; }
  const ord = e.target.closest("[data-ordem]");
  if (ord) { estado.ordem = ord.dataset.ordem; render(); return; }
  if (e.target.closest("[data-tentar]")) { atualizar(); return; }
  const lim = e.target.closest("[data-f-limpar]");
  if (lim) { estado.filtros = filtrosVazios(); render(); return; }
  const mc = e.target.closest("[data-mapa-cargo]");
  if (mc) { estado.mapaCargo = mc.dataset.mapaCargo; estado.munSel = ""; navegar({}); return; }
  const munSel = e.target.closest("[data-mun-ibge]");
  if (munSel) { estado.munSel = estado.munSel === munSel.dataset.munIbge ? "" : munSel.dataset.munIbge; render(); return; }
  const verMun = e.target.closest("[data-ver-mun]");
  if (verMun) { navegar({ cargo: estado.mapaCargo, mun: verMun.dataset.verMun }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const vis = e.target.closest("[data-visao-estados]");
  if (vis) { estado.visaoEstados = vis.dataset.visaoEstados; render(); return; }
  const filtro = e.target.closest("[data-filtro-regiao]");
  if (filtro) { estado.regiao = filtro.dataset.filtroRegiao; navegar({ uf: "BR", mun: "" }); return; }
  const mapaUf = e.target.closest("[data-mapa-uf]");
  if (mapaUf) { estado.mapaUf = estado.mapaUf === mapaUf.dataset.mapaUf ? "" : mapaUf.dataset.mapaUf; render(); return; }
  const pv = e.target.closest("[data-pvisao]");
  if (pv) { estado.partidoVisao = pv.dataset.pvisao; render(); return; }
  const cl = e.target.closest("[data-clausula]");
  if (cl) { estado.clausula = cl.dataset.clausula; render(); return; }
  const agrupC = e.target.closest("[data-agrup-camara]");
  if (agrupC) { estado.agrupCamara = agrupC.dataset.agrupCamara; render(); return; }
  const agrup = e.target.closest("[data-agrup-bancada]");
  if (agrup) { estado.agrupBancada = agrup.dataset.agrupBancada; render(); return; }
  const visaoG = e.target.closest("[data-visao-gov]");
  if (visaoG) { estado.visaoGov = visaoG.dataset.visaoGov; navegar({}); return; }
  const visao = e.target.closest("[data-visao-senado]");
  if (visao) { estado.visaoSenado = visao.dataset.visaoSenado; navegar({}); return; }
  const painel = e.target.closest("[data-painel]");
  if (painel) { estado.painel = painel.dataset.painel; render(); return; }
  const regCard = e.target.closest("[data-regiao]");
  if (regCard) { estado.regiao = regCard.dataset.regiao; navegar({ uf: "BR", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const pag = e.target.closest("[data-pag-lista]");
  if (pag) { const k = pag.dataset.pagLista; estado.pag[k] = Math.max(0, (estado.pag[k] ?? 0) + Number(pag.dataset.dir)); render(); return; }
  const abrir = e.target.closest("[data-abrir-estado]");
  if (abrir) { navegar({ aba: "estados", uf: abrir.dataset.abrirEstado, cargo: "resumo", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const ir = e.target.closest("[data-ir]");
  if (ir) {
    const alvo = ir.dataset.ir;
    if (estado.aba === "estados") navegar({ cargo: alvo });
    else navegar(alvo === "presidente" ? { aba: "presidente", mun: "" } : { aba: "estados", uf: estado.uf === "BR" || estado.uf === "ZZ" ? estado.ufPadrao : estado.uf, cargo: alvo, mun: "" });
    window.scrollTo({ top: 0, behavior: "smooth" }); return;
  }
  const tr = e.target.closest("[data-uf]");
  if (tr && estado.aba === "andamento") { navegar({ uf: estado.uf === tr.dataset.uf ? "BR" : tr.dataset.uf, mun: "" }); return; } // abre/fecha o resumo na própria lista
  if (tr && estado.aba === "camara") { navegar({ aba: "estados", uf: tr.dataset.uf, cargo: "dep-federal", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (tr && (estado.aba === "governadores" || estado.aba === "senadores")) { navegar({ aba: "estados", uf: tr.dataset.uf, cargo: estado.aba === "governadores" ? "governador" : "senador", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (tr && estado.aba === "presidente") { navegar({ uf: tr.dataset.uf, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
});
addEventListener("hashchange", () => { lerHash(); montarControles(); atualizar(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });

const hashInicial = location.hash;
lerHash();
gravarHash(); // endereços antigos passam para o formato novo
montarControles();
carregarMunicipios();
// Primeira visita: abre a visão por estado no estado de quem acessa (a Cloudflare informa a região).
if (!ufGuardada()) {
  fetch("/api/meu-estado").then((r) => r.json()).then(({ uf }) => {
    if (!UFS[uf] || ufGuardada()) return;
    estado.ufPadrao = uf;
    if (estado.aba === "estados" && !hashInicial.split("/")[2]) navegar({ uf });
  }).catch(() => { /* fica com o padrão */ });
}
atualizar();
setInterval(atualizar, CONFIG.atualizarACadaSegundos * 1000);
setInterval(mostrarStatus, 1000);
$("status").addEventListener("click", (e) => { if (e.target.closest("[data-reabrir]")) { encerradas.delete(chaveRota()); atualizar(); } }); // busca de novo, uma vez, se a pessoa quiser conferir
