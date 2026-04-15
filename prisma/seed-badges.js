const { PrismaClient } = require("../lib/generated/prisma/index.js");

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding badges...");

  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        criteria: badge.criteria,
      },
      create: badge,
    });
  }

  console.log(`Seeded ${BADGES.length} badges successfully!`);
}

main()
  .catch((e) => {
    console.error("Error seeding badges:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
