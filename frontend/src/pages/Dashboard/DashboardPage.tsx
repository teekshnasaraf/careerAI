import {
  Upload,
  Brain,
  GraduationCap,
} from "lucide-react";

import StatCard from "../../components/dashboard/StatCard";
import QuickAction from "../../components/dashboard/QuickAction";

function DashboardPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Dashboard Overview
        </h2>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Resume Uploaded"
            value="No"
            description="Upload your resume to begin"
          />

          <StatCard
            title="Resume Score"
            value="--"
            description="AI analysis pending"
          />

          <StatCard
            title="Interviews"
            value="0"
            description="Completed mock interviews"
          />

          <StatCard
            title="Questions Solved"
            value="0"
            description="Interview questions practiced"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Quick Actions
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <QuickAction
            title="Upload Resume"
            description="Upload your latest resume"
            icon={Upload}
          />

          <QuickAction
            title="Analyze Resume"
            description="Get AI-powered feedback"
            icon={Brain}
          />

          <QuickAction
            title="Start Interview"
            description="Practice with AI interviewer"
            icon={GraduationCap}
          />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;