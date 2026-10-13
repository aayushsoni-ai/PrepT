"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// ─── PROCESS AI REVIEW ────────────────────────────────────

export const processAIReview = async (bookingId) => {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      interviewer: {
        select: { id: true, name: true, categories: true, clerkUserId: true },
      },
      interviewee: {
        select: { id: true, name: true, clerkUserId: true, aiReviewConsent: true },
      },
      aiSummary: true,
    },
  });

  if (!booking) return { success: false, error: "Booking not found" };
  if (!booking.interviewee.aiReviewConsent) {
    return { success: false, error: "User has not consented to AI review" };
  }
  if (booking.status !== "COMPLETED") {
    return { success: false, error: "Booking is not completed" };
  }

  // Idempotency: skip if already processed
  if (booking.aiSummary?.status === "COMPLETED") {
    return { success: true, alreadyDone: true };
  }

  // Ensure AISummary record exists
  let summary = booking.aiSummary;
  if (!summary) {
    summary = await db.aISummary.create({
      data: {
        bookingId,
        status: "PENDING",
        consentGiven: true,
        interviewType: booking.interviewer.categories?.[0] ?? null,
        recordingUrl: booking.recordingUrl ?? null,
      },
    });
  }

  if (summary.status === "FAILED" && (summary.errorMessage?.includes("attempt 3"))) {
    return { success: false, error: "Max retries exceeded" };
  }

  // Mark as PROCESSING
  await db.aISummary.update({
    where: { id: summary.id },
    data: { status: "PROCESSING" },
  });

  try {
    // Fetch transcript if available
    let transcriptText = "";
    if (summary.transcriptUrl) {
      try {
        const res = await fetch(summary.transcriptUrl);
        const jsonl = await res.text();
        const lines = jsonl
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => { try { return JSON.parse(l); } catch { return null; } })
          .filter((e) => e?.type === "speech");

        const speakerMap = {
          [booking.interviewer.clerkUserId]: booking.interviewer.name ?? "Interviewer",
          [booking.interviewee.clerkUserId]: booking.interviewee.name ?? "Candidate",
        };
        transcriptText = lines.map((l) => `${speakerMap[l.speaker_id] ?? l.speaker_id}: ${l.text}`).join("\n");
      } catch (e) {
        console.warn("[ai-review] Failed to fetch transcript:", e.message);
      }
    }

    // Guard: if no meaningful transcript, fail fast rather than generate generic report
    const speechTurnCount = transcriptText.split("\n").filter(Boolean).length;
    if (!transcriptText || speechTurnCount < 5) {
      await db.aISummary.update({
        where: { id: summary.id },
        data: {
          status: "FAILED",
          errorMessage: "Transcript too short or audio recording had no detected speech. Cannot generate a meaningful report.",
        },
      });
      return { success: false, error: "Insufficient transcript data" };
    }

    const interviewType = booking.interviewer.categories?.join(", ") ?? "General";
    const durationMin = booking.startTime && booking.endTime
      ? Math.round((new Date(booking.endTime) - new Date(booking.startTime)) / 60000)
      : 60;

    // ── RAG: Retrieve evaluation rubrics for this interview's domain ─────────
    let rubricsContext = "";
    try {
      const { getRubricsForTopics } = await import("@/lib/rag");
      const primaryCategory = booking.interviewer.categories?.[0] ?? null;
      const rubrics = await getRubricsForTopics(
        `${interviewType} interview evaluation rubric`,
        primaryCategory,
        4
      );
      if (rubrics.length > 0) {
        rubricsContext = rubrics
          .map((r, i) => `[Rubric ${i + 1}] ${r.title}\n${r.answer}`)
          .join("\n\n");
        console.log(`[ai-review] RAG retrieved ${rubrics.length} rubrics for ${interviewType}`);
      }
    } catch (ragErr) {
      console.warn("[ai-review] RAG rubric retrieval failed, continuing without rubrics:", ragErr.message);
    }

    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `You are an elite Staff Engineer conducting a rigorous post-interview evaluation.

Interview Type: ${interviewType}
Duration: ${durationMin} minutes
Interviewer: ${booking.interviewer.name}
Candidate: ${booking.interviewee.name}

${
  rubricsContext
    ? `EVALUATION RUBRICS (Official engineering standards — use these to ground your scores):
${rubricsContext}

`
    : ""
}TRANSCRIPT:
${transcriptText}

CRITICAL EVALUATION RULES:
1. Every score MUST be justified by citing a specific moment or quote from the transcript.
2. Do NOT use generic phrases like "good communication" or "needs improvement" without evidence.
3. If rubrics are provided above, evaluate the candidate's answers strictly against those rubric criteria.
4. If the candidate evaded a question or gave a vague answer, call it out directly with the specific question context.
5. missedConcepts must list exact technical concepts the candidate should have mentioned but did not.

Respond ONLY with valid JSON (no markdown, no backticks, no explanation):
{
  "overallScore": <1-100>,
  "technicalScore": <1-100>,
  "communicationScore": <1-100>,
  "problemSolvingScore": <1-100>,
  "confidenceScore": <1-100>,
  "technicalFeedback": "Cite specific transcript moments. Reference rubric criteria if provided.",
  "communicationFeedback": "Cite a specific moment they explained something clearly or poorly.",
  "strengthsShown": ["Specific strength backed by a transcript quote"],
  "weakAreas": ["Specific weakness with the exact topic or question context"],
  "missedConcepts": ["Exact technical concept not mentioned that rubric requires"],
  "suggestedTopics": ["Specific topic to study based on identified gaps"],
  "improvementRoadmap": "Personalized 2-4 week action plan referencing the specific gaps found.",
  "readinessLevel": "Not Ready | Getting There | Almost Ready | Interview Ready"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .trim()
      .replace(/^```json|^```|```$/gm, "")
      .trim();

    const data = JSON.parse(raw);

    // Write back to DB
    await db.aISummary.update({
      where: { id: summary.id },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        errorMessage: null,
        overallScore: data.overallScore,
        technicalScore: data.technicalScore,
        communicationScore: data.communicationScore,
        problemSolvingScore: data.problemSolvingScore,
        confidenceScore: data.confidenceScore,
        technicalFeedback: data.technicalFeedback,
        communicationFeedback: data.communicationFeedback,
        strengthsShown: data.strengthsShown ?? [],
        weakAreas: data.weakAreas ?? [],
        missedConcepts: data.missedConcepts ?? [],
        suggestedTopics: data.suggestedTopics ?? [],
        improvementRoadmap: data.improvementRoadmap,
        readinessLevel: data.readinessLevel,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[ai-review] processAIReview error:", err);
    // Track retry count in errorMessage
    const prevErr = booking.aiSummary?.errorMessage ?? "";
    const attemptMatch = prevErr.match(/attempt (\d+)/);
    const attempt = attemptMatch ? Number(attemptMatch[1]) + 1 : 1;

    await db.aISummary.update({
      where: { id: summary.id },
      data: { status: "FAILED", errorMessage: `${err.message} (attempt ${attempt})` },
    });

    return { success: false, error: err.message };
  }
};

// ─── GET AI SUMMARY ───────────────────────────────────────

export const getAISummary = async (bookingId) => {
  try {
    const user = await currentUser();
    if (!user) return null;

    const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
    if (!dbUser) return null;

    const summary = await db.aISummary.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            intervieweeId: true,
            interviewerId: true,
            interviewer: { select: { name: true, categories: true } },
          },
        },
      },
    });

    if (!summary) return null;

    // Only interviewee or interviewer of this booking can view
    const isAllowed =
      summary.booking.intervieweeId === dbUser.id ||
      summary.booking.interviewerId === dbUser.id;

    if (!isAllowed) return null;

    return summary;
  } catch (err) {
    console.error("getAISummary error:", err);
    return null;
  }
};

// ─── UPDATE AI CONSENT ────────────────────────────────────

export const updateAIConsent = async (consent) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await db.user.update({
    where: { clerkUserId: user.id },
    data: { aiReviewConsent: Boolean(consent) },
  });

  revalidatePath("/appointments");
  return { success: true };
};

// ─── QUEUE AI REVIEW FOR BOOKING ─────────────────────────

export const queueAIReview = async (bookingId) => {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { interviewee: { select: { aiReviewConsent: true } }, aiSummary: true },
  });

  if (!booking || !booking.interviewee.aiReviewConsent) return;
  if (booking.aiSummary?.status === "COMPLETED") return;

  if (!booking.aiSummary) {
    await db.aISummary.create({
      data: {
        bookingId,
        status: "PENDING",
        consentGiven: true,
        interviewType: null,
        recordingUrl: booking.recordingUrl ?? null,
      },
    });
  }
};
