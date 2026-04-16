"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Sparkles, Check, X, Star } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";
import { ReviewModal } from "./ReviewModal";
import { formatDate, formatDuration, formatTime } from "@/lib/helpers";
import { RATING_LABEL, RATING_STYLES, STATUS_STYLES } from "@/lib/data";
import { updateBookingStatus } from "@/actions/booking";
import { toast } from "sonner";

export function AppointmentCard({ booking, mode, isPast = false }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { has } = useAuth();
  const { user: clerkUser } = useUser();

  const {
    id: bookingId,
    startTime,
    endTime,
    status,
    creditsCharged,
    streamCallId,
    recordingUrl,
    feedback,
    review,
  } = booking;

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      const res = await updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        toast.success(
          newStatus === "SCHEDULED"
            ? "Interview accepted!"
            : "Interview rejected."
        );
      }
    } catch (err) {
      toast.error(err.message || "Failed to update booking");
    } finally {
      setLoading(false);
    }
  };

  const person =
    mode === "interviewer" ? booking.interviewee : booking.interviewer;

  const creditsLabel =
    mode === "interviewer"
      ? `+${creditsCharged} credits earned`
      : `−${creditsCharged} credits`;

  const creditsStyle =
    mode === "interviewer"
      ? "border-green-500/20 bg-green-500/10 text-green-400"
      : "border-amber-400/20 bg-amber-400/5 text-amber-400";

  const now = new Date();
  const isUpcoming = status === "SCHEDULED" && new Date(endTime) > now;
  const isPending = status === "PENDING" && new Date(startTime) > now;
  const isPastSession = new Date(endTime) <= now;

  const statusLabel = {
    PENDING: isPastSession ? "Expired" : "Pending",
    SCHEDULED: isPastSession ? "Completed" : "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
    NO_SHOW_INTERVIEWER: "Interviewer No-show",
    NO_SHOW_INTERVIEWEE: "Candidate No-show",
    TECHNICAL_FAILURE: "System Error",
  }[status] || status;

  return (
    <>
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        feedback={feedback}
        intervieweeName={
          mode === "interviewer" ? booking.interviewee?.name : undefined
        }
      />

      <ReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        bookingId={bookingId}
        interviewerName={mode === "interviewee" ? person?.name : undefined}
      />

      <article className="group relative bg-[#0f0f11] border border-white/10 transition-all duration-300 hover:-translate-y-0.5 rounded-2xl bg-linear-to-t from-transparent via-transparent to-amber-300/10 p-7 flex flex-col gap-6 self-start">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
            <Avatar className="w-14 h-14 border border-white/10 rounded-2xl shrink-0">
              <AvatarImage
                src={person?.imageUrl}
                alt={person?.name}
                className="rounded-2xl"
              />
              <AvatarFallback className="rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-lg font-medium">
                {person?.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-base font-medium text-stone-200 leading-tight truncate">
                {person?.name ?? "—"}
              </p>
              {person?.title && person?.company ? (
                <p className="text-xs text-stone-500 truncate">
                  {person.title}
                  <span className="text-stone-700 mx-1.5">·</span>
                  {person.company}
                </p>
              ) : (
                <p className="text-xs text-stone-600 truncate">
                  {person?.email}
                </p>
              )}
              {mode === "interviewee" && person?.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {person.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="text-[10px] px-2 py-0.5 rounded-md border border-amber-400/20 bg-amber-400/5 text-amber-400 leading-tight"
                    >
                      {cat.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 flex-wrap">
            <Badge variant="outline" className={STATUS_STYLES[status]}>
              {statusLabel}
            </Badge>
            <Badge variant="outline" className={creditsStyle}>
              {creditsLabel}
            </Badge>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-stone-600">
              <Calendar size={12} />
              <span className="text-[10px] font-semibold tracking-widest uppercase">
                Date
              </span>
            </div>
            <p className="text-sm text-stone-300">{formatDate(startTime)}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-stone-600">
              <Clock size={12} />
              <span className="text-[10px] font-semibold tracking-widest uppercase">
                Time
              </span>
            </div>
            <p className="text-sm text-stone-300">
              {formatTime(startTime)}
              <span className="text-stone-600 mx-1">–</span>
              {formatTime(endTime)}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-stone-600">
              <Video size={12} />
              <span className="text-[10px] font-semibold tracking-widest uppercase">
                Duration
              </span>
            </div>
            <p className="text-sm text-stone-300">
              {formatDuration(startTime, endTime)}
            </p>
          </div>
        </div>

        {feedback?.summary && (
          <div className="rounded-xl border border-white/8 bg-[#141417] px-4 py-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-stone-600 tracking-widest uppercase">
              AI Feedback
            </p>
            <p className="text-xs text-stone-400 font-light leading-relaxed line-clamp-2">
              {feedback.summary}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {isPending && mode === "interviewer" && !isPast && (
            <>
              <Button
                variant="gold"
                size="sm"
                className="gap-1.5 h-9 grow sm:grow-0"
                onClick={() => handleStatusUpdate("SCHEDULED")}
                disabled={loading}
              >
                <Check size={14} />
                Accept Request
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 grow sm:grow-0"
                onClick={() => handleStatusUpdate("REJECTED")}
                disabled={loading}
              >
                <X size={14} />
                Reject
              </Button>
            </>
          )}

          {!isPast && streamCallId && isUpcoming && (
            <Button variant="gold" size="sm" className="gap-2" asChild>
              <Link href={`/call/${streamCallId}`}>
                <Video size={13} />
                Join call
              </Link>
            </Button>
          )}

          {recordingUrl && has?.({ plan: "pro" }) && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                📹 Recording
              </a>
            </Button>
          )}

          {feedback &&
            (has?.({ plan: "starter" }) || has?.({ plan: "pro" })) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-400/20 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/40"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <Sparkles size={12} />
                  Full Feedback
                </Button>
                <Badge
                  variant="outline"
                  className={RATING_STYLES[feedback.overallRating]}
                >
                  ✦ {RATING_LABEL[feedback.overallRating]} performance
                </Badge>
              </>
            )}

          {/* Leave Review — interviewee only, completed sessions, no existing review */}
          {mode === "interviewee" &&
            (status === "COMPLETED" || (status === "SCHEDULED" && isPastSession)) &&
            !review && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-400/20 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/40"
                onClick={() => setReviewOpen(true)}
              >
                <Star size={12} />
                Leave Review
              </Button>
            )}

          {/* Show existing review badge */}
          {review && mode === "interviewee" && (
            <Badge
              variant="outline"
              className="border-amber-400/20 bg-amber-400/5 text-amber-400"
            >
              ★ {review.rating}/5 — Reviewed
            </Badge>
          )}
        </div>
      </article>
    </>
  );
}
