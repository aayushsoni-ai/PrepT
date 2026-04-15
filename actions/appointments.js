"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getIntervieweeAppointments = async () => {
  const user = await currentUser();
  if (!user) return [];

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser) return [];

  return db.booking.findMany({
    where: { intervieweeId: dbUser.id },
    include: {
      interviewer: {
        select: {
          name: true,
          imageUrl: true,
          email: true,
          title: true,
          company: true,
          categories: true,
        },
      },
      feedback: true,
      review: { select: { rating: true } },
    },
    orderBy: { startTime: "desc" },
  });
};

export const completeCallAndGenerateFeedback = async (bookingId) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      interviewer: true,
      interviewee: true,
      feedback: true,
    },
  });

  if (!booking) throw new Error("Booking not found");

  // If already completed or has feedback, do not regenerate
  if (booking.status === "COMPLETED" && booking.feedback) return;

  const candidateName = booking.interviewee?.name || "the candidate";
  const interviewerName = booking.interviewer?.name || "the interviewer";
  const categories = booking.interviewer?.categories?.join(", ") || "General";

  // Attempt to generate synthetic feedback if none exists
  let feedbackData = null;
  if (!booking.feedback) {
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `You are an expert technical interviewer evaluating a mock interview. Generate a realistic mock interview feedback report.
        
          Interview categories: ${categories}
          Interviewer: ${interviewerName}
          Candidate: ${candidateName}

          Create a realistic but fictional evaluation. Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation:
          {
            "summary": "2-3 sentence overall summary of the session",
            "technical": "Assessment of technical knowledge and accuracy",
            "communication": "Assessment of clarity, structure, and communication style",
            "problemSolving": "Assessment of problem-solving approach and thought process",
            "recommendation": "HIRE / CONSIDER / NO_HIRE with a one-sentence reason",
            "strengths": ["strength 1", "strength 2", "strength 3"],
            "improvements": ["improvement 1", "improvement 2", "improvement 3"],
            "overallRating": "POOR or AVERAGE or GOOD or EXCELLENT"
          }`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim().replace(/^```json|^```|```$/gm, "").trim();
        feedbackData = JSON.parse(raw);
        feedbackData.sessionRating = 4;
        feedbackData.sessionComment = "Good session.";
      } catch (e) {
        console.error("AI Generation error", e);
      }
    }
  }

  // Use transaction to ensure both feedback and status update safely
  await db.$transaction(async (tx) => {
    // 1. Create feedback if we generated it
    if (feedbackData && !booking.feedback) {
      await tx.feedback.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          ...feedbackData,
        },
      });
    }

    // 2. Update booking status
    if (booking.status !== "COMPLETED") {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED" },
      });
    }

    // 3. Process credits if not already done
    const earnExists = await tx.creditTransaction.findFirst({
      where: { bookingId: booking.id, type: "BOOKING_EARNING" },
    });

    if (!earnExists) {
      await tx.creditTransaction.create({
        data: {
          userId: booking.interviewer.id,
          amount: booking.creditsCharged,
          type: "BOOKING_EARNING",
          bookingId: booking.id,
        },
      });
    }
  });

  return { success: true };
};
