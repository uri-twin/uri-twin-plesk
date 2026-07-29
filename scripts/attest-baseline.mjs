import {createPrivateKey, sign} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {
  ATTESTATION_PATH,
  ATTESTATION_SCHEMA,
  BASELINE_PATH,
  POLICY_PATH,
  REPOSITORY,
  activeSigner,
  digest,
  readJson,
  serialized,
} from "./attestation-lib.mjs";

const keyPath = process.env.URI_TWIN_SIGNING_KEY_FILE;
if (!keyPath) throw new Error("URI_TWIN_SIGNING_KEY_FILE is required");

const baseline = await readJson(BASELINE_PATH);
const policy = await readJson(POLICY_PATH);
const signer = activeSigner(policy, process.env.URI_TWIN_SIGNER_ID || "uri-twin-release-2026-01");
const statement = {
  schema: ATTESTATION_SCHEMA,
  version: 1,
  issued_at: process.env.URI_TWIN_ATTESTATION_ISSUED_AT || new Date().toISOString(),
  subject: {
    repository: REPOSITORY,
    path: BASELINE_PATH,
    schema: baseline.schema,
    version: String(baseline.version),
    digest: digest(baseline),
  },
  signer: {
    id: signer.id,
    algorithm: signer.algorithm,
    public_key_sha256: signer.public_key_sha256,
  },
};
const privateKey = createPrivateKey(await readFile(keyPath));
const signature = sign(null, Buffer.from(serialized(statement)), privateKey).toString("base64");
await writeFile(ATTESTATION_PATH, `${JSON.stringify({...statement, signature}, null, 2)}\n`, {mode: 0o644});
console.log(JSON.stringify({ok: true, path: ATTESTATION_PATH, signer: signer.id, digest: statement.subject.digest}));
