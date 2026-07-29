import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTESTATION_PATH,
  BASELINE_PATH,
  POLICY_PATH,
  readJson,
  verifyAttestation,
} from "../scripts/attestation-lib.mjs";

const baseline = await readJson(BASELINE_PATH);
const policy = await readJson(POLICY_PATH);
const attestation = await readJson(ATTESTATION_PATH);

test("reviewed baseline has a valid signature from an allowed signer", () => {
  assert.equal(verifyAttestation({attestation, baseline, policy}).ok, true);
});

test("a valid-looking baseline change is rejected without a new signature", () => {
  const changed = structuredClone(baseline);
  changed.version = `${baseline.version}-unauthorized`;
  assert.throws(
    () => verifyAttestation({attestation, baseline: changed, policy}),
    /uri_twin_attestation_version_invalid/,
  );
});

test("a signer outside the policy is rejected before signature verification", () => {
  const changed = structuredClone(attestation);
  changed.signer.id = "untrusted-contributor";
  assert.throws(
    () => verifyAttestation({attestation: changed, baseline, policy}),
    /uri_twin_signer_not_allowed/,
  );
});
