import { useEffect, useState } from "react";
import {
  Award,
  AlertTriangle,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";

import { getProgressStatsApi } from "../../features/progress/progress.service";
import type { ProgressStatsData } from "../../features/progress/progress.service";

function ProgressPage() {
  const [stats, setStats] = useState<ProgressStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await getProgressStatsApi();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch progress stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Aggregating progress history, score trends & achievements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Learning Progress & Journey</h1>
        <p className="mt-1 text-gray-500">
          Visualized score trends, achievements, chronological timeline, recurring weak topics, and AI Progress Coach guidance.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Resume Score</span>
          <div className="text-3xl font-extrabold text-blue-600">{stats?.currentResumeScore || 0}/100</div>
          <p className="text-[11px] text-gray-500">Quality & recruiter rating</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">ATS Score</span>
          <div className="text-3xl font-extrabold text-emerald-600">{stats?.currentAtsScore || 0}/100</div>
          <p className="text-[11px] text-gray-500">Parser match score</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Interview Avg</span>
          <div className="text-3xl font-extrabold text-purple-600">{stats?.interviewAverage || 0}%</div>
          <p className="text-[11px] text-gray-500">Mock practice rating</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Roadmap Progress</span>
          <div className="text-3xl font-extrabold text-amber-600">{stats?.roadmapCompletion || 0}%</div>
          <p className="text-[11px] text-gray-500">Target role completion</p>
        </div>
      </div>

      {/* AI Progress Coach Report */}
      {stats?.weeklyCoachReport && (
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/60 via-white to-blue-50/60 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Progress Coach Weekly Report</h2>
              <p className="text-xs text-gray-500">Personalized evaluation of your recent progress and placement readiness.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 pt-2">
            <div className="rounded-xl bg-white p-4 border border-purple-100 space-y-2">
              <span className="text-xs font-bold text-emerald-700">What Improved</span>
              <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                {stats.weeklyCoachReport.whatImproved.map((imp, idx) => (
                  <li key={idx}>{imp}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-4 border border-purple-100 space-y-2">
              <span className="text-xs font-bold text-amber-700">Areas Needing Focus</span>
              <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                {stats.weeklyCoachReport.whatDeclined.map((dec, idx) => (
                  <li key={idx}>{dec}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-purple-600 text-white p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">Readiness Metrics</span>
              <div className="flex justify-between text-xs pt-1">
                <span>Placement Readiness:</span>
                <span className="font-bold">{stats.weeklyCoachReport.placementReadiness}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Interview Readiness:</span>
                <span className="font-bold">{stats.weeklyCoachReport.interviewReadiness}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Badges Grid */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Achievements & Badges</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats?.achievements?.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                ach.unlocked
                  ? "border-emerald-100 bg-emerald-50/30"
                  : "border-gray-200 bg-gray-50/50 opacity-60"
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white ${
                  ach.unlocked ? "bg-emerald-500" : "bg-gray-400"
                }`}
              >
                <Award className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">{ach.title}</h3>
                  {ach.unlocked && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Unlocked
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{ach.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weakness Tracker & Learning Timeline Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weakness Tracker */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Weakness Tracker (Recurring Topics)
          </h3>
          <div className="space-y-3">
            {stats?.weakTopics?.map((wt, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{wt.topic}</h4>
                  <p className="text-xs text-gray-500">Auto-detected recurring weak area</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {wt.mistakeCount} Flagged
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chronological Learning Timeline */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Chronological Learning Timeline
          </h3>
          <div className="space-y-4">
            {stats?.timeline?.map((item) => (
              <div key={item.id} className="border-l-2 border-blue-600 pl-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                  <span className="text-[11px] text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
