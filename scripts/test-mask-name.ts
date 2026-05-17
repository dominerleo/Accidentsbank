import assert from "node:assert/strict";
import {
  isPotentialIdentifierField,
  maskName,
  maskPotentialIdentifierFields,
} from "@/lib/privacy/maskName";

const cases: Array<[string, string]> = [
  ["홍", "*"],
  ["홍길", "홍*"],
  ["홍길동", "홍*동"],
  ["ABC", "A*C"],
  ["Alice", "A*e"],
  ["홍 길동", "* 길*"],
  ["Kim Min Su", "K*m M*n S*"],
];

for (const [input, expected] of cases) {
  assert.equal(maskName(input), expected, `${input} -> ${expected}`);
}

assert.equal(isPotentialIdentifierField("성명"), true);
assert.equal(isPotentialIdentifierField("offender_name"), true);
assert.equal(isPotentialIdentifierField("displayAddress"), false);

assert.deepEqual(
  maskPotentialIdentifierFields({
    성명: "홍길동",
    offender_name: "Alice",
    displayAddress: "서울특별시 강남구",
  }),
  {
    성명: "홍*동",
    offender_name: "A*e",
    displayAddress: "서울특별시 강남구",
  }
);

console.log("maskName tests passed");
