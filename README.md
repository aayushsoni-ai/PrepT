# Prept — An AI-Powered Marketplace for Real-World Interview Preparation

<p align="center">
  <img width="1280" alt="Prept Dashboard Overview" src="https://raw.githubusercontent.com/aayushsoni-ai/PrepT/main/banner.png" />
</p>

## 🌟 Overview
**Prept** is a modern, full-stack interview marketplace built by  **Aayush Soni**, designed to redefine how mock interviews are conducted. It combines real-time video (WebRTC), collaborative tools, and AI-powered feedback into a seamless, scalable platform.

By enabling interviewers to monetize their time with flexible availability and automated payouts, and empowering candidates with smooth booking, live sessions, and actionable insights, Prept delivers a unified solution to the fragmented mock interview landscape.
- **All-in-One Unified Ecosystem:** Instead of relying on fragmented third-party scheduling and meeting links, Prept natively embeds zero-latency video calls and scheduling dynamically within the browser.
- **Intelligent Credit & Payouts Engine:** Features a custom double-entry ledger system using Prisma transactions to guarantee safe, race-condition-free credit deductions and automated backend withdrawal pipelines.
- **Generative AI Integration:** Leverages AI APIs to generate deep insights, structure feedback automatically, and review interview performance to supercharge candidate prep.
- **State-of-the-art Security:** Implements intelligent rate limiters (via Arcjet) to bulletproof sensitive financial operations and endpoints against bots or abuse.

## 🛠️ Tooling & Tech Stack
I have meticulously engineered this platform using the latest industry standards:

**Core Architecture**
- **Next.js (App Router)** - Leveraging Server Actions, SSR, and React Server Components for maximum performance.
- **React 19** - Utilizing the absolute latest concurrency hooks and state management.

**Authentication & Security**
- **Clerk** - Advanced session management and secure authentication.
- **Arcjet** - Real-time bot protection and rate-limiting to protect vital API routes.

**Database & Data-Layer**
- **Prisma ORM** - Strongly-typed database layer with Postgres edge compatibility.
- **PostgreSQL** - Highly robust relational database handling complex table relationships (Bookings, Availabilities, Users, Payouts).

**Real-Time Media & Communications**
- **Stream Video SDK** - Delivering low-latency, scalable video conferencing rooms dynamically provisioned for each interview.
- **Stream Chat** - Synced text channels for in-interview communications.
- **Resend & React Email** - Delivering beautiful programmatic transactional emails in React.

**Artificial Intelligence**
- **Google Generative AI (Gemini)** - The AI brain behind intelligent candidate evaluations and dynamically generated feedback.

**UI/UX & Styling**
- **Tailwind CSS V4** - Utility-first styling with the newly introduced high-performance v4 engine.
- **Shadcn UI & Radix Primitives** - Fully accessible and unstyled base components tailored to the exact design language of the platform.
- **Motion** - Fluid, high-performance layout transitions and micro-animations.

## 🧠 Author
Architected and developed by **Aayush Soni**. 
This platform serves as a flagship demonstration of building complex, real-time, AI-augmented, and highly secure full-stack applications.
