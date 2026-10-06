// Códigos de eleição publicados no índice do TSE (comum/config/ele-c.json).
// Em 2026 são DOIS códigos por turno: um só para Presidente e outro para
// Governador, Senador e Deputados.
// Para testar com outro ciclo: ?ano=2024&fed=619&est=619
import { UFS_GOVERNO_SEGUNDO_TURNO } from "./segundo-turno.js";
const p = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
// 2º turno: 25/10/2026. A partir dessa data o site abre direto no 2º turno; antes, ?turno=2 mostra a prévia e ?turno=1 volta ao 1º turno.
const INICIO_DIA_SEGUNDO_TURNO = Date.parse("2026-10-25T00:00:00-03:00");
const turno = p.get("turno") === "2" ? 2 : p.get("turno") === "1" ? 1 : typeof location !== "undefined" && Date.now() >= INICIO_DIA_SEGUNDO_TURNO ? 2 : 1;

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

// Os gráficos de evolução começam às 17h (Brasília) do dia da eleição, quando o TSE inicia a divulgação.
export const INICIO_APURACAO = Date.parse(turno === 2 ? "2026-10-25T17:00:00-03:00" : "2026-10-04T17:00:00-03:00");
export const TURNO2 = turno === 2;
/** Página dos cenários "e se...": no subdomínio ese.* ou em /ese. Só tem a aba de cenários. */
export const MODO_ESE = typeof location !== "undefined" && (/^ese\./.test(location.hostname) || /^\/ese(\/|\/index\.html)?$/.test(location.pathname));
/** O 2º turno já começou (a partir de 25/10): só então vale buscar os arquivos dele para consolidar o resultado geral. */
export const SEGUNDO_TURNO_ABERTO = typeof location !== "undefined" && Date.now() >= INICIO_DIA_SEGUNDO_TURNO;

export const CARGOS = {
  presidente: { cod: 1, nome: "Presidente", nacional: true, federal: true },
  governador: { cod: 3, nome: "Governador" },
  senador: { cod: 5, nome: "Senador" },
  "dep-federal": { cod: 6, nome: "Deputado Federal", proporcional: true },
  "dep-estadual": { cod: 7, nome: "Deputado Estadual", proporcional: true },
};

const TODAS_ABAS = [
  { id: "andamento", nome: "Marcha da apuração" },
  { id: "presidente", nome: "Presidente" },
  { id: "governadores", nome: "Governadores" },
  { id: "senadores", nome: "Senadores" },
  { id: "camara", nome: "Deputados" },
  { id: "partidos", nome: "Partidos" },
  { id: "cenarios", nome: "E se…" },
  { id: "geo", nome: "Geografia" },
  { id: "nulos", nome: "Nulos" },
  { id: "estados", nome: "Estados" },
];

// No 2º turno só há Presidente e o governo de sete estados: sem Senado nem deputados.
export const ABAS = MODO_ESE ? TODAS_ABAS.filter((a) => a.id === "cenarios") : TURNO2 ? TODAS_ABAS.filter((a) => ["andamento", "presidente", "governadores", "partidos", "cenarios", "estados"].includes(a.id)) : TODAS_ABAS;

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

// Estados que elegem governador neste turno (no 2º turno, só os sete com disputa definida em 04/10/2026).
export const UFS_GOV = TURNO2 ? UFS_GOVERNO_SEGUNDO_TURNO : Object.keys(UFS);
