import { textoAptos, telaMarcha, regiaoDe, locaisResultado, navegacaoRegional, heroApuracao, escopoDoPainel, cardCargo, cardBancada, situacaoGeral, agregar, REGIOES } from "./marcha.js";
import { agregarResultados } from "./agregado.js";
import { fmt, pct } from "./formato.js";
import { rankingMajoritario } from "./ranking.js";
import { cardEstado, cardRegiao, gradeCards, linha2022, cardMunicipio } from "./cardsEstados.js";
import { montarBancada, telaBancada, situacaoUf } from "./bancada.js";
import { statusProjecao } from "./status.js";
import { barraFiltros, filtrarUfs, filtrosVazios, statusEleicao } from "./filtros.js";
import { blocoTop10, cardsMaisVotados } from "./deputadosVotados.js";
import { seletorAgrupCamara, plenarioCamara, porPartidoCamara, cardsEstadosCamara, tabelaEstadosCamara, lideresCamara, MAIORIA_CAMARA } from "./camara.js";
import { mapaBrasil, legendaMapa, contarLideres, COR_SEGUNDO_TURNO, mapaMunicipal } from "./mapa.js";
import { lerMalha, carregarMunicipios as carregarVotosMunicipais, lerMun, progresso } from "./municipios.js";
import { ordenarCandidatos } from "./ranking.js";
import { faixaDefinicao, legendaSituacao, TEXTO_SIT, situacaoEleicao, seloSit, seloProjetado, rotuloEleito } from "./situacao.js";
import { cartoesVotacao } from "./votacao.js";
import { lerRota, montarRota } from "./rota.js";
import { barraEstado, folhaEstados, filtrarEstados, vizinho } from "./seletor.js";
import { abrirFicha, iniciarFicha } from "./candidato.js";
import { CONFIG, CARGOS, ABAS, UFS, INICIO_APURACAO } from "./config.js";
import {
  urlsResultado, urlMunicipios, urlAcompanhamento, urlHistorico, urlEventos, urlResultadosPresidente, urlFoto,
  buscarJson, buscarPrimeiro, normalizar, lerMunicipios, lerAcompanhamento,
} from "./tse.js";
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { corPartido, ajustarContrasteChips } from "./cores.js";
import { linhaEvolucao, linhasResultado } from "./graficos.js";
import { atualizarFaixa } from "./eventos.js";
import { iniciarGraficos, reaplicarGraficos } from "./graficoInterativo.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (d) => d.toLocaleTimeString("pt-BR");
const nomeUF = (uf) => (uf === "BR" ? "Brasil" : uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

const estado = { aba: "andamento", uf: "BR", cargo: "resumo", mun: "", municipios: {}, mostrar: 50, pagEleitos: 0, view: null, serie: "f", regiao: "", ordem: "az", painel: "geral", visaoSenado: "estados", agrupBancada: "partido", agrupCamara: "partido", visaoEstados: "cards", mapaUf: "", mapaCargo: "governador", munSel: "", filtros: filtrosVazios(), visaoGov: "estados" };
const memo = { historico: { t: 0, dados: [] }, ultima: null, proxima: 0, erro: "" };

// ---------- navegação (guardada na URL: #/estados/SP/governador/71072) ----------
const guardarUf = (uf) => { try { localStorage.setItem("uf-estados", uf); } catch { /* sem armazenamento */ } };
const ufGuardada = () => { try { const u = localStorage.getItem("uf-estados"); return UFS[u] ? u : ""; } catch { return ""; } };
estado.ufPadrao = ufGuardada() || "SP";
const cargoAtivo = () => (estado.aba === "estados" ? estado.cargo : estado.aba);

function lerHash() {
  Object.assign(estado, lerRota(location.hash, { ufs: UFS, ufPadrao: estado.ufPadrao }));
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

const chaveRota = () => `${estado.aba}/${estado.uf}/${estado.cargo}/${estado.mun}${estado.aba === "presidente" ? "/" + estado.regiao : ""}${estado.aba === "senadores" ? "/" + estado.visaoSenado : ""}${estado.aba === "governadores" ? "/" + estado.visaoGov : ""}${estado.aba === "estados" && estado.cargo === "mapa" ? "/" + estado.mapaCargo : ""}`; // na aba Presidente a região também muda a carga
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
  estado.mostrar = 50; estado.pagEleitos = 0;
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
async function obter(cargo, uf, mun) {
  const { json } = await buscarPrimeiro(urlsResultado(cargo, uf, mun));
  return normalizar(json);
}
const obterAcompanhamento = async (cargo) => lerAcompanhamento(await buscarJson(urlAcompanhamento(cargo)));

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
async function obterResultadosPresidente(locais) {
  const chave = locais.join(",");
  const m = memoRP.get(chave);
  if (m && Date.now() - m.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return m.dados;
  let dados = m?.dados ?? null;
  try { dados = await buscarJson(urlResultadosPresidente(locais)); } catch { /* segue com o que já tinha */ }
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

async function panorama(cargo) {
  const ufs = [...Object.keys(UFS), ...(cargo === "presidente" ? ["ZZ"] : [])];
  const rs = await Promise.allSettled(ufs.map((uf) => obter(cargo, uf)));
  return ufs.map((uf, i) => ({ uf, d: rs[i].status === "fulfilled" ? rs[i].value : null }));
}

async function estadosDepFederal() {
  const lista = (await panorama("dep-federal")).filter((x) => x.d);
  return lista.map(({ uf, d }) => ({ uf, d, dist: distribuirEstado(d) }));
}

async function detalhesEstado(uf, comDeputados = false) {
  const talvez = (cargo) => obter(cargo, uf).catch(() => null);
  const bancada = async (cargo) => { const d = await talvez(cargo); return d ? { d, dist: distribuirEstado(d) } : null; };
  const [pres, gov, sen, depf, depe] = await Promise.all([talvez("presidente"), uf === "ZZ" ? null : talvez("governador"), uf === "ZZ" ? null : talvez("senador"),
    comDeputados ? bancada("dep-federal") : null, comDeputados ? bancada("dep-estadual") : null]);
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
    const [d, rp] = await Promise.all([obter(cargo, uf, mun), cargo === "presidente" ? obterResultadosPresidente(locaisResultado(uf, "")) : null]);
    return { ...base, d, rp };
  }
  if (aba === "governadores" || aba === "senadores") {
    const cargo = aba === "governadores" ? "governador" : "senador";
    const lista = emSegundoPlano("pan-" + cargo, CONFIG.atualizarACadaSegundos * 900, () => panorama(cargo));
    const [e, mandatos] = await Promise.all([obterAcompanhamento("governador"), cargo === "senador" ? obterMandatos() : null]);
    return { tipo: "cargo-por-estado", cargo, e, lista, mandatos, visao: rota.visaoSenado };
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

function blocoResultadoEvolucao(rp, local, final = false) {
  const largura = Math.max(300, Math.min(640, document.documentElement.clientWidth - 64));
  const grafico = rp === undefined ? `<p class="muted vazio-grafico">Carregando o histórico…</p>`
    : linhasResultado(rp, local, corPartido, { largura, inicio: INICIO_APURACAO, ate: final ? 0 : Date.now() });
  return `<section class="card"><h2>Evolução do resultado</h2>${grafico}
    <p class="muted">% dos votos válidos de cada candidato, desde o início da apuração, minuto a minuto. Toque no gráfico para ver um momento.</p></section>`;
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
    <td><span class="chip" style="--cor:${corPartido(l.sigla)}">${esc(l.sigla)}</span></td><td>${fmt(l.votos)}</td><td>${pct(l.pctVotos)}</td>
    <td><strong>${l.vagas}</strong></td><td>${l.qp}</td><td>${l.porQuociente}</td><td>${l.porSobras}</td>${final ? `<td>${l.oficial ?? ""}</td>` : ""}</tr>`).join("");
  return `<div class="tab-scroll"><table><tr><th>Partido / federação</th><th>Votos</th><th>% dos votos</th><th>Cadeiras</th><th>QP</th><th>Por quociente</th><th>Por sobras</th>${final ? "<th>Oficial TSE</th>" : ""}</tr>${linhas}</table></div>`;
}

const POR_PAGINA = 15;

/** Candidatos eleitos (oficiais ou projetados), do mais votado ao menos votado. */
function dadosEleitos(d, dist) {
  const oficiais = d.candidatos.filter((c) => c.eleito);
  const usaOficial = d.totalizacaoFinal && oficiais.length > 0;
  const base = usaOficial
    ? oficiais.map((c) => ({ id: c.id, partido: c.partido, nome: c.nome, votos: c.votos, sub: c.situacao }))
    : [...dist.eleitos].sort((a, b) => b.votos - a.votos).map((e) => ({ id: e.id, partido: e.partido, nome: e.nome, votos: e.votos, sub: e.via === "quociente" ? "quociente" : e.via === "art. 111" ? "art. 111" : `sobra (${e.rodada ?? 1}ª rodada)` }));
  return { usaOficial, base };
}

/** Box dos eleitos: 15 por página, com a paginação dentro do próprio box. */
function boxEleitos(d, dist) {
  const { usaOficial, base } = dadosEleitos(d, dist);
  const paginas = Math.max(1, Math.ceil(base.length / POR_PAGINA));
  const pag = Math.min(Math.max(0, estado.pagEleitos), paginas - 1);
  const ini = pag * POR_PAGINA, fatia = base.slice(ini, ini + POR_PAGINA);
  const max = Math.max(1, base[0]?.votos ?? 1);
  const cargo = cargoAtivo();
  const itens = fatia.map((b, i) => `<li class="ce" style="--cor:${corPartido(b.partido)}" data-sq="${esc(b.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
      <span class="pos">${ini + i + 1}</span><img class="foto mini" loading="lazy" alt="" src="${urlFoto(cargo, estado.uf, b.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <span class="ce-nome"><b>${esc(b.nome)}</b><span class="chip" style="--cor:${corPartido(b.partido)}">${esc(b.partido)}</span>${usaOficial ? seloSit({ sit: "eleito" }, { curto: true }) : seloProjetado({ curto: true })}<small>${esc(b.sub)}</small></span>
      <span class="ce-votos">${fmt(b.votos)}</span><span class="cr-barra"><i style="width:${(b.votos / max) * 100}%"></i></span></li>`).join("");
  const nav = paginas > 1
    ? `<nav class="paginacao" aria-label="Páginas dos eleitos"><button type="button" data-pag-eleitos="-1" ${pag === 0 ? "disabled" : ""}>‹ Anteriores</button>
        <span>${ini + 1}–${ini + fatia.length} de ${base.length}</span><button type="button" data-pag-eleitos="1" ${pag >= paginas - 1 ? "disabled" : ""}>Próximos ›</button></nav>` : "";
  return `<section class="card"><div class="titulo-cadeiras"><h2>Candidatos eleitos</h2><span class="muted">${base.length} de ${dist.vagas}</span></div>
    <p class="muted">${usaOficial ? "Resultado oficial do TSE." : "Projeção com os votos contados até agora."}</p>
    ${base.length ? `<ol class="lista-eleitos" start="${ini + 1}">${itens}</ol>${nav}` : `<p class="muted">Nenhum candidato eleito ainda.</p>`}</section>`;
}

function maisVotados(d, rotulo = "Candidatos por votos", projetados = null) {
  const max = Math.max(1, d.candidatos[0]?.votos ?? 1);
  const selo = (c) => c.sit ? seloSit(c, { rotulo: rotuloEleito(c) }) : projetados?.has(c.id) ? seloProjetado() : !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "";
  const itens = d.candidatos.slice(0, estado.mostrar).map((c, i) =>
    itemCandidato({ pos: i + 1, nome: c.nome, sub: ` ${c.numero}`, partido: c.partido, votos: c.votos, pctVotos: null, max, foto: fotoDe(cargoAtivo(), estado.uf, c), sq: c.id,
      badge: selo(c), eleito: !!c.sit })).join("");
  const mais = d.candidatos.length > estado.mostrar ? `<button class="mais" data-mais>Ver mais (${fmt(d.candidatos.length - estado.mostrar)} candidatos)</button>` : "";
  return `<section class="card"><h2>${esc(rotulo)} (${fmt(d.candidatos.length)})</h2>${itens}${mais}</section>`;
}

function carregandoEstados(titulo) {
  return `<section class="card"><h2>${esc(titulo)}</h2><p class="muted">Carregando os 27 estados…</p></section>`;
}

function telaMajoritaria(v) {
  const { d } = v, { uf, mun } = estado, aba = cargoAtivo();
  const local = mun ? `${nomeUF(uf)}, município ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : nomeUF(uf);
  const titulo = aba === "senador" ? `Senador (${d.vagas || 2} vagas): ${local}` : `${CARGOS[aba].nome}: ${local}`;
  const evolucao = !mun && aba === "presidente" ? blocoResultadoEvolucao(v.rp, locaisResultado(uf, ""), d.totalizacaoFinal) : "";
  return `${blocoProgresso(titulo, d, null)}<section class="card"><h2>Candidatos por votos</h2>${rankingMajoritario(d, { aba, uf })}</section>${cartoesVotacao(d)}${evolucao}`;
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
    <p class="muted nota-estado">Deslize para ver todas as eleições. Porcentagens de candidatos: votos no candidato ÷ votos válidos.</p>`;
}

function telaMapaMunicipal(v) {
  const { uf } = estado, cargo = v.cargoMapa ?? estado.mapaCargo;
  const seg = `<div class="seg visao-mapa" role="group" aria-label="Eleição no mapa">${[["governador", "Governador"], ["presidente", "Presidente"], ["senador", "Senador"]].map(([k, n]) => `<button type="button" data-mapa-cargo="${k}" aria-pressed="${k === cargo}">${n}</button>`).join("")}</div>`;
  if (v.malha?.erro) return `${seg}<section class="card">${aviso(v.malha.erro)}</section>`;
  const municipios = estado.municipios[uf] ?? [];
  if (!municipios.length) return `${seg}<section class="card"><p class="muted">A lista de municípios ainda não foi carregada. Tente de novo em instantes.</p></section>`;
  const nomes = new Map(municipios.map((m) => [m.ibge, m.nome]));
  const porIbge = new Map(municipios.map((m) => [m.ibge, m]));
  const lideres = new Map(), contagem = {};
  let semVotos = 0;
  for (const m of municipios) {
    const d = lerMun(cargo, uf, m.cod);
    const topo = d ? ordenarCandidatos(d.candidatos)[0] : null;
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

function telaCargoPorEstado(v) {
  if (v.cargo === "senador" && estado.visaoSenado === "bancada") return telaBancadaSenado(v);
  if (v.cargo === "senador" && estado.visaoSenado === "eleitos") return `${seletorSenado("eleitos")}${telaEleitos(v, "senador")}`;
  if (v.cargo === "governador" && estado.visaoGov === "eleitos") return `${seletorGovernador("eleitos")}${telaEleitos(v, "governador")}`;
  const { regiao } = estado, cargo = v.cargo, governador = cargo === "governador";
  const plural = governador ? "Governadores" : "Senadores", singular = governador ? "governador" : "senador";
  const ds = v.lista ? v.lista.map((x) => x.d).filter(Boolean) : [];
  const definidas = ds.filter((d) => situacaoEleicao(d) === "eleito").length, segundoTurno = ds.filter((d) => situacaoEleicao(d) === "segundo").length;
  const resumo = governador ? `${definidas} definido${definidas === 1 ? "" : "s"} · ${segundoTurno} no 2º turno` : `${definidas} eleição${definidas === 1 ? "" : "ões"} definida${definidas === 1 ? "" : "s"}`;
  // Governadores: só os cards. Senadores: o painel geral continua.
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, regiao === "exterior" ? "" : regiao, "BR");
  const hero = governador ? "" : heroApuracao({ ...p, titulo: regiao ? p.titulo : plural, subtitulo: regiao ? p.subtitulo : "2 vagas por estado, 54 no total", extra: v.lista ? `<p class="hero-sub">${resumo}</p>` : "", grafico: false, hist: [] });
  const ufs = (regiao && REGIOES[regiao] ? REGIOES[regiao].ufs : Object.keys(UFS)).slice();
  const de2022 = new Map((v.mandatos?.senadores ?? []).map((x) => [x.uf, x]));
  const extra = (u) => (governador ? "" : linha2022(de2022.get(u)));
  const secao = blocoPorEstado({ titulo: `${governador ? "Governador" : "Senador"} por estado`, cargo, lista: v.lista, ac: v.e, ufs, regiao, porPartido: true, maioria: governador, extra,
    nota: `Toque em um estado para ver a disputa completa de ${singular}.${governador ? "" : " Cada estado elege 2 senadores hoje; o terceiro foi eleito em 2022."} Abstenção sobre as seções já apuradas.` });
  return `${governador ? seletorGovernador("estados") : seletorSenado("estados")}${hero}<section class="card sem-borda">${governador ? `<p class="muted">${v.lista ? resumo : ""}</p>` : ""}${legendaSituacao(governador)}</section>${secao}`;
}

/** Resumo nacional (senadores ou governadores): uma linha por estado com a situação no momento e o % de urnas apuradas. */
function telaEleitos(v, cargo) {
  const senador = cargo === "senador", f = filtrosAtuais();
  const nomePlural = senador ? "Senadores" : "Governadores";
  if (!v.lista) return carregandoEstados(`Resumo nacional · ${nomePlural}`);
  const dDe = (u) => v.lista.find((x) => x.uf === u)?.d ?? null;
  const todas = Object.keys(UFS).sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  const ufs = filtrarUfs(todas, f, (u) => statusEleicao(dDe(u)));
  const nome = (c) => `<b class="link-cand" data-sq="${esc(c.id)}" role="button" tabindex="0" style="--cor:${corPartido(c.partido)}">${esc(c.nome)}</b> <span class="muted">${esc(c.partido)}</span>`;
  const situacaoDe = (d) => {
    const ordenados = ordenarCandidatos(d.candidatos).filter((c) => c.votos > 0 && c.elegivel);
    const eleitos = ordenados.filter((c) => c.sit === "eleito"), segundos = ordenados.filter((c) => c.sit === "segundo");
    if (!ordenados.length) return `<span class="muted">Sem votos apurados</span>`;
    if (!senador && segundos.length) return `<span class="selo-sit segundo"><i aria-hidden="true">2º</i>2º turno</span> ${segundos.map(nome).join(" × ")}`;
    if (eleitos.length) {
      const falta = senador ? (d.vagas || 2) - eleitos.length : 0;
      const lider = falta > 0 ? ordenados.filter((c) => !c.sit).slice(0, falta) : [];
      return `<span class="selo-sit eleito"><i aria-hidden="true">✓</i>${eleitos.length > 1 ? "Eleitos" : "Eleito"}</span> ${eleitos.map(nome).join(" e ")}${falta > 0 ? `<br><span class="muted">${falta} vaga${falta > 1 ? "s" : ""} em aberto${lider.length ? ` · à frente: ${lider.map(nome).join(", ")}` : ""}</span>` : ""}`;
    }
    const topo = ordenados.slice(0, senador ? d.vagas || 2 : 2);
    return `<span class="selo-sit projetado"><i aria-hidden="true">…</i>Em aberto</span> ${topo.map((c) => `${nome(c)} <span class="muted">${pct(c.pct)}</span>`).join(senador ? ", " : " × ")}`;
  };
  const linhas = ufs.map((uf) => {
    const d = dDe(uf);
    if (!d) return "";
    return `<tr class="clicavel" data-uf="${uf}"><td class="uf-nome">${esc(UFS[uf])}</td><td style="text-align:left;white-space:normal">${situacaoDe(d)}</td>
      <td><span class="mini-barra"><i style="width:${Math.min(100, d.pctSecoes)}%"></i></span>${pct(d.pctSecoes)}</td></tr>`;
  }).join("");
  const contagem = { definida: 0, segundo: 0, aberta: 0 };
  ufs.forEach((u) => { const d = dDe(u); if (d) contagem[statusEleicao(d)]++; });
  const resumo = [`${contagem.definida} com eleição definida`, !senador && contagem.segundo ? `${contagem.segundo} com 2º turno` : "", `${contagem.aberta} em aberto`].filter(Boolean).join(" · ");
  return `<section class="card"><div class="titulo-cadeiras"><h2>Resumo nacional · ${nomePlural}</h2><span class="muted">${ufs.length} estados</span></div>
    ${statusAcompanhamento(v.e)}
    <p class="muted">${resumo}.${senador ? " Cada estado elege 2 senadores." : ""}</p>
    ${barraFiltros(f, { comSegundo: !senador })}
    <div class="tab-scroll"><table><tr><th>Estado</th><th>Situação no momento</th><th>Urnas apuradas</th></tr>${linhas || `<tr><td colspan="3" class="muted" style="text-align:left">Nenhum estado com esses filtros.</td></tr>`}</table></div></section>`;
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
  return `${hero}
    <section class="card"><h2>Candidatos por votos</h2>${listaCand}</section>${d ? cartoesVotacao(d) : ""}${grafico}${quadroPorRegiao(v, uf)}${tabelaPresidentePorEstado(v, uf, emRegiao ? ufsRegiao : null)}`;
}

/**
 * Líder (cor e nome) de cada estado, para colorir o mapa.
 * Com `maioria` (governador), o estado só ganha a cor do partido se o líder tiver mais da metade dos votos válidos (50% + 1);
 * senão a cor é a do 2º turno.
 */
function lideresPorUf(lista, porPartido, maioria = false) {
  const out = {};
  for (const { uf, d } of lista ?? []) {
    const topo = d ? ordenarCandidatos(d.candidatos)[0] : null;
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
  const chips = barraFiltros(filtrosAtuais(), { comSegundo: cargo !== "senador", ordem: visao === "cards" ? estado.ordem : null });
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
    ${boxEleitos(d, dist)}
    <section class="card"><h2>Partidos e federações</h2>${tabelaPartidos(dist, d)}${COMO}</section>
    ${cartoesVotacao(d, { proporcional: true })}
    ${maisVotados(d, "Candidatos por votos", new Set(dist.eleitos.map((e) => e.id)))}`;
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
  if (aba === "camara") return !["partido", "top10"].includes(estado.agrupCamara);
  return false;
}
let navAnterior = "", subAnterior = "";
let ultimoAc = null; // andamento por estado mais recente, para a navegação aparecer enquanto a tela carrega
function renderNavegacao(v) {
  ultimoAc = v?.f ?? v?.ac ?? v?.e ?? ultimoAc;
  const nav = usaRegiao() && ultimoAc
    ? navegacaoRegional(ultimoAc, { regiao: estado.regiao, uf: estado.uf, comExterior: estado.aba === "andamento" || estado.aba === "presidente", comEstados: estado.aba === "andamento" || estado.aba === "presidente" }) : "";
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
  if (!forcar && document.activeElement?.tagName === "SELECT" && $("conteudo").contains(document.activeElement)) return; // não fecha a lista de estados enquanto ela está aberta
  const tela = { andamento: (v) => telaMarcha(v, estado, false), estados: telaEstados, presidente: telaPresidente, "cargo-por-estado": telaCargoPorEstado, "nacional-prop": telaNacionalProp }[v.tipo];
  renderNavegacao(v);
  $("conteudo").innerHTML = tela(v);
  reaplicarGraficos($("conteudo"));
  ajustarContrasteChips($("conteudo"));
  if (estado.rolar) { estado.rolar = false; document.querySelector("li.aberto")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

// ---------- atualização automática (a cada 10 segundos) ----------
// Cada tela carrega por conta própria: trocar de visão nunca espera uma carga anterior terminar.
const emVoo = new Set();
async function atualizar() {
  obterEventos().then((d) => atualizarFaixa($("faixa"), d)).catch(() => {});
  const chave = chaveRota();
  if (emVoo.has(chave)) return; // esta tela já está sendo carregada
  emVoo.add(chave);
  const rota = { ...estado };
  try {
    const v = await carregarView(rota);
    cacheViews.set(chave, v);
    if (chave === chaveRota()) { estado.view = v; render(); memo.ultima = new Date(); memo.erro = ""; }
  } catch (e) {
    if (chave === chaveRota()) {
      memo.erro = e.message;
      if (!cacheViews.has(chave)) $("conteudo").innerHTML = `<section class="card">${aviso(`${e.message} Tentaremos de novo automaticamente.`)}<button type="button" class="link" data-tentar>Tentar agora</button></section>`;
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
  el.textContent = memo.ultima
    ? `Atualizado às ${hora(memo.ultima)} · próxima em ${seg}s${memo.erro ? " · falha na última tentativa: " + memo.erro : ""}`
    : memo.erro || "Carregando…";
}

async function carregarMunicipios() {
  try { estado.municipios = lerMunicipios(await buscarJson(urlMunicipios())); montarControles(); } catch { /* segue sem a lista */ }
}

// ---------- eventos ----------
$("abas").addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b) { estado.regiao = ""; estado.filtros = filtrosVazios(); navegar({ aba: b.dataset.aba, uf: "BR", cargo: "resumo", mun: "" }); window.scrollTo({ top: 0 }); } }); // trocar de aba recomeça do Brasil, sem carregar o estado da aba anterior
$("mun").addEventListener("change", () => navegar({ mun: $("mun").value }));
$("nav").addEventListener("click", (e) => {
  const reg = e.target.closest("[data-regiao]");
  if (reg) { estado.regiao = reg.dataset.regiao; if (estado.filtros.uf && regiaoDe(estado.filtros.uf) !== estado.regiao) estado.filtros.uf = ""; navegar({ uf: "BR", mun: "" }); return; }
  if (e.target.closest("[data-regiao-inteira]")) { navegar({ uf: "BR", mun: "" }); return; }
  const nav = e.target.closest("[data-nav-uf]");
  if (nav) { estado.rolar = true; navegar({ uf: nav.dataset.navUf, mun: "" }); return; }
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
$("conteudo").addEventListener("change", (e) => {
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
  const pag = e.target.closest("[data-pag-eleitos]");
  if (pag) { estado.pagEleitos = Math.max(0, estado.pagEleitos + Number(pag.dataset.pagEleitos)); render(); return; }
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
