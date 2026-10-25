// Busca única do site (componente Busca do design system): candidatos e cidades num só campo, com "usar minha localização" e cidades populares.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const LIMITE = 5;

/** Cidades populares, com a posição aproximada: também servem para achar a mais próxima de quem toca em "Usar minha localização". */
export const CIDADES_POPULARES = [
  ["São Paulo", "SP", -23.55, -46.63], ["Rio de Janeiro", "RJ", -22.91, -43.17], ["Belo Horizonte", "MG", -19.92, -43.94], ["Salvador", "BA", -12.97, -38.51],
  ["Brasília", "DF", -15.79, -47.88], ["Fortaleza", "CE", -3.73, -38.52], ["Recife", "PE", -8.05, -34.88], ["Curitiba", "PR", -25.43, -49.27],
  ["Porto Alegre", "RS", -30.03, -51.23], ["Manaus", "AM", -3.12, -60.02], ["Belém", "PA", -1.46, -48.5], ["Goiânia", "GO", -16.68, -49.25],
  ["São Luís", "MA", -2.53, -44.3], ["Maceió", "AL", -9.67, -35.74], ["Natal", "RN", -5.79, -35.21], ["Teresina", "PI", -5.09, -42.8],
  ["Campo Grande", "MS", -20.47, -54.62], ["João Pessoa", "PB", -7.12, -34.86], ["Aracaju", "SE", -10.91, -37.07], ["Cuiabá", "MT", -15.6, -56.1],
  ["Florianópolis", "SC", -27.6, -48.55], ["Vitória", "ES", -20.32, -40.34], ["Porto Velho", "RO", -8.76, -63.9], ["Macapá", "AP", 0.03, -51.07],
  ["Rio Branco", "AC", -9.97, -67.81], ["Boa Vista", "RR", 2.82, -60.67], ["Palmas", "TO", -10.18, -48.33],
  ["Campinas", "SP", -22.9, -47.06], ["Guarulhos", "SP", -23.46, -46.53], ["Niterói", "RJ", -22.88, -43.1], ["Uberlândia", "MG", -18.92, -48.28],
  ["Joinville", "SC", -26.3, -48.85], ["Londrina", "PR", -23.31, -51.16], ["Santos", "SP", -23.96, -46.33], ["Juiz de Fora", "MG", -21.76, -43.35],
];
/** As seis do atalho: as maiores. */
export const ATALHOS = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador", "Brasília", "Fortaleza"];

/** Cidades que casam com o texto (todas as palavras no nome), as que começam pelo texto primeiro. */
export function buscarCidades(municipiosPorUf, texto, limite = LIMITE) {
  const t = norm(texto);
  if (t.length < 2) return [];
  const palavras = t.split(/\s+/);
  const achadas = [];
  for (const [uf, lista] of Object.entries(municipiosPorUf ?? {})) {
    if (uf === "ZZ") continue;
    for (const m of lista) { const n = norm(m.nome); if (palavras.every((p) => n.includes(p))) achadas.push({ ...m, uf, comeca: n.startsWith(t) }); }
  }
  return achadas.sort((a, b) => Number(b.comeca) - Number(a.comeca) || a.nome.length - b.nome.length || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, limite);
}

/** Candidatos que casam por nome (todas as palavras) ou número. */
export function buscarCandidatos(indice, texto, limite = LIMITE) {
  const t = norm(texto);
  if (t.length < 2) return [];
  const palavras = t.split(/\s+/);
  return (indice ?? []).filter((c) => { const alvo = norm(`${c.nome} ${c.numero ?? ""}`); return palavras.every((p) => alvo.includes(p)); })
    .sort((a, b) => Number(norm(b.nome).startsWith(t)) - Number(norm(a.nome).startsWith(t)) || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, limite);
}

/** A cidade popular mais próxima de uma posição (distância aproximada em graus, com a longitude corrigida pela latitude). */
export function maisProxima(lat, lon) {
  let melhor = null, d = Infinity;
  for (const [nome, uf, la, lo] of CIDADES_POPULARES) {
    const x = (lo - lon) * Math.cos((lat * Math.PI) / 180), y = la - lat, dist = x * x + y * y;
    if (dist < d) { d = dist; melhor = { nome, uf }; }
  }
  return melhor;
}

/** Acha o código do TSE de uma cidade pelo nome e pelo estado. */
export const acharCidade = (municipiosPorUf, nome, uf) => (municipiosPorUf?.[uf] ?? []).find((m) => norm(m.nome) === norm(nome)) ?? null;

const NOME_CARGO = { presidente: "Presidente", governador: "Governador", senador: "Senador" };
const destaque = (nome, texto) => esc(nome);

/** O conteúdo da janela de busca. `b` = { texto, candidatos[], cidades[], localizacao: "" | "buscando" | "negada" | "sem-cidade", carregandoIndice }. */
export function htmlBusca(b, { corPartido = () => "var(--sem-cor)", nomeUf = (u) => u } = {}) {
  const t = norm(b.texto ?? "");
  const cands = b.candidatos ?? [], cids = b.cidades ?? [];
  const lista = (itens, vazio) => itens.length ? `<ul class="el-resultados" role="listbox">${itens.join("")}</ul>` : vazio;
  const linhaC = (c) => `<li><button type="button" role="option" data-busca-cand="${esc(c.id)}"><span class="el-chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span> ${destaque(c.nome, t)}<small>${NOME_CARGO[c.cargo] ?? c.cargo}${c.uf && c.uf !== "BR" ? ` · ${esc(c.uf)}` : ""}</small></button></li>`;
  const linhaM = (m) => `<li><button type="button" role="option" data-busca-cidade="${esc(m.uf)}/${esc(m.cod)}">${esc(m.nome)}<small>${esc(nomeUf(m.uf))}</small></button></li>`;
  const resultados = t.length >= 2
    ? `<div class="busca-grupo"><span class="el-apoio">Candidatos</span>${lista(cands.map(linhaC), `<p class="el-apoio">${b.carregandoIndice ? "Carregando os candidatos…" : `Nada encontrado para “${esc(b.texto)}”. Confira o número do candidato.`}</p>`)}</div>
       <div class="busca-grupo"><span class="el-apoio">Cidades</span>${lista(cids.map(linhaM), `<p class="el-apoio">Nada encontrado para “${esc(b.texto)}”.</p>`)}</div><p class="el-apoio">No máximo ${LIMITE} resultados de cada tipo; refine para ver os demais.</p>`
    : `<div class="busca-atalhos"><button type="button" class="el-botao el-botao--cheio" data-busca-local>◎ Usar minha localização</button>
        ${b.localizacao === "buscando" ? `<p class="el-apoio">Procurando onde você está…</p>` : b.localizacao === "negada" ? `<p class="el-apoio">Não foi possível localizar. Digite o nome da cidade.</p>` : ""}
        <span class="el-apoio">Cidades populares</span><div class="el-abas el-abas--filtro el-abas--atalhos" role="group" aria-label="Cidades populares">${ATALHOS.map((n) => { const c = CIDADES_POPULARES.find((x) => x[0] === n); return `<button type="button" class="el-aba" data-busca-popular="${esc(n)}|${c[1]}">${esc(n)}</button>`; }).join("")}</div></div>`;
  return `<div class="busca-cab"><label class="el-campo">Buscar candidato ou cidade<input type="search" id="busca-unica" data-busca-unica value="${esc(b.texto)}" placeholder="Nome, número ou cidade" autocomplete="off"></label><button type="button" class="busca-fechar" data-busca-fechar aria-label="Fechar a busca">×</button></div>${resultados}`;
}
