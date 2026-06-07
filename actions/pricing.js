"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── CREATE PLAN ─────────────────────────────────────────

export const createPlan = async (data) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWER") {
    throw new Error("Only interviewers can create pricing plans");
  }

  const { name, description, durationMins, creditCost, discountPercent, discountEndsAt, bundleSize, bundlePrice } = data;

  if (!name?.trim()) throw new Error("Plan name is required");
  if (!durationMins || durationMins < 15) throw new Error("Duration must be at least 15 minutes");
  if (!creditCost || creditCost < 1) throw new Error("Credit cost must be at least 1");

  // Determine sort order (append at end)
  const existingCount = await db.interviewPlan.count({
    where: { interviewerId: dbUser.id, isActive: true },
  });

  try {
    const plan = await db.interviewPlan.create({
      data: {
        interviewerId: dbUser.id,
        name: name.trim(),
        description: description?.trim() || null,
        durationMins: Number(durationMins),
        creditCost: Number(creditCost),
        discountPercent: discountPercent ? Number(discountPercent) : null,
        discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : null,
        bundleSize: bundleSize ? Number(bundleSize) : null,
        bundlePrice: bundlePrice ? Number(bundlePrice) : null,
        sortOrder: existingCount,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/interviewers/${dbUser.id}`);

    return { success: true, plan };
  } catch (err) {
    console.error("createPlan error:", err);
    throw new Error("Failed to create plan. Please try again.");
  }
};

// ─── UPDATE PLAN ─────────────────────────────────────────

export const updatePlan = async (planId, data) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWER") {
    throw new Error("Only interviewers can update pricing plans");
  }

  const plan = await db.interviewPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.interviewerId !== dbUser.id) {
    throw new Error("Plan not found or access denied");
  }

  const { name, description, durationMins, creditCost, discountPercent, discountEndsAt, bundleSize, bundlePrice } = data;

  try {
    const updated = await db.interviewPlan.update({
      where: { id: planId },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        description: description?.trim() || null,
        ...(durationMins && { durationMins: Number(durationMins) }),
        ...(creditCost && { creditCost: Number(creditCost) }),
        discountPercent: discountPercent != null ? Number(discountPercent) : null,
        discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : null,
        bundleSize: bundleSize ? Number(bundleSize) : null,
        bundlePrice: bundlePrice ? Number(bundlePrice) : null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/interviewers/${dbUser.id}`);

    return { success: true, plan: updated };
  } catch (err) {
    console.error("updatePlan error:", err);
    throw new Error("Failed to update plan.");
  }
};

// ─── DELETE PLAN (soft-delete) ────────────────────────────

export const deletePlan = async (planId) => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWER") {
    throw new Error("Only interviewers can delete pricing plans");
  }

  const plan = await db.interviewPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.interviewerId !== dbUser.id) {
    throw new Error("Plan not found or access denied");
  }

  try {
    await db.interviewPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/interviewers/${dbUser.id}`);

    return { success: true };
  } catch (err) {
    console.error("deletePlan error:", err);
    throw new Error("Failed to delete plan.");
  }
};

// ─── GET INTERVIEWER PLANS ────────────────────────────────

export const getInterviewerPlans = async (interviewerId) => {
  try {
    return await db.interviewPlan.findMany({
      where: { interviewerId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (err) {
    console.error("getInterviewerPlans error:", err);
    return [];
  }
};

// ─── GET MY PLANS (interviewer dashboard) ────────────────

export const getMyPlans = async () => {
  const user = await currentUser();
  if (!user) return [];

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWER") return [];

  return getInterviewerPlans(dbUser.id);
};

// ─── EARNINGS ANALYTICS ───────────────────────────────────

export const getEarningsAnalytics = async () => {
  const user = await currentUser();
  if (!user) return null;

  const dbUser = await db.user.findUnique({ where: { clerkUserId: user.id } });
  if (!dbUser || dbUser.role !== "INTERVIEWER") return null;

  try {
    const [completedBookings, transactions, plans] = await Promise.all([
      db.booking.findMany({
        where: { interviewerId: dbUser.id, status: "COMPLETED" },
        select: { creditsCharged: true, planId: true, startTime: true },
        orderBy: { startTime: "desc" },
      }),
      db.creditTransaction.findMany({
        where: { userId: dbUser.id, type: { in: ["HELD_RELEASE", "BOOKING_EARNING"] } },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.interviewPlan.findMany({
        where: { interviewerId: dbUser.id },
        select: { id: true, name: true, creditCost: true },
      }),
    ]);

    const totalEarned = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSessions = completedBookings.length;

    // Breakdown by plan
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));
    const byPlan = {};
    for (const booking of completedBookings) {
      const planName = booking.planId
        ? (planMap[booking.planId]?.name ?? "Custom Plan")
        : "Standard Rate";
      if (!byPlan[planName]) byPlan[planName] = { sessions: 0, credits: 0 };
      byPlan[planName].sessions++;
      byPlan[planName].credits += booking.creditsCharged;
    }

    // Last 6 months trend
    const now = new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const credits = transactions
        .filter((t) => {
          const td = new Date(t.createdAt);
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { label, credits };
    });

    return { totalEarned, totalSessions, byPlan, monthlyTrend, creditBalance: dbUser.creditBalance };
  } catch (err) {
    console.error("getEarningsAnalytics error:", err);
    return null;
  }
};
