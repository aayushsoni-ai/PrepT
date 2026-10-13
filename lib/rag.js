// lib/rag.js
// ─── RAG Core: Embedding generation + Vector similarity search ───────────────
// Uses Gemini text-embedding-004 (768 dimensions) + Supabase pgvector

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./prisma.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Convert a text string into a 768-dimension embedding vector using Gemini.
 * @param {string} text
 * @returns {Promise<number[]>} - Array of 768 floats
 */
export async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  });
  return result.embedding.values;
}

/**
 * Search the KnowledgeDocument table using cosine similarity.
 *
 * @param {string} queryText  - The natural language query to embed and search
 * @param {object} filters    - Optional filters: { type, category, difficulty }
 * @param {number} limit      - Max number of results to return (default: 8)
 * @returns {Promise<Array>}  - Array of matching documents with similarity score
 *
 * Example:
 *   const questions = await searchKnowledge(
 *     "Redis cache invalidation distributed system",
 *     { type: "QUESTION", category: "BACKEND", difficulty: "Senior" },
 *     8
 *   );
 */
export async function searchKnowledge(queryText, filters = {}, limit = 8) {
  try {
    // 1. Convert query to a vector
    const queryEmbedding = await getEmbedding(queryText);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // 2. Build optional WHERE clauses dynamically
    const { type, category, difficulty } = filters;

    // 3. Run cosine similarity search via raw SQL (pgvector operator: <=>)
    //    Lower <=> distance = higher similarity
    //    We return 1 - distance as "similarity" (1.0 = perfect match)
    const results = await db.$queryRawUnsafe(
      `
      SELECT
        id,
        type,
        title,
        content,
        answer,
        category,
        difficulty,
        company,
        ROUND((1 - (embedding <=> '${vectorString}'::vector))::numeric, 4) AS similarity
      FROM "KnowledgeDocument"
      WHERE
        ($1::text IS NULL OR type = $1)
        AND ($2::text IS NULL OR category = $2)
        AND ($3::text IS NULL OR difficulty = $3)
      ORDER BY embedding <=> '${vectorString}'::vector
      LIMIT $4;
      `,
      type ?? null,
      category ?? null,
      difficulty ?? null,
      limit
    );

    return results;
  } catch (err) {
    console.error("[rag] searchKnowledge error:", err.message);
    return [];
  }
}

/**
 * Convenience: retrieve interview questions for a given category + difficulty.
 * Used by the AI Copilot panel during live calls.
 */
export async function getQuestionsForCategory(category, difficulty = null, limit = 12) {
  const query = `${category} interview questions ${difficulty ?? ""}`.trim();
  return searchKnowledge(query, { type: "QUESTION", category, difficulty }, limit);
}

/**
 * Convenience: retrieve evaluation rubrics for a list of topics.
 * Used by the post-interview AI feedback generator.
 */
export async function getRubricsForTopics(topicsText, category = null, limit = 6) {
  return searchKnowledge(topicsText, { type: "RUBRIC", category }, limit);
}
