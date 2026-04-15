import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { recalculateBadges } from "@/actions/badges";

// Vercel Cron endpoint or manual trigger
export async function GET(request) {
  try {
    // Only allow Vercel cron or admin to trigger this
    const authHeader = request.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch all active interviewers
    const interviewers = await db.user.findMany({
      where: { role: "INTERVIEWER" },
      select: { id: true },
    });

    let awardedTotal = 0;

    for (const interviewer of interviewers) {
      const result = await recalculateBadges(interviewer.id);
      if (result.success && result.awarded > 0) {
        awardedTotal += result.awarded;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${interviewers.length} interviewers. Awarded ${awardedTotal} new badges.`,
    });
  } catch (error) {
    console.error("Cron badges error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
