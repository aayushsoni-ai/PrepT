import { db } from "@/lib/prisma";

export async function GET(req) {
  try {
    const pending = await db.referral.findMany({
      where: { status: 'PENDING' },
      include: { referee: true, referrer: true }
    });

    let fixedCount = 0;

    for (const ref of pending) {
      const completedBooking = await db.booking.findFirst({
        where: {
          intervieweeId: ref.refereeId,
          status: 'COMPLETED'
        }
      });

      if (completedBooking) {
        await db.$transaction(async (tx) => {
          await tx.referral.update({
            where: { id: ref.id },
            data: { status: "REWARDED", rewardedAt: new Date() },
          });

          if (ref.referrer.role === "INTERVIEWEE") {
            await tx.user.update({
              where: { id: ref.referrerId },
              data: { credits: { increment: ref.referrerReward } },
            });
            await tx.creditTransaction.create({
              data: {
                userId: ref.referrerId,
                amount: ref.referrerReward,
                type: "REFERRAL_REWARD",
              },
            });
          }

          if (ref.referee.role === "INTERVIEWEE") {
            await tx.user.update({
              where: { id: ref.refereeId },
              data: { credits: { increment: ref.refereeReward } },
            });
            await tx.creditTransaction.create({
              data: {
                userId: ref.refereeId,
                amount: ref.refereeReward,
                type: "REFERRAL_REWARD",
              },
            });
          }
        });
        fixedCount++;
      }
    }
    
    return Response.json({ success: true, fixed: fixedCount });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
