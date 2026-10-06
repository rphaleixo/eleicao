import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirRdv } from "../tools/rdv.mjs";

// monta um pedaço de BER: tag, tamanho e conteúdo
const tlv = (tag, conteudo) => Buffer.concat([Buffer.from([tag, conteudo.length]), conteudo]);
const seq = (...filhos) => tlv(0x30, Buffer.concat(filhos));
const tipo = (n) => tlv(0x0a, Buffer.from([n]));
const dig = (t) => tlv(0x12, Buffer.from(t));
const voto = (n, d) => seq(tipo(n), ...(d ? [dig(d)] : []));
const cargo = (cod, ...votos) => seq(tlv(0x81, Buffer.from([cod])), tlv(0x02, Buffer.from([1])), seq(...votos));

test("conta tipos de voto e os números digitados nos nulos dos cargos majoritários", () => {
  const rdv = seq(seq(cargo(5, voto(2, "444"), voto(4, "000"), voto(4, "000"), voto(4, "551"), voto(7, "131"), voto(3), voto(6)), cargo(6, voto(2, "1011"), voto(4, "0000"))));
  const r = resumirRdv(new Uint8Array(rdv));
  assert.deepEqual(r[5][4], { "000": 2, "551": 1 });
  assert.deepEqual(r[5][7], { "131": 1 });
  assert.equal(r[5][2], 1); assert.equal(r[5][3], 1); assert.equal(r[5][6], 1);
  assert.equal(r[6][4], 1, "nos deputados só se conta o tipo, sem o número");
});
