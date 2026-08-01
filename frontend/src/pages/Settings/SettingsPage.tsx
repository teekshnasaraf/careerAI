import { useEffect, useState } from "react";
import {
  User,
  Target,
  BookOpen,
  Sparkles,
  Bell,
  Shield,
  Save,
  Loader2,
  Check,
  Download,
  Lock,
} from "lucide-react";

import { getUserSettingsApi, updateUserSettingsApi } from "../../features/settings/settings.service";
import type { SettingsData } from "../../features/settings/settings.service";

function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "career" | "learning" | "ai" | "notifications" | "security">("profile");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await getUserSettingsApi();
        if (res.success && res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await updateUserSettingsApi(settings);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Retrieving user profile & preference configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Account Settings & Preferences</h1>
          <p className="mt-1 text-gray-500">
            Manage your personal profile, career goals, AI mentor preferences, learning style, and security settings.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} className="text-emerald-300" /> : <Save size={16} />}
          {saving ? "Saving Changes..." : saveSuccess ? "Settings Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex flex-wrap border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "profile" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={16} />
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab("career")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "career" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Target size={16} />
            Career Goals
          </button>
          <button
            onClick={() => setActiveTab("learning")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "learning" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BookOpen size={16} />
            Learning Preferences
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "ai" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles size={16} />
            AI Persona
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "notifications" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Bell size={16} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-4 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "security" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield size={16} />
            Security & Data
          </button>
        </div>

        {settings && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            {/* TAB 1: Profile Details */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Personal & Academic Profile</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={settings.profile?.name || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, name: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={settings.profile?.phone || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, phone: e.target.value } })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">College / University</label>
                    <input
                      type="text"
                      value={settings.profile?.college || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, college: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Degree & Major</label>
                    <input
                      type="text"
                      value={settings.profile?.degree || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, degree: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Branch / Specialization</label>
                    <input
                      type="text"
                      value={settings.profile?.branch || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, branch: e.target.value } })}
                      placeholder="Computer Science & Engineering"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Current CGPA / Percentage</label>
                    <input
                      type="text"
                      value={settings.profile?.cgpa || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, cgpa: e.target.value } })}
                      placeholder="8.5 / 10"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Current Location</label>
                    <input
                      type="text"
                      value={settings.profile?.location || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, location: e.target.value } })}
                      placeholder="San Francisco, CA"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Graduation Year</label>
                    <input
                      type="text"
                      value={settings.profile?.graduationYear || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, graduationYear: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={settings.profile?.linkedin || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, linkedin: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">GitHub Profile</label>
                    <input
                      type="text"
                      value={settings.profile?.github || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, github: e.target.value } })}
                      placeholder="https://github.com/username"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Portfolio Website</label>
                    <input
                      type="text"
                      value={settings.profile?.portfolio || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, portfolio: e.target.value } })}
                      placeholder="https://yourportfolio.dev"
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Professional Bio / Elevator Pitch</label>
                    <textarea
                      rows={3}
                      value={settings.profile?.bio || ""}
                      onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, bio: e.target.value } })}
                      placeholder="Brief overview of your technical background, goals, and passions..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Career Preferences */}
            {activeTab === "career" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Career Goals & Preferences</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Target Role</label>
                    <input
                      type="text"
                      value={settings.career?.preferredRole || ""}
                      onChange={(e) => setSettings({ ...settings, career: { ...settings.career, preferredRole: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Experience Level</label>
                    <select
                      value={settings.career?.experienceLevel || "Student / Fresher"}
                      onChange={(e) => setSettings({ ...settings, career: { ...settings.career, experienceLevel: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Student / Fresher">Student / Fresher</option>
                      <option value="1-3 Years Experience">1-3 Years Experience</option>
                      <option value="Senior / 5+ Years">Senior / 5+ Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Primary Career Goal</label>
                    <select
                      value={settings.career?.careerGoal || "Product Company Placement"}
                      onChange={(e) => setSettings({ ...settings, career: { ...settings.career, careerGoal: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Product Company Placement">Product Company Placement</option>
                      <option value="FAANG Interview Prep">FAANG Interview Prep</option>
                      <option value="Campus Internship">Campus Internship</option>
                      <option value="Startup High-Growth Role">Startup High-Growth Role</option>
                      <option value="Higher Studies / M.S.">Higher Studies / M.S.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Work Setup Preference</label>
                    <select
                      value={settings.career?.workType || "Remote"}
                      onChange={(e) => setSettings({ ...settings, career: { ...settings.career, workType: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Onsite">Onsite</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Learning Preferences */}
            {activeTab === "learning" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Learning Preferences</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Weekly Time Available (Hours)</label>
                    <input
                      type="number"
                      value={settings.learning?.weeklyHours || 10}
                      onChange={(e) => setSettings({ ...settings, learning: { ...settings.learning, weeklyHours: Number(e.target.value) } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Learning Format</label>
                    <select
                      value={settings.learning?.learningStyle || "Hands-on Projects"}
                      onChange={(e) => setSettings({ ...settings, learning: { ...settings.learning, learningStyle: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Hands-on Projects">Hands-on Projects</option>
                      <option value="Video Courses & Tutorials">Video Courses & Tutorials</option>
                      <option value="Documentation & Articles">Documentation & Articles</option>
                      <option value="Mixed Interactive">Mixed Interactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AI Preferences */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">AI Mentor Persona & Behavior</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Preferred AI Reviewer Tone</label>
                    <select
                      value={settings.aiPreferences?.tone || "Friendly Mentor"}
                      onChange={(e) => setSettings({ ...settings, aiPreferences: { ...settings.aiPreferences, tone: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Friendly Mentor">Friendly Mentor</option>
                      <option value="Strict Recruiter Reviewer">Strict Recruiter Reviewer</option>
                      <option value="FAANG Senior Interviewer">FAANG Senior Interviewer</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      checked={settings.aiPreferences?.autoAnalyze}
                      onChange={(e) => setSettings({ ...settings, aiPreferences: { ...settings.aiPreferences, autoAnalyze: e.target.checked } })}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-semibold text-gray-700">Auto-generate AI Analysis on Resume Upload</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Notifications */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Notification Settings</h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.email}
                      onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, email: e.target.checked } })}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-semibold text-gray-700">Email Notifications</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.interviewReminders}
                      onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, interviewReminders: e.target.checked } })}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-semibold text-gray-700">Mock Interview Reminders</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.weeklyProgress}
                      onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, weeklyProgress: e.target.checked } })}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-semibold text-gray-700">Weekly Progress Coach Reports</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 6: Security & Data */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Security & Data Management</h2>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => alert("Progress data exported successfully.")}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <Download size={14} />
                    Export Career Progress
                  </button>

                  <button
                    onClick={() => alert("Password reset link sent to your registered email.")}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <Lock size={14} />
                    Change Account Password
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
