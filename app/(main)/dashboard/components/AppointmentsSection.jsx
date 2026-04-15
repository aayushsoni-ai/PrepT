"use client";

import { AppointmentCard } from "@/components/AppointmentCard";
import { GrayTitle } from "@/components/reusables";
import { ClipboardList } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";

export default function AppointmentsSection({ appointments }) {
  const now = new Date();
  const scheduled = appointments.filter(
    (a) => a.status === "SCHEDULED" && new Date(a.startTime) > now
  );
  const pending = appointments.filter(
    (a) => a.status === "PENDING" && new Date(a.startTime) > now
  );
  const past = appointments.filter(
    (a) =>
      (a.status !== "SCHEDULED" && a.status !== "PENDING") ||
      new Date(a.endTime) <= now
  );

  const needsRefresh = appointments.some((a) => {
    if (a.feedback) return false;
    const endTimeMs = new Date(a.endTime).getTime();
    const nowMs = Date.now();
    if (a.status === "COMPLETED") return true;
    if (a.status === "SCHEDULED") {
      if (nowMs > endTimeMs - 60000 && nowMs < endTimeMs + 2 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  });

  return (
    <section className="flex flex-col gap-6">
      <AutoRefresh condition={needsRefresh} interval={10000} />
      <div className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8">
        <span className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
          <ClipboardList size={18} className="text-amber-400" />
        </span>
        <h2 className="font-serif text-xl tracking-tight">
          <GrayTitle>Appointments</GrayTitle>
        </h2>
        <p className="text-xs text-stone-500 font-light mt-1">
          All your scheduled and past sessions.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-[#0f0f11] border border-white/10 rounded-2xl py-20 text-center">
          <p className="text-stone-600 text-sm">No appointments yet.</p>
          <p className="text-stone-700 text-xs mt-1">
            Once interviewees book your slots, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {pending.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase flex items-center gap-2">
                Pending Requests ({pending.length})
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {pending.map((b) => (
                  <AppointmentCard
                    key={b.id}
                    booking={b}
                    mode="interviewer"
                    isPast={false}
                  />
                ))}
              </div>
            </div>
          )}

          {scheduled.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">
                Upcoming ({scheduled.length})
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {scheduled.map((b) => (
                  <AppointmentCard key={b.id} booking={b} mode="interviewer" />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-stone-500 tracking-widest uppercase">
                Past ({past.length})
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {past.map((b) => (
                  <AppointmentCard
                    key={b.id}
                    booking={b}
                    mode="interviewer"
                    isPast
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
