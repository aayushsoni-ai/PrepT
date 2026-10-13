![PrepT Banner](./banner.png)

# PrepT — Enterprise AI-Powered Mock Interview & Talent Marketplace

[![CI/CD Pipeline](https://github.com/aayushsoni-ai/PrepT/actions/workflows/deploy.yml/badge.svg)](https://github.com/aayushsoni-ai/PrepT/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-AWS%20EC2-FF9900?logo=amazon-aws&logoColor=white)](https://prept.duckdns.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-Supabase%20pgvector%20(HNSW)-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage%20Alpine-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Security](https://img.shields.io/badge/Security-SSL%20%2F%20Let's%20Encrypt-003A70?logo=letsencrypt&logoColor=white)](https://letsencrypt.org)

> 🚀 **Live Production Deployment:** [https://prept.duckdns.org](https://prept.duckdns.org)

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [High-Level Design (HLD)](#-high-level-design-hld)
3. [End-to-End Business & Technical Workflows](#-end-to-end-business--technical-workflows)
4. [RAG Architecture & Benchmark Audit](#-rag-architecture--benchmark-audit)
5. [Database Schema & Data Architecture](#-database-schema--data-architecture)
6. [Categorized Tech Stack & Architectural Decisions](#-categorized-tech-stack--architectural-decisions)
7. [DevOps, Cloud & Production Deployment](#-devops-cloud--production-deployment)
8. [Local Development Guide](#-local-development-guide)

---

## 🎯 Project Overview

**PrepT** is a full-stack, enterprise-grade marketplace connecting job seekers (*Interviewees*) with vetted industry experts (*Interviewers*) for real-time mock interviews. 

Unlike generic AI chatbot mock interviewers, PrepT facilitates **human-to-human interviews** augmented by an **intelligent AI subsystem**:
* **Live In-Call Copilot:** Powered by a **Retrieval-Augmented Generation (RAG)** pipeline utilizing PostgreSQL `pgvector` with **HNSW** indexing and Gemini 768-dimensional embeddings to surface relevant, role-specific questions and evaluation rubrics in **< 40ms**.
* **Evidence-Grounded Feedback:** Analyzes full conversational transcripts against engineering rubrics, citing verbatim quotes while eliminating LLM hallucinations through speech-turn guards.
* **Automated Financial Escrow:** Holds credits in escrow upon booking, tracks WebRTC attendance presence via webhooks to prevent fraud, and auto-settles payouts to interviewers.
* **Production Cloud Deployment:** Containerized with multi-stage Docker builds and hosted on **AWS EC2** behind an **Nginx** reverse proxy with automated **Let's Encrypt SSL** and a **GitHub Actions CI/CD** pipeline.

---

## 🏛 High-Level Design (HLD)

### 1. System Topology & Architecture Diagram

```mermaid
flowchart TD
    subgraph Client_Layer ["Client Layer"]
        Browser["User Web Browser (Desktop / Mobile)"]
    end

    subgraph Edge_Security ["Edge & Reverse Proxy Layer (AWS EC2 Host)"]
        Firewall["UFW Host Firewall (Ports 22, 80, 443)"]
        Nginx["Nginx Reverse Proxy + Let's Encrypt TLS Termination"]
        Firewall --> Nginx
    end

    subgraph App_Container ["Application Server (Docker Container: Port 3000)"]
        NextServer["Next.js 16 Standalone Server (Node.js 20 Alpine)"]
        Middlewares["Auth & Security Middlewares (Clerk + Arcjet)"]
        ServerActions["Next.js Server Actions & API Routes"]
        RAGModule["RAG Retrieval Engine (lib/rag.js)"]
        NextServer --> Middlewares --> ServerActions
        ServerActions --> RAGModule
    end

    subgraph Managed_Cloud_Services ["External Managed Cloud Services"]
        ClerkAuth["Clerk Auth (JWT & Session Management)"]
        StreamSDK["Stream Video & Chat (WebRTC SFU & Audio Transcripts)"]
        GeminiAPI["Google Gemini AI (gemini-2.5-flash-lite & gemini-embedding-001)"]
        ResendMail["Resend & React Email (Transactional Notifications)"]
        ArcjetSec["Arcjet Cloud (Bot Detection & Shield)"]
    end

    subgraph Database_Layer ["Database & Vector Store (Supabase Managed PostgreSQL)"]
        PrismaRelational[("Relational Store (Users, Bookings, Escrow, Reviews)")]
        pgvectorStore[("Vector Store (KnowledgeDocument: 768-dim Vectors)")]
        HNSWIndex["HNSW Index (Hierarchical Navigable Small World)"]
        pgvectorStore --- HNSWIndex
    end

    Browser -->|HTTPS :443| Firewall
    Nginx -->|Proxy Pass :3000| NextServer

    Middlewares -.-> ClerkAuth
    Middlewares -.-> ArcjetSec
    ServerActions --> PrismaRelational
    RAGModule -->|Dense Embeddings| GeminiAPI
    RAGModule -->|Cosine Distance <=>| pgvectorStore
    ServerActions --> StreamSDK
    ServerActions --> ResendMail
```

### 2. Architectural Layers & Responsibilities

1. **Edge & Transport Layer:**
   * **Nginx Reverse Proxy:** Terminates incoming SSL/TLS certificates issued by Let's Encrypt, buffers client requests, compresses assets with Gzip, and forwards traffic to the internal container on `http://127.0.0.1:3000`.
   * **UFW Firewall:** Restricts inbound network access strictly to SSH (`22`), HTTP (`80`), and HTTPS (`443`).
2. **Application Runtime Layer:**
   * **Next.js 16 (Turbopack):** Combines Server Components (RSC) for minimal client bundles with Server Actions for zero-API-boilerplate mutations.
   * **Multi-Stage Docker Container:** Packages the standalone Next.js server on Alpine Linux, running as an unprivileged user (`nextjs:nodejs`, UID `1001`).
3. **AI & Vector Layer:**
   * **Gemini Embedding Engine (`gemini-embedding-001`):** Generates 768-dimensional normalized dense vectors.
   * **PostgreSQL `pgvector` with HNSW Index:** Performs sub-40ms cosine similarity searches (`ORDER BY embedding <=> $1::vector LIMIT K`) across 8 engineering domains.
4. **Data Persistence & Ledger Layer:**
   * **Prisma ORM with `@prisma/adapter-pg`:** Provides type-safe queries, connection pooling, and transactional integrity.
   * **Double-Entry Style Ledger:** Credit movements are recorded in an append-only `CreditTransaction` table to prevent balance manipulation.

---

## 🔄 End-to-End Business & Technical Workflows

### Workflow 1: Interview Booking & Escrow Hold

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Interviewee
    participant App as Next.js App
    participant DB as PostgreSQL (Prisma)
    participant Mail as Resend Service
    actor Interviewer as Expert Interviewer

    Candidate->>App: Selects Date, Time & Plan Tier
    App->>DB: Check Candidate Credit Balance >= Plan Cost
    alt Insufficient Credits
        App-->>Candidate: Prompt Credit Top-Up Modal
    else Sufficient Balance
        App->>DB: BEGIN Transaction: Lock credits in escrow (SettlementStatus = HELD)
        App->>DB: Create Booking record (Status = PENDING)
        App->>DB: Log CreditTransaction (type = BOOKING_HELD)
        App->>DB: COMMIT Transaction
        App->>Mail: Dispatch booking notification email to Interviewer
        Mail-->>Interviewer: Email with 1-click Accept / Reject links
        App-->>Candidate: Display confirmation with calendar sync
    end
```

---

### Workflow 2: Live Session, WebRTC & Real-Time RAG Copilot

```mermaid
sequenceDiagram
    autonumber
    actor Interviewer as Interviewer
    participant App as Next.js Call Room
    participant Stream as Stream Video SFU
    participant RAG as RAG Engine (lib/rag.js)
    participant pgvector as Supabase pgvector (HNSW)
    participant Gemini as Google Gemini AI

    Interviewer->>App: Joins Interview Call Room
    App->>Stream: Initialize WebRTC Session (Audio, Video, Recording)
    Interviewer->>App: Clicks "Generate Questions" in AI Copilot Panel
    App->>RAG: getQuestionsForCategory(category, difficulty)
    RAG->>Gemini: Generate 768-dim query embedding
    Gemini-->>RAG: Returns float32[768] vector
    RAG->>pgvector: SELECT title, content, answer WHERE type='QUESTION' ORDER BY embedding <=> vector LIMIT 12
    pgvector-->>RAG: Returns top matching verified questions (< 40ms)
    RAG->>Gemini: Prompt with Knowledge Base context to select & summarize 6 best questions
    Gemini-->>App: Returns curated questions + evaluator answer criteria
    App-->>Interviewer: Renders questions in real-time UI without video stream lag
```

---

### Workflow 3: Automated Settlement & Presence Webhooks

```mermaid
sequenceDiagram
    autonumber
    participant Stream as Stream Webhook Gateway
    participant Webhook as /api/webhooks/stream
    participant Settlement as actions/settlement.js
    participant DB as PostgreSQL DB
    participant Mail as Resend Mail

    Stream->>Webhook: POST call.ended (duration, participant sessions, recording)
    Webhook->>DB: Query Booking by streamCallId
    Webhook->>Settlement: settleCall(bookingId)
    Settlement->>DB: Calculate Interviewer vs Candidate duration from AttendanceLog
    alt Both attended >= required minimum duration
        Settlement->>DB: Settle escrow (SettlementStatus = SETTLED)
        Settlement->>DB: Credit interviewer ledger (creditBalance += creditsCharged)
        Settlement->>DB: Log CreditTransaction (type = BOOKING_EARNING)
        Settlement->>Mail: Send session completion & rating request
    else Interviewer No-Show
        Settlement->>DB: Refund candidate credits (SettlementStatus = REFUNDED)
        Settlement->>DB: Increment interviewer noShowCount
        Settlement->>DB: Log CreditTransaction (type = BOOKING_REFUND)
    else Candidate No-Show
        Settlement->>DB: Release held credits to interviewer (SettlementStatus = SETTLED)
    end
```

---

### Workflow 4: RAG-Grounded Post-Call AI Review Generation

```mermaid
sequenceDiagram
    autonumber
    participant Webhook as Stream Webhook
    participant AIReview as actions/ai-review.js
    participant RAG as RAG Engine
    participant pgvector as Supabase pgvector
    participant Gemini as Gemini 2.5 Flash
    participant DB as PostgreSQL DB

    Webhook->>AIReview: Trigger review on call.transcription_ready
    AIReview->>Stream: Fetch full audio transcript text
    AIReview->>AIReview: Check Transcript Guard: speechTurnCount >= 5
    alt Insufficient Speech Turns (< 5)
        AIReview->>DB: Update AISummary (status = FAILED, error = "Insufficient transcript")
        Note over AIReview: Prevents fabricated hallucinated reviews
    else Meaningful Transcript Available
        AIReview->>RAG: getRubricsForTopics(interviewType, primaryCategory, 4)
        RAG->>pgvector: Cosine query for official FAANG grading rubrics
        pgvector-->>RAG: Returns rubric criteria (Frontend, Backend, System Design, etc.)
        AIReview->>Gemini: Send prompt: Transcript + Rubric standards + Citation rules
        Gemini-->>AIReview: Returns JSON evaluation (4 domain scores, strengths, quotes, gaps)
        AIReview->>DB: Save AISummary (status = COMPLETED)
    end
```

---

### Workflow 5: GitHub Actions CI/CD Deployment Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub Repository
    participant Actions as GitHub Actions Runner
    participant EC2 as AWS EC2 Server
    participant Docker as Docker Engine

    Dev->>GH: git push origin main
    GH->>Actions: Trigger CI/CD Workflow (.github/workflows/deploy.yml)
    
    rect rgb(240, 248, 255)
        note over Actions: Job 1: Test & Build (CI)
        Actions->>Actions: Install dependencies (npm ci)
        Actions->>Actions: Generate Prisma Client (npx prisma generate)
        Actions->>Actions: Run RAG Benchmark (npm run test:rag)
        Actions->>Actions: Compile Next.js production build (npm run build)
    end

    rect rgb(245, 255, 245)
        note over Actions, EC2: Job 2: Continuous Deployment (CD)
        Actions->>EC2: SSH connection via appleboy/ssh-action using EC2_SSH_KEY
        EC2->>EC2: git pull origin main
        EC2->>Docker: docker compose up -d --build
        Docker->>Docker: Build standalone Alpine image & start container
        EC2->>Docker: docker image prune -f
    end
    
    Actions-->>Dev: Pipeline Succeeded (Live at https://prept.duckdns.org)
```

---

## 🧠 RAG Architecture & Benchmark Audit

PrepT replaces non-deterministic LLM prompt generation with an exact **Retrieval-Augmented Generation (RAG)** pipeline.

### Vector Knowledge Base Schema (Native PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "type"        TEXT         NOT NULL, -- 'QUESTION' | 'RUBRIC'
  "title"       TEXT         NOT NULL,
  "content"     TEXT         NOT NULL,
  "answer"      TEXT,
  "category"    TEXT         NOT NULL, -- 'FRONTEND', 'BACKEND', 'DSA', etc.
  "difficulty"  TEXT         NOT NULL DEFAULT 'Mid',
  "company"     TEXT,
  "embedding"   vector(768)  NOT NULL,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- HNSW Index for high-throughput, sub-40ms cosine similarity search
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_embedding_idx"
  ON "KnowledgeDocument"
  USING hnsw (embedding vector_cosine_ops);
```

### Production Benchmark Results (`scripts/test-production-rag.js`)

Executed on live Supabase PostgreSQL infrastructure:

| Benchmark Dimension | Measured Number | Industry Standard | Evaluation |
| :--- | :--- | :--- | :--- |
| **pgvector DB Query Time (HNSW)** | **37 ms (P50)** / **47 ms (P90)** | < 100 ms | **Sub-50ms Ultra Fast ✓** |
| **Gemini 768-dim Embedding Latency** | **474 ms (P50)** / **644 ms (P90)** | < 800 ms | **Optimal External API Latency ✓** |
| **Total End-to-End Pipeline Latency** | **510 ms (P50)** / **711 ms (P90)** | < 1,000 ms | **Seamless In-Call Response ✓** |
| **Throughput (15 Concurrent Workers)** | **393.2 Queries / Second** | > 100 QPS | **High Concurrency Resilient ✓** |
| **Stress Test Error Rate** | **0.0% (100% Availability)** | < 1.0% | **Zero Connection Drops ✓** |
| **Cosine Precision Rate** | **100.0% (> 0.74 Cosine Score)** | > 85% | **Exact Domain Recall ✓** |
| **Node.js Memory Footprint** | **25.1 MB Heap / 189 MB RSS** | < 512 MB | **Extremely Low Memory Profile ✓** |

---

## 🗄 Database Schema & Data Architecture

### Entity-Relationship Diagram

```mermaid
erDiagram
    User {
        String id PK
        String clerkUserId UK
        String email UK
        String name
        UserRole role
        Int credits
        Int creditBalance
        Int creditRate
        Float avgRating
        Int totalReviews
        Float completionRate
        Int noShowCount
        String referralCode UK
    }

    Availability {
        String id PK
        String interviewerId FK
        DateTime startTime
        DateTime endTime
        AvailabilityStatus status
    }

    InterviewPlan {
        String id PK
        String interviewerId FK
        String name
        Int durationMins
        Int creditCost
        Boolean isActive
        Int discountPercent
        Int bundleSize
        Int bundlePrice
    }

    Booking {
        String id PK
        String intervieweeId FK
        String interviewerId FK
        String planId FK
        DateTime startTime
        DateTime endTime
        BookingStatus status
        Int creditsCharged
        String streamCallId UK
        SettlementStatus settlementStatus
        Int heldAmount
        Boolean interviewerJoined
        Boolean intervieweeJoined
        Int interviewerDuration
        Int intervieweeDuration
    }

    AttendanceLog {
        String id PK
        String bookingId FK
        String userId FK
        AttendanceEvent event
        DateTime timestamp
    }

    AISummary {
        String id PK
        String bookingId FK
        Int overallScore
        Int technicalScore
        Int communicationScore
        Int problemSolvingScore
        Int confidenceScore
        String technicalFeedback
        String communicationFeedback
        String improvementRoadmap
        AISummaryStatus status
    }

    InterviewerReview {
        String id PK
        String bookingId FK
        String interviewerId FK
        String intervieweeId FK
        Int rating
        String comment
    }

    CreditTransaction {
        String id PK
        String userId FK
        String bookingId FK
        Int amount
        TransactionType type
        DateTime createdAt
    }

    Payout {
        String id PK
        String interviewerId FK
        Int credits
        Float platformFee
        Float netAmount
        String paymentMethod
        PayoutStatus status
    }

    Referral {
        String id PK
        String referrerId FK
        String refereeId FK
        ReferralStatus status
        Int referrerReward
        Int refereeReward
    }

    KnowledgeDocument {
        String id PK
        String type
        String title
        String content
        String category
        String difficulty
        vector embedding
    }

    User ||--o{ Availability : "defines"
    User ||--o{ InterviewPlan : "offers"
    User ||--o{ Booking : "books/hosts"
    User ||--o{ CreditTransaction : "owns"
    User ||--o{ Payout : "requests"
    User ||--o{ InterviewerReview : "receives/writes"
    User ||--o{ Referral : "refers"

    Booking ||--o{ AttendanceLog : "records"
    Booking ||--o| AISummary : "generates"
    Booking ||--o| InterviewerReview : "has"
    Booking ||--o{ CreditTransaction : "escrow"
    InterviewPlan ||--o{ Booking : "applies to"
```

### Schema Enums & State Machines

| Enum | Allowed Values | Usage in Architecture |
| :--- | :--- | :--- |
| **`UserRole`** | `UNASSIGNED`, `INTERVIEWEE`, `INTERVIEWER` | Role-based routing, authorization guards, and dashboard rendering. |
| **`BookingStatus`** | `PENDING`, `SCHEDULED`, `COMPLETED`, `CANCELLED`, `REJECTED` | Lifecycle of an interview reservation. |
| **`SettlementStatus`** | `HELD`, `SETTLED`, `REFUNDED`, `DISPUTED` | Escrow state machine governing credit locking and release. |
| **`AttendanceEvent`** | `JOINED`, `LEFT`, `REJOINED`, `DISCONNECTED` | Granular presence logging via Stream WebRTC webhooks. |
| **`InterviewCategory`**| `FRONTEND`, `BACKEND`, `FULLSTACK`, `DSA`, `SYSTEM_DESIGN`, `BEHAVIORAL`, `DEVOPS`, `MOBILE` | Taxonomy for profile filtering, question vectors, and evaluation rubrics. |
| **`TransactionType`** | `CREDIT_PURCHASE`, `BOOKING_DEDUCTION`, `BOOKING_EARNING`, `BOOKING_REFUND`, `BOOKING_HELD`, `HELD_RELEASE`, `REFERRAL_REWARD` | Double-entry ledger classification. |
| **`PayoutStatus`** | `PROCESSING`, `PROCESSED` | Fiat withdrawal fulfillment tracking. |
| **`AISummaryStatus`** | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` | Asynchronous transcript analysis state machine. |

---

## 🛠 Categorized Tech Stack & Architectural Decisions

| Category | Technology | Provider / Version | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Core Framework** | **Next.js** | `v16.2.2` (Turbopack) | Server Components for instant initial paint, Server Actions for zero-API boilerplate, and standalone output for minimal Docker builds. |
| **Language** | **JavaScript / Node.js** | `Node.js 20 LTS` | High asynchronous I/O performance for concurrent WebSocket and HTTP requests. |
| **Database** | **PostgreSQL** | Supabase Managed | ACID compliance for transactional credit ledgers combined with native relational foreign keys. |
| **Vector Engine** | **`pgvector`** | Supabase Extension | Native vector storage within Postgres eliminating the cost and sync complexity of external vector DBs (Pinecone/Weaviate). |
| **Vector Index** | **HNSW Index** | `hnsw (vector_cosine_ops)` | Provides 99%+ recall without requiring centroid clustering, achieving **37ms P50 latency** across arbitrary dataset sizes. |
| **AI Embeddings** | **Google Gemini** | `gemini-embedding-001` | High-density 768-dimensional semantic embeddings optimized for retrieval. |
| **LLM Inference** | **Google Gemini** | `gemini-2.5-flash-lite` | Sub-second generative speed with strict JSON schema response mode enforcement. |
| **WebRTC & Video** | **Stream Video SDK** | `@stream-io/video-react-sdk` | Enterprise global SFU network handling media routing, background recording, and real-time speech transcription. |
| **Authentication** | **Clerk** | `@clerk/nextjs v6` | Complete session lifecycle, OAuth social logins, secure JWT cookies, and instant user onboarding. |
| **Edge Defense** | **Arcjet** | `@arcjet/next v1` | IP rate limiting, bot protection, and attack shielding configured directly in Next.js middleware. |
| **Styling & UI** | **Tailwind CSS v4 + Radix** | Shadcn UI Primitives | Accessible headless UI components styled with high-performance CSS tokens. |
| **Email Engine** | **Resend** | `Resend API` + React Email | Transactional emails with typed React components for cross-client email rendering. |
| **Containerization** | **Docker** | Multi-stage Alpine | Multi-stage builder shrinks image footprint to **180 MB**; unprivileged non-root runner enforces container security. |
| **Cloud Hosting** | **AWS EC2** | `c7i-flex.large` (Mumbai) | 2 vCPU, 4 GiB RAM dedicated compute in `ap-south-1` offering cost-effective, full-root hosting control. |
| **Reverse Proxy** | **Nginx** | `v1.24+` | TLS 1.3 termination, HTTP/2 multiplexing, client buffering, and reverse proxy forwarding to port 3000. |
| **SSL / TLS** | **Certbot** | Let's Encrypt | Automated 90-day SSL certificate issuance and background cron renewal. |
| **CI/CD** | **GitHub Actions** | Native GitHub Workflows | Zero-maintenance automated testing, build compilation, and SSH zero-downtime deployment. |

---

## 🚢 DevOps, Cloud & Production Deployment

### 1. Docker Multi-Stage Build Architecture

```
[ Stage 1: Base (node:20-alpine + libc6-compat) ]
                      │
                      ▼
[ Stage 2: Deps ] ───► Installs package.json & runs npx prisma generate
                      │
                      ▼
[ Stage 3: Builder ] ─► Compiles Next.js standalone server with Turbopack
                      │
                      ▼
[ Stage 4: Runner ] ──► Unprivileged 'nextjs' user (UID 1001)
                        Copies standalone server + static assets (~180 MB image)
```

### 2. GitHub Actions Automated Pipeline (`deploy.yml`)

1. **Trigger:** Push to `main` branch.
2. **Job 1 (CI — Test & Validate):**
   * Checks out code on `ubuntu-latest`.
   * Sets up Node.js 20 and executes `npm ci`.
   * Runs `npx prisma generate` to ensure type definitions compile.
   * Runs `npm run test:rag` to benchmark vector similarity and latency.
   * Compiles the production Next.js bundle (`npm run build`).
3. **Job 2 (CD — Continuous Deployment):**
   * Uses `appleboy/ssh-action` to establish an encrypted SSH session with AWS EC2 using `EC2_SSH_KEY`.
   * Executes:
     ```bash
     cd prept
     git pull origin main
     docker compose up -d --build
     docker image prune -f
     ```
   * Result: Zero-downtime container update.

---

## 💻 Local Development Guide

### 1. Prerequisites
* Node.js `20.x` or later
* Git
* PostgreSQL database with `pgvector` enabled (or Supabase account)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/aayushsoni-ai/PrepT.git
cd PrepT

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory using `.env.example`:
```bash
cp .env.example .env
```

Fill in your service credentials:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Supabase PostgreSQL + pgvector)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# AI & APIs
GEMINI_API_KEY=AIzaSy...
ARCJET_KEY=ajkey_...

# Stream Video & Chat
NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET_KEY=...

# Email
RESEND_API_KEY=re_...
```

### 4. Database Setup & RAG Seeding
```bash
# Generate Prisma Client & push schema
npx prisma generate
npx prisma db push

# Enable pgvector table and seed 26 verified questions & rubrics
node scripts/seed-rag.js
```

### 5. Run the Production Benchmark Suite
```bash
npm run test:rag
```

### 6. Start the Local Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
