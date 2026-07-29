import {createHash, createPublicKey, verify} from "node:crypto";
import {readFile} from "node:fs/promises";

export const ATTESTATION_SCHEMA = "uri-twin.attestation/v1";
export const BASELINE_PATH = "baseline/plesk-surface.v1.json";
export const ATTESTATION_PATH = "baseline/plesk-surface.v1.attestation.json";
export const POLICY_PATH = "release/allowed-signers.v1.json";
export const REPOSITORY = "https://github.com/uri-twin/uri-twin-plesk.git";

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function serialized(value) {
  return JSON.stringify(canonical(value));
}

export function digest(value) {
  return `sha256:${createHash("sha256").update(serialized(value)).digest("hex")}`;
}

export function unsignedAttestation(attestation) {
  const {signature, ...statement} = attestation;
  return statement;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function activeSigner(policy, signerId) {
  if (policy?.schema !== "uri-twin.signer-policy/v1" || policy?.threshold !== 1) {
    throw new Error("uri_twin_signer_policy_invalid");
  }
  const matches = (policy.signers || []).filter((signer) => signer.id === signerId && signer.status === "active");
  if (matches.length !== 1 || matches[0].algorithm !== "ed25519") {
    throw new Error("uri_twin_signer_not_allowed");
  }
  return matches[0];
}

export function verifyAttestation({attestation, baseline, policy}) {
  if (attestation?.schema !== ATTESTATION_SCHEMA || attestation?.version !== 1) {
    throw new Error("uri_twin_attestation_schema_invalid");
  }
  if (attestation.subject?.repository !== REPOSITORY || attestation.subject?.path !== BASELINE_PATH) {
    throw new Error("uri_twin_attestation_subject_invalid");
  }
  if (attestation.subject?.schema !== baseline.schema || String(attestation.subject?.version) !== String(baseline.version)) {
    throw new Error("uri_twin_attestation_version_invalid");
  }
  if (attestation.subject?.digest !== digest(baseline)) {
    throw new Error("uri_twin_attestation_digest_invalid");
  }
  const signer = activeSigner(policy, attestation.signer?.id);
  if (attestation.signer?.algorithm !== signer.algorithm || attestation.signer?.public_key_sha256 !== signer.public_key_sha256) {
    throw new Error("uri_twin_attestation_signer_invalid");
  }
  const publicDer = Buffer.from(signer.public_key_spki_base64, "base64");
  const fingerprint = `sha256:${createHash("sha256").update(publicDer).digest("hex")}`;
  if (fingerprint !== signer.public_key_sha256) throw new Error("uri_twin_signer_key_invalid");
  const signature = Buffer.from(String(attestation.signature || ""), "base64");
  const valid = verify(
    null,
    Buffer.from(serialized(unsignedAttestation(attestation))),
    createPublicKey({key: publicDer, format: "der", type: "spki"}),
    signature,
  );
  if (!valid) throw new Error("uri_twin_attestation_signature_invalid");
  return {ok: true, signer: signer.id, digest: attestation.subject.digest};
}
