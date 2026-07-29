import {createHash} from "node:crypto";

const SECRETISH = /(authorization|password|secret|token|api[_-]?key|credential)/i;
const SAFE_ATTRIBUTES = new Set(["active", "category", "name", "vendor", "version"]);

function text(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > 160 || SECRETISH.test(normalized)) {
    throw new Error(`review_proposal_${field}_invalid`);
  }
  return normalized;
}

function safeAttributes(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result = {};
  for (const key of Object.keys(input).sort()) {
    if (SECRETISH.test(key)) throw new Error("review_proposal_secret_forbidden");
    if (!SAFE_ATTRIBUTES.has(key)) continue;
    const value = input[key];
    if (!["boolean", "number", "string"].includes(typeof value)) continue;
    const normalized = typeof value === "string" ? text(value, "attribute") : value;
    result[key] = normalized;
  }
  return result;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function buildReviewProposal({discoveries = [], baselineDigest, observedAt, instanceId} = {}) {
  if (!/^sha256:[0-9a-f]{64}$/.test(String(baselineDigest || ""))) {
    throw new Error("review_proposal_baseline_digest_invalid");
  }
  const unique = new Map();
  for (const raw of discoveries) {
    if (raw?.status !== "review-required") continue;
    const discovery = {
      type: text(raw.type, "type"),
      id: text(raw.id, "id"),
      attributes: safeAttributes(raw.attributes),
    };
    unique.set(`${discovery.type}\0${discovery.id}`, discovery);
  }
  const reviewed = [...unique.values()].sort((left, right) =>
    `${left.type}\0${left.id}`.localeCompare(`${right.type}\0${right.id}`));
  if (!reviewed.length) throw new Error("review_proposal_discoveries_missing");
  const proposalId = createHash("sha256").update(JSON.stringify(canonical({baselineDigest, reviewed}))).digest("hex").slice(0, 20);
  return {
    schema: "uri-twin.change-proposal/v1",
    version: 1,
    proposal_id: `plesk-${proposalId}`,
    mode: "review-required",
    authority_change: "none",
    base: {
      repository: "https://github.com/uri-twin/uri-twin-plesk.git",
      baseline_digest: baselineDigest,
    },
    observation: {
      observed_at: String(observedAt || ""),
      instance_id: String(instanceId || ""),
      discoveries: reviewed,
    },
    required_reviews: [
      "human-baseline-review",
      "connector-manifest-route-conformance",
      "signed-baseline-attestation",
    ],
    pull_request: {
      draft: true,
      title: `Review Plesk discoveries (${reviewed.length})`,
      labels: ["review-required", "uri-twin", "no-authority"],
    },
  };
}
