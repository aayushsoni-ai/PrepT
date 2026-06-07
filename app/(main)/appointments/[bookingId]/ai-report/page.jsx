import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getAISummary } from "@/actions/ai-review";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Zap, MessageSquare, Target, TrendingUp, BookOpen, Map } from "lucide-react";

const READINESS_CONFIG = {
  "Not Ready": { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", emoji: "🔴" },
  "Getting There": { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", emoji: "🟡" },
  "Almost Ready": { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", emoji: "🔵" },
  "Interview Ready": { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", emoji: "🟢" },
};

function ScoreGauge({ label, score, icon: Icon, color = "amber" }) {
  const colorMap = {
    amber: { ring: "stroke-amber-400", text: "text-amber-400", bg: "bg-amber-400/10" },
    blue: { ring: "stroke-blue-400", text: "text-blue-400", bg: "bg-blue-400/10" },
    purple: { ring: "stroke-purple-400", text: "text-purple-400", bg: "bg-purple-400/10" },
    green: { ring: "stroke-green-400", text: "text-green-400", bg: "bg-green-400/10" },
    rose: { ring: "stroke-rose-400", text: "text-rose-400", bg: "bg-rose-400/10" },
  };
  const c = colorMap[color] ?? colorMap.amber;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dash = ((score ?? 0) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-5 bg-[#0f0f11] border border-white/8 rounded-2xl">
      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
        <Icon size={18} className={c.text} />
      </div>
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            className={c.ring}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-serif text-xl ${c.text}`}>
          {score ?? "–"}
        </span>
      </div>
      <p className="text-xs text-stone-500 text-center leading-tight">{label}</p>
    </div>
  );
}

export default async function AIReportPage({ params }) {
  const { bookingId } = await params;

  const user = await currentUser();
  if (!user) redirect("/");

  const summary = await getAISummary(bookingId);

  if (!summary) notFound();

  if (summary.status === "PENDING" || summary.status === "PROCESSING") {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center animate-pulse">
          <Brain size={28} className="text-amber-400" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-2xl text-stone-200 mb-2">AI Analysis in Progress</h1>
          <p className="text-sm text-stone-500 max-w-sm">
            Our AI is analyzing your interview session. This usually takes 1–2 minutes. Refresh the page shortly.
          </p>
        </div>
        <Button variant="outline" asChild className="border-white/10 text-stone-400">
          <Link href="/appointments">← Back to Appointments</Link>
        </Button>
      </main>
    );
  }

  if (summary.status === "FAILED") {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
          <Brain size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-2xl text-stone-200 mb-2">Analysis Failed</h1>
          <p className="text-sm text-stone-500 max-w-sm">
            We couldn&apos;t process the AI review for this session. This may be due to insufficient recording data.
          </p>
        </div>
        <Button variant="outline" asChild className="border-white/10 text-stone-400">
          <Link href="/appointments">← Back to Appointments</Link>
        </Button>
      </main>
    );
  }

  const readiness = READINESS_CONFIG[summary.readinessLevel] ?? READINESS_CONFIG["Getting There"];
  const interviewer = summary.booking?.interviewer;

  return (
    <main className="min-h-screen bg-black pb-24">
      {/* Hero */}
      <section className="relative border-b border-white/8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-400/8 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 sm:px-8 pt-16 pb-10 flex flex-col gap-6">
          <Link href="/appointments">
            <Button variant="link" className="text-stone-500 cursor-pointer px-0 gap-1.5">
              <ArrowLeft size={13} />
              Back to Appointments
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center shrink-0">
              <Brain size={26} className="text-amber-400" />
            </div>
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl leading-tight tracking-tight text-stone-100">
                AI Interview Report
              </h1>
              {interviewer && (
                <p className="text-sm text-stone-500 mt-1">
                  Session with {interviewer.name}
                  {interviewer.categories?.length > 0 && (
                    <span className="text-stone-700"> · {interviewer.categories[0].replace("_", " ")}</span>
                  )}
                </p>
              )}
            </div>

            {/* Readiness badge */}
            <div className={`ml-auto shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border ${readiness.bg}`}>
              <span>{readiness.emoji}</span>
              <span className={`text-sm font-medium ${readiness.color}`}>{summary.readinessLevel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-10 flex flex-col gap-8">
        {/* Score Gauges */}
        <section>
          <p className="text-[10px] font-semibold text-stone-600 tracking-widest uppercase mb-4">Performance Scores</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <ScoreGauge label="Overall" score={summary.overallScore} icon={Target} color="amber" />
            <ScoreGauge label="Technical" score={summary.technicalScore} icon={Zap} color="blue" />
            <ScoreGauge label="Communication" score={summary.communicationScore} icon={MessageSquare} color="purple" />
            <ScoreGauge label="Problem Solving" score={summary.problemSolvingScore} icon={Brain} color="green" />
            <ScoreGauge label="Confidence" score={summary.confidenceScore} icon={TrendingUp} color="rose" />
          </div>
        </section>

        {/* Detailed Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.technicalFeedback && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-blue-400" />
                <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">Technical</p>
              </div>
              <p className="text-sm text-stone-300 font-light leading-relaxed">{summary.technicalFeedback}</p>
            </div>
          )}
          {summary.communicationFeedback && (
            <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" />
                <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">Communication</p>
              </div>
              <p className="text-sm text-stone-300 font-light leading-relaxed">{summary.communicationFeedback}</p>
            </div>
          )}
        </div>

        {/* Strengths + Weak Areas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {summary.strengthsShown?.length > 0 && (
            <div className="bg-[#0f0f11] border border-green-500/15 rounded-2xl p-6 flex flex-col gap-3">
              <p className="text-xs font-semibold text-green-400/70 tracking-widest uppercase">✓ Strengths</p>
              <ul className="flex flex-col gap-2">
                {summary.strengthsShown.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.weakAreas?.length > 0 && (
            <div className="bg-[#0f0f11] border border-red-500/15 rounded-2xl p-6 flex flex-col gap-3">
              <p className="text-xs font-semibold text-red-400/70 tracking-widest uppercase">⚠ Areas to Improve</p>
              <ul className="flex flex-col gap-2">
                {summary.weakAreas.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                    <span className="text-red-400 mt-0.5 shrink-0">→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Missed Concepts + Study Topics */}
        {(summary.missedConcepts?.length > 0 || summary.suggestedTopics?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {summary.missedConcepts?.length > 0 && (
              <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-amber-400" />
                  <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">Missed Concepts</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.missedConcepts.map((c, i) => (
                    <Badge key={i} variant="outline" className="border-amber-400/20 bg-amber-400/5 text-amber-400/80 text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {summary.suggestedTopics?.length > 0 && (
              <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-400" />
                  <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">Study These Next</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.suggestedTopics.map((t, i) => (
                    <Badge key={i} variant="outline" className="border-blue-400/20 bg-blue-400/5 text-blue-400/80 text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Improvement Roadmap */}
        {summary.improvementRoadmap && (
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Map size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">Improvement Roadmap</p>
            </div>
            <p className="text-sm text-stone-300 font-light leading-relaxed whitespace-pre-line">
              {summary.improvementRoadmap}
            </p>
          </div>
        )}

        {/* Processed timestamp */}
        {summary.processedAt && (
          <p className="text-[10px] text-stone-700 text-center">
            Analysis generated {new Date(summary.processedAt).toLocaleString()}
          </p>
        )}
      </div>
    </main>
  );
}
