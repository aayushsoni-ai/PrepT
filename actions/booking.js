"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { StreamClient } from "@stream-io/node-sdk";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import { createRateLimiter, checkRateLimit } from "@/lib/arcjet";
import { sendMail } from "@/lib/mail";
import { InterviewBookingEmail } from "@/emails/InterviewBookingEmail";
import { InterviewConfirmedEmail } from "@/emails/InterviewConfirmedEmail";
import { InterviewAcceptedEmail } from "@/emails/InterviewAcceptedEmail";
import { InterviewRejectedEmail } from "@/emails/InterviewRejectedEmail";
import { InterviewReminderEmail } from "@/emails/InterviewReminderEmail";
import { BookingExpiredEmail } from "@/emails/BookingExpiredEmail";
import { render } from "@react-email/render";
import { settleCall } from "./settlement";

// Relaxed for development/testing
const bookingLimiter = createRateLimiter({
  refillRate: 100,
  interval: "1h",
  capacity: 100,
});

export const getInterviewerProfile = async (interviewerId) => {
  try {
    const interviewer = await db.user.findUnique({
      where: { id: interviewerId, role: "INTERVIEWER" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        title: true,
        company: true,
        yearsExp: true,
        bio: true,
        categories: true,
        creditRate: true,
        availabilities: {
          where: { status: "AVAILABLE" },
          select: { startTime: true, endTime: true },
          take: 1,
        },
        bookingsAsInterviewer: {
          where: { status: { in: ["PENDING", "SCHEDULED"] } },
          select: { startTime: true, endTime: true },
        },
        badges: {
          include: { badge: true },
        },

      },
    });

    return interviewer ?? null;
  } catch (err) {
    console.error("getInterviewerProfile error:", err);
    throw new Error("Failed to fetch interviewer profile. Please try again.");
  }
};

export const bookSlot = async ({ interviewerId, startTime, endTime, planId }) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  // ── Arcjet rate limit ──────────────────────────────────────────────────────
  const req = await request();
  const rateLimitError = await checkRateLimit(bookingLimiter, req, user.id);
  if (rateLimitError) throw new Error(rateLimitError);
  // ──────────────────────────────────────────────────────────────────────────

  const [dbUser, interviewer] = await Promise.all([
    db.user.findUnique({ where: { clerkUserId: user.id } }),
    db.user.findUnique({ where: { id: interviewerId } }),
  ]);

  if (!dbUser || dbUser.role !== "INTERVIEWEE")
    throw new Error("Only interviewees can book sessions");
  if (!interviewer || interviewer.role !== "INTERVIEWER")
    throw new Error("Interviewer not found");

  // ── Determine credits from plan or flat rate ──────────────────────────────
  let credits = interviewer.creditRate ?? 10;
  let resolvedPlanId = null;

  if (planId) {
    const plan = await db.interviewPlan.findUnique({
      where: { id: planId, interviewerId, isActive: true },
    });
    if (!plan) throw new Error("Selected plan not found or no longer active.");
    credits = plan.creditCost;
    resolvedPlanId = plan.id;
  }

  if (dbUser.credits < credits)
    throw new Error("Insufficient credits. Please upgrade your plan.");

  // Check slot isn't already taken
  const conflict = await db.booking.findFirst({
    where: {
      interviewerId,
      status: { in: ["PENDING", "SCHEDULED"] },
      startTime: { lt: new Date(endTime) },
      endTime: { gt: new Date(startTime) },
    },
  });
  if (conflict)
    throw new Error(
      "This slot was just booked or is pending. Please pick another."
    );

  try {
    const booking = await db.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          intervieweeId: dbUser.id,
          interviewerId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: "PENDING",
          creditsCharged: credits,
          ...(resolvedPlanId && { planId: resolvedPlanId }),
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: dbUser.id,
          amount: -credits,
          type: "BOOKING_DEDUCTION",
          bookingId: newBooking.id,
        },
      });

      await tx.user.update({
        where: { id: dbUser.id },
        data: { credits: { decrement: credits } },
      });

      return newBooking;
    });

    // 📧 Send Notification Email to Interviewer
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${booking.id}/accept`;
      const rejectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${booking.id}/reject`;

      const html = await render(
        InterviewBookingEmail({
          intervieweeName: dbUser.name ?? "A candidate",
          interviewerName: interviewer.name ?? "Interviewer",
          startTime: new Date(startTime).toLocaleString(),
          endTime: new Date(endTime).toLocaleString(),
          credits,
          dashboardUrl,
          acceptUrl,
          rejectUrl,
        })
      );

      const emailInfo = await sendMail({
        from: process.env.EMAIL_FROM,
        to: interviewer.email,
        subject: `New Interview Request from ${dbUser.name ?? "a candidate"}`,
        html,
      });

      // Save the email Message-ID for threading reminder as a reply
      if (emailInfo?.messageId) {
        await db.booking.update({
          where: { id: booking.id },
          data: { notificationMessageId: emailInfo.messageId },
        });
      }
    } catch (emailErr) {
      console.error("Booking notification email failed:", emailErr);
    }

    revalidatePath(`/interviewers/${interviewerId}`);
    revalidatePath("/dashboard");

    return { success: true, bookingId: booking.id };
  } catch (err) {
    console.error("bookSlot transaction failed:", err);
    throw new Error("Booking failed. Please try again.");
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
  });

  if (!dbUser || dbUser.role !== "INTERVIEWER") {
    throw new Error("Only interviewers can update booking status");
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId, interviewerId: dbUser.id },
    include: { interviewee: true, interviewer: true },
  });

  if (!booking) throw new Error("Booking not found");

  if (status === "SCHEDULED") {
    // ── Create Stream call ──
    let streamCallId;
    try {
      const streamClient = new StreamClient(
        process.env.NEXT_PUBLIC_STREAM_API_KEY,
        process.env.STREAM_SECRET_KEY
      );

      await streamClient.upsertUsers([
        {
          id: booking.interviewee.clerkUserId,
          name: booking.interviewee.name ?? "Interviewee",
          image: booking.interviewee.imageUrl ?? undefined,
          role: "user",
        },
        {
          id: booking.interviewer.clerkUserId,
          name: booking.interviewer.name ?? "Interviewer",
          image: booking.interviewer.imageUrl ?? undefined,
          role: "user",
        },
      ]);

      streamCallId = `mock_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const call = streamClient.video.call("default", streamCallId);

      await call.getOrCreate({
        data: {
          created_by_id: booking.interviewer.clerkUserId,
          members: [
            { user_id: booking.interviewee.clerkUserId, role: "host" },
            { user_id: booking.interviewer.clerkUserId, role: "host" },
          ],
          settings_override: {
            recording: { mode: "available", quality: "1080p" },
            screensharing: { enabled: true },
            transcription: { mode: "auto-on" },
          },
        },
      });
    } catch (err) {
      console.error("Stream call creation failed:", err);
      throw new Error("Failed to create video call. Please try again.");
    }

    // Acceptance flow
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "SCHEDULED", streamCallId },
      });

      // We no longer release credits here. They stay in ESCROW.
      // SettleCall will release them to the interviewer's creditBalance later.
    });

    // 📧 Send Confirmation Email to Interviewer
    try {
      const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/call/${streamCallId}`;
      const html = await render(
        InterviewConfirmedEmail({
          intervieweeName: booking.interviewee?.name ?? "A candidate",
          interviewerName: dbUser.name ?? "Interviewer",
          startTime: new Date(booking.startTime).toLocaleString(),
          endTime: new Date(booking.endTime).toLocaleString(),
          joinUrl,
        })
      );

      await sendMail({
        from: process.env.EMAIL_FROM,
        to: dbUser.email,
        subject: `Interview Confirmed with ${
          booking.interviewee?.name ?? "a candidate"
        }`,
        html,
      });
    } catch (emailErr) {
      console.error("Confirmation email to interviewer failed:", emailErr);
    }

    // 📧 Send Confirmation Email to Interviewee
    try {
      const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/call/${streamCallId}`;
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
      const html = await render(
        InterviewAcceptedEmail({
          intervieweeName: booking.interviewee?.name ?? "Candidate",
          interviewerName: dbUser.name ?? "Interviewer",
          startTime: new Date(booking.startTime).toLocaleString(),
          endTime: new Date(booking.endTime).toLocaleString(),
          joinUrl,
          dashboardUrl,
        })
      );

      await sendMail({
        from: process.env.EMAIL_FROM,
        to: booking.interviewee.email,
        subject: `Your interview with ${dbUser.name ?? "an interviewer"} is confirmed!`,
        html,
      });
    } catch (emailErr) {
      console.error("Confirmation email to interviewee failed:", emailErr);
    }
  } else if (status === "REJECTED") {
    // Rejection flow
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "REJECTED" },
      });

      // Refund credits to interviewee
      await tx.user.update({
        where: { id: booking.intervieweeId },
        data: { credits: { increment: booking.creditsCharged } },
      });

      // Log the refund transaction
      await tx.creditTransaction.create({
        data: {
          userId: booking.intervieweeId,
          amount: booking.creditsCharged,
          type: "BOOKING_REFUND",
          bookingId,
        },
      });
    });

    // 📧 Send Rejection Email to Interviewee
    try {
      const browsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interviewers`;
      const html = await render(
        InterviewRejectedEmail({
          intervieweeName: booking.interviewee?.name ?? "Candidate",
          interviewerName: dbUser.name ?? "Interviewer",
          startTime: new Date(booking.startTime).toLocaleString(),
          endTime: new Date(booking.endTime).toLocaleString(),
          creditsRefunded: booking.creditsCharged,
          browsUrl,
        })
      );

      await sendMail({
        from: process.env.EMAIL_FROM,
        to: booking.interviewee.email,
        subject: `Interview request update from ${dbUser.name ?? "an interviewer"}`,
        html,
      });
    } catch (emailErr) {
      console.error("Rejection email to interviewee failed:", emailErr);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  return { success: true };
};

export const cleanupBookings = async () => {
  const now = new Date();
  const REMINDER_HOURS = 12;
  const SLA_HOURS = 24;
  const reminderDeadline = new Date(now.getTime() - REMINDER_HOURS * 60 * 60 * 1000);
  const slaDeadline = new Date(now.getTime() - SLA_HOURS * 60 * 60 * 1000);

  try {
    // ── 1. Send 12h reminder to interviewers who haven't responded ─────────
    const needsReminder = await db.booking.findMany({
      where: {
        status: "PENDING",
        reminderSent: false,
        createdAt: { lt: reminderDeadline },
        startTime: { gt: now }, // only future bookings
      },
      include: { interviewer: true, interviewee: true },
    });

    for (const booking of needsReminder) {
      try {
        const hoursLeft = Math.max(
          0,
          Math.round((SLA_HOURS - REMINDER_HOURS) -
            (now.getTime() - new Date(booking.createdAt).getTime() - REMINDER_HOURS * 60 * 60 * 1000) / (60 * 60 * 1000))
        ) || (SLA_HOURS - REMINDER_HOURS);

        const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${booking.id}/accept`;
        const rejectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${booking.id}/reject`;
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

        const html = await render(
          InterviewReminderEmail({
            intervieweeName: booking.interviewee?.name ?? "A candidate",
            interviewerName: booking.interviewer?.name ?? "Interviewer",
            startTime: new Date(booking.startTime).toLocaleString(),
            endTime: new Date(booking.endTime).toLocaleString(),
            credits: booking.creditsCharged,
            hoursLeft,
            acceptUrl,
            rejectUrl,
            dashboardUrl,
          })
        );

        const intervieweeName = booking.interviewee?.name ?? "a candidate";

        await sendMail({
          from: process.env.EMAIL_FROM,
          to: booking.interviewer.email,
          subject: `Re: New Interview Request from ${intervieweeName}`,
          html,
          // Thread under the original booking email
          ...(booking.notificationMessageId && {
            inReplyTo: booking.notificationMessageId,
            references: booking.notificationMessageId,
          }),
        });

        await db.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });
      } catch (emailErr) {
        console.error(`Reminder email failed for booking ${booking.id}:`, emailErr);
      }
    }

    // ── 2. Auto-cancel PENDING bookings (startTime passed OR 24h SLA expired) ─
    const expiredPending = await db.booking.findMany({
      where: {
        status: "PENDING",
        OR: [
          { startTime: { lt: now } },       // interview time already passed
          { createdAt: { lt: slaDeadline } }, // interviewer didn't respond in 24h
        ],
      },
      include: { interviewer: true, interviewee: true },
    });

    for (const booking of expiredPending) {
      await db.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        });

        await tx.user.update({
          where: { id: booking.intervieweeId },
          data: { credits: { increment: booking.creditsCharged } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: booking.intervieweeId,
            amount: booking.creditsCharged,
            type: "BOOKING_REFUND",
            bookingId: booking.id,
          },
        });
      });

      // 📧 Notify interviewee about auto-cancellation
      try {
        const browsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interviewers`;
        const html = await render(
          BookingExpiredEmail({
            intervieweeName: booking.interviewee?.name ?? "Candidate",
            interviewerName: booking.interviewer?.name ?? "the interviewer",
            startTime: new Date(booking.startTime).toLocaleString(),
            endTime: new Date(booking.endTime).toLocaleString(),
            creditsRefunded: booking.creditsCharged,
            browsUrl,
          })
        );

        await sendMail({
          from: process.env.EMAIL_FROM,
          to: booking.interviewee.email,
          subject: `Booking Request Expired — ${booking.creditsCharged} credits refunded`,
          html,
        });
      } catch (emailErr) {
        console.error(`Expiry notification failed for booking ${booking.id}:`, emailErr);
      }
    }

    // ── 3. Mark past SCHEDULED bookings via Settlement ─────────────────────
    const pastScheduled = await db.booking.findMany({
      where: {
        status: "SCHEDULED",
        endTime: { lt: now },
      },
      select: { id: true },
    });

    for (const b of pastScheduled) {
      await settleCall(b.id);
    }

    // Note: no revalidatePath here — this function is called during render
    // (from data-fetching helpers), where revalidatePath is not allowed.
    // The fresh data is already returned by the queries that follow.
  } catch (err) {
    console.error("cleanupBookings error:", err);
  }
};

