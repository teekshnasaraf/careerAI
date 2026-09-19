/**
 * ProfileNotification.tsx
 *
 * A subtle notification badge in the Topbar that:
 * 1. Computes which profile fields are missing (from actual SettingsData schema).
 * 2. Surfaces top priority skill-gap reminders from the latest AI analysis.
 * 3. Shows a compact dismissible popover when clicked — never an intrusive popup.
 * 4. All data comes from existing API calls; nothing is hard-coded.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, X, User, Zap, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getUserSettingsApi, type SettingsData } from "../../features/settings/settings.service";
import { getLatestAnalysisApi } from "../../features/analysis/analysis.service";
import type { AnalysisData } from "../../types/analysis";

// ─── Profile field completeness schema ────────────────────────────────────────
// Derived from the actual SettingsData type — no hard-coded personal values.

interface ProfileFieldCheck {
  label: string;
  getValue: (s: SettingsData) => string | boolean | undefined;
}

const PROFILE_FIELDS: ProfileFieldCheck[] = [
  { label: "Full name", getValue: (s) => s.profile?.name },
  { label: "College / University", getValue: (s) => s.profile?.college },
  { label: "Degree & major", getValue: (s) => s.profile?.degree },
  { label: "Graduation year", getValue: (s) => s.profile?.graduationYear },
  { label: "Preferred target role", getValue: (s) => s.career?.preferredRole },
  { label: "LinkedIn profile", getValue: (s) => s.profile?.linkedin },
];

const CAREER_FIELDS: ProfileFieldCheck[] = [
  { label: "Career goal", getValue: (s) => s.career?.careerGoal },
  { label: "Work setup preference", getValue: (s) => s.career?.workType },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isFilled = (val: string | boolean | undefined): boolean => {
  if (typeof val === "boolean") return true; // boolean fields are always "filled"
  return typeof val === "string" && val.trim().length > 0;
};

const getMissingProfileFields = (settings: SettingsData): string[] =>
  [...PROFILE_FIELDS, ...CAREER_FIELDS]
    .filter((f) => !isFilled(f.getValue(settings)))
    .map((f) => f.label);

/**
 * Extracts at most `limit` actionable skill-gap reminders from analysis data.
 * Uses `topPriorityImprovements`, `missingSkills`, and `skillGapAnalysis.prioritySkills`
 * in that order — all real fields from AnalysisData, nothing invented.
 */
const getSkillGapReminders = (analysis: AnalysisData, limit = 3): string[] => {
  const items: string[] = [];

  // topPriorityImprovements is the most direct actionable list
  if (analysis.topPriorityImprovements?.length) {
    for (const item of analysis.topPriorityImprovements) {
      if (items.length >= limit) break;
      items.push(item);
    }
  }

  // Supplement with missing skills if we still have room
  if (items.length < limit && analysis.missingSkills?.length) {
    for (const skill of analysis.missingSkills) {
      if (items.length >= limit) break;
      const label = `Add "${skill}" to strengthen your profile`;
      if (!items.includes(label)) items.push(label);
    }
  }

  // Supplement with skill-gap analysis priority skills
  if (items.length < limit && analysis.skillGapAnalysis?.prioritySkills?.length) {
    for (const skill of analysis.skillGapAnalysis.prioritySkills) {
      if (items.length >= limit) break;
      const label = `Recommended: work on ${skill}`;
      if (!items.some((i) => i.includes(skill))) items.push(label);
    }
  }

  return items;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileNotification() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── Fetch data once on mount ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [settingsRes, analysisRes] = await Promise.allSettled([
          getUserSettingsApi(),
          getLatestAnalysisApi(),
        ]);
        if (cancelled) return;
        if (settingsRes.status === "fulfilled" && settingsRes.value.success) {
          setSettings(settingsRes.value.data);
        }
        if (analysisRes.status === "fulfilled" && analysisRes.value.success) {
          setAnalysis(analysisRes.value.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Close when clicking outside ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Compute notification items ──
  const missingFields = settings ? getMissingProfileFields(settings) : [];
  const skillReminders = analysis ? getSkillGapReminders(analysis) : [];
  const totalCount = missingFields.length + skillReminders.length;

  return (
    <div className="relative">
      {/* ── Bell button ── */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${totalCount > 0 ? ` (${totalCount})` : ""}`}
        className="relative rounded-full p-2 transition hover:bg-gray-100 focus:outline-none"
      >
        <Bell size={22} className="text-gray-600" />

        {/* Dot badge — only shown when there are actionable items */}
        {!loading && totalCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow"
            aria-hidden
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* ── Popover panel ── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close notifications"
            >
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-xs text-gray-400">Loading…</span>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-2xl">✅</span>
              <p className="text-sm font-semibold text-gray-700">You're all caught up!</p>
              <p className="text-xs text-gray-400">No profile gaps or pending actions.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {/* ── Missing profile fields ── */}
              {missingFields.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600">
                    <User size={11} />
                    Profile incomplete
                  </p>
                  {missingFields.map((field) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Missing: {field}</span>
                    </div>
                  ))}
                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Complete your profile
                    <ChevronRight size={11} />
                  </Link>
                </div>
              )}

              {/* ── Skill-gap reminders ── */}
              {skillReminders.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
                    <Zap size={11} />
                    Recommended actions
                  </p>
                  {skillReminders.map((reminder, i) => (
                    <div key={i} className="text-xs text-gray-600 leading-snug">
                      {reminder}
                    </div>
                  ))}
                  <Link
                    to="/analysis"
                    onClick={() => setOpen(false)}
                    className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View full analysis
                    <ChevronRight size={11} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
