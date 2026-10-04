// Formatação de números do site. Todo percentual tem sempre 2 casas decimais.
export const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
export const pct = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
