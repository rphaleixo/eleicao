import { controleTema } from "./tema.js";
// Navegação do design system: barra inferior (celular) e menu lateral (desktop), com as mesmas áreas na mesma ordem.
// As áreas que não existem no turno (Senado e deputados no 2º turno) simplesmente não aparecem.
const ICONES = {
  andamento: "M5 20V10M12 20V4M19 20v-7",
  evolucao: "M3 18l5-7 4 3 8-9M3 21h18",
  presidente: "M6 21V4M6 4h11l-2 4 2 4H6",
  governadores: "M4 21h16M6 21V9l6-5 6 5v12M10 21v-6h4v6",
  camara: "M3 20v-1a5 5 0 015-5h2a5 5 0 015 5v1M9 10a3 3 0 100-6 3 3 0 000 6zM16 14a4 4 0 014 4v2M15 4.2a3 3 0 010 5.6",
  estados: "M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z",
  mais: "",
};
const ICONE_INFO = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>`;
const svg = (id) => id === "mais"
  ? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`
  : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[id] ?? ICONES.andamento}"/>${id === "estados" ? '<circle cx="12" cy="9" r="2.5"/>' : ""}</svg>`;

/** Grupos do menu lateral, na ordem do design system. */
export const GRUPOS = [
  ["Acompanhar", ["andamento", "evolucao"]],
  ["Cargos", ["presidente", "governadores", "senadores", "camara"]],
  ["Estado", ["estados"]],
  ["Análises", ["partidos", "cenarios", "geo", "nulos"]],
];

const href = (id) => `#/${id}`;
const nomeDe = (abas, id) => abas.find((a) => a.id === id)?.nome ?? id;

/** Menu lateral: onze áreas em quatro grupos, numeradas em sequência. */
export function menuLateral(abas, atual, turnoTxt) {
  const tem = (id) => abas.some((a) => a.id === id);
  const grupos = GRUPOS.map(([nome, ids]) => [nome, ids.filter(tem)]).filter(([, ids]) => ids.length);
  return `<div class="el-menu__marca">Apuração 2026<small>${turnoTxt}</small></div>${grupos.map(([nome, ids]) =>
    `<p class="el-menu__grupo">${nome}</p><ol>${ids.map((id) => `<li><a href="${href(id)}" data-area="${id}"${id === atual ? ' aria-current="true"' : ""}>${nomeDe(abas, id)}</a></li>`).join("")}</ol>`).join("")}
    <ul class="el-menu__sobre"><li><button type="button" data-gaveta aria-haspopup="dialog" aria-expanded="false">${ICONE_INFO}Como calcular</button></li></ul><div class="el-menu__tema"><span class="el-apoio">Tema</span>${controleTema()}</div><div class="el-menu__rodape">Fonte: arquivos de divulgação do TSE. Site independente, sem vínculo com o TSE.</div>`;
}

/** As quatro áreas principais da barra: no 1º turno, Deputados no lugar de Governadores (que vai para o "Mais"). */
export function destinosPrincipais(abas, turno2) {
  const tem = (id) => abas.some((a) => a.id === id);
  const ids = ["andamento", "presidente", turno2 ? "governadores" : "camara", "estados"].filter(tem);
  return ids;
}

/** Barra inferior com cinco destinos, e a lista do "Mais" com as demais áreas. */
export function barraInferior(abas, atual, turno2) {
  const principais = destinosPrincipais(abas, turno2);
  const resto = GRUPOS.flatMap(([, ids]) => ids).filter((id) => abas.some((a) => a.id === id) && !principais.includes(id));
  const emMais = resto.includes(atual);
  const link = (id) => `<a href="${href(id)}" data-area="${id}"${id === atual ? ' aria-current="true"' : ""}>${svg(id)}${nomeDe(abas, id)}</a>`;
  const barra = `${principais.map(link).join("")}<a href="#" data-mais aria-haspopup="dialog"${emMais ? ' aria-current="true"' : ""}>${svg("mais")}Mais</a>`;
  const folha = `<div class="el-folha__tema"><span class="el-apoio">Tema</span>${controleTema()}</div><h2>Mais áreas</h2><ul>${resto.map((id) => `<li><a href="${href(id)}" data-area="${id}"${id === atual ? ' aria-current="true"' : ""}>${nomeDe(abas, id)}</a></li>`).join("")}</ul><button type="button" class="folha-sobre" data-gaveta aria-haspopup="dialog" aria-expanded="false">Como calcular</button><button type="button" data-fechar-mais>Fechar</button>`;
  return { barra, folha };
}
