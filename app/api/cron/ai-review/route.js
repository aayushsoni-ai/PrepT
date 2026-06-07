import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { processAIReview } from "@/actions/ai-review";

// Vercel Cron: runs every 5 minutes (configure in vercel.json)
// Manual trigger: GET /api/cron/ai-review  (with Authorization: Bearer <CRON_SECRET>)

export async function GET(request) {
  try {
    // Auth check (skip in dev)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch all PENDING AISummary records (up to 20 per run)
    const pending = await db.aISummary.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        // Don't retry permanently failed ones (3+ attempts)
        NOT: { errorMessage: { contains: "attempt 3" } },
      },
      select: { bookingId: true, id: true, status: true },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: "No pending AI reviews" });
    }

    console.log(`[cron/ai-review] Processing ${pending.length} pending reviews...`);

    let succeeded = 0;
    let failed = 0;

    // Process sequentially to avoid rate-limiting Gemini
    for (const item of pending) {
      try {
        const result = await processAIReview(item.bookingId);
        if (result.success) {
          succeeded++;
        } else {
          failed++;
          console.warn(`[cron/ai-review] Skipped ${item.bookingId}: ${result.error}`);
        }
        // Small delay between Gemini calls to stay within rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        failed++;
        console.error(`[cron/ai-review] Error on ${item.bookingId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pending.length} AI reviews. ✓ ${succeeded} succeeded, ✗ ${failed} failed.`,
    });
  } catch (error) {
    console.error("[cron/ai-review] Fatal error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
