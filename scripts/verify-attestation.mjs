import {
  ATTESTATION_PATH,
  BASELINE_PATH,
  POLICY_PATH,
  readJson,
  verifyAttestation,
} from "./attestation-lib.mjs";

const result = verifyAttestation({
  attestation: await readJson(ATTESTATION_PATH),
  baseline: await readJson(BASELINE_PATH),
  policy: await readJson(POLICY_PATH),
});
console.log(JSON.stringify(result));
