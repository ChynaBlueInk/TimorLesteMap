"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type StopEditorValue = {
  id: string;
  name?: string;
  placeId?: string;
  notes?: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMin?: number | null;
  transportMode?: string | null;
  roadCondition?: string | null;
  distanceKm?: number | null;
  order?: number;
  lat?: number | null;
  lng?: number | null;
};

export default function StopEditorModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: StopEditorValue;
  onSave: (updated: StopEditorValue) => void;
}) {
  const [form, setForm] = useState<StopEditorValue>(initial);

  useEffect(() => setForm(initial), [initial]);

  if (!open) return null;

  const set = <K extends keyof StopEditorValue>(k: K, v: StopEditorValue[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Stop</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name/Label</label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g., Cristo Rei lookout"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Place ID (optional)</label>
              <Input
                value={form.placeId ?? ""}
                onChange={(e) => set("placeId", e.target.value)}
                placeholder="internal placeId if linked"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Start time</label>
              <Input
                type="time"
                value={form.startTime ?? ""}
                onChange={(e) => set("startTime", e.target.value || null)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">End time</label>
              <Input
                type="time"
                value={form.endTime ?? ""}
                onChange={(e) => set("endTime", e.target.value || null)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.durationMin ?? ""}
                onChange={(e) => {
                  const val = e.target.value.trim() === "" ? null : Number(e.target.value);
                  set("durationMin", Number.isNaN(val as any) ? null : (val as number | null));
                }}
                placeholder="e.g., 45"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Distance (km)</label>
              <Input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={form.distanceKm ?? ""}
                onChange={(e) => {
                  const val = e.target.value.trim() === "" ? null : Number(e.target.value);
                  set("distanceKm", Number.isNaN(val as any) ? null : (val as number | null));
                }}
                placeholder="override route calc if needed"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Transport mode</label>
              <Select
                value={form.transportMode ?? ""}
                onValueChange={(v) => set("transportMode", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drive">Drive</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="walk">Walk</SelectItem>
                  <SelectItem value="boat">Boat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Road condition</label>
              <Select
                value={form.roadCondition ?? ""}
                onValueChange={(v) => set("roadCondition", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="rough">Rough</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Order</label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.order ?? 0}
                onChange={(e) => set("order", Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="parking, entry fee, timing tips…"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
