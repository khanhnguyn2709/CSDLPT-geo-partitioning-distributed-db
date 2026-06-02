# Geo-Partitioned Distributed Database

A distributed database simulation project implementing geo-partitioning, cross-shard migration, routing logic, and failure handling for a global ride-hailing system.

This project was developed for the Distributed Database course.

---

# Project Overview

The system simulates how a global ride-hailing platform stores driver location data across geographically distributed shards.

Drivers are automatically routed to different database shards based on their city.

Example:

- Paris → EU Shard
- London → UK Shard
- New York → US Shard

When a driver changes city, the Router Server automatically performs cross-shard migration.

The project also simulates distributed system failures such as:

- node failure
- migration interruption
- duplicate data
- stale metadata

---

# System Architecture

The system contains:

- 1 Router Server
- 3 Shard Nodes

Ports:

- Router Server → 8000
- EU Shard → 8001
- UK Shard → 8002
- US Shard → 8003

Architecture flow:

Client → Router → Target Shard

---

# Technologies Used

- Node.js
- Express.js
- SQLite3
- Axios
- Postman

---

# Folder Structure

```text
geo-db/
│
├── src/
│   │
│   ├── router/
│   │   ├── server.js
│   │   ├── routing.js
│   │   ├── recovery.js
│   │   ├── metrics.js
│   │   └── metadata.db
│   │
│   ├── shard-eu/
│   │   ├── server.js
│   │   └── eu.db
│   │
│   ├── shard-uk/
│   │   ├── server.js
│   │   └── uk.db
│   │
│   ├── shard-us/
│   │   ├── server.js
│   │   └── us.db
│   │
│   ├── scripts/
│   │   ├── benchmark.js
│   │   └── verifyConsistency.js
│   │
│   └── shared/
│       ├── createShardServer.js
│       ├── logger.js
│       └── shardConfig.js
│
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```

---

# Installation

Clone repository:

```bash
git clone https://github.com/khanhnguyn2709/CSDLPT-geo-partitioning-distributed-db.git
```

Install dependencies:

```bash
npm install
```

---

# Run the System

Open 4 terminals.

Start EU shard:

```bash
npm run eu
```

Start UK shard:

```bash
npm run uk
```

Start US shard:

```bash
npm run us
```

Start Router:

```bash
npm run router
```

---

# API Endpoints

## Update Driver Location

POST:

```http
http://localhost:8000/updateLocation
```

Example JSON:

```json
{
  "DriverID": 101,
  "City": "Paris",
  "Lat": 48.85,
  "Long": 2.35
}
```

---

## Get Driver

GET:

```http
http://localhost:8000/driver/101
```

---

## Toggle Failure Simulation

POST:

```http
http://localhost:8000/toggleFailure
```

This endpoint simulates migration interruption.

---

# Geo-Partitioning Rules

EU Shard:

- Paris
- Berlin

UK Shard:

- London
- Manchester

US Shard:

- New York
- Boston

---

# Cross-Shard Migration

Migration flow:

1. Copy driver data to new shard
2. Verify copied data
3. Update metadata
4. Delete old copy

This copy-first strategy helps reduce data loss during failures.

---

# Failure Simulation

The project supports:

- Node Failure
- Migration Crash
- Duplicate Data
- Stale Metadata

Example:
If FAIL_AFTER_COPY is enabled, the system crashes after copying data but before deleting the old record.

This creates temporary inconsistency which is later resolved by rollback and verification scripts.

---

# Consistency Verification

Run consistency check:

```bash
node scripts/verifyConsistency.js
```

The script checks whether a driver exists on multiple shards simultaneously.

---

# CAP Theorem

The system prioritizes:

- Availability
- Partition Tolerance

over strict Consistency.

Therefore, temporary duplicate data may occur during migration failures, but the system eventually restores consistency.

---

# Academic Concepts Used

- Horizontal Fragmentation
- Geo-Partitioning
- Distributed Query Routing
- Metadata Directory
- Eventual Consistency
- Cross-Shard Migration
- Failure Recovery
- Distributed Storage Allocation

---

# Demo Scenario

1. Insert Driver 101 into Paris
2. Router sends data to EU shard
3. Update Driver 101 location to London
4. Router performs migration EU → UK
5. Simulate migration crash
6. Run consistency verification
7. Demonstrate rollback recovery

---

# Author

Nguyễn Khánh Nguyên
Distributed Database Project
