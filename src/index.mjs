import {buildTwinFact} from "@uri-twin/core";
import catalog from "../catalog/query-routes.v1.json" with {type: "json"};

export {catalog};

/**
 * Pure builders: turn connector/XML probe payloads into twin facts.
 * Transport (XML/REST) stays in urirun-connector-plesk; this package normalizes.
 */

export function subscriptionSnapshotFact({instanceId, subscriptions, featureFlags, observedAt}) {
  return buildTwinFact({
    twinType: "plesk.subscription",
    instanceId,
    uri: "plesk://host/subscription/query/snapshot",
    payload: {
      count: Array.isArray(subscriptions) ? subscriptions.length : 0,
      subscriptions: (subscriptions || []).map((item) => ({
        id: item?.id ?? null,
        name: item?.name ?? null,
        domains_limit: item?.domains_limit ?? null,
        domains_used: item?.domains_used ?? null,
      })),
    },
    featureFlags,
    observedAt,
  });
}

export function siteDocrootFact({instanceId, domain, docroot, wwwRoot, source, featureFlags, observedAt}) {
  return buildTwinFact({
    twinType: "plesk.site.docroot",
    instanceId,
    uri: "plesk://host/site/query/docroot",
    payload: {
      domain: String(domain || ""),
      docroot: docroot == null ? null : String(docroot),
      www_root: wwwRoot == null ? null : String(wwwRoot),
      source: source == null ? null : String(source),
    },
    featureFlags,
    observedAt,
  });
}

export function dnsAuthorityFact({instanceId, hostname, provider, nameservers, managementPlane, featureFlags, observedAt}) {
  return buildTwinFact({
    twinType: "plesk.dns.authority",
    instanceId,
    uri: "plesk://host/dns/query/authority",
    payload: {
      hostname: String(hostname || ""),
      provider: provider == null ? null : String(provider),
      nameservers: Array.isArray(nameservers) ? nameservers.map(String) : [],
      management_plane: managementPlane == null ? null : String(managementPlane),
    },
    featureFlags,
    observedAt,
  });
}

export function listQueryUris() {
  return catalog.routes.map((route) => route.uri);
}
