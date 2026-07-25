import assert from "node:assert/strict";
import test from "node:test";
import {
  dnsAuthorityFact,
  listQueryUris,
  siteDocrootFact,
  subscriptionSnapshotFact,
} from "../src/index.mjs";

test("catalog exposes the three Plesk v1 query URIs", () => {
  const uris = listQueryUris();
  assert.ok(uris.includes("plesk://host/site/query/docroot"));
  assert.ok(uris.includes("plesk://host/subscription/query/snapshot"));
  assert.ok(uris.includes("plesk://host/dns/query/authority"));
});

test("docroot fact is query-only and secret-free", () => {
  const fact = siteDocrootFact({
    instanceId: "panel-a",
    domain: "autonomicznosc.pl",
    docroot: "/autonomicznosc.pl",
    wwwRoot: "/autonomicznosc.pl",
    source: "xml-site",
  });
  assert.equal(fact.twin_type, "plesk.site.docroot");
  assert.equal(fact.payload.domain, "autonomicznosc.pl");
  assert.match(fact.uri, /\/query\/docroot$/);
});

test("subscription and dns builders produce distinct twin types", () => {
  const sub = subscriptionSnapshotFact({
    instanceId: "panel-a",
    subscriptions: [{id: "1", name: "main", domains_limit: 10, domains_used: 3}],
  });
  const dns = dnsAuthorityFact({
    instanceId: "panel-a",
    hostname: "docs.subactor.com",
    provider: "cloudflare",
    nameservers: ["ns1.example", "ns2.example"],
    managementPlane: "cloudflaredns",
  });
  assert.equal(sub.twin_type, "plesk.subscription");
  assert.equal(dns.twin_type, "plesk.dns.authority");
  assert.notEqual(sub.snapshot_hash, dns.snapshot_hash);
});
