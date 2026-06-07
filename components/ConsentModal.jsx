"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Shield, X } from "lucide-react";
import { updateAIConsent } from "@/actions/ai-review";
import { toast } from "sonner";

export function ConsentModal({ open, onOpenChange, onConsent }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateAIConsent(true);
      toast.success("AI review enabled! You'll receive personalized feedback after each session.");
      onConsent?.(true);
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save preference");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await updateAIConsent(false);
      onConsent?.(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/10 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-center justify-center shrink-0">
              <Brain size={16} className="text-amber-400" />
            </span>
            Enable AI Interview Analysis?
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          <p className="text-sm text-stone-400 font-light leading-relaxed">
            Allow <span className="text-amber-400 font-medium">Prept AI</span> to analyze your interview recordings
            and provide personalized, in-depth feedback after each session.
          </p>

          {/* What AI analyzes */}
          <div className="bg-[#141417] border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-stone-600 tracking-widest uppercase">What you get</p>
            <ul className="flex flex-col gap-2">
              {[
                "Technical depth score with specific feedback",
                "Communication & problem-solving analysis",
                "Personalized 2–4 week improvement roadmap",
                "Interview readiness rating",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-stone-400">
                  <span className="text-amber-400 shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2.5 text-xs text-stone-600">
            <Shield size={12} className="shrink-0 mt-0.5 text-stone-600" />
            <span>
              Only your recordings are analyzed. Data is never shared with third parties. You can revoke consent
              anytime from your settings.
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={loading}
            className="flex-1 border-white/10 text-stone-500 gap-1.5"
          >
            <X size={13} />
            No thanks
          </Button>
          <Button
            variant="gold"
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 gap-1.5"
          >
            <Brain size={13} />
            {loading ? "Saving..." : "Enable AI Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
