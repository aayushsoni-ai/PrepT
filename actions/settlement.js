"use server";

import { db } from "@/lib/prisma";
import { processReferralReward } from "./referrals";

// Threshold in minutes for someone to be considered "present"
const PRESENCE_THRESHOLD_MINUTES = 5;

// Helper: Calculate total duration in session based on join/leave events
const calculateTotalPresence = (events) => {
  let totalMs = 0;
  let currentJoin = null;

  // Assume events are sorted chronologically
  const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (const event of sortedEvents) {
    if (event.eventType === "joined" && !currentJoin) {
      currentJoin = new Date(event.timestamp);
    } else if (event.eventType === "left" && currentJoin) {
      totalMs += new Date(event.timestamp).getTime() - currentJoin.getTime();
      currentJoin = null;
    }
  }

  return totalMs / 1000 / 60; // Returns minutes
};

// ─── PROCESS SETTLEMENT ────────────────────────────────────

export const settleCall = async (bookingId) => {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      interviewee: true,
      interviewer: true,
      events: true, // Need CallEvent records
    },
  });

  if (!booking) throw new Error("Booking not found");
  
  // Prevent double-settling: only settle if still accepted/pending and call just ended 
  // Normally the webhook marks it COMPLETED or NO_SHOW before we reach here? 
  // No, we use this exact function to evaluate state and THEN mark it.
  if (["COMPLETED", "NO_SHOW_INTERVIEWER", "NO_SHOW_INTERVIEWEE", "TECHNICAL_FAILURE"].includes(booking.status)) {
    return { success: false, message: "Already settled" };
  }

  // 1. Separate events by user
  const intervieweeEvents = booking.events.filter((e) => e.userId === booking.intervieweeId);
  const interviewerEvents = booking.events.filter((e) => e.userId === booking.interviewerId);

  // 2. Calculate presence duration
  const intervieweePresence = calculateTotalPresence(intervieweeEvents);
  const interviewerPresence = calculateTotalPresence(interviewerEvents);

  const intervieweeAttended = intervieweePresence >= PRESENCE_THRESHOLD_MINUTES;
  const interviewerAttended = interviewerPresence >= PRESENCE_THRESHOLD_MINUTES;

  const credits = booking.creditsCharged;

  try {
    await db.$transaction(async (tx) => {
      if (intervieweeAttended && interviewerAttended) {
        // Both attended -> Complete session & pay interviewer
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "COMPLETED" },
        });

        // Pay the interviewer (transfer HELD -> earnings)
        await tx.user.update({
          where: { id: booking.interviewerId },
          data: { creditBalance: { increment: credits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: booking.interviewerId,
            amount: credits,
            type: "HELD_RELEASE", // Money out of escrow to interviewer
            bookingId: booking.id,
          },
        });
      } else if (!interviewerAttended && intervieweeAttended) {
        // Interviewer no-show -> Refund interviewee
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "NO_SHOW_INTERVIEWER" },
        });

        // Refund interviewee
        await tx.user.update({
          where: { id: booking.intervieweeId },
          data: { credits: { increment: credits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: booking.intervieweeId,
            amount: credits,
            type: "BOOKING_REFUND",
            bookingId: booking.id,
          },
        });
      } else if (interviewerAttended && !intervieweeAttended) {
        // Interviewee no-show -> Complete (punish interviewee, reward interviewer)
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "NO_SHOW_INTERVIEWEE" },
        });

        // Pay interviewer
        await tx.user.update({
          where: { id: booking.interviewerId },
          data: { creditBalance: { increment: credits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: booking.interviewerId,
            amount: credits,
            type: "HELD_RELEASE",
            bookingId: booking.id,
          },
        });
      } else {
        // Neither attended (or technical glitch) -> Refund interviewee
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "NO_SHOW_INTERVIEWEE" }, // Both didn't show up, lean toward nullifying
        });

        await tx.user.update({
          where: { id: booking.intervieweeId },
          data: { credits: { increment: credits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: booking.intervieweeId,
            amount: credits,
            type: "BOOKING_REFUND",
            bookingId: booking.id,
          },
        });
      }
    });

    // Automatically reward the referrer if the referee successfully completes their session
    if (intervieweeAttended && interviewerAttended) {
      await processReferralReward(booking.intervieweeId);
    }

    return { success: true };
  } catch (error) {
    console.error("Settlement error:", error);
    return { success: false, message: "Settlement failed" };
  }
};

// ─── RECORD CALL EVENT ────────────────────────────────────
// Can be used either from Stream Webhook or Frontend heartbeat

export const recordCallEvent = async ({ bookingId, userId, eventType, timestamp }) => {
  try {
    await db.callEvent.create({
      data: {
        bookingId,
        userId,
        eventType,
        timestamp: new Date(timestamp || Date.now()),
      },
    });
    return { success: true };
  } catch (err) {
    console.error("recordCallEvent error:", err);
    return { success: false };
  }
};
