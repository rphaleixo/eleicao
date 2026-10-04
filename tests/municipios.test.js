globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { lerMalha, carregarMunicipios, lerMun, progresso, limparMunicipios } = await import("../public/municipios.js");
const { mapaMunicipal } = await import("../public/mapa.js");
const { lerMunicipios } = await import("../public/tse.js");
const { cardMunicipio } = await import("../public/cardsEstados.js");
const { barraEstado } = await import("../public/seletor.js");
const { lerRota } = await import("../public/rota.js");
const { UFS } = await import("../public/config.js");

const SVG = '<?xml version="1.0"?><svg viewBox="-53.1 19.7 8.9 5.5"><g transform="scale(0.0001,-0.0001)"><path id="3500105" d="M0,0l10,10Z" /><path id="3500204" d="M5,5l1,1Z" /></g></svg>';

test("lê o desenho do IBGE: viewBox e um caminho por município", () => {
  const m = lerMalha(SVG);
  assert.equal(m.viewBox, "-53.1 19.7 8.9 5.5");
  assert.deepEqual([...m.caminhos.keys()], ["3500105", "3500204"]);
  assert.equal(m.caminhos.get("3500105"), "M0,0l10,10Z");
});

test("a lista de municípios do TSE traz o código do IBGE", () => {
  const r = lerMunicipios({ abr: [{ cd: "sp", mu: [{ cd: "71072", cdi: "3550308", nm: "SÃO PAULO" }, { cd: "01120", nm: "SEM CODIGO" }] }] });
  assert.deepEqual(r.SP.map((m) => [m.cod, m.ibge, m.nome]), [["71072", "3550308", "SÃO PAULO"], ["01120", "", "SEM CODIGO"]]);
});

test("mapa municipal: um caminho por município, na cor de quem lidera", () => {
  const m = lerMalha(SVG);
  const h = mapaMunicipal(m, new Map([["3500105", { cor: "#d00", quem: "ANA (PT)" }]]), new Map([["3500105", "Adamantina"], ["3500204", "Água Doce"]]), "3500105");
  assert.equal((h.match(/data-mun-ibge=/g) || []).length, 2);
  assert.ok(h.includes("fill:#d00") && h.includes("Adamantina: ANA (PT) na frente") && h.includes("sem votos apurados") && h.includes('class="mun sel"') && h.includes("scale(0.0001,-0.0001)"));
});

test("carga dos municípios: limite de simultâneas, cache e município sem arquivo", async () => {
  limparMunicipios();
  const mun = Array.from({ length: 9 }, (_, i) => ({ cod: String(i).padStart(5, "0"), nome: "M" + i }));
  let simultaneas = 0, maxima = 0, chamadas = 0;
  const buscar = async (cargo, uf, cod) => { chamadas++; simultaneas++; maxima = Math.max(maxima, simultaneas); await new Promise((r) => setTimeout(r, 5)); simultaneas--; if (cod === "00003") throw new Error("404"); return { cod }; };
  let avisos = 0;
  await carregarMunicipios({ cargo: "governador", uf: "SP", municipios: mun, buscar, aoProgresso: () => { avisos++; }, concorrencia: 3, intervalo: 1 });
  assert.equal(chamadas, 9);
  assert.ok(maxima <= 3 && maxima >= 2);
  assert.deepEqual(lerMun("governador", "SP", "00001"), { cod: "00001" });
  assert.equal(lerMun("governador", "SP", "00003"), null); // sem arquivo: guardado como vazio
  assert.equal(lerMun("governador", "SP", "99999"), undefined);
  assert.equal(progresso("governador", "SP", mun), 9);
  assert.ok(avisos >= 1);
  await carregarMunicipios({ cargo: "governador", uf: "SP", municipios: mun, buscar, concorrencia: 3 });
  assert.equal(chamadas, 9); // nada de novo: tudo ainda está fresco
  await carregarMunicipios({ cargo: "governador", uf: "SP", municipios: mun, buscar, concorrencia: 3, ttl: -1 });
  assert.equal(chamadas, 9 + 8); // renova os carregados; o vazio espera mais tempo
  limparMunicipios();
});

test("card de município, aba Mapa na barra do estado e no endereço", () => {
  const d = { candidatos: [{ id: "1", nome: "Ana", numero: "13", partido: "PT", votos: 10, pct: 100 }], votosValidos: 10, secoesTotal: 5, secoesApuradas: 5, pctSecoes: 100, andamento: "f", comparecimento: 9, abstencao: 1 };
  const h = cardMunicipio("71072", "São Paulo", "SP", d, "governador");
  assert.ok(h.includes('data-ver-mun="71072"') && h.includes("São Paulo") && h.includes("Ver apuração completa"));
  assert.ok(barraEstado("SP", "mapa").includes('data-cargo="mapa" aria-selected="true"'));
  assert.equal(lerRota("#/estados/SP/mapa", { ufs: UFS, ufPadrao: "SP" }).cargo, "mapa");
});
