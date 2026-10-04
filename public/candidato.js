// Modal com a ficha completa do candidato (dados do banco). Não aparece na tela de apuração.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const campo = (rotulo, valor) => (valor == null || valor === "" ? "" : `<div><dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd></div>`);

export const urlFichaCandidato = (sq) => `/api/candidato/${encodeURIComponent(sq)}`;
export const urlFotoFicha = (f) => `/api/ele2026/${f.eleicao}/fotos/${f.uf === "BR" ? "br" : f.uf.toLowerCase()}/${f.sq}.jpeg`;

export function htmlFicha(f, apuracao) {
  const p = f.pessoa;
  const naturalidade = p.ufNascimento ? `${p.ufNascimento}` : null;
  const idade = f.idade != null ? `${f.idade} anos (na posse)` : p.anoNascimento ? `nascido em ${p.anoNascimento}` : null;
  const votos = apuracao ? `<section><h3>Na apuração</h3><dl class="ficha-campos">
      ${campo("Votos", fmt(apuracao.votos))}${campo("% dos votos", apuracao.pct != null ? Number(apuracao.pct).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%" : null)}
      ${campo("Situação", apuracao.situacao)}</dl></section>` : "";
  const agr = f.agremiacao;
  const bens = f.bens.itens.length
    ? `<section><h3>Bens declarados (${fmt(f.bens.itens.length)})</h3><p class="ficha-total">Patrimônio total: <strong>${brl(f.bens.total)}</strong></p>
        <div class="tab-scroll"><table><tr><th>Tipo</th><th>Descrição</th><th>Valor</th></tr>
        ${f.bens.itens.map((b) => `<tr><td style="text-align:left">${esc(b.tipo)}</td><td style="text-align:left;white-space:normal">${esc(b.descricao)}</td><td>${brl(b.valor)}</td></tr>`).join("")}</table></div></section>`
    : `<section><h3>Bens declarados</h3><p class="muted">Nenhum bem declarado.</p></section>`;
  const hist = f.historico.length
    ? `<section><h3>Candidaturas anteriores (${f.historico.length})</h3><div class="tab-scroll"><table><tr><th>Ano</th><th>Cargo</th><th>Local</th><th>Partido</th><th>Resultado</th></tr>
        ${f.historico.map((h) => `<tr><td>${h.ano}${h.turno === 2 ? " (2º t.)" : ""}</td><td style="text-align:left">${esc(h.cargo_nome)}</td><td style="text-align:left">${esc(h.municipio && h.municipio !== h.uf ? `${h.municipio}/${h.uf ?? ""}` : h.uf)}</td><td>${esc(h.partido)}</td><td style="text-align:left">${esc(h.resultado ?? h.julgamento ?? "")}</td></tr>`).join("")}</table></div></section>`
    : `<section><h3>Candidaturas anteriores</h3><p class="muted">Sem candidaturas anteriores registradas.</p></section>`;
  const outras = f.outrasCandidaturas.length
    ? `<p class="muted">Esta pessoa tem outra(s) candidatura(s) em 2026: ${f.outrasCandidaturas.map((o) => `${esc(o.cargoNome)} (${esc(o.uf)})`).join(", ")}.</p>` : "";
  return `<header class="ficha-topo"><img class="foto ficha-foto" alt="" src="${urlFotoFicha(f)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <div><h2 id="ficha-titulo">${esc(f.nomeUrna)}</h2><p class="muted">${esc(f.nome)}</p>
      <p><span class="chip">${esc(f.federacao || f.partido || "–")}</span> ${esc(f.cargoNome)} · ${f.uf === "BR" ? "Brasil" : esc(f.uf)} · nº ${esc(f.numero)}</p></div></header>
    ${votos}
    <section><h3>Candidatura</h3><dl class="ficha-campos">
      ${campo("Partido", f.partido)}${campo("Federação", f.federacao)}${campo("Tipo", agr?.tipo)}${campo("Composição", agr?.composicao)}
      ${campo("Registro", f.julgamento)}${campo("Destino dos votos", f.destinacaoVotos)}${campo("Reeleição", f.reeleicao === "S" ? "Sim" : f.reeleicao === "N" ? "Não" : null)}
      ${campo("Teto de gastos", f.tetoGastos != null ? brl(f.tetoGastos) : null)}</dl>${outras}</section>
    <section><h3>Dados pessoais</h3><dl class="ficha-campos">
      ${campo("Idade", idade)}${campo("Gênero", p.genero)}${campo("Cor/raça", p.corRaca)}${campo("Instrução", p.instrucao)}${campo("Ocupação", p.ocupacao)}${campo("Naturalidade", naturalidade)}</dl></section>
    ${bens}${hist}
    <p class="muted">Fonte: cadastro de candidaturas do TSE (DivulgaCandContas). Dados do registro, que podem mudar até a diplomação.</p>`;
}

export async function abrirFicha(sq, apuracao) {
  const dlg = document.getElementById("ficha");
  const corpo = document.getElementById("ficha-corpo");
  corpo.innerHTML = `<p class="muted">Carregando…</p>`;
  if (!dlg.open) dlg.showModal();
  try {
    const r = await fetch(urlFichaCandidato(sq));
    if (!r.ok) throw new Error(r.status === 404 ? "Candidato não encontrado no cadastro." : `Falha ao carregar (HTTP ${r.status}).`);
    corpo.innerHTML = htmlFicha(await r.json(), apuracao);
  } catch (e) {
    corpo.innerHTML = `<p class="aviso">${esc(e.message)}</p>`;
  }
}

export function iniciarFicha() {
  const dlg = document.getElementById("ficha");
  document.getElementById("ficha-fechar").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
}
