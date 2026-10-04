globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { lerRota, montarRota } = await import("../public/rota.js");
const { filtrarEstados, tiraEstados, barraEstado, folhaEstados } = await import("../public/seletor.js");
const { UFS } = await import("../public/config.js");
const o = { ufs: UFS, ufPadrao: "SP" };

test("endereços novos", () => {
  assert.deepEqual(lerRota("#/estados/RJ/governador/71072", o), { aba: "estados", uf: "RJ", cargo: "governador", mun: "71072" });
  assert.deepEqual(lerRota("#/estados/rj", o), { aba: "estados", uf: "RJ", cargo: "resumo", mun: "" });
  assert.deepEqual(lerRota("#/estados", o), { aba: "estados", uf: "SP", cargo: "resumo", mun: "" });
  assert.deepEqual(lerRota("#/estados/RJ/dep-federal/71072", o).mun, ""); // deputado não tem município
  assert.deepEqual(lerRota("#/presidente/ZZ", o), { aba: "presidente", uf: "ZZ", cargo: "resumo", mun: "" });
  assert.deepEqual(lerRota("#/andamento/RJ", o).uf, "RJ");
  assert.deepEqual(lerRota("", o).aba, "andamento");
});

test("endereços antigos viram a visão por estado", () => {
  assert.deepEqual(lerRota("#/governador/SP/71072", o), { aba: "estados", uf: "SP", cargo: "governador", mun: "71072" });
  assert.deepEqual(lerRota("#/senador/BR", o), { aba: "estados", uf: "SP", cargo: "senador", mun: "" });
  assert.deepEqual(lerRota("#/dep-federal/BR", o).aba, "camara");
  assert.deepEqual(lerRota("#/dep-federal/MG", o), { aba: "estados", uf: "MG", cargo: "dep-federal", mun: "" });
  assert.equal(lerRota("#/dep-estadual/RJ", o).cargo, "dep-estadual");
  assert.equal(lerRota("#/estados/ZZ", o).uf, "SP"); // exterior não é estado desta visão
});

test("montar e ler são inversos", () => {
  for (const r of [{ aba: "estados", uf: "RJ", cargo: "governador", mun: "71072" }, { aba: "estados", uf: "AC", cargo: "resumo", mun: "" }, { aba: "presidente", uf: "BA", cargo: "resumo", mun: "" }, { aba: "camara", uf: "BR", cargo: "resumo", mun: "" }]) {
    assert.deepEqual(lerRota(montarRota(r), o), r);
  }
});

test("busca de estado sem acento e por sigla", () => {
  assert.deepEqual(filtrarEstados("espirito"), ["ES"]);
  assert.ok(filtrarEstados("rio").includes("RJ") && filtrarEstados("rio").includes("RN") && filtrarEstados("rio").includes("RS"));
  assert.equal(filtrarEstados("sp")[0], "SP"); // a sigla exata vem antes de "Espírito Santo"
  assert.equal(filtrarEstados("").length, 27);
  assert.deepEqual(filtrarEstados("xyz"), []);
});

test("tira, barra e folha de seleção", () => {
  const ac = { ufs: { rj: { andamento: "p" } } };
  assert.equal((tiraEstados("RJ", ac).match(/data-pick-uf/g) || []).length, 27);
  assert.ok(tiraEstados("RJ", ac).includes('data-pick-uf="RJ" aria-pressed="true"'));
  const b = barraEstado("RJ", "senador");
  assert.ok(b.includes("Rio de Janeiro") && b.includes('data-cargo="senador" aria-selected="true"') && b.includes("data-abrir-seletor"));
  assert.equal((folhaEstados("RJ").match(/data-escolher-uf/g) || []).length, 27);
});
