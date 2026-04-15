"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import crypto from "crypto";

// ─── GENERATE REFERRAL CODE ───────────────────────────────

export const generateReferralCode = async () => {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
  });

  if (!dbUser) throw new Error("User not found");
  if (dbUser.referralCode) return { code: dbUser.referralCode };

  // Generate a random 6-character code (e.g., PREP-A1B2C3)
  const randomChars = crypto.randomBytes(3).toString("hex").toUpperCase();
  const code = `PREP-${randomChars}`;

  await db.user.update({
    where: { id: dbUser.id },
    data: { referralCode: code },
  });

  return { code };
};

// ─── APPLY REFERRAL CODE ──────────────────────────────────

export const applyReferralCode = async (code) => {
  if (!code) return { success: false, message: "No code provided" };

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
  });

  if (!dbUser) throw new Error("User not found");
  if (dbUser.referredById) {
    return { success: false, message: "You have already used a referral code." };
  }

  // Find referrer
  const referrer = await db.user.findUnique({
    where: { referralCode: code.toUpperCase() },
  });

  if (!referrer) {
    return { success: false, message: "Invalid referral code." };
  }

  if (referrer.id === dbUser.id) {
    return { success: false, message: "You cannot refer yourself." };
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Link the referee to the referrer
      await tx.user.update({
        where: { id: dbUser.id },
        data: { referredById: referrer.id },
      });

      // 2. Create the Referral record (PENDING status)
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: dbUser.id,
          status: "PENDING",
          referrerReward: 2, // 2 credits for referring someone
          refereeReward: 1,  // 1 bonus credit for signing up
        },
      });
    });

    return { success: true, message: "Referral code applied successfully!" };
  } catch (error) {
    console.error("applyReferralCode error:", error);
    return { success: false, message: "Failed to apply referral code." };
  }
};

// ─── PROCESS REFERRAL REWARD ──────────────────────────────

export const processReferralReward = async (refereeId) => {
  // This is typically called after the referee completes their first session
  const referral = await db.referral.findUnique({
    where: { refereeId },
    include: { referrer: true, referee: true },
  });

  if (!referral || referral.status !== "PENDING") {
    return { success: false, message: "No pending referral found." };
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Update referral status
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: "REWARDED", rewardedAt: new Date() },
      });

      // 2. Award Referrer (if interviewee, they get credits)
      if (referral.referrer.role === "INTERVIEWEE") {
        await tx.user.update({
          where: { id: referral.referrerId },
          data: { credits: { increment: referral.referrerReward } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: referral.referrerId,
            amount: referral.referrerReward,
            type: "REFERRAL_REWARD",
          },
        });
      }

      // 3. Award Referee (they get a bonus credit)
      if (referral.referee.role === "INTERVIEWEE") {
        await tx.user.update({
          where: { id: referral.refereeId },
          data: { credits: { increment: referral.refereeReward } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: referral.refereeId,
            amount: referral.refereeReward,
            type: "REFERRAL_REWARD",
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("processReferralReward error:", error);
    return { success: false, message: "Failed to process reward." };
  }
};

// ─── GET REFERRAL DASHBOARD ───────────────────────────────

export const getReferralDashboard = async () => {
  const user = await currentUser();
  if (!user) return null;

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
    include: {
      referralsSent: {
        include: {
          referee: { select: { name: true, imageUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!dbUser) return null;

  // Auto-generate if missing
  let code = dbUser.referralCode;
  if (!code) {
    const res = await generateReferralCode();
    code = res.code;
  }

  const totalReferred = dbUser.referralsSent.length;
  const creditsEarned = dbUser.referralsSent
    .filter((r) => r.status === "REWARDED")
    .reduce((sum, r) => sum + r.referrerReward, 0);
  const pendingRewards = dbUser.referralsSent
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.referrerReward, 0);

  return {
    code,
    totalReferred,
    creditsEarned,
    pendingRewards,
    referrals: dbUser.referralsSent,
  };
};
