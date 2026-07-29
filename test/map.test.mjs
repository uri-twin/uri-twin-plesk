import assert from "node:assert/strict";
import test from "node:test";

import {
  baseline,
  observedFromExtensionCatalog,
  pleskMap,
  PLESK_INTENTS,
  resolveNamedIntent,
} from "../src/map.mjs";

/** Credentials a fully provisioned Subactor panel binding holds today. */
const FULL = ["plesk-xml-subscription-owner", "plesk-admin-api-key", "plesk-sftp-subscription-user"];

const LIVE_EXTENSIONS = [
  {id: "sslit", name: "SSL It!", version: "1.13.0", active: true},
  {id: "letsencrypt", name: "Let's Encrypt", version: "3.1.0", active: true},
];

function mapFor({credentials = FULL, extensions = LIVE_EXTENSIONS, reviewedOperations = ["plesk.ssl.ensure"], dnsModule = true} = {}) {
  return pleskMap({
    observed: observedFromExtensionCatalog({extensions, reviewedOperations, dnsModule}),
    credentials,
    instanceId: "prototypowanie-pl",
    observedAt: "2026-07-29T12:00:00.000Z",
  });
}

test("baseline ships every capability with a declared credential and provider", () => {
  for (const entry of baseline.capabilities) {
    assert.ok(entry.provided_by?.length, `${entry.id} has no provider`);
    assert.ok(Array.isArray(entry.requires_credentials), `${entry.id} has no credential list`);
    assert.match(entry.id, /^plesk\./);
  }
});

test("a fully credentialed panel resolves publish-site into an ordered plan", () => {
  const result = resolveNamedIntent(mapFor(), "publish-site");

  assert.equal(result.resolved, true);
  assert.deepEqual(result.plan.map((step) => step.capability), [
    "plesk.subscription.snapshot",
    "plesk.site.docroot",
    "plesk.site.publish",
  ]);
  // Publishing is the only mutating step and it is reached last.
  assert.deepEqual(result.plan.map((step) => step.effect), ["query", "query", "command"]);
  assert.equal(result.plan.at(-1).transport, "sftp");
});

// The scenario the twin exists to prevent: today this fails inside a connector
// and becomes a ticket that asks a human to work out which credential was wrong.
test("a panel holding only the admin key names the XML credential as the gap", () => {
  const result = resolveNamedIntent(mapFor({credentials: ["plesk-admin-api-key"]}), "publish-site");

  assert.equal(result.resolved, false);
  assert.deepEqual(result.plan, []);
  assert.equal(result.gap.capability, "plesk.subscription.snapshot");
  assert.equal(result.gap.kind, "credential_missing");
  assert.equal(result.gap.detail, "plesk-xml-subscription-owner");
});

test("the baseline records why the admin credential cannot stand in for the XML one", () => {
  const handle = baseline.credential_handles["plesk-xml-subscription-owner"];
  assert.match(handle.note, /1001\/1006/);
  assert.match(handle.authority, /customer account/);
});

test("publish-site-with-tls is blocked by the DNS module, not by the certificate step", () => {
  const result = resolveNamedIntent(mapFor({dnsModule: false}), "publish-site-with-tls");

  assert.equal(result.resolved, false);
  assert.equal(result.gap.capability, "plesk.dns.authority");
  assert.equal(result.gap.kind, "feature_flag_off");
  assert.equal(result.gap.detail, "has_dns_module");
});

test("an uninstalled SSL It! downgrades only the certificate capability", () => {
  const map = mapFor({extensions: [{id: "letsencrypt", active: true}]});

  const ssl = map.capabilities.find((entry) => entry.id === "plesk.ssl.ensure");
  const publish = map.capabilities.find((entry) => entry.id === "plesk.site.publish");
  assert.equal(ssl.execution_policy, "absent");
  assert.equal(publish.execution_policy, "executable");
  assert.equal(resolveNamedIntent(map, "publish-site").resolved, true);
});

test("an installed extension without a reviewed profile stays discovery-only", () => {
  const map = mapFor({reviewedOperations: []});

  const ssl = map.capabilities.find((entry) => entry.id === "plesk.ssl.ensure");
  assert.equal(ssl.execution_policy, "discovery-only");
  assert.ok(ssl.blockers.some((blocker) => blocker.kind === "no_reviewed_profile"));
});

test("live observation cannot introduce a capability the baseline never reviewed", () => {
  const map = pleskMap({
    observed: {feature_flags: {has_dns_module: true}, capabilities: {"plesk.rootkit.install": true}},
    credentials: FULL,
    instanceId: "prototypowanie-pl",
  });

  assert.equal(map.capabilities.some((entry) => entry.id === "plesk.rootkit.install"), false);
  assert.equal(map.capabilities.length, baseline.capabilities.length);
});

test("the root-SSH capability is declared but uncredentialed, so plans fail by name", () => {
  const map = mapFor();
  const utility = map.capabilities.find((entry) => entry.id === "plesk.server.utility");

  assert.equal(utility.execution_policy, "credential-missing");
  assert.deepEqual(utility.blockers, [{kind: "credential_missing", detail: "plesk-root-ssh"}]);
});

test("create-mailbox needs the admin key and the subscription snapshot", () => {
  assert.equal(resolveNamedIntent(mapFor(), "create-mailbox").resolved, true);

  const result = resolveNamedIntent(
    mapFor({credentials: ["plesk-xml-subscription-owner", "plesk-sftp-subscription-user"]}),
    "create-mailbox",
  );
  assert.equal(result.resolved, false);
  assert.equal(result.gap.detail, "plesk-admin-api-key");
});

test("every named intent references capabilities that exist in the baseline", () => {
  const known = new Set(baseline.capabilities.map((entry) => entry.id));
  for (const [name, requires] of Object.entries(PLESK_INTENTS)) {
    for (const id of requires) assert.ok(known.has(id), `${name} requires unknown ${id}`);
  }
});

test("the map hash changes when observation changes and is stable when it does not", () => {
  assert.equal(mapFor().map_hash, mapFor().map_hash);
  assert.notEqual(mapFor().map_hash, mapFor({dnsModule: false}).map_hash);
});
