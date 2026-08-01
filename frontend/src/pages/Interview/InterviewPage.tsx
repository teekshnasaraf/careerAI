import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Award,
  Play,
  Loader2,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  getInterviewStatsApi,
  startInterviewSessionApi,
  submitQuestionAnswerApi,
  finishInterviewSessionApi,
} from "../../features/interview/interview.service";
import type { InterviewStatsData, InterviewSessionData, EvaluationEntry } from "../../features/interview/interview.service";

const MODES = [
  "Mixed Interview",
  "Resume Based Interview",
  "Technical Interview",
  "System Design",
  "HR Interview",
  "Behavioural Interview",
  "Aptitude",
];

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Netflix",
  "Adobe",
  "TCS",
  "Infosys",
  "Startup",
];

const ROLES = [
  "Full Stack Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "DevOps Engineer",
  "AI / ML Engineer",
  "Cybersecurity Analyst",
];

function InterviewPage() {
  const [stats, setStats] = useState<InterviewStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup Form State
  const [selectedMode, setSelectedMode] = useState("Resume Based Interview");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [selectedLength, setSelectedLength] = useState(5);
  const [selectedCompany, setSelectedCompany] = useState("Google");
  const [selectedRole, setSelectedRole] = useState("Full Stack Engineer");
  const [startingSession, setStartingSession] = useState(false);

  // Active Session State
  const [activeSession, setActiveSession] = useState<InterviewSessionData | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswerInput, setUserAnswerInput] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationEntry | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getInterviewStatsApi();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch interview stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleStartSession = async () => {
    try {
      setStartingSession(true);
      const res = await startInterviewSessionApi({
        mode: selectedMode,
        difficulty: selectedDifficulty,
        length: selectedLength,
        targetCompany: selectedCompany,
        targetRole: selectedRole,
      });

      if (res.success && res.data) {
        setActiveSession(res.data);
        setCurrentQuestionIdx(0);
        setUserAnswerInput("");
        setLatestEvaluation(null);
      }
    } catch (err) {
      console.error("Error starting session:", err);
      alert("Failed to start mock interview session.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswerInput.trim()) return;

    const currentQ = activeSession.questions[currentQuestionIdx];
    if (!currentQ) return;

    try {
      setSubmittingAnswer(true);
      const res = await submitQuestionAnswerApi({
        sessionId: activeSession._id,
        questionId: currentQ.questionId,
        questionText: currentQ.text,
        userAnswer: userAnswerInput,
      });

      if (res.success && res.data) {
        setLatestEvaluation(res.data.evaluation);
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      alert("Failed to evaluate answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (!activeSession) return;
    if (currentQuestionIdx + 1 < activeSession.questions.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setUserAnswerInput("");
      setLatestEvaluation(null);
    } else {
      handleFinishSession();
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    try {
      const res = await finishInterviewSessionApi(activeSession._id);
      if (res.success && res.data) {
        setActiveSession(res.data);
        fetchStats();
      }
    } catch (err) {
      console.error("Error finishing session:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading AI interview simulator & user statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Interview Preparation</h1>
        <p className="mt-1 text-gray-500">
          Practice company-tailored mock interviews with instant Gemini evaluation, scoring, and STAR feedback.
        </p>
      </div>

      {/* Section 1: Top Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solved</span>
          <div className="text-2xl font-extrabold text-gray-900">{stats?.questionsSolved || 0}</div>
          <p className="text-[11px] text-gray-400">Total Questions</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-extrabold text-blue-600">{stats?.mockInterviewsCompleted || 0}</div>
          <p className="text-[11px] text-gray-400">Mock Sessions</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Avg Score</span>
          <div className="text-2xl font-extrabold text-emerald-600">{stats?.averageInterviewScore || 0}%</div>
          <p className="text-[11px] text-gray-400">Accuracy Rating</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Confidence</span>
          <div className="text-lg font-bold text-purple-900">{stats?.confidenceLevel || "Building"}</div>
          <p className="text-[11px] text-gray-400">AI Assessed</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Focus Topics</span>
          <div className="text-xs font-medium text-gray-800">
            <span className="text-red-600 font-bold">Weakest:</span> {stats?.weakestTopic || "System Architecture"}
          </div>
          <div className="text-xs font-medium text-gray-800">
            <span className="text-emerald-600 font-bold">Strongest:</span> {stats?.strongestTopic || "Frontend Frameworks"}
          </div>
        </div>
      </div>

      {/* Active Session Workbench OR Session Setup Controls */}
      {activeSession ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-2">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Question {currentQuestionIdx + 1} of {activeSession.questions.length}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {activeSession.targetCompany} • {activeSession.targetRole}
              </span>
            </div>

            <button
              onClick={() => setActiveSession(null)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Exit Session
            </button>
          </div>

          {/* Current Question Display */}
          {activeSession.questions[currentQuestionIdx] && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50/60 p-5 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                    {activeSession.questions[currentQuestionIdx].category} Question
                  </span>
                  {activeSession.questions[currentQuestionIdx].resumeReference && (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={12} />
                      Resume Context: {activeSession.questions[currentQuestionIdx].resumeReference}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {activeSession.questions[currentQuestionIdx].text}
                </h3>
              </div>

              {/* User Answer Textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Your Technical Response</label>
                <textarea
                  rows={5}
                  value={userAnswerInput}
                  onChange={(e) => setUserAnswerInput(e.target.value)}
                  placeholder="Type your detailed explanation or solution here..."
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submittingAnswer || !userAnswerInput.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingAnswer ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submittingAnswer ? "Evaluating Answer..." : "Submit Answer to Gemini"}
                </button>

                {latestEvaluation && (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
                  >
                    {currentQuestionIdx + 1 < activeSession.questions.length ? "Next Question →" : "Finish & View Report"}
                  </button>
                )}
              </div>

              {/* Gemini Answer Evaluation Box */}
              {latestEvaluation && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-6 space-y-4 pt-4 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <h4 className="font-bold text-emerald-950 text-sm">Gemini AI Evaluation Result</h4>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 border">
                        Accuracy: {latestEvaluation.accuracy}%
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-800 border">
                        Communication: {latestEvaluation.communication}%
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-purple-800 border">
                        Score: {latestEvaluation.score}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-gray-700">Alternative Better Answer:</span>
                      <p className="text-xs text-gray-800 leading-relaxed bg-white p-3.5 rounded-lg border mt-1">
                        {latestEvaluation.betterAnswer}
                      </p>
                    </div>

                    {latestEvaluation.followupQuestion && (
                      <div>
                        <span className="text-xs font-bold text-purple-800">Suggested Follow-Up Question:</span>
                        <p className="text-xs text-purple-900 font-medium bg-purple-50 p-3 rounded-lg border border-purple-100 mt-1">
                          "{latestEvaluation.followupQuestion}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Final Report View */}
          {activeSession.status === "completed" && activeSession.report && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <Award className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Session Final Report</h3>
                  <p className="text-xs text-gray-500">Target Role: {activeSession.targetRole} • Company: {activeSession.targetCompany}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                  <span className="text-xs font-semibold text-blue-800">Overall Interview Rating</span>
                  <div className="text-3xl font-extrabold text-blue-600 mt-1">{activeSession.report.overallScore}%</div>
                </div>

                <div className="rounded-xl bg-purple-50 p-4 border border-purple-100 col-span-2">
                  <span className="text-xs font-semibold text-purple-800">Concepts to Revise</span>
                  <ul className="list-disc pl-4 text-xs text-purple-950 space-y-1 mt-1">
                    {activeSession.report.conceptsToRevise?.map((c, cIdx) => (
                      <li key={cIdx}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Setup Controls Section */
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Configure Mock Interview</h2>
              <p className="text-xs text-gray-500">Select mode, company, target role, and difficulty to generate tailored questions.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Interview Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Target Company */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Target Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Target Role */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Target Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Difficulty Level</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Adaptive AI">Adaptive AI</option>
              </select>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Questions Count</label>
              <select
                value={selectedLength}
                onChange={(e) => setSelectedLength(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={5}>5 Questions (Quick Practice)</option>
                <option value={10}>10 Questions (Standard)</option>
                <option value={20}>20 Questions (Full Assessment)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartSession}
              disabled={startingSession}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
            >
              {startingSession ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {startingSession ? "Generating Personalized Interview..." : "Start Mock Interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewPage;
