"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Clock, Coins, Zap } from "lucide-react";
import { createPlan, updatePlan, deletePlan } from "@/actions/pricing";
import { toast } from "sonner";

const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  durationMins: 60,
  creditCost: "",
  discountPercent: "",
};

export default function PricingSection({ initialPlans = [] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  // Keep in sync with server if server re-renders
  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      durationMins: plan.durationMins,
      creditCost: String(plan.creditCost),
      discountPercent: plan.discountPercent != null ? String(plan.discountPercent) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    if (!form.creditCost || Number(form.creditCost) < 1) { toast.error("Credit cost must be at least 1"); return; }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMins: Number(form.durationMins),
        creditCost: Number(form.creditCost),
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
      };

      if (editingPlan) {
        const res = await updatePlan(editingPlan.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? res.plan : p)));
        toast.success("Plan updated!");
      } else {
        const res = await createPlan(payload);
        setPlans((prev) => [...prev, res.plan]);
        toast.success("Plan created!");
      }

      setOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!confirm("Remove this plan? It won't affect existing bookings.")) return;
    try {
      await deletePlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan removed");
    } catch (err) {
      toast.error(err.message || "Failed to remove plan");
    }
  };

  const effectivePrice = (plan) => {
    if (plan.discountPercent && plan.discountPercent > 0) {
      return Math.round(plan.creditCost * (1 - plan.discountPercent / 100));
    }
    return plan.creditCost;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-200">Your Pricing Plans</p>
          <p className="text-xs text-stone-600 mt-0.5">
            Interviewees pick a plan when booking. Falls back to your credit rate if no plans exist.
          </p>
        </div>
        <Button variant="gold" size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <Plus size={14} />
          Add Plan
        </Button>
      </div>

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-10 flex flex-col items-center gap-3">
          <span className="text-3xl">📋</span>
          <p className="text-sm text-stone-500">No pricing plans yet.</p>
          <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
            <Plus size={13} />
            Create your first plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative bg-[#141417] border border-white/8 rounded-2xl p-5 flex flex-col gap-3 group hover:border-amber-400/20 transition-colors"
            >
              {plan.discountPercent > 0 && (
                <span className="absolute -top-2.5 left-4 text-[10px] font-bold bg-amber-400 text-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {plan.discountPercent}% off
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-stone-200 leading-tight">{plan.name}</p>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-stone-200 transition-colors"
                    aria-label="Edit plan"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-500/60 hover:text-red-400 transition-colors"
                    aria-label="Remove plan"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-xs text-stone-500 font-light leading-relaxed">{plan.description}</p>
              )}

              <div className="flex items-center gap-3 mt-auto pt-1">
                <Badge variant="outline" className="border-white/10 text-stone-500 text-[10px] gap-1">
                  <Clock size={10} />
                  {plan.durationMins} min
                </Badge>
                <div className="flex items-center gap-1">
                  {plan.discountPercent > 0 && (
                    <span className="text-xs text-stone-600 line-through">{plan.creditCost}</span>
                  )}
                  <span className="text-base font-serif bg-gradient-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {effectivePrice(plan)}
                  </span>
                  <span className="text-[10px] text-stone-600 ml-0.5">credits</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black border border-white/10 text-stone-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-tight">
              {editingPlan ? "Edit Plan" : "New Pricing Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 mt-2">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-name" className="text-xs text-stone-500 uppercase tracking-widest">
                Plan Name *
              </Label>
              <Input
                id="plan-name"
                placeholder="e.g. 60 min Deep Dive"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-[#141417] border-white/10"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-desc" className="text-xs text-stone-500 uppercase tracking-widest">
                Description (optional)
              </Label>
              <Textarea
                id="plan-desc"
                rows={2}
                placeholder="What's included in this plan..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-[#141417] border-white/10 resize-none"
              />
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-stone-500 uppercase tracking-widest">Duration *</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, durationMins: d.value }))}
                    className={`text-xs px-4 py-2 rounded-lg border transition-all ${
                      form.durationMins === d.value
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                        : "border-white/10 text-stone-500 hover:border-white/20"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credits + Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-credits" className="text-xs text-stone-500 uppercase tracking-widest">
                  Credit Cost *
                </Label>
                <Input
                  id="plan-credits"
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={form.creditCost}
                  onChange={(e) => setForm((p) => ({ ...p, creditCost: e.target.value }))}
                  className="bg-[#141417] border-white/10"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-discount" className="text-xs text-stone-500 uppercase tracking-widest">
                  Discount %
                </Label>
                <Input
                  id="plan-discount"
                  type="number"
                  min={0}
                  max={90}
                  placeholder="e.g. 20"
                  value={form.discountPercent}
                  onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
                  className="bg-[#141417] border-white/10"
                />
              </div>
            </div>

            {/* Price preview */}
            {form.creditCost && (
              <div className="flex items-center gap-2 text-xs text-stone-500 bg-[#141417] rounded-xl px-4 py-2 border border-white/5">
                <Zap size={12} className="text-amber-400" />
                <span>
                  Interviewee pays{" "}
                  <span className="text-amber-400 font-medium">
                    {form.discountPercent
                      ? Math.round(Number(form.creditCost) * (1 - Number(form.discountPercent) / 100))
                      : form.creditCost}
                  </span>{" "}
                  credits for {form.durationMins} min
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-stone-400">
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
