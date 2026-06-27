import {
  Atom,
  Server,
  Database,
  BrainCircuit,
  FileCode2,
  Boxes,
} from "lucide-react";

function TrustedBy() {
  const technologies = [
    {
      name: "React",
      icon: Atom,
    },
    {
      name: "TypeScript",
      icon: FileCode2,
    },
    {
      name: "Node.js",
      icon: Server,
    },
    {
      name: "PostgreSQL",
      icon: Database,
    },
    {
      name: "Prisma",
      icon: Boxes,
    },
    {
      name: "Gemini AI",
      icon: BrainCircuit,
    },
  ];

  return (
    <section className="border-y border-gray-200 bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-10 text-center text-lg font-semibold uppercase tracking-widest text-gray-500">
          Built Using Modern Technologies
        </h2>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {technologies.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-lg"
            >
              <Icon
                size={42}
                className="text-blue-600"
              />

              <p className="font-semibold text-gray-700">
                {name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustedBy;