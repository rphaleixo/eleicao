#!/usr/bin/env node
// Prepara o arquivo do mapa de nulos: junta o resultado por urna (urnas-<uf>.jsonl, de nulos-digitados.mjs), as coordenadas dos
// locais de votação (eleitorado_local_votacao_2026_<UF>.csv, do TSE) e os nomes de partidos e candidatos (arquivos -u do TSE).
// Uso: node tools/preparar-nulos-mapa.mjs rj --urnas dados-nulos/urnas-rj.jsonl --locais eleitorado_local_votacao_2026_RJ.csv --resumo public/dados/nulos-rj.json --saida public/dados/nulos-rj-mapa.json
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const uf = (args.find((a) => /^[a-z]{2}$/i.test(a)) ?? "").toLowerCase();
const opcao = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const [arqUrnas, arqLocais, arqResumo, arqSaida] = ["urnas", "locais", "resumo", "saida"].map(opcao);
if (!uf || !arqUrnas || !arqLocais || !arqResumo || !arqSaida) { console.error("Faltam argumentos. Veja o início do arquivo."); process.exit(1); }
const NUM = 16; // quantos números mais frequentes (por cargo) têm contagem em cada local
const CARGOS = ["1", "3", "5"];
const ORIGEM = "https://resultados.tse.jus.br/oficial/ele2026";

// ---------- coordenadas e nomes dos locais ----------
const linhasCsv = readFileSync(arqLocais, "latin1").split(/\r?\n/).filter(Boolean);
const campos = (l) => l.split(";").map((c) => c.replace(/^"|"$/g, ""));
const cab = campos(linhasCsv[0]);
const col = Object.fromEntries(cab.map((c, i) => [c, i]));
const secao = new Map(); // "mun/zona/seção" -> local
for (const l of linhasCsv.slice(1)) {
  const c = campos(l), lat = Number(c[col.NR_LATITUDE].replace(",", ".")), lon = Number(c[col.NR_LONGITUDE].replace(",", "."));
  const key = `${c[col.CD_MUNICIPIO]}/${String(c[col.NR_ZONA]).padStart(4, "0")}/${String(c[col.NR_SECAO]).padStart(4, "0")}`;
  secao.set(key, { mn: c[col.NM_MUNICIPIO], local: c[col.NR_LOCAL_VOTACAO], nome: c[col.NM_LOCAL_VOTACAO], bairro: c[col.NM_BAIRRO], lat, lon, valido: Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0 && lat > -90 });
}

// ---------- números mais frequentes por cargo (do resumo do estado) ----------
const resumo = JSON.parse(readFileSync(arqResumo, "utf8"));
const topo = Object.fromEntries(CARGOS.map((c) => [c, resumo.total[c].nulos.slice(0, NUM).map(([d]) => d)]));

// ---------- locais ----------
const locais = new Map();
let semCoordenada = 0, lidas = 0;
for (const linha of readFileSync(arqUrnas, "utf8").split("\n")) {
  if (!linha) continue;
  const u = JSON.parse(linha); lidas++;
  const s = secao.get(`${u.m}/${u.z}/${u.s}`);
  if (!s?.valido) { semCoordenada++; continue; }
  const id = `${u.m}/${u.z}/${s.local}`;
  const l = locais.get(id) ?? { m: u.m, mn: s.mn, z: u.z, nl: s.nome, b: s.bairro, la: +s.lat.toFixed(5), lo: +s.lon.toFixed(5), u: 0, c: Object.fromEntries(CARGOS.map((c) => [c, { n: 0, d: {} }])) };
  l.u++;
  for (const c of CARGOS) for (const [dig, q] of Object.entries(u.c?.[c]?.[4] ?? {})) { l.c[c].n += q; l.c[c].d[dig] = (l.c[c].d[dig] ?? 0) + q; }
  locais.set(id, l);
}
const saidaLocais = [...locais.values()].map((l) => ({
  m: l.m, mn: l.mn, z: l.z, nl: l.nl, b: l.b, la: l.la, lo: l.lo, u: l.u,
  c: Object.fromEntries(CARGOS.map((c) => [c, [l.c[c].n, topo[c].map((d) => l.c[c].d[d] ?? 0), Object.entries(l.c[c].d).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)]])),
}));

// ---------- nomes de partidos e candidatos ----------
async function tse(caminho) { const r = await fetch(`${ORIGEM}/${caminho}`); if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`); return r.json(); }
const partidos = {}, candidatos = { 1: {}, 3: {}, 5: {} };
const lerCargo = (json, destino) => {
  for (const a of json.carg?.[0]?.agr ?? []) for (const p of a.par ?? []) {
    partidos[p.n] = p.sg;
    for (const c of p.cand ?? []) if (destino) destino[c.n] = `${c.nmu ?? c.nm} (${p.sg})`;
  }
};
lerCargo(await tse(`6259/dados/${uf}/${uf}-c0006-e006259-u.json`), null); // deputado federal: todos os partidos
lerCargo(await tse(`6257/dados/${uf}/${uf}-c0001-e006257-u.json`), candidatos[1]);
lerCargo(await tse(`6259/dados/${uf}/${uf}-c0003-e006259-u.json`), candidatos[3]);
lerCargo(await tse(`6259/dados/${uf}/${uf}-c0005-e006259-u.json`), candidatos[5]);

writeFileSync(arqSaida, JSON.stringify({ uf: uf.toUpperCase(), geradoEm: new Date().toISOString(), cargos: CARGOS, topo, nomes: { partidos, candidatos }, locais: saidaLocais }));
console.log(`${lidas} urnas lidas; ${semCoordenada} sem coordenada; ${saidaLocais.length} locais de votação; ${Object.keys(partidos).length} partidos. Salvo em ${arqSaida}`);
