import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { getInterviewerProfile } from "@/actions/booking";
import { getInterviewerReviews, getReviewStats } from "@/actions/reviews";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GrayTitle, SectionLabel } from "@/components/reusables";
import SlotPicker from "./_components/SlotPicker";
import { StarsBackgroundDemo } from "@/components/demo-components-backgrounds-stars";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, EXPECT_ITEMS } from "@/lib/data";

export default async function InterviewerProfilePage({ params }) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect("/");

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: user.id },
    select: { role: true, credits: true },
  });

  if (!dbUser) redirect("/");
  if (dbUser.role === "UNASSIGNED") redirect("/onboarding");

  const interviewer = await getInterviewerProfile(id);

  if (!interviewer) notFound();

  const [reviewData, reviewStats] = await Promise.all([
    getInterviewerReviews(id),
    getReviewStats(id),
  ]);

  return (
    <main className="min-h-screen bg-black">
      {/* ── Hero identity banner ── */}
      <section className="relative border-b border-white/8 overflow-hidden">
        <StarsBackgroundDemo />

        <div className="relative max-w-6xl mx-auto px-8 pt-20 pb-14 flex flex-col gap-8">
          <Link href="/explore">
            <Button variant="link" className="text-stone-500 cursor-pointer">
              <ArrowLeft size={13} />
              Back to explore
            </Button>
          </Link>

          <div className="flex items-start gap-8">
            <Avatar className="w-24 h-24 border-2 border-white/10 shrink-0 rounded-2xl">
              <AvatarImage
                src={interviewer.imageUrl}
                alt={interviewer.name}
                className="rounded-2xl"
              />
              <AvatarFallback className="rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-3xl font-medium">
                {interviewer.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-3 min-w-0 pt-1">
              <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight">
                <GrayTitle>{interviewer.name}</GrayTitle>
              </h1>

              {interviewer.title && interviewer.company && (
                <p className="text-base text-stone-400 font-light">
                  {interviewer.title}
                  <span className="text-stone-700 mx-2">·</span>
                  {interviewer.company}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap mt-1">
                {interviewer.yearsExp && (
                  <Badge
                    variant="outline"
                    className="border-white/10 text-stone-400 text-xs px-3 py-1"
                  >
                    {interviewer.yearsExp}+ yrs experience
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-amber-400/25 bg-amber-400/8 text-amber-400 text-xs px-3 py-1"
                >
                  {interviewer.creditRate ?? 10} credits / session
                </Badge>
                {interviewer.availabilities?.[0] && (
                  <Badge
                    variant="outline"
                    className="border-green-500/20 bg-green-500/8 text-green-400 text-xs px-3 py-1"
                  >
                    🟢 Available
                  </Badge>
                )}
                {reviewStats.totalReviews > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs px-3 py-1 gap-1"
                  >
                    <Star size={11} className="fill-amber-400" />
                    {reviewStats.avgRating?.toFixed(1)} ({reviewStats.totalReviews} reviews)
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* ── LEFT ── */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-2 lg:-order-1">
          {interviewer.bio && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
              <SectionLabel>About</SectionLabel>
              <p className="text-base text-stone-300 font-light leading-relaxed">
                {interviewer.bio}
              </p>
            </div>
          )}

          {interviewer.categories?.length > 0 && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
              <div>
                <SectionLabel>Specialties</SectionLabel>
                <p className="text-sm text-stone-500 font-light mt-1">
                  Interview categories this expert covers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {interviewer.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-sm px-4 py-2 rounded-xl border border-amber-400/20 bg-amber-400/5 text-amber-400"
                  >
                    {CATEGORY_LABEL[cat] ?? cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Badges ── */}
          {interviewer.badges && interviewer.badges.length > 0 && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
              <div>
                <SectionLabel>Verified Badges</SectionLabel>
                <p className="text-sm text-stone-500 font-light mt-1">
                  Achievements earned by this interviewer on Prept.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {interviewer.badges.map(({ badge }) => (
                  <div
                    key={badge.id}
                    className="group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/5 bg-[#141417] hover:bg-[#1a1a1e] transition-colors"
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-stone-200">
                        {badge.name}
                      </span>
                      <span className="text-[10px] text-stone-500 line-clamp-1 max-w-[150px]">
                        {badge.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          {reviewStats.totalReviews > 0 && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
              <div>
                <SectionLabel>Reviews</SectionLabel>
                <p className="text-sm text-stone-500 font-light mt-1">
                  What interviewees say about this interviewer.
                </p>
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <p className="font-serif text-4xl bg-linear-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {reviewStats.avgRating?.toFixed(1)}
                  </p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= Math.round(reviewStats.avgRating || 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-stone-700"}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-600">{reviewStats.totalReviews} reviews</p>
                </div>

                {/* Bar breakdown */}
                <div className="flex-1 flex flex-col gap-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewStats.breakdown[star] || 0;
                    const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-600 w-3 text-right">{star}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-stone-700 w-5">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex gap-2 flex-wrap">
                {reviewStats.completionRate !== null && (
                  <Badge variant="outline" className="border-green-500/20 bg-green-500/5 text-green-400 text-xs">
                    {reviewStats.completionRate.toFixed(0)}% completion rate
                  </Badge>
                )}
                {reviewStats.noShowRate > 0 && (
                  <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-400 text-xs">
                    {reviewStats.noShowRate}% no-show rate
                  </Badge>
                )}
              </div>

              {/* Recent reviews */}
              <div className="flex flex-col gap-3">
                {reviewData.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-[#141417] border border-white/5 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 rounded-lg">
                          <AvatarImage src={review.interviewee?.imageUrl} className="rounded-lg" />
                          <AvatarFallback className="rounded-lg bg-amber-400/10 text-amber-400 text-[10px]">
                            {review.interviewee?.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-stone-400">{review.interviewee?.name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={10}
                            className={s <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-700"}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-stone-400 font-light leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                    {review.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md border border-amber-400/15 bg-amber-400/5 text-amber-400/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
            <div>
              <SectionLabel>What to expect</SectionLabel>
              <p className="text-sm text-stone-500 font-light mt-1">
                Every session on Prept includes the following.
              </p>
            </div>
            <ul className="flex flex-col gap-5">
              {EXPECT_ITEMS.map(([icon, title, desc]) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-lg">
                    {icon}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-stone-200">
                      {title}
                    </p>
                    <p className="text-xs text-stone-500 font-light leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── RIGHT — sticky slot picker ── */}
        <div className="lg:col-span-2 lg:sticky top-24">
          <SlotPicker
            interviewer={interviewer}
            interviewerCredits={interviewer.creditRate ?? 10}
            userCredits={dbUser.credits}
          />
        </div>
      </div>
    </main>
  );
}
