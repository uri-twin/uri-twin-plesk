# @uri-twin/plesk

Reviewed Plesk environment, service and workflow map for autonomous URI-process planning.

This repository is the Git source of truth loaded by
`urirun-connector-subactor-twin-map`. It describes what a Plesk environment can
offer through one or more connectors; it does not store credentials and does
not execute commands.

## What the baseline contains

- environment bindings shared by many panel instances;
- five service surfaces: Plesk XML, REST v2, extensions, subscription SFTP and
  an alternative Namecheap DNS API;
- reviewed resource types for subscriptions, sites, extensions and DNS zones;
- workflows such as site publication, mailbox creation and publication with
  managed DNS and TLS;
- capability dependencies, risk, connector URI providers and named credential
  handles.

The multi-connector workflow can select either
`plesk://host/dns/command/reconcile` or
`dns://host/records/command/apply` according to the observed
`dns_management_plane` binding, loaded route inventory and credential handles.
The resolver never receives the credential values.

## Git baseline + API enrichment

`baseline/plesk-surface.v1.json` is reviewed code. On startup the consumer:

1. clones this repository and records the exact commit and content digest;
2. validates the baseline and caches a last-known-good snapshot;
3. joins it with live Plesk/API observations for the bound `instance_id`;
4. returns an ordered connector plan or one deepest actionable gap.

API observations can add current instances of reviewed resource types. Unknown
modules are retained as `review-required` discoveries. They cannot become an
executable route until this Git baseline is reviewed and updated.

## Query facts

| Resource | Query URI |
| --- | --- |
| subscriptions | `plesk://host/subscription/query/snapshot` |
| site/docroot | `plesk://host/site/query/docroot` |
| DNS authority | `plesk://host/dns/query/authority` |

The pure builders in `src/index.mjs` normalize connector responses into
`subactor.twin-fact/v1`. `src/map.mjs` composes and resolves the dynamic map.

```bash
npm install
npm test
```

Mutations, apply grants, kill switches and human boundaries remain in
`urirun-connectors` and the controlling platform. This twin is a roadmap, not
an authority source.
