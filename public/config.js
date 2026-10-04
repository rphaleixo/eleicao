// Ajuste aqui quando o TSE publicar os endereços oficiais do dia.
// Também dá para testar pela URL: ?ano=2022&ele=544 (dados reais de 2022).
const p = new URLSearchParams(location.search);

export const CONFIG = {
  ano: p.get("ano") || "2026",
  // Código da eleição (1º turno) informado na página técnica do TSE.
  // PREENCHER: sem ele o site não sabe qual arquivo buscar.
  eleicao: p.get("ele") || "",
  atualizarACadaSegundos: 60,
};

export const CARGOS = {
  presidente: { cod: 1, nome: "Presidente", nacional: true },
  governador: { cod: 3, nome: "Governador" },
  senador: { cod: 5, nome: "Senador", vagas: 2 },
  "dep-federal": { cod: 6, nome: "Deputado Federal", proporcional: true },
  "dep-estadual": { cod: 7, nome: "Deputado Estadual", proporcional: true },
};

export const UFS = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

// Bancada federal por estado (tabela de 2022, 513 cadeiras).
// CONFIRMAR: se a bancada de 2026 mudou, corrija aqui (ou na tela, campo "Vagas").
export const VAGAS_FEDERAIS = {
  AC: 8, AL: 9, AP: 8, AM: 8, BA: 39, CE: 22, DF: 8, ES: 10, GO: 17, MA: 18,
  MT: 8, MS: 8, MG: 53, PA: 17, PB: 12, PR: 30, PE: 25, PI: 10, RJ: 46, RN: 8,
  RS: 31, RO: 8, RR: 8, SC: 16, SP: 70, SE: 8, TO: 8,
};
