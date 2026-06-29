import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-20 text-center shadow-2xl md:px-16">
          <h2 className="text-4xl font-extrabold text-white md:text-5xl">
            Ready to Launch Your Career?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
            Join thousands of students using CareerAI to build stronger resumes,
            discover personalized job opportunities, practice interviews, and
            land their dream jobs with confidence.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:scale-105 hover:bg-gray-100"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>

            <a
              href="#features"
              className="inline-flex items-center rounded-xl border border-white/30 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTA;