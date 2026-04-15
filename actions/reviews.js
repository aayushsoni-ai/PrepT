"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── SUBMIT REVIEW ────────────────────────────────────────

export const submitReview = async ({
  bookingId,
  rating,
  comment,
  tags = [],
}) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWEE") {
    throw new Error("Only interviewees can leave reviews");
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { review: true, interviewer: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.intervieweeId !== dbUser.id) {
    throw new Error("You can only review your own sessions");
  }
  if (booking.status !== "COMPLETED") {
    throw new Error("You can only review completed sessions");
  }
  if (booking.review) {
    throw new Error("You have already reviewed this session");
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Create the review
      await tx.interviewerReview.create({
        data: {
          bookingId,
          interviewerId: booking.interviewerId,
          intervieweeId: dbUser.id,
          rating,
          comment: comment?.trim() || null,
          tags,
        },
      });

      // 2. Recalculate interviewer's denormalized rating stats
      const allReviews = await tx.interviewerReview.findMany({
        where: { interviewerId: booking.interviewerId },
        select: { rating: true },
      });

      // Include the new review we just created
      const totalReviews = allReviews.length;
      const avgRating =
        totalReviews > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : null;

      // Calculate completion rate
      const totalBookings = await tx.booking.count({
        where: {
          interviewerId: booking.interviewerId,
          status: { in: ["COMPLETED", "CANCELLED"] },
        },
      });
      const completedBookings = await tx.booking.count({
        where: {
          interviewerId: booking.interviewerId,
          status: "COMPLETED",
        },
      });
      const completionRate =
        totalBookings > 0 ? (completedBookings / totalBookings) * 100 : null;

      await tx.user.update({
        where: { id: booking.interviewerId },
        data: {
          avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
          totalReviews,
          completionRate: completionRate
            ? parseFloat(completionRate.toFixed(1))
            : null,
        },
      });
    });

    revalidatePath("/appointments");
    revalidatePath(`/interviewers/${booking.interviewerId}`);
    revalidatePath("/explore");

    return { success: true };
  } catch (err) {
    console.error("submitReview error:", err);
    throw new Error("Failed to submit review. Please try again.");
  }
};

// ─── GET INTERVIEWER REVIEWS ──────────────────────────────

export const getInterviewerReviews = async (
  interviewerId,
  { page = 1, limit = 5 } = {}
) => {
  try {
    const [reviews, total] = await Promise.all([
      db.interviewerReview.findMany({
        where: { interviewerId },
        include: {
          interviewee: {
            select: { name: true, imageUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.interviewerReview.count({ where: { interviewerId } }),
    ]);

    return {
      reviews,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (err) {
    console.error("getInterviewerReviews error:", err);
    return { reviews: [], total: 0, totalPages: 0, currentPage: 1 };
  }
};

// ─── GET REVIEW STATS ─────────────────────────────────────

export const getReviewStats = async (interviewerId) => {
  try {
    const [user, reviews, noShows] = await Promise.all([
      db.user.findUnique({
        where: { id: interviewerId },
        select: {
          avgRating: true,
          totalReviews: true,
          completionRate: true,
          noShowCount: true,
        },
      }),
      db.interviewerReview.findMany({
        where: { interviewerId },
        select: { rating: true },
      }),
      db.booking.count({
        where: {
          interviewerId,
          status: "CANCELLED",
          interviewerJoined: false,
        },
      }),
    ]);

    // Rating breakdown (1-5 star distribution)
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      breakdown[r.rating]++;
    });

    return {
      avgRating: user?.avgRating ?? null,
      totalReviews: user?.totalReviews ?? 0,
      completionRate: user?.completionRate ?? null,
      noShowRate:
        reviews.length > 0
          ? parseFloat(((noShows / (reviews.length + noShows)) * 100).toFixed(1))
          : 0,
      breakdown,
    };
  } catch (err) {
    console.error("getReviewStats error:", err);
    return {
      avgRating: null,
      totalReviews: 0,
      completionRate: null,
      noShowRate: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
};
