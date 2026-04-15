"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/reviews";
import { REVIEW_TAGS } from "@/lib/data";
import { toast } from "sonner";

export function ReviewModal({ open, onOpenChange, bookingId, interviewerName }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      await submitReview({
        bookingId,
        rating,
        comment,
        tags: selectedTags,
      });
      toast.success("Review submitted! Thank you for your feedback.");
      onOpenChange(false);
      // Reset form
      setRating(0);
      setComment("");
      setSelectedTags([]);
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/10 text-stone-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            <span className="text-stone-400">Rate your session with </span>
            <span className="bg-linear-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent">
              {interviewerName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-2">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-stone-700"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-sm text-amber-400 font-medium animate-in fade-in duration-200">
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-stone-600 tracking-widest uppercase">
              What stood out? (optional)
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                      : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-400"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-stone-600 tracking-widest uppercase">
              Additional feedback (optional)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              maxLength={500}
              className="w-full bg-[#141417] border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-300 placeholder:text-stone-700 focus:outline-none focus:border-amber-400/30 resize-none transition-colors"
            />
            <p className="text-[10px] text-stone-700 text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-stone-400"
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={!rating || loading}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
