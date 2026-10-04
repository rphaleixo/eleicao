import test from "node:test";
import assert from "node:assert/strict";
import { pct, fmt } from "../public/formato.js";

test("todo percentual tem 2 casas decimais", () => {
  assert.equal(pct(0), "0,00%");
  assert.equal(pct(100), "100,00%");
  assert.equal(pct(85.1), "85,10%");
  assert.equal(pct(12.3456), "12,35%");
  assert.equal(pct("7"), "7,00%");
});

test("números inteiros com separador de milhar", () => assert.equal(fmt(1234567), "1.234.567"));
