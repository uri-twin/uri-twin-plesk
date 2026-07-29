import assert from "node:assert/strict";
import test from "node:test";

import {buildReviewProposal} from "../src/proposal.mjs";

const input = {
  baselineDigest: `sha256:${"a".repeat(64)}`,
  observedAt: "2026-07-29T14:00:00.000Z",
  instanceId: "panel-primary",
  discoveries: [
    {type: "plesk.module.experimental", id: "ai-button", status: "review-required", attributes: {active: true, version: "1.0", internal_path: "/opt/private"}},
    {type: "plesk.module.known", id: "git", status: "reviewed", attributes: {active: true}},
  ],
};

test("review-required discovery becomes a draft proposal with no authority change", () => {
  const proposal = buildReviewProposal(input);
  assert.equal(proposal.mode, "review-required");
  assert.equal(proposal.authority_change, "none");
  assert.equal(proposal.pull_request.draft, true);
  assert.deepEqual(proposal.observation.discoveries, [{
    type: "plesk.module.experimental",
    id: "ai-button",
    attributes: {active: true, version: "1.0"},
  }]);
  assert.ok(!JSON.stringify(proposal).includes("internal_path"));
  assert.ok(!JSON.stringify(proposal).includes("provided_by"));
});

test("reviewed observations cannot generate a proposal", () => {
  assert.throws(
    () => buildReviewProposal({...input, discoveries: input.discoveries.slice(1)}),
    /review_proposal_discoveries_missing/,
  );
});

test("secret-shaped discovery data fails closed", () => {
  const discoveries = [{
    type: "plesk.module.experimental",
    id: "unsafe",
    status: "review-required",
    attributes: {api_token: "do-not-copy"},
  }];
  assert.throws(() => buildReviewProposal({...input, discoveries}), /review_proposal_secret_forbidden/);
});
