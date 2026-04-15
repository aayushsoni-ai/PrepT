"use server";

import { db } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Initial badges array
const BADGES = [
  {
    slug: "top-rated",
    name: "Top Rated",
    description: "Maintains an average rating of 4.5+ with at least 10 reviews.",
    icon: "🌟",
    category: "achievement",
    criteria: { type: "rating", minRating: 4.5, minReviews: 10 },
  },
  {
    slug: "50-sessions",
    name: "50+ Sessions",
    description: "Has completed over 50 mock interviews.",
    icon: "🎯",
    category: "achievement",
    criteria: { type: "sessions", minSessions: 50 },
  },
  {
    slug: "frontend-expert",
    name: "Frontend Expert",
    description: "Completed 20+ Frontend architecture sessions.",
    icon: "⚛️",
    category: "expertise",
    criteria: { type: "category", category: "FRONTEND", minSessions: 20 },
  },
  {
    slug: "backend-expert",
    name: "Backend Expert",
    description: "Completed 20+ Backend systems sessions.",
    icon: "⚙️",
    category: "expertise",
    criteria: { type: "category", category: "BACKEND", minSessions: 20 },
  },
  {
    slug: "fullstack-expert",
    name: "Full Stack Expert",
    description: "Completed 20+ Full Stack architecture sessions.",
    icon: "🌐",
    category: "expertise",
    criteria: { type: "category", category: "FULLSTACK", minSessions: 20 },
  },
  {
    slug: "mobile-expert",
    name: "Mobile Expert",
    description: "Completed 20+ Mobile app engineering sessions.",
    icon: "📱",
    category: "expertise",
    criteria: { type: "category", category: "MOBILE", minSessions: 20 },
  },
  {
    slug: "devops-expert",
    name: "DevOps & Cloud Expert",
    description: "Completed 20+ DevOps/Cloud engineering sessions.",
    icon: "☁️",
    category: "expertise",
    criteria: { type: "category", category: "DEVOPS", minSessions: 20 },
  },
  {
    slug: "dsa-expert",
    name: "DSA Expert",
    description: "Completed 20+ Data Structures & Algorithms sessions.",
    icon: "🧠",
    category: "expertise",
    criteria: { type: "category", category: "DSA", minSessions: 20 },
  },
  {
    slug: "system-design-expert",
    name: "System Design Expert",
    description: "Completed 20+ System Design architecture sessions.",
    icon: "🏗️",
    category: "expertise",
    criteria: { type: "category", category: "SYSTEM_DESIGN", minSessions: 20 },
  },
  {
    slug: "hr-specialist",
    name: "Behavioral Specialist",
    description: "Completed 20+ Behavioral/HR mock sessions.",
    icon: "🤝",
    category: "expertise",
    criteria: { type: "category", category: "BEHAVIORAL", minSessions: 20 },
  },
  {
    slug: "consistent-performer",
    name: "Consistent Performer",
    description: "Maintains a 95%+ completion rate with over 20 sessions.",
    icon: "🏆",
    category: "performance",
    criteria: { type: "completion", minRate: 95, minSessions: 20 },
  },
];

const seedBadgesIfEmpty = async () => {
  const count = await db.badge.count();
  if (count === 0) {
    console.log("Seeding badges...");
    for (const badge of BADGES) {
      await db.badge.create({ data: badge });
    }
    return await db.badge.findMany();
  }
  return await db.badge.findMany();
};

export const recalculateBadges = async (userId) => {
  if (!userId) return { success: false, message: "Missing userId" };

  const allBadges = await seedBadgesIfEmpty();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      avgRating: true,
      totalReviews: true,
      completionRate: true,
      categories: true,
      badges: {
        select: { badgeId: true },
      },
    },
  });

  if (!user || user.role !== "INTERVIEWER") return { success: false };

  const completedBookings = await db.booking.findMany({
    where: { interviewerId: user.id, status: "COMPLETED" },
    select: { id: true, planId: true },
  });

  const totalSessions = completedBookings.length;
  const existingBadgeIds = user.badges.map((b) => b.badgeId);

  const newBadgesToAward = [];

  for (const badge of allBadges) {
    if (existingBadgeIds.includes(badge.id)) continue; // Already has it

    const criteria = badge.criteria;
    let earned = false;

    if (criteria.type === "rating") {
      if (
        user.avgRating >= criteria.minRating &&
        user.totalReviews >= criteria.minReviews
      ) {
        earned = true;
      }
    } else if (criteria.type === "sessions") {
      if (totalSessions >= criteria.minSessions) earned = true;
    } else if (criteria.type === "category") {
      if (
        totalSessions >= criteria.minSessions &&
        user.categories.includes(criteria.category)
      ) {
        earned = true;
      }
    } else if (criteria.type === "completion") {
      if (
        totalSessions >= criteria.minSessions &&
        user.completionRate >= criteria.minRate
      ) {
        earned = true;
      }
    }

    if (earned) {
      newBadgesToAward.push(badge.id);
    }
  }

  if (newBadgesToAward.length > 0) {
    await db.userBadge.createMany({
      data: newBadgesToAward.map((badgeId) => ({
        userId: user.id,
        badgeId,
      })),
    });
  }

  return { success: true, awarded: newBadgesToAward.length };
};

export const getUserBadges = async (userId) => {
  try {
    const userBadges = await db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    });
    return userBadges.map((ub) => ({
      ...ub.badge,
      awardedAt: ub.awardedAt,
    }));
  } catch (err) {
    return [];
  }
};
