// Busca por nome/número e filtro por partido na lista de candidatos de um estado (deputados federais e estaduais).
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PREFIXO_FED = "fed:"; // valor da lista para uma federação inteira (todos os partidos dela)
export const buscaVazia = () => ({ texto: "", partido: "" });
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Passa se todas as palavras digitadas aparecem no nome ou no número, e se o partido (quando escolhido) é o do candidato. */
export function passaBusca(c, { texto = "", partido = "" } = {}) {
  if (partido && !(partido.startsWith(PREFIXO_FED) ? c.federacao === partido.slice(PREFIXO_FED.length) : c.partido === partido)) return false;
  const alvo = norm(`${c.nome} ${c.numero ?? ""}`);
  return norm(texto).split(/\s+/).filter(Boolean).every((p) => alvo.includes(p));
}
export const filtrando = (b) => !!(b?.texto?.trim() || b?.partido);

/** Partidos presentes entre os candidatos, com a quantidade, em ordem alfabética. */
export function partidosDe(candidatos) {
  const m = new Map();
  for (const c of candidatos) m.set(c.partido, (m.get(c.partido) ?? 0) + 1);
  return [...m].map(([sigla, n]) => ({ sigla, n })).sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
}

/** Federações presentes (composição, ex.: "PP / UNIÃO"), com a quantidade de candidatos. */
export function federacoesDe(candidatos) {
  const m = new Map();
  for (const c of candidatos) if (c.federacao) m.set(c.federacao, (m.get(c.federacao) ?? 0) + 1);
  return [...m].map(([nome, n]) => ({ nome, n })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Bloco com o campo de texto, a lista de partidos (e federações) e o botão de limpar. `achados` = quantos candidatos passaram. */
export function barraBusca(candidatos, busca, achados) {
  const opt = (valor, rotulo) => `<option value="${esc(valor)}"${valor === busca.partido ? " selected" : ""}>${esc(rotulo)}</option>`;
  const feds = federacoesDe(candidatos), partidos = partidosDe(candidatos);
  const opcoes = (feds.length ? `<optgroup label="Federações (todos os partidos)">${feds.map((f) => opt(PREFIXO_FED + f.nome, `${f.nome} (${f.n})`)).join("")}</optgroup>` : "")
    + `<optgroup label="Partidos">${partidos.map((p) => opt(p.sigla, `${p.sigla} (${p.n})`)).join("")}</optgroup>`;
  return `<section class="card busca-cand"><h2>Buscar candidatos</h2>
    <div class="busca-linha"><label class="f-sel busca-texto"><span>Nome ou número</span><input type="search" id="busca-texto" data-busca-texto value="${esc(busca.texto)}" placeholder="Ex.: Silva ou 1234" autocomplete="off" enterkeyhint="search"></label>
    <label class="f-sel"><span>Partido ou federação</span><select data-busca-partido aria-label="Filtrar por partido ou federação"><option value="">Todos</option>${opcoes}</select></label></div>
    ${filtrando(busca) ? `<p class="muted busca-info">${achados} de ${candidatos.length} candidatos <button type="button" class="f-limpar" data-busca-limpar>Limpar busca</button></p>` : ""}</section>`;
}
