import { cleanupBookings } from "@/actions/booking";

// Secured with CRON_SECRET to prevent unauthorized calls
export async function GET(req) {
  // Verify the request is from Vercel Cron (or authorized caller)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cleanupBookings();
    return Response.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Cron booking-cleanup failed:", err);
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
