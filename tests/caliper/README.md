# Caliper Benchmarks — Digital Identity System

Performance benchmarks for thesis Section 7.  
Nine rounds × three workloads × three concurrency levels (50 / 100 / 200).

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| Hyperledger Fabric test-network | 2.4 or 2.5 |
| All four chaincodes deployed | `identity`, `consent`, `audit`, `orgpermission` |
| Channel created | `identitychannel` |

## Setup

```bash
# 1. From this directory
cd tests/caliper
npm install

# 2. Bind Caliper to Fabric 2.x SDK (once per machine)
npm run benchmark:bind

# 3. Seed the ledger with 200 benchmark identities (once per network reset)
node workloads/seed-ledger.js
```

## Run All Benchmarks

```bash
npm run benchmark
```

Caliper prints a summary table and writes `report.html` to the current
directory.  Copy the table values into thesis Section 7.

## Round Overview

| Round label | Workload | Workers | Duration |
|---|---|---|---|
| identity-query-50 | `GetIdentity` (read) | 50 | 30 s |
| identity-query-100 | `GetIdentity` (read) | 100 | 30 s |
| identity-query-200 | `GetIdentity` (read) | 200 | 30 s |
| consent-grant-50 | `GrantPermission` (write) | 50 | 30 s |
| consent-grant-100 | `GrantPermission` (write) | 100 | 30 s |
| consent-grant-200 | `GrantPermission` (write) | 200 | 30 s |
| audit-log-write-50 | `LogEvent` (write) | 50 | 30 s |
| audit-log-write-100 | `LogEvent` (write) | 100 | 30 s |
| audit-log-write-200 | `LogEvent` (write) | 200 | 30 s |

## Metrics Captured

- **TPS** — committed transactions per second (throughput)
- **Latency** — min / max / avg / p99 (seconds)
- **Success / failure counts**
- **Docker resource usage** — peer and orderer CPU/memory (requires Docker monitoring enabled)

## Interpreting Results for the Thesis

| Workload | What it measures | Expected behaviour |
|---|---|---|
| `identity-query` | Read path — peer evaluation only, no ordering | Highest TPS; latency <100 ms at 50 workers |
| `consent-grant` | Write path — endorsement + ordering + commit | TPS drops vs read; MVCC conflicts possible at 200 |
| `audit-log-write` | Write path — UUID keys, zero MVCC conflicts | Upper-bound write TPS; baseline for audit scalability |

## Troubleshooting

**`Error: identity already exists`** during seeding — normal, seed is idempotent.

**`MVCC_READ_CONFLICT`** in consent-grant at high concurrency — expected; Fabric
serialises conflicting writes.  The failure count in the report is valid data
for the thesis (demonstrates MVCC behaviour under load).

**gRPC connection refused** — ensure `peer0.org1.example.com:7051` is reachable.
On WSL2, `localhost` inside WSL maps to the WSL network interface, not the
Windows host.  Set `PEER_ENDPOINT` in `seed-ledger.js` and the connection
profile to the WSL2 IP if needed.

**Private key path** — the test-network generates a random filename ending in
`_sk`.  `seed-ledger.js` auto-discovers it; Caliper uses `priv_sk` (the
symlink created by recent fabric-samples versions).  If your version uses a
different name, update `network-config.yaml` → `clientPrivateKey.path`.
