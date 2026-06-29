import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Frontend Developer",
    quote:
      "CareerAI transformed my resume and helped me secure interviews at top product companies.",
  },
  {
    name: "Priya Verma",
    role: "Software Engineer",
    quote:
      "The AI interview practice felt incredibly realistic. The feedback helped me improve my confidence.",
  },
  {
    name: "Aditya Kumar",
    role: "Final Year Student",
    quote:
      "I loved the personalized job recommendations. It saved me hours of searching every week.",
  },
];

function Testimonials() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            Loved by Students
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Thousands of students use CareerAI to improve their resumes,
            prepare for interviews, and discover better career opportunities.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              {/* Stars */}
              <div className="mb-6 flex gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="mb-8 leading-7 text-gray-600">
                "{testimonial.quote}"
              </p>

              {/* User */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {testimonial.name.charAt(0)}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {testimonial.name}
                  </h4>

                  <p className="text-sm text-gray-500">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;