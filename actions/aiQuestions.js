"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { currentUser } from "@clerk/nextjs/server";

const CATEGORY_PROMPTS = {
  FRONTEND: "React, JavaScript, CSS, performance, accessibility, browser APIs",
  BACKEND:
    "Node.js, REST APIs, databases, authentication, caching, scalability",
  FULLSTACK:
    "full-stack architecture, API design, state management, deployment",
  DSA: "data structures, algorithms, time complexity, problem solving",
  SYSTEM_DESIGN:
    "distributed systems, scalability, databases, microservices, caching",
  BEHAVIORAL:
    "leadership, teamwork, conflict resolution, career growth, STAR method",
  DEVOPS: "CI/CD, Docker, Kubernetes, cloud infrastructure, monitoring",
  MOBILE:
    "React Native, iOS/Android, performance, offline support, app lifecycle",
};

export const generateInterviewQuestions = async ({ category }) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  if (!category || !CATEGORY_PROMPTS[category])
    throw new Error("Invalid category");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  // ── RAG: Retrieve real questions from knowledge base ─────────────────────
  let retrievedQuestions = [];
  try {
    const { getQuestionsForCategory } = await import("@/lib/rag");
    retrievedQuestions = await getQuestionsForCategory(category, null, 12);
    console.log(
      `[aiQuestions] RAG retrieved ${retrievedQuestions.length} questions for ${category}`
    );
  } catch (ragErr) {
    console.warn(
      "[aiQuestions] RAG retrieval failed, falling back to pure generation:",
      ragErr.message
    );
  }

  let prompt;

  if (retrievedQuestions.length >= 3) {
    // ── RAG-AUGMENTED PROMPT: Gemini selects + enriches from real questions ──
    const knowledgeContext = retrievedQuestions
      .map(
        (q, i) =>
          `[${i + 1}] ${q.company ? `(${q.company}) ` : ""}${q.content}\n   Expected Answer Guidance: ${q.answer ?? "Not specified"}`
      )
      .join("\n\n");

    prompt = `You are an expert technical interviewer running a live mock interview.

You have been provided with a curated knowledge base of ${retrievedQuestions.length} verified interview questions for the ${category} domain.

KNOWLEDGE BASE (real questions — use these as your primary source):
${knowledgeContext}

TASK:
1. Select the 6 most balanced and varied questions from the knowledge base above.
2. For each selected question, write a concise evaluator guide (2-4 sentences) summarizing what a strong answer looks like.
3. You may slightly rephrase questions for clarity but do NOT invent entirely new questions.

Respond ONLY with a valid JSON array. No markdown, no backticks, no explanation:
[{"question": "...", "answer": "..."}, ...]`;
  } else {
    // ── FALLBACK: Pure Gemini generation if knowledge base is empty/small ──
    console.log(
      "[aiQuestions] Not enough RAG results, using fallback generation"
    );
    prompt = `You are an expert technical interviewer. Generate 6 interview questions for a ${category} role covering: ${CATEGORY_PROMPTS[category]}.

For each question, provide a concise but complete answer (2-4 sentences) that an interviewer can use to evaluate responses.

Respond ONLY with a valid JSON array. No markdown, no backticks, no explanation. Example format:
[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]`;
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text.replace(/^```json|^```|```$/gm, "").trim();
  const questions = JSON.parse(clean);

  return {
    questions,
    source: retrievedQuestions.length >= 3 ? "rag" : "generated",
    ragCount: retrievedQuestions.length,
  };
};
