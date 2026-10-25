// Regras de cálculo de cada tela, mostradas na gaveta "Como calcular" (seção "Nesta tela").
const R = {
  andamento: ["Apuração", "O percentual de apuração é seções apuradas ÷ seções totais, como o TSE informa. Presentes e ausentes são calculados sobre os eleitores aptos das seções já apuradas. Cada estado mostra a situação do próprio arquivo do TSE."],
  presidente: ["Presidente", "O percentual de cada candidato é votos no candidato ÷ votos válidos (soma dos votos em candidatos). Com a base Eleitores aptos, brancos, nulos e abstenções entram como parte do total. Quem passa de 50% dos válidos é eleito no 1º turno; senão, os dois mais votados vão ao 2º turno."],
  governadores: ["Governadores", "Em cada estado, o percentual é votos no candidato ÷ votos válidos. Mais de 50% dos válidos elege no 1º turno; sem isso, os dois mais votados disputam o 2º turno. O resumo nacional conta quantos governos cada partido já elegeu."],
  senadores: ["Senadores", "Percentual = votos no candidato ÷ votos válidos do estado. Cada estado elege duas vagas em 2026: os dois mais votados. O site só marca eleito quando nenhum rival, somando todos os eleitores das seções que faltam, pode alcançá-lo."],
  camara: ["Deputados", "Votos válidos são votos em candidatos mais votos em legendas. O quociente eleitoral (QE) é votos válidos ÷ vagas do estado. Cada partido ou federação recebe vagas pelo quociente partidário (votos ÷ QE) e as sobras seguem as regras de 2026; o candidato precisa de pelo menos 10% do QE. Antes do fim da apuração as cadeiras são uma projeção, e vêm rotuladas assim."],
  estados: ["Meu estado", "Os cartões usam as mesmas regras de cada cargo: percentual sobre votos válidos para Presidente, Governador e Senador, e quociente eleitoral para deputados. A abstenção é sobre os eleitores aptos das seções já apuradas."],
  partidos: ["Partidos", "Vitórias, 2º turno e derrotas contam as disputas majoritárias do partido (Presidente, Governador, Senador). Em deputados, os votos do partido ou da federação somam candidatos e legenda. A cláusula de desempenho segue a EC 97/2017: percentual dos votos válidos nacionais ou número de deputados federais eleitos em estados."],
  cenarios: ["Cenários", "Os cenários são hipóteses: recalculam as vagas da Câmara com os votos reais do 1º turno, mudando só a composição das federações. Nunca são o resultado oficial do TSE. O quociente partidário e as sobras são refeitos em cada estado."],
  geo: ["Geografia", "Todas as medidas são sobre os eleitores aptos do município: abstenção, brancos e nulos. Não voto é a soma dos três. A cor mostra a taxa ou o número de pessoas, conforme a visão escolhida; brancos e nulos chegam município a município, então o mapa vai se completando."],
  nulos: ["Nulos", "Conta só os votos nulos digitados, urna a urna (registro digital do voto), no estado do Rio de Janeiro. O percentual de cada número é sobre o total de nulos digitados no cargo. Zeros são nulo proposital; números de partido sem candidato ou com dígito errado são separados."],
  turnos: ["Comparar turnos", "Lula, Flávio Bolsonaro e outros são percentuais sobre votos válidos (só candidatos) e somam 100%. Com a base Eleitores aptos entra também o não voto (abstenções, brancos e nulos). A variação é em pontos percentuais: 2º turno menos 1º turno. Enquanto o 2º turno não termina, os números dele são parciais."],
};
const POR_CARGO = {
  governador: "Governador no estado: percentual = votos no candidato ÷ votos válidos; mais de 50% dos válidos elege no 1º turno.",
  senador: "Senador no estado: percentual = votos no candidato ÷ votos válidos; os dois mais votados ocupam as vagas.",
  presidente: "Presidente no estado: percentual = votos no candidato ÷ votos válidos do estado (o resultado final é nacional).",
  "dep-federal": "Deputado Federal: votos válidos = candidatos mais legendas; quociente eleitoral = válidos ÷ vagas do estado; candidato precisa de 10% do quociente.",
  "dep-estadual": "Deputado Estadual: votos válidos = candidatos mais legendas; quociente eleitoral = válidos ÷ vagas da Assembleia; candidato precisa de 10% do quociente.",
  mapa: "Mapa por município: o percentual é votos no candidato ÷ votos válidos do município; a cor mostra o líder ou o percentual.",
};

/** Título e texto das regras da tela aberta; em "Meu estado", o cargo escolhido acrescenta a regra dele. */
export function regrasDaTela(aba, cargo = "") {
  const [titulo, texto] = R[aba] ?? R.andamento;
  const extra = aba === "estados" ? POR_CARGO[cargo] ?? "" : "";
  return { titulo, texto: extra ? `${texto} ${extra}` : texto };
}

export const TEXTO_BASE = {
  validos: "Votos válidos são só os votos em candidatos e legendas. Brancos, nulos e abstenções ficam de fora.",
  totais: "Eleitores aptos: o percentual é sobre todos os eleitores das seções apuradas, e o não voto (abstenções, brancos e nulos) aparece à parte.",
};

/** O texto do botão de base logo abaixo do título de cada tela. */
export function baseAtual(aba, base) {
  if (aba === "geo") return ["Medido sobre os eleitores aptos de cada município", ""];
  if (aba === "nulos") return ["Percentuais sobre os nulos digitados", ""];
  return ["Percentuais sobre", base === "totais" ? "eleitores aptos" : "votos válidos"];
}
