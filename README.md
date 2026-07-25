# @uri-twin/plesk

Plesk **observe** twin packages (v1):

| Package concept | Query URI | Status |
| --- | --- | --- |
| subscriptions | `plesk://host/subscription/query/snapshot` | skeleton fact builder |
| domain / docroot | `plesk://host/site/query/docroot` | skeleton fact builder |
| dns | `plesk://host/dns/query/authority` | normalize existing connector probe |

Transport and credentials stay in `urirun-connector-plesk`. This package only
shapes `subactor.twin-fact/v1` payloads.

```bash
npm install
npm test
```

See org README and Subactor ADR-012.
