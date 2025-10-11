Here’s a deep, first‑principles guide to distributed storage systems, distilled from GFS but generalized. It focuses purely on concepts and insights you can reuse in any large-scale design.

Mental model: what you’re optimizing
- Safety vs liveness
  - Safety: nothing bad happens (e.g., two primaries, torn records).
  - Liveness: something good eventually happens (e.g., re‑replication completes).
  - Design every mechanism with both lists explicit; test them independently.
- Failure and time
  - Crash‑stop processes, lossy and reordering networks, partitions. No Byzantine.
  - Clocks are imperfect; timeouts are guesses. Much of your “coordination” is managing uncertainty about time.

1) Failure model mastery
- Partial synchrony is the default
  - Sometimes the network looks synchronous (low, bounded delays); sometimes not. Algorithms that rely on strict bounds will fail in the wild.
  - Leases, timeouts, and “heartbeat death” all embed time assumptions; state them and leave margin.
- Failure detectors are suspicion services
  - Heartbeat timeout means “suspected failed,” not “failed.”
  - Safe actions under false suspicion: you can demote leadership only when a lease expires (fencing), not when a timeout fires.
- Membership and epochs
  - Any configuration change (replica added/removed) must use epoch numbers (terms) so stale members cannot act with authority.
  - Epoch monotonicity is a core safety invariant for leadership, write order, and config changes.

2) Coordination is expensive; avoid it deliberately
- Coordination budget:
  - Every strong guarantee (e.g., linearizable writes) costs round trips and serialization.
  - Spend it where the business requires it; avoid elsewhere.
- Single‑writer per partition
  - Grant one primary per shard/chunk/partition via a lease. This serializes write order without global consensus.
  - Works when “who writes” can be constrained; otherwise pivot to quorum consensus.
- Commutativity and idempotence
  - If operations commute or are idempotent, you can relax ordering and retry aggressively.
  - Example: append‑only logs with unique record IDs; duplicates are cheap to detect and drop.

3) Consistency: choose the contracts that fit
- Core models (in practice)
  - Linearizability: real‑time order of operations preserved. Strongest single‑object guarantee; highest coordination cost.
  - Sequential consistency: total order consistent with per‑client program order; not real-time.
  - Causal consistency: preserves happens‑before links; scalable with metadata (vector clocks).
  - Eventual consistency: replicas converge absent new writes; you must define detectability and repair of divergence.
- Session guarantees for pragmatic UX
  - Read‑your‑writes, monotonic reads, monotonic writes, write‑follows‑reads. Cheap to provide with per‑client version memory even under eventual consistency.
- Storage‑specific contracts
  - Record‑append contract: atomic per record (no torn records), at‑least‑once delivery (duplicates possible), ordering only within the chunk via a primary. Readers may observe padding/holes. This is sufficient for batch analytics but not for general OLTP.

4) Replication patterns: when to use what
- Primary‑backup (single leader)
  - Total order per shard via primary. Simple, low latency. Failure recovery requires lease expiry and re‑election.
  - Good for logs, append‑heavy workloads, and write‑once objects.
- Quorum replication (R/W quorums)
  - Reads and writes hit overlapping quorums (R + W > N) to ensure intersection. Tunable latency vs consistency.
  - Good when multi‑region latencies matter and you need availability during partitions.
- Chain replication
  - Write flows head→…→tail; acks from tail imply all replicas have the write. Strong ordering, simple failure handling at the cost of write latency.
  - Great for hot keys; concentrates backpressure at head.
- Gossip/anti‑entropy
  - Async background convergence with version vectors/merkle trees. Excellent for large, weakly consistent datasets (object storage, key-value stores).

Key invariants across patterns
- One writer per epoch per shard. Epoch increases on leadership change.
- No commit without durability at the quorum/tail/primaries-in‑lease.
- Readers can detect and refuse stale replicas (version vectors, term/offset pairs).

5) Time, leases, and fencing: safely using clocks
- Leases are time‑based mutual exclusion
  - Master: grants lease to P for T seconds; will not grant new lease until old lease end + safety margin.
  - Primary: must stop acting after lease expiration, even if isolated.
- Fencing tokens
  - Every lease grant carries a monotonically increasing token. Downstream components accept commands only with the highest seen token.
  - Prevents “zombie primary” from corrupting state even if it still has TCP connectivity.
- Choosing T and margins
  - Let drift ≤ δ, worst RTT ≤ Δ, and grant latency ≤ g. Choose safety margin ε ≥ δ + Δ + g; never re‑grant before t_old_end + ε.
  - Tradeoff: larger T improves availability (fewer renewals) but delays failover.

6) Durability and recovery: design the time machine
- Write‑ahead logging (WAL)
  - All ordering decisions and mutations must hit durable storage before acknowledgement.
  - WAL + idempotent reapply gives crash safety. You can always rebuild from a checkpoint + WAL replay.
- Checkpointing
  - Periodically snapshot state so that replay length is bounded; use copy‑on‑write to avoid long pauses.
  - For metadata masters, keep the active state in memory; snapshot + op log is the source of truth after crash.
- Replays must be deterministic
  - Deterministic order and idempotent application prevent diverging reconstructions.
  - Include version numbers/epochs to ignore stale operations during replay.

7) Data layout and record design: resilience starts at the byte level
- Record framing
  - length‑prefix or delimiter + checksum; guarantees no torn reads are misinterpreted.
  - On recovery, scan and discard trailing partial records.
- Idempotency keys
  - Unique, stable IDs per producer (e.g., UUID or offset+producerID). Consumers can dedupe without coordination.
- Padding and sparse holes
  - Use explicit PADDING records for alignment or failed attempts; keep parsers simple and deterministic.

8) Caching and staleness: realistic coherence
- TTL vs invalidation
  - TTL: simple, probabilistic staleness bounds; avoid stampedes with jitter.
  - Callback/lease invalidation: precise but requires push channels and state on the server; use for hot metadata.
- Monotonic read policy
  - Clients remember the highest version per shard/chunk seen; never accept older. Cheap and avoids read regressions.
- Negative caching
  - Cache “not found” with short TTL to deflect floods of misses during hot periods.

9) Placement and correlated failures
- Fault domains
  - Distribute replicas across independent domains: node, rack, power, AZ, region. Independence is an assumption—be conservative.
- Randomization with constraints
  - Power‑of‑two choices: pick two bins, choose the better (e.g., less loaded). Balances load with minimal coordination.
- Rebalance as a background flow
  - “Never move hot data during peak hours” is a policy, not a hope. Use moving windows, rate limits, and priority queues by risk (RF=1 > RF=2 > imbalance).

10) Repair math and durability budgeting
- Replication durability intuition
  - With independent failures (approximation), loss probability over window t is ~P(all replicas fail before repair completes).
  - Real risk comes from correlated failures and slow repair; design for rapid convergence of RF.
- Repair bandwidth as a first‑class SLO
  - Required bandwidth B ≥ LostData / TargetMTTR. If B is lower, your durability claims are fiction.
- Erasure coding vs replication
  - (k+m) coding cuts storage overhead but increases rebuild bandwidth and latency. Local reconstruction codes (LRC) reduce repair cost for single‑failure events.
  - Use EC for cold data; keep hot or write‑heavy data on replication; migrate over time.

11) Flow control, backpressure, and fail‑slow
- Backpressure is a safety mechanism
  - Every producer must respect consumer windows; otherwise you create implicit queues with unbounded memory.
- Fail‑slow nodes hurt more than fail‑stop
  - Detect and shed load from slow replicas (tail‑at‑scale mitigation: hedged reads with cancel on first success).
- Pipeline depth and fairness
  - Writes and repairs should have bounded in‑flight windows per link/replica; use per‑peer quotas to avoid head-of-line blocking.

12) CAP, PACELC, and choosing your point on the curve
- CAP in practice
  - Under partition, you can either serve writes (AP) or refuse and wait (CP). Choose per operation or per dataset.
- PACELC
  - Else (no partition), you still trade Latency vs Consistency. GFS chooses latency for data plane; single‑master metadata chooses consistency and simplicity (until sharding is required).
- Mixed models
  - It’s common to run CP for metadata (namespace, leases) and AP for data (append logs). Make the boundary explicit.

13) Quorums and read/write semantics
- R/W quorums
  - With N replicas, choose R (read quorum size) and W (write quorum size) such that R + W > N for consistency and W > N/2 for write availability under minority failures.
  - Latency and throughput scale with R and W; don’t set and forget—adapt to workloads.
- Fast reads and committed offsets
  - Readers that need freshness can contact the leader or require a read barrier (wait for term+offset ≥ X). Others can hit followers at lower latency.

14) Reconfiguration without foot‑guns
- Joint consensus (two‑phase membership)
  - Transition from old config to joint (old ∪ new) to new. Avoids split clusters and ensures quorum intersection during transitions.
- Epoch and fencing during reconfig
  - All writes in new config must carry the new epoch; old write attempts must be rejected by followers with higher epochs.

15) The “exactly‑once” myth and the real recipe
- Transport can’t guarantee exactly‑once
  - Networks drop and duplicate; crashes lose “did we ack?” state. Exactly-once is an end-to-end property.
- Achieve it as: at‑least‑once delivery + idempotent processing + dedupe window + transactional sinks (optional).
- For storage pipelines
  - Use idempotency keys and transactional writes (e.g., “insert if not exists by key” or “upsert with version check”).

16) How to think about timeouts, retries, and idempotence
- Exponential backoff with jitter
  - Prevents synchronized retries causing waves.
- Budgeted retries
  - Tie retry budgets to SLOs; avoid infinite retries that amplify failure.
- Idempotence levels
  - Write path: record IDs, offsets, or sequence numbers per producer.
  - Control path: epoch tokens and compare‑and‑swap semantics.

17) Metadata scaling: sharding and cross‑shard correctness
- Shard by namespace or hash
  - Namespace shards preserve directory operations locality; hash shards smooth load but complicate path operations.
- Cross‑shard operations
  - Need 2PC or transactional metadata logs for rename/move; otherwise tear is possible.
- Read scaling via followers
  - Shadow/standby readers subscribe to the op log; serve stale‑tolerant reads; promote on failover with epoch bump.

18) Garbage collection and deletion semantics
- Lazy deletion
  - Mark‑delete now, reclaim later. Prevents costly spikes and supports undelete windows.
- Tombstones and compaction
  - Tombstones are needed for anti‑entropy; compaction cleans them while preserving correctness (don’t resurrect).
- GC safety rules
  - Never collect data that might be referenced by lagging replicas or snapshots. Track low‑watermarks (e.g., min safe version per replica).

19) Designing with commutativity and CRDTs (when applicable)
- If your operations are semilattices (associative, commutative, idempotent), replicas can converge without coordination.
- Examples
  - G‑counter, PN‑counter, OR‑set for some metadata.
  - Not a fit for ordered logs, but useful for “who holds what chunk” sets or “which replicas are healthy” gossip.

20) Debugging and proving properties (lightweight)
- State the invariants as predicates
  - At most one primary per (chunk, epoch). Every committed record appears on a quorum. Version numbers are strictly increasing.
- Small proof sketches
  - Show that safety holds even when timeouts lie (e.g., false suspicions) due to leases and fencing.
  - Show liveness under partial synchrony: when timing stabilizes, leader gets/renews lease and progress resumes.

21) Practical design playbooks
- If you can partition the data and enforce single writer → use leases + primary‑backup; recover with epochs + fencing.
- If you need multi‑writer or cross‑region strong reads → use quorum consensus (Raft/Multi‑Paxos) with joint consensus for reconfig; cache reads with read leases if needed.
- If you need low storage cost for cold data → erasure code with repair budget; keep hot writes on replication and migrate.
- If you face hot partitions → consider chain replication or dynamic shard splitting; add admission control and queuing at leader.

22) Anti‑patterns to avoid
- TTL as correctness mechanism
  - TTL reduces load; it doesn’t guarantee freshness or ordering. Use versions/fencing for safety.
- Unfenced failover
  - Promoting a new primary without lease expiry/fencing invites split‑brain.
- Repair storms
  - Triggering cluster‑wide repairs at once saturates network and disks; always rate‑limit and prioritize.
- Hidden global locks
  - A “simple global mutex” in a microservice kills availability. If you must, make it a lease with fencing and scoped to a partition.

23) Back‑of‑the‑envelope calculators (keep these handy)
- Master/metadata RAM
  - RAM ≈ (#objects × bytes/object). For chunks: bytes/object ~ 64–200 depending on attributes. Large chunk size shrinks #objects.
- Repair time
  - T ≈ Data_to_repair / Effective_bandwidth. Ensure T << mean time between correlated failures.
- Quorum latency
  - p99 write ≈ max leader append + max N−1 follower acks for W quorum; add cross‑AZ RTT if applicable.
- Availability of a replicated object (rough)
  - For independent p(node_up), Avail ≈ 1 − Π (1 − p). Independence rarely holds; adjust with fault domains.

24) How to make weak consistency safe enough
- Detectable artifacts
  - Duplicates and padding are acceptable if detectable; corruption is not. Always add checksums.
- Idempotence everywhere
  - From client to final sink, maintain idempotent semantics; otherwise retries change results.
- Convergence guarantees
  - Make “eventual” measurable: define max replication lag under load; prioritize stragglers; expose version vectors.

25) Evolving requirements: how to adapt the architecture
- When metadata RAM/CPU saturates
  - Shard the namespace; introduce a root coordinator for cross‑shard ops; add read‑only followers.
- When single‑file append bottlenecks
  - Partition the file (file‑per‑producer or sharded segments); merge later.
- When global durability targets tighten
  - Move hot paths to quorum consensus; add sync replication across failure domains; quantify costs upfront.

26) The meta‑skill: designing “good enough” contracts
- Start from user‑visible invariants
  - What must never happen? What must eventually happen? What anomalies are acceptable?
- Map invariants to mechanisms
  - Fencing tokens, epochs, leases for safety of leadership. WAL + checkpoints for recovery. Idempotency keys + checksums for data path.
- Quantify tradeoffs
  - Add RTTs, storage overhead, and repair bandwidth to every option; don’t argue in adjectives.

Short applied examples
- Log ingestion at 1M records/s across regions
  - Partition by producer; leader per partition via lease; at‑least‑once with idempotent record IDs; async replicate cross‑region with per‑partition offset fences; downstream sorter dedupes.
- Photo storage for billions of objects
  - Object immutability after upload; put metadata in a CP store (catalog) with read replicas; objects stored on EC with local repair; TTL + signed URLs for cache; background rebalancer keeps RF and cost.

If you want, I can tailor this content to a specific workload and write design notes that derive the exact invariants, replication strategy, and repair math for that case (e.g., multi‑region analytics lake, real‑time messaging, or OLTP storage).