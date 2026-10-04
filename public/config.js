// Códigos de eleição publicados no índice do TSE (comum/config/ele-c.json).
// Em 2026 são DOIS códigos por turno: um só para Presidente e outro para
// Governador, Senador e Deputados.
// Para testar com outro ciclo: ?ano=2024&fed=619&est=619
const p = new URLSearchParams(location.search);
const turno = p.get("turno") === "2" ? 2 : 1;

const PADRAO_2026 = turno === 2
  ? { federal: "6258", estadual: "6260" }
  : { federal: "6257", estadual: "6259" };

export const CONFIG = {
  ano: p.get("ano") || "2026",
  turno,
  eleicaoFederal: p.get("fed") || PADRAO_2026.federal,
  eleicaoEstadual: p.get("est") || PADRAO_2026.estadual,
  atualizarACadaSegundos: 10, // requisições automáticas a cada 10 segundos
  atualizarNacionalACadaSegundos: 30, // soma dos 27 estados (arquivos grandes)
  atualizarHistoricoACadaSegundos: 30,
};

export const CARGOS = {
  presidente: { cod: 1, nome: "Presidente", nacional: true, federal: true },
  governador: { cod: 3, nome: "Governador" },
  senador: { cod: 5, nome: "Senador" },
  "dep-federal": { cod: 6, nome: "Deputado Federal", proporcional: true },
  "dep-estadual": { cod: 7, nome: "Deputado Estadual", proporcional: true },
};

export const ABAS = [
  { id: "andamento", nome: "Marcha da apuração" },
  { id: "presidente", nome: "Presidente" },
  { id: "camara", nome: "Câmara (513)" },
  { id: "estados", nome: "Estados" },
];

export const UFS = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

// Reserva: bancada federal por estado (2022). O número de vagas oficial vem
// do próprio arquivo do TSE (campo "nv"); esta tabela só é usada se faltar.
export const VAGAS_FEDERAIS = {
  AC: 8, AL: 9, AP: 8, AM: 8, BA: 39, CE: 22, DF: 8, ES: 10, GO: 17, MA: 18,
  MT: 8, MS: 8, MG: 53, PA: 17, PB: 12, PR: 30, PE: 25, PI: 10, RJ: 46, RN: 8,
  RS: 31, RO: 8, RR: 8, SC: 16, SP: 70, SE: 8, TO: 8,
};
