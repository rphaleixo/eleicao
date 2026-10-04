import { CONFIG, CARGOS, UFS, VAGAS_FEDERAIS } from "./config.js";
import { urlResultado, urlMunicipios, buscarJson, normalizar, lerMunicipios } from "./tse.js";
import {
  distribuirCadeiras, vagasEstaduais, REGRAS_STF_2024, REGRAS_CODIGO_LITERAL,
} from "./quociente.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const pct = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const estado = { cargo: "presidente", uf: "BR", mun: "", municipios: {}, modoRegras: "stf", vagasManual: {} };
let timer;

// ---------- navegação (guardada na URL, ex.: #/governador/SP/71072) ----------
function lerHash() {
  const [, cargo, uf, mun] = location.hash.split("/");
  if (CARGOS[cargo]) estado.cargo = cargo;
  estado.uf = (uf || (CARGOS[estado.cargo].nacional ? "BR" : "SP")).toUpperCase();
  estado.mun = mun || "";
  if (!CARGOS[estado.cargo].nacional && estado.uf === "BR") estado.uf = "SP";
}
function gravarHash() {
  const partes = [estado.cargo, estado.uf, estado.mun].filter(Boolean);
  history.replaceState(null, "", "#/" + partes.join("/"));
}

function montarControles() {
  $("cargos").innerHTML = Object.entries(CARGOS)
    .map(([k, c]) => `<button data-c="${k}" aria-current="${k === estado.cargo}">${c.nome}</button>`).join("");
  $("cargos").querySelectorAll("button").forEach((b) => (b.onclick = () => {
    estado.cargo = b.dataset.c; estado.mun = "";
    if (!CARGOS[estado.cargo].nacional && estado.uf === "BR") estado.uf = "SP";
    atualizarTudo();
  }));

  const ufs = Object.entries(UFS).map(([s, n]) => `<option value="${s}">${n}</option>`).join("");
  $("uf").innerHTML = (CARGOS[estado.cargo].nacional ? `<option value="BR">Brasil</option>` : "") + ufs;
  $("uf").value = estado.uf;
  $("uf").onchange = () => { estado.uf = $("uf").value; estado.mun = ""; atualizarTudo(); };

  const permiteMun = !CARGOS[estado.cargo].proporcional && estado.uf !== "BR";
  $("lbl-mun").hidden = !permiteMun;
  const lista = estado.municipios[estado.uf] || [];
  $("mun").innerHTML = `<option value="">Todo o estado</option>` +
    lista.map((m) => `<option value="${m.cod}">${esc(m.nome)}</option>`).join("");
  $("mun").value = estado.mun;
  $("mun").onchange = () => { estado.mun = $("mun").value; atualizarTudo(); };
}

// ---------- telas ----------
function cabecalhoApuracao(d) {
  return `<div class="card"><div class="resumo">
    <div><span class="muted">Seções apuradas</span><strong>${pct(d.pctSecoes)}</strong></div>
    <div><span class="muted">Votos válidos</span><strong>${fmt(d.votosValidos)}</strong></div>
    <div><span class="muted">Brancos</span><strong>${fmt(d.brancos)}</strong></div>
    <div><span class="muted">Nulos</span><strong>${fmt(d.nulos)}</strong></div>
  </div><div class="progresso"><i style="width:${Math.min(100, d.pctSecoes)}%"></i></div>
  ${d.atualizadoEm ? `<p class="muted">Arquivo do TSE gerado em ${esc(d.atualizadoEm)}</p>` : ""}</div>`;
}

function listaCandidatos(cands, limite = 30) {
  const max = Math.max(1, ...cands.map((c) => c.votos));
  return cands.slice(0, limite).map((c) => `
    <div class="cand ${c.eleito ? "eleito" : ""}">
      <div class="nome">${esc(c.nome)} <small>${esc(c.numero)} · ${esc(c.partido)}</small>${c.eleito ? '<span class="selo">ELEITO</span>' : ""}</div>
      <div class="num"><strong>${fmt(c.votos)}</strong> <span class="muted">${pct(c.pct)}</span></div>
      <div class="barra"><i style="width:${(c.votos / max) * 100}%"></i></div>
    </div>`).join("");
}

function telaMajoritaria(d) {
  const c = CARGOS[estado.cargo];
  const titulo = estado.cargo === "senador" ? `Senador (${c.vagas} vagas, os dois mais votados são eleitos)` : c.nome;
  return cabecalhoApuracao(d) + `<div class="card"><h2 style="margin-top:0">${titulo}</h2>${listaCandidatos(d.candidatos)}</div>`;
}

function vagasDoEstado() {
  const chave = estado.cargo + estado.uf;
  if (estado.vagasManual[chave]) return estado.vagasManual[chave];
  const fed = estado.vagasManual["dep-federal" + estado.uf] || VAGAS_FEDERAIS[estado.uf] || 0;
  return estado.cargo === "dep-federal" ? fed : vagasEstaduais(fed);
}

function telaProporcional(d) {
  const vagas = vagasDoEstado();
  const regras = estado.modoRegras === "stf" ? REGRAS_STF_2024 : REGRAS_CODIGO_LITERAL;

  let partidos = d.partidos.map((p) => ({
    id: p.id, nome: p.nome, votos: p.votos, votosLegenda: p.votosLegenda,
    candidatos: p.candidatos.map((c) => ({ id: c.id, nome: c.nome, votos: c.votos })),
  }));
  const semPartidos = !partidos.length;
  const r = semPartidos ? null : distribuirCadeiras(vagas, partidos, regras);

  const parcial = d.pctSecoes < 100;
  let html = cabecalhoApuracao(d);

  html += `<div class="card"><h2 style="margin-top:0">Quociente eleitoral</h2>
    <div class="regras">
      <label>Vagas em disputa<input type="number" id="vagas" min="1" value="${vagas}"></label>
      <label>Regra das sobras
        <select id="modo">
          <option value="stf" ${estado.modoRegras === "stf" ? "selected" : ""}>Com decisão do STF de 2024 (todos disputam sobras)</option>
          <option value="codigo" ${estado.modoRegras === "codigo" ? "selected" : ""}>Texto literal do Código (80% partido, 20% candidato)</option>
        </select>
      </label>
    </div>`;
  if (r) {
    html += `<div class="resumo" style="margin-top:12px">
      <div><span class="muted">Votos válidos (candidatos + legenda)</span><strong>${fmt(r.votosValidos)}</strong></div>
      <div><span class="muted">Quociente eleitoral</span><strong>${fmt(r.qe)}</strong></div>
      <div><span class="muted">10% do quociente</span><strong>${fmt(r.qe * 0.1)}</strong></div>
    </div>`;
  } else {
    html += `<p class="aviso">Este arquivo não trouxe os votos por partido. O cálculo precisa deles (veja o arquivo bruto na página de diagnóstico).</p>`;
  }
  if (parcial) html += `<p class="aviso">Apuração em ${pct(d.pctSecoes)}. O quociente e as vagas abaixo são uma projeção com os votos contados até agora e vão mudar.</p>`;
  html += `</div>`;

  if (r) {
    html += `<div class="card tabela-scroll"><h2 style="margin-top:0">Vagas por partido ou federação</h2><table>
      <tr><th>Partido / federação</th><th>Votos</th><th>Quociente partidário</th><th>Por quociente</th><th>Por sobras</th><th>Total</th></tr>
      ${r.partidos.map((p) => {
        const q = p.eleitos.filter((c) => c.via === "quociente").length;
        return `<tr><td>${esc(p.nome)}</td><td>${fmt(p.votos)}</td><td>${p.qp}</td><td>${q}</td><td>${p.eleitos.length - q}</td><td><strong>${p.eleitos.length}</strong></td></tr>`;
      }).join("")}</table>`;
    if (r.proximoFora) {
      html += `<p class="muted">Primeiro fora, hoje: ${esc(r.proximoFora.cand.nome)} (${esc(r.proximoFora.partido)}), média ${fmt(r.proximoFora.media)}.</p>`;
    }
    html += `</div><div class="card"><h2 style="margin-top:0">Eleitos (${r.eleitos.length} de ${vagas})</h2>
      ${listaCandidatos(r.eleitos.map((e) => ({ ...e, numero: "", pct: 0, eleito: true })), 100).replace(/<span class="muted">0,00%<\/span>/g, "")}</div>`;
  }
  html += `<div class="card"><h2 style="margin-top:0">Mais votados</h2>${listaCandidatos(d.candidatos, 30)}</div>`;
  return html;
}

function ligarEventosProporcional() {
  const v = $("vagas"), m = $("modo");
  if (v) v.onchange = () => { estado.vagasManual[estado.cargo + estado.uf] = Number(v.value) || 0; carregar(); };
  if (m) m.onchange = () => { estado.modoRegras = m.value; carregar(); };
}

// ---------- carregamento ----------
async function carregar() {
  const el = $("conteudo");
  if (!CONFIG.eleicao) {
    el.innerHTML = `<p class="aviso">Falta configurar o código da eleição do TSE em public/config.js (campo "eleicao"). Para testar com dados de 2022, abra o site com ?ano=2022&amp;ele=544 no final do endereço.</p>`;
    return;
  }
  $("status").textContent = "Atualizando…";
  try {
    const url = urlResultado(estado.cargo, estado.uf, estado.mun);
    const json = await buscarJson(url);
    const d = normalizar(json);
    const proporcional = CARGOS[estado.cargo].proporcional;
    el.innerHTML = proporcional ? telaProporcional(d) : telaMajoritaria(d);
    if (proporcional) ligarEventosProporcional();
    $("status").textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR");
  } catch (e) {
    $("status").textContent = "";
    el.innerHTML = `<p class="aviso">${esc(e.message)} Tentaremos de novo automaticamente.</p>`;
  }
}

async function carregarMunicipios() {
  if (!CONFIG.eleicao) return;
  try { estado.municipios = lerMunicipios(await buscarJson(urlMunicipios())); } catch { /* segue sem lista */ }
}

function atualizarTudo() {
  gravarHash();
  montarControles();
  carregar();
}

lerHash();
montarControles();
carregarMunicipios().then(() => { montarControles(); });
carregar();
timer = setInterval(carregar, CONFIG.atualizarACadaSegundos * 1000);
addEventListener("hashchange", () => { lerHash(); montarControles(); carregar(); });
