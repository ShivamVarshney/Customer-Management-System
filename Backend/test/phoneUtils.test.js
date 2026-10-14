const test = require("node:test");
const assert = require("node:assert/strict");

test("phone country search supports supported names, ISO codes, and dial codes", async () => {
  const { searchPhoneCountries } = await import("../../Frontend/src/components/phoneUtils.js");

  assert.deepEqual(searchPhoneCountries("Australia").map(({ name, dial }) => [name, dial]), [["Australia", "+61"]]);
  assert.deepEqual(searchPhoneCountries("+61").map(({ name }) => name), ["Australia"]);
  assert.deepEqual(searchPhoneCountries("Canada").map(({ name, dial }) => [name, dial]), [["Canada", "+1"]]);
  assert.deepEqual(searchPhoneCountries("CA").map(({ name }) => name), ["Canada"]);
  assert.deepEqual(searchPhoneCountries("+1").map(({ name }) => name), ["United States", "Canada"]);
});

test("phone country flags and number normalization preserve supported international formats", async () => {
  const { phoneCountries, isValidPhoneNumber, normalizePhoneNumber } = await import("../../Frontend/src/components/phoneUtils.js");
  const canada = phoneCountries.find(({ code }) => code === "CA");
  const australia = phoneCountries.find(({ code }) => code === "AU");

  assert.equal(canada.flag, "🇨🇦");
  assert.equal(australia.flag, "🇦🇺");
  assert.equal(normalizePhoneNumber("+61 412 345 678"), "+61412345678");
  assert.equal(isValidPhoneNumber("+61412345678"), true);
  assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
  assert.equal(isValidPhoneNumber("+14165550123"), true);
});
