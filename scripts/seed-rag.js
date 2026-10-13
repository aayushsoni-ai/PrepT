// scripts/seed-rag.js
// ─── One-time script to populate the KnowledgeDocument table ─────────────────
// Run with: npx tsx scripts/seed-rag.js
//
// This script:
// 1. Loads interview questions + rubrics from a local JSON dataset
// 2. Generates embeddings using Gemini text-embedding-004
// 3. Inserts them into your Supabase KnowledgeDocument table via raw SQL
//
// No need to run this again unless you want to add more data.

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { GoogleGenerativeAI } from "@google/generative-ai";
import pg from "pg";

const { Pool } = pg;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── KNOWLEDGE BASE DATA ─────────────────────────────────────────────────────
// This is your curated seed data — real interview questions + evaluation rubrics
// You can expand this dataset or load it from a JSON file/Hugging Face URL
const KNOWLEDGE_BASE = [

  // ──── FRONTEND QUESTIONS ─────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "FRONTEND",
    difficulty: "Mid",
    company: "General",
    title: "React useEffect dependency array",
    content: "Explain the React useEffect hook. What happens if you omit the dependency array? What if you pass an empty array?",
    answer: "Without dependency array: runs after every render. Empty array []: runs once on mount (like componentDidMount). With deps: runs when those values change. Stale closures are a common pitfall — always include all referenced variables in deps. Use useCallback/useMemo to stabilize function/object refs.",
  },
  {
    type: "QUESTION",
    category: "FRONTEND",
    difficulty: "Senior",
    company: "Meta",
    title: "React rendering optimization",
    content: "How do you prevent unnecessary re-renders in React? Walk me through React.memo, useMemo, and useCallback with real use cases.",
    answer: "React.memo: memoize functional components (shallow prop comparison). useMemo: memoize expensive computations. useCallback: memoize function references so child components don't re-render when the parent does. Key insight: premature optimization is harmful — profile first with React DevTools Profiler.",
  },
  {
    type: "QUESTION",
    category: "FRONTEND",
    difficulty: "Senior",
    company: "Google",
    title: "Critical rendering path and web performance",
    content: "Explain the browser's critical rendering path. How would you optimize LCP (Largest Contentful Paint) on a slow page?",
    answer: "CRP: DOM → CSSOM → Render Tree → Layout → Paint → Composite. LCP optimizations: preload key resources, eliminate render-blocking CSS/JS, use CDN + HTTP/2, compress images (WebP/AVIF), use resource hints (prefetch, preconnect), lazy load below-fold content, server-side render above-fold HTML.",
  },
  {
    type: "QUESTION",
    category: "FRONTEND",
    difficulty: "Junior",
    company: "General",
    title: "CSS Box Model",
    content: "Explain the CSS Box Model. What is the difference between box-sizing: content-box and border-box?",
    answer: "Content-box (default): width/height = content only. Padding and border add to total size. Border-box: width/height includes padding + border. Most developers use * { box-sizing: border-box } globally for predictable layouts.",
  },
  {
    type: "QUESTION",
    category: "FRONTEND",
    difficulty: "Mid",
    company: "Amazon",
    title: "Event delegation",
    content: "What is event delegation in JavaScript? When and why would you use it?",
    answer: "Attaching a single event listener on a parent element instead of many listeners on children. Uses event bubbling. Benefits: fewer memory allocations, works for dynamically added children. Example: single click handler on a <ul> that handles all <li> items via e.target.",
  },

  // ──── BACKEND QUESTIONS ──────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "BACKEND",
    difficulty: "Senior",
    company: "Uber",
    title: "Redis distributed caching",
    content: "How do you handle cache invalidation in a distributed system using Redis? Explain cache-aside pattern and how to deal with cache stampede.",
    answer: "Cache-aside (lazy loading): app reads cache → on miss reads DB → writes to cache. Invalidation strategies: TTL-based expiry, write-through (update cache on DB write), event-driven (pub/sub). Cache stampede: multiple parallel requests hit DB simultaneously on cache miss. Solutions: probabilistic early expiration, mutex/lock (Redis SETNX), background refresh before TTL expires.",
  },
  {
    type: "QUESTION",
    category: "BACKEND",
    difficulty: "Mid",
    company: "General",
    title: "REST API pagination",
    content: "What pagination strategies exist for REST APIs? Compare cursor-based vs offset-based pagination.",
    answer: "Offset: LIMIT/OFFSET SQL. Simple but slow on large datasets (full table scan) and inconsistent if rows are inserted/deleted during pagination. Cursor-based: uses an opaque pointer (e.g. last seen ID or timestamp). O(1) to fetch next page regardless of dataset size. Preferred for infinite scroll and large datasets. Keyset pagination is a variant using indexed columns.",
  },
  {
    type: "QUESTION",
    category: "BACKEND",
    difficulty: "Senior",
    company: "Netflix",
    title: "Idempotency in distributed systems",
    content: "What is idempotency and why is it critical in distributed systems? How do you implement it in a payment API?",
    answer: "An operation is idempotent if calling it multiple times produces the same result. Critical because networks fail and retries happen. Implementation: client generates a unique idempotency key per request. Server stores (key → result) in Redis or DB. On duplicate request, return stored result without re-executing. Idempotency keys should have TTL (e.g. 24 hours).",
  },
  {
    type: "QUESTION",
    category: "BACKEND",
    difficulty: "Junior",
    company: "General",
    title: "JWT vs Session authentication",
    content: "Compare JWT-based authentication vs session-based authentication. When would you choose one over the other?",
    answer: "Sessions: server stores state (in-memory or Redis). Stateful, easy to invalidate, requires sticky sessions or shared store. JWT: stateless, all data in token. No server storage needed, scales horizontally. Downside: hard to invalidate before expiry. Choose JWT for stateless microservices/APIs. Choose sessions for traditional web apps where you need instant logout.",
  },
  {
    type: "QUESTION",
    category: "BACKEND",
    difficulty: "Mid",
    company: "Stripe",
    title: "Database transactions and ACID",
    content: "Explain ACID properties. What is the difference between optimistic and pessimistic locking?",
    answer: "Atomicity: all or nothing. Consistency: DB invariants maintained. Isolation: concurrent transactions don't interfere. Durability: committed data persists. Optimistic locking: read freely, check version on write, retry on conflict (low contention). Pessimistic locking: lock row on read, blocks other writes (high contention). Optimistic preferred for read-heavy workloads.",
  },

  // ──── DSA QUESTIONS ──────────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "DSA",
    difficulty: "Mid",
    company: "Google",
    title: "Binary search trees",
    content: "Explain binary search trees. What is the time complexity for search, insert, and delete? How does a balanced BST differ from an unbalanced one?",
    answer: "BST: left subtree < node < right subtree. Average case: O(log n) for search/insert/delete. Worst case (degenerate/linear tree): O(n). Balanced BSTs (AVL, Red-Black): guarantee O(log n) by self-balancing on insert/delete. Real use: databases use B-Trees (disk-friendly variant) for indexes.",
  },
  {
    type: "QUESTION",
    category: "DSA",
    difficulty: "Senior",
    company: "Amazon",
    title: "Dynamic programming - coin change",
    content: "Solve the Coin Change problem (minimum coins to make amount N). Explain your approach and time complexity.",
    answer: "DP bottom-up: dp[0]=0, dp[i]=min(dp[i], dp[i-coin]+1) for each coin. Time: O(amount * coins). Space: O(amount). Key insight: overlapping subproblems (same sub-amount computed multiple times) → memoization or tabulation. Greedy does NOT work for all coin systems (e.g. coins=[1,3,4], amount=6: greedy gives 4+1+1=3, optimal is 3+3=2).",
  },
  {
    type: "QUESTION",
    category: "DSA",
    difficulty: "Junior",
    company: "General",
    title: "Hash map collision handling",
    content: "How does a hash map handle collisions? Explain chaining vs open addressing.",
    answer: "Chaining: each bucket holds a linked list of key-value pairs. Simple, handles high load factors. Open addressing: on collision, probe for next empty slot (linear, quadratic, double hashing). Better cache performance (contiguous memory) but degrades badly at high load. Most language implementations (Java HashMap, Python dict) use chaining or a hybrid.",
  },

  // ──── SYSTEM DESIGN QUESTIONS ────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "SYSTEM_DESIGN",
    difficulty: "Senior",
    company: "Amazon",
    title: "Design a URL shortener",
    content: "Design a URL shortener like bit.ly. Walk through the system design including data model, encoding strategy, and scalability.",
    answer: "Core: POST /shorten → unique 6-char code (Base62 of auto-increment ID or MD5 prefix). GET /{code} → 301 redirect. Data model: {id, short_code, long_url, created_at, user_id}. Scale: read-heavy → cache hot URLs in Redis. Write: single DB table with index on short_code. Avoid hash collisions with DB unique constraint + retry. Analytics: async write-behind to analytics table.",
  },
  {
    type: "QUESTION",
    category: "SYSTEM_DESIGN",
    difficulty: "Senior",
    company: "Meta",
    title: "Design a notification system",
    content: "Design a large-scale push notification system that sends millions of notifications per day across web, iOS, and Android.",
    answer: "Components: Notification Service API → message queue (Kafka/SQS) → channel-specific workers (FCM for Android, APNS for iOS, WebPush, Email via SES). User device token registry. Retry logic with exponential backoff. Rate limiting per user. Fan-out: for social notifications (new follower) use precomputed delivery lists. Store notification history in Cassandra (time-series friendly).",
  },

  // ──── BEHAVIORAL QUESTIONS ───────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "BEHAVIORAL",
    difficulty: "Mid",
    company: "General",
    title: "Handling disagreement with a senior engineer",
    content: "Tell me about a time you disagreed with a more senior engineer or manager on a technical decision. How did you handle it?",
    answer: "Strong answer (STAR method): Situation — describe the technical context. Task — what was at stake. Action — how you raised the concern (data-driven argument, proposed alternatives, sought third-party review). Result — what happened and what you learned. Key signals: respectful, data-backed disagreement; willing to disagree and commit if overruled.",
  },
  {
    type: "QUESTION",
    category: "BEHAVIORAL",
    difficulty: "Senior",
    company: "Amazon",
    title: "Delivering under tight deadline",
    content: "Describe a time when you had to deliver a project under an extremely tight deadline. What tradeoffs did you make?",
    answer: "Strong answer: Clearly identify what was descoped (technical debt accepted consciously, not carelessly). Show prioritization framework. Communicate proactively with stakeholders. Post-delivery: paid back the debt with a follow-up ticket. Avoid: answers that imply you just worked longer hours as the only strategy.",
  },

  // ──── DEVOPS QUESTIONS ───────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "DEVOPS",
    difficulty: "Mid",
    company: "General",
    title: "Docker containers vs virtual machines",
    content: "What is the difference between Docker containers and virtual machines? When would you choose one over the other?",
    answer: "VMs: full OS stack, hardware-level isolation via hypervisor. Heavy (~GBs), slow startup. Containers: share host OS kernel, process-level isolation. Lightweight (MBs), start in seconds. Containers ideal for microservices, CI/CD, consistent dev environments. VMs ideal when you need full OS isolation (e.g., running Windows on Linux host, strong security isolation between tenants).",
  },
  {
    type: "QUESTION",
    category: "DEVOPS",
    difficulty: "Senior",
    company: "Google",
    title: "Zero-downtime deployment strategies",
    content: "Explain blue-green deployment vs canary deployment. When would you use each?",
    answer: "Blue-green: two identical environments. Traffic switches instantly from blue to green. Full rollback is easy. Requires 2x infrastructure. Canary: gradually route % of traffic to new version (1% → 10% → 50% → 100%). Catch issues early with minimal blast radius. More complex to implement. Use blue-green for simple/infrequent releases; canary for risky changes or ML model updates where behavior needs validation at scale.",
  },

  // ──── FULLSTACK QUESTIONS ────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "FULLSTACK",
    difficulty: "Mid",
    company: "General",
    title: "Next.js Server vs Client components",
    content: "Explain the difference between Server Components and Client Components in Next.js App Router. When would you use each?",
    answer: "Server Components: render on server, zero JS sent to client, can directly access DB/filesystem, no hooks or browser APIs. Client Components: rendered client-side with 'use client', support useState/useEffect/event handlers. Use server components for data fetching, auth checks, heavy rendering. Use client components only for interactivity. Default is server in App Router.",
  },

  // ──── MOBILE QUESTIONS ───────────────────────────────────────────────────
  {
    type: "QUESTION",
    category: "MOBILE",
    difficulty: "Mid",
    company: "General",
    title: "React Native bridge architecture",
    content: "Explain React Native's bridge architecture. What are the performance implications and what is the New Architecture (JSI)?",
    answer: "Old bridge: JS thread ↔ serialized JSON messages ↔ native thread. Async, batched. Performance bottleneck for high-frequency events (animations, gestures). New Architecture (JSI): direct JS-to-native function calls via C++ interface. No serialization overhead. Enables synchronous native calls. Fabric (new renderer) + TurboModules use JSI. Critical for smooth 60fps animations.",
  },

  // ──── EVALUATION RUBRICS ─────────────────────────────────────────────────
  {
    type: "RUBRIC",
    category: "FRONTEND",
    difficulty: "Senior",
    company: null,
    title: "React performance rubric",
    content: "Senior Frontend React Performance Evaluation Rubric",
    answer: `STRONG answer MUST include: (1) Profiling before optimizing (React DevTools Profiler). (2) Distinction between React.memo, useMemo, useCallback with correct use cases. (3) Awareness that unnecessary memoization has its own cost. (4) Virtual DOM reconciliation understanding.

WEAK signals: Generic "use memo everywhere", no mention of profiling, confusion between useMemo and useCallback purposes.

RED FLAGS: Claims React always re-renders entire DOM, doesn't know what the reconciler does.`,
  },
  {
    type: "RUBRIC",
    category: "BACKEND",
    difficulty: "Senior",
    company: null,
    title: "Redis caching rubric",
    content: "Senior Backend Redis Caching Evaluation Rubric",
    answer: `STRONG answer MUST include: (1) Cache-aside vs Write-through patterns — knows the tradeoffs. (2) Cache stampede problem and at least one solution (mutex, probabilistic expiry). (3) TTL strategy rationale. (4) Awareness of Redis data structures beyond strings (sorted sets for leaderboards, streams for messaging).

WEAK signals: Only mentions "set TTL and done", no awareness of stampede or invalidation complexity.

RED FLAGS: Recommends in-memory lock (mutexes) for distributed systems — does not scale across replicas.`,
  },
  {
    type: "RUBRIC",
    category: "DSA",
    difficulty: "Mid",
    company: null,
    title: "Dynamic programming rubric",
    content: "Mid-level Dynamic Programming Evaluation Rubric",
    answer: `STRONG answer MUST include: (1) Identifies overlapping subproblems and optimal substructure. (2) Articulates top-down (memoization) vs bottom-up (tabulation) tradeoffs. (3) States correct time AND space complexity. (4) Can explain why greedy fails for the specific problem.

WEAK signals: Only writes code without explaining the DP recurrence relation. Cannot explain why a greedy approach fails.

RED FLAGS: Claims DP and greedy are the same. Cannot state the time complexity.`,
  },
  {
    type: "RUBRIC",
    category: "SYSTEM_DESIGN",
    difficulty: "Senior",
    company: null,
    title: "System design general rubric",
    content: "Senior System Design Evaluation Rubric",
    answer: `STRONG answer MUST include: (1) Clarifies requirements and scale before designing. (2) Identifies bottlenecks proactively (read-heavy vs write-heavy). (3) Chooses appropriate data stores with justification. (4) Discusses tradeoffs explicitly (CAP theorem awareness). (5) Addresses failure modes and redundancy.

WEAK signals: Jumps to solution without requirements gathering. Only draws happy path, no failure handling.

RED FLAGS: Proposes a single database for millions of users without sharding/replication discussion. No mention of caching layer.`,
  },
  {
    type: "RUBRIC",
    category: "BEHAVIORAL",
    difficulty: "Mid",
    company: null,
    title: "Behavioral STAR rubric",
    content: "Behavioral Interview STAR Method Evaluation Rubric",
    answer: `STRONG answer MUST include: (1) Clear Situation with specific context (not vague). (2) Their personal Task/Role — not the team's. (3) Specific Actions they took (not "we decided"). (4) Quantifiable or clearly articulated Result. (5) What they learned.

WEAK signals: Uses "we" throughout without specifying their individual contribution. Situation is too vague ("at my previous job..."). No result or outcome mentioned.

RED FLAGS: Cannot recall a specific example, pivots to hypothetical. Blames others for the outcome.`,
  },
];

// ─── MAIN SEEDING FUNCTION ────────────────────────────────────────────────────

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  console.log(`\n🚀 Starting RAG seed — ${KNOWLEDGE_BASE.length} documents to embed\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
    const doc = KNOWLEDGE_BASE[i];

    try {
      // Text to embed: combines all meaningful fields for richer semantic search
      const textToEmbed = [doc.title, doc.content, doc.answer ?? ""]
        .filter(Boolean)
        .join(" | ");

      // Generate 768-dimension embedding
      const embResult = await embeddingModel.embedContent({
        content: { parts: [{ text: textToEmbed }] },
        outputDimensionality: 768,
      });
      const embedding = embResult.embedding.values;
      const vectorString = `[${embedding.join(",")}]`;

      // Insert into DB
      await pool.query(
        `INSERT INTO "KnowledgeDocument"
          (type, title, content, answer, category, difficulty, company, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
         ON CONFLICT DO NOTHING`,
        [
          doc.type,
          doc.title,
          doc.content,
          doc.answer ?? null,
          doc.category,
          doc.difficulty,
          doc.company ?? null,
          vectorString,
        ]
      );

      successCount++;
      console.log(`  ✓ [${i + 1}/${KNOWLEDGE_BASE.length}] ${doc.type} — "${doc.title}"`);

      // Small delay between Gemini API calls to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      errorCount++;
      console.error(`  ✗ [${i + 1}/${KNOWLEDGE_BASE.length}] "${doc.title}" → ${err.message}`);
    }
  }

  await pool.end();

  console.log(`\n✅ Seed complete — ${successCount} inserted, ${errorCount} failed`);
  console.log(`📊 Your KnowledgeDocument table now has ${successCount} documents with vector embeddings.\n`);
}

seed();
