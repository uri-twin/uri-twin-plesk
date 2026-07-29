import {composeMap, defineCapability, resolveIntent} from "@uri-twin/core/capability";
import baseline from "../baseline/plesk-surface.v1.json" with {type: "json"};

export {baseline};

/**
 * Git is the default; the API only enriches.
 *
 * The baseline ships in this repo and is what a cold twin loads. Live
 * observation may downgrade a capability (not installed, no reviewed profile)
 * or satisfy a feature flag, but it can never introduce a capability nobody
 * reviewed. That asymmetry is what keeps a compromised or simply chatty panel
 * from widening what the system believes it may do.
 */

export function pleskBaseline() {
  return {
    twin_family: baseline.twin_family,
    version: baseline.version,
    capabilities: baseline.capabilities.map((entry) =>
      defineCapability({
        id: entry.id,
        twinFamily: baseline.twin_family,
        effect: entry.effect,
        transport: entry.transport,
        risk: entry.risk,
        requiresCredentials: entry.requires_credentials || [],
        requiresCapabilities: entry.requires_capabilities || [],
        requiresFeatureFlags: entry.requires_feature_flags || [],
        providedBy: entry.provided_by,
        summary: entry.summary,
      })),
  };
}

const EXTENSION_FEATURE_FLAGS = Object.freeze({
  "sslit": "has_ssl_it",
  "git": "has_git_extension",
});

/**
 * Turn a live extension catalog into the observed layer.
 *
 * An installed extension with no reviewed profile becomes discovery-only rather
 * than executable, mirroring the connector's own extension capability model: a
 * button in the panel is not proof of a supported remote operation.
 */
export function observedFromExtensionCatalog({extensions = [], reviewedOperations = [], dnsModule = false} = {}) {
  const featureFlags = {has_dns_module: Boolean(dnsModule)};
  const capabilities = {};

  for (const extension of extensions) {
    const id = String(extension?.id || "");
    const flag = EXTENSION_FEATURE_FLAGS[id];
    if (flag) featureFlags[flag] = Boolean(extension?.active);
  }

  const reviewed = new Set(reviewedOperations.map(String));
  for (const entry of baseline.capabilities) {
    if (entry.transport !== "extension-xml" || entry.effect !== "command") continue;
    if (!reviewed.has(entry.id)) capabilities[entry.id] = "discovery-only";
  }

  return {feature_flags: featureFlags, capabilities};
}

export function pleskMap({observed, credentials, instanceId, observedAt}) {
  return composeMap({baseline: pleskBaseline(), observed, credentials, instanceId, observedAt});
}

export function resolvePleskIntent(map, intent) {
  return resolveIntent(map, intent);
}

/** Named intents, so callers ask for an outcome rather than assembling URIs. */
export const PLESK_INTENTS = Object.freeze({
  "publish-site": ["plesk.site.publish"],
  "publish-site-with-tls": ["plesk.site.publish", "plesk.ssl.ensure"],
  "create-mailbox": ["plesk.mailbox.create"],
  "observe-topology": ["plesk.subscription.snapshot", "plesk.site.docroot"],
});

export function resolveNamedIntent(map, name) {
  const requires = PLESK_INTENTS[name];
  if (!requires) throw new Error(`plesk_intent_unknown:${name}`);
  return resolveIntent(map, {intent: name, requires});
}
