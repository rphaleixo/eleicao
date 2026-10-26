// Lê o resultado do 1º turno de cada disputa do 2º turno (arquivos -u do TSE, pelo site publicado) e imprime, para cada uma,
// os eleitores aptos das seções apuradas e o "não voto" (abstenções + brancos + nulos), que public/segundo-turno.js guarda
// para mostrar a barra da disputa na base Eleitores aptos. Uso: node tools/disputas-aptos.mjs [https://eleicao.aleixo.workers.dev]
globalThis.location = { search: "?turno=1" };
const { urlsResultado, normalizar } = await import("../public/tse.js");
const { DISPUTAS_SEGUNDO_TURNO } = await import("../public/segundo-turno.js");
const origem = process.argv[2] ?? "https://eleicao.aleixo.workers.dev";
for (const d of DISPUTAS_SEGUNDO_TURNO) {
  const [url] = urlsResultado(d.cargo, d.uf, undefined, 1);
  const r = await (await fetch(origem + url)).json(), x = normalizar(r);
  const aptos = x.eleitorado.apuradas, naoVoto = x.abstencao + x.brancos + x.nulos;
  console.log(JSON.stringify({ cargo: d.cargo, uf: d.uf, aptos, naoVoto, comparecimento: x.comparecimento, brancos: x.brancos, nulos: x.nulos, abstencao: x.abstencao, votosA: d.candidatos.map((c) => [c.numero, x.candidatos.find((k) => k.numero === c.numero)?.votos, c.votos])}));
}
