import { getReferralDashboard } from "@/actions/referrals";
import PageHeader, { GrayTitle, SectionLabel } from "@/components/reusables";
import { Gift, Users, Coins, Copy, CheckCircle2 } from "lucide-react";
import { CopyButton } from "./components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function ReferralsPage() {
  const dashboard = await getReferralDashboard();

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-stone-400">
        Dashboard unavailable.
      </main>
    );
  }

  const { code, totalReferred, creditsEarned, pendingRewards, referrals } = dashboard;
  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?ref=${code}`;

  return (
    <main className="min-h-screen bg-black pb-24">
      <section className="relative border-b border-white/8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent opacity-50" />
        <div className="relative max-w-4xl mx-auto px-8 pt-20 pb-14 flex flex-col gap-6">
          <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center text-amber-400 mb-2">
            <Gift size={28} />
          </div>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-tight">
            <GrayTitle>Invite Friends.</GrayTitle>
            <br />
            Earn Credits.
          </h1>
          <p className="text-lg text-stone-400 font-light max-w-xl">
            Give a friend <span className="text-amber-400 font-medium">1 free credit</span> to start.
            When they complete their first session, you earn <span className="text-amber-400 font-medium">2 credits</span>.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-8 pt-12 flex flex-col gap-10">
        {/* Your Code Section */}
        <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 blur-[100px] rounded-full pointer-events-none" />
          
          <SectionLabel>Your Referral Link</SectionLabel>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            <div className="flex-1 bg-[#141417] border border-white/10 rounded-xl p-4 flex items-center justify-between font-mono text-sm text-stone-300 relative z-10">
              <span className="truncate pr-4">{shareLink}</span>
            </div>
            <CopyButton text={shareLink} label="Copy Link" />
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="h-px bg-white/10 grow" />
            <span className="text-xs text-stone-600 font-medium uppercase tracking-widest">OR SHARE CODE</span>
            <div className="h-px bg-white/10 grow" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            <div className="flex-1 bg-[#141417] border border-white/10 border-dashed rounded-xl p-4 flex items-center justify-center font-mono text-xl text-amber-400 font-bold tracking-widest relative z-10">
              {code}
            </div>
            <CopyButton text={code} label="Copy Code" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-stone-400 mb-2">
              <Users size={20} />
            </div>
            <p className="text-3xl font-serif text-stone-200">{totalReferred}</p>
            <p className="text-sm text-stone-500 font-medium">Friends Invited</p>
          </div>
          
          <div className="bg-[#0f0f11] border border-amber-400/20 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-400/10 blur-[40px] rounded-full" />
            <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center text-amber-400 mb-2 relative z-10">
              <Coins size={20} />
            </div>
            <p className="text-3xl font-serif text-amber-400 relative z-10">{creditsEarned}</p>
            <p className="text-sm text-amber-400/70 font-medium relative z-10">Credits Earned</p>
          </div>

          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-stone-400 mb-2">
              <Gift size={20} />
            </div>
            <p className="text-3xl font-serif text-stone-200">{pendingRewards}</p>
            <p className="text-sm text-stone-500 font-medium">Pending Credits</p>
          </div>
        </div>

        {/* Referral History */}
        <div className="flex flex-col gap-6">
          <SectionLabel>Your Referrals</SectionLabel>
          
          {referrals.length === 0 ? (
            <div className="text-center py-12 border border-white/5 border-dashed rounded-2xl bg-[#0f0f11]">
              <p className="text-stone-500 text-sm">You haven't referred anyone yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10 rounded-xl flex-[0_0_auto]">
                      <AvatarImage src={ref.referee.imageUrl} className="rounded-xl" />
                      <AvatarFallback className="rounded-xl bg-white/5 text-stone-400 text-xs">
                        {ref.referee.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-stone-200">{ref.referee.name || "New User"}</p>
                      <p className="text-xs text-stone-500">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {ref.status === "REWARDED" ? (
                      <>
                        <span className="text-xs font-medium text-amber-400">+{ref.referrerReward} Credits</span>
                        <Badge variant="outline" className="border-green-500/20 bg-green-500/5 text-green-400 text-xs gap-1">
                          <CheckCircle2 size={12} />
                          Rewarded
                        </Badge>
                      </>
                    ) : ref.status === "PENDING" ? (
                      <Badge variant="outline" className="border-white/10 text-stone-500 text-xs">
                        Pending Session
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/20 text-red-500 text-xs">
                        Flagged
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
