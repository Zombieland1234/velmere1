# VELMÈRE — RELIABILITY & SITE RELIABILITY ENGINEERING (SRE) AUDIT
**High Availability, Disaster Recovery, RPO/RTO Targets, and Chaos Engineering**

---

## 1. Reliability & Uptime Targets
- **Target SLA**: 99.99% Availability (< 52.6 minutes of unscheduled downtime per year).
- **Recovery Point Objective (RPO)**: < 1 minute via streaming PostgreSQL write-ahead logs.
- **Recovery Time Objective (RTO)**: < 5 minutes via automated serverless failover to standby region.
- **Health Checks**: `/api/health` provides deep system diagnostics (database connection, RPC latency, memory usage).
