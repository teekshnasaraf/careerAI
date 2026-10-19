import { SKILL_TAXONOMY } from "./skillTaxonomy";

export interface SkillPrerequisiteDefinition {
  skill: string; // Canonical skill name
  prerequisites: string[]; // Canonical names of immediate prerequisites
  rationale: string;
}

/**
 * Curated prerequisite relationships across CareerAI's canonical skill taxonomy.
 * 
 * Rules:
 * 1. Every skill name must map to a valid canonical skill in SKILL_TAXONOMY.
 * 2. Prerequisite relationship A -> B means A must be learned before B.
 * 3. The graph is curated as a strict Directed Acyclic Graph (DAG).
 */
export const SKILL_PREREQUISITES: readonly SkillPrerequisiteDefinition[] = [
  // --- Programming & Computer Science Fundamentals ---
  {
    skill: "OOP",
    prerequisites: [],
    rationale: "Object-Oriented Programming principles form the foundation for class-based languages and enterprise software.",
  },
  {
    skill: "Data Structures and Algorithms",
    prerequisites: [],
    rationale: "Foundational for computational efficiency, problem solving, and technical engineering interviews.",
  },
  {
    skill: "Operating Systems",
    prerequisites: [],
    rationale: "Foundational conceptual knowledge for process management, memory allocation, concurrency, and file systems.",
  },
  {
    skill: "Computer Networks",
    prerequisites: [],
    rationale: "Fundamental understanding of networking models, sockets, and internet communication protocols.",
  },
  {
    skill: "DBMS",
    prerequisites: [],
    rationale: "Theoretical foundation of relational algebra, ACID guarantees, database normalization, and storage models.",
  },

  // --- Languages ---
  {
    skill: "C",
    prerequisites: [],
    rationale: "Foundational systems programming language providing raw pointer memory model.",
  },
  {
    skill: "C++",
    prerequisites: ["C", "OOP"],
    rationale: "Extends C with object-oriented paradigms, generic templates, and standard template library (STL).",
  },
  {
    skill: "Java",
    prerequisites: ["OOP"],
    rationale: "Strictly object-oriented, managed runtime language building upon core OOP principles.",
  },
  {
    skill: "C#",
    prerequisites: ["OOP"],
    rationale: "Modern component-oriented language for enterprise and .NET software engineering.",
  },
  {
    skill: "Python",
    prerequisites: [],
    rationale: "High-level expressive language widely used for web development, scripting, data science, and AI.",
  },
  {
    skill: "JavaScript",
    prerequisites: [],
    rationale: "Fundamental language of the web platform, event-driven async execution, and client-server runtimes.",
  },
  {
    skill: "TypeScript",
    prerequisites: ["JavaScript"],
    rationale: "Statically typed superset of JavaScript requiring mastery of core JS syntax and runtime semantics.",
  },
  {
    skill: "Go",
    prerequisites: ["Computer Networks"],
    rationale: "Concurrent cloud and systems language designed for high-performance network services.",
  },
  {
    skill: "Rust",
    prerequisites: ["C++"],
    rationale: "Systems programming language with borrow checker safety model building on systems programming concepts.",
  },
  {
    skill: "Kotlin",
    prerequisites: ["Java"],
    rationale: "Modern interoperable JVM language heavily relying on Java platform fundamentals.",
  },
  {
    skill: "Swift",
    prerequisites: ["OOP"],
    rationale: "Apple ecosystem programming language built on modern OOP and type safety concepts.",
  },
  {
    skill: "PHP",
    prerequisites: ["HTML"],
    rationale: "Server-side web scripting language operating closely with HTML document structures.",
  },
  {
    skill: "R",
    prerequisites: [],
    rationale: "Statistical computing environment for statistical analysis and data visualization.",
  },

  // --- Frontend Track ---
  {
    skill: "HTML",
    prerequisites: [],
    rationale: "Fundamental semantic markup structure for all web pages and browsers.",
  },
  {
    skill: "CSS",
    prerequisites: ["HTML"],
    rationale: "Styling and layout system applied directly to semantic HTML DOM trees.",
  },
  {
    skill: "Tailwind CSS",
    prerequisites: ["CSS"],
    rationale: "Utility-first CSS framework requiring knowledge of standard CSS box model and styling rules.",
  },
  {
    skill: "UI/UX Design",
    prerequisites: [],
    rationale: "User interface heuristics, accessibility, wireframing, and user research principles.",
  },
  {
    skill: "React",
    prerequisites: ["JavaScript", "HTML", "CSS"],
    rationale: "Component-based UI library requiring solid knowledge of modern JS (ES6+), DOM rendering, and CSS.",
  },
  {
    skill: "Vue.js",
    prerequisites: ["JavaScript", "HTML", "CSS"],
    rationale: "Progressive JavaScript framework built on reactive DOM bindings and web standards.",
  },
  {
    skill: "Angular",
    prerequisites: ["TypeScript", "HTML", "CSS"],
    rationale: "Opinionated frontend framework authored completely in TypeScript with dependency injection.",
  },
  {
    skill: "Next.js",
    prerequisites: ["React", "Node.js"],
    rationale: "Full-stack React framework implementing server-side rendering, hybrid generation, and API routes.",
  },

  // --- Backend & APIs Track ---
  {
    skill: "HTTP",
    prerequisites: ["Computer Networks"],
    rationale: "Application protocol governing client-server request/response cycles, status codes, and headers.",
  },
  {
    skill: "REST API",
    prerequisites: ["HTTP"],
    rationale: "Architectural style for web services utilizing standard HTTP methods, resources, and status codes.",
  },
  {
    skill: "GraphQL",
    prerequisites: ["REST API", "JavaScript"],
    rationale: "Query language for APIs addressing over-fetching and schema-first data querying over HTTP.",
  },
  {
    skill: "Node.js",
    prerequisites: ["JavaScript"],
    rationale: "Server-side JavaScript runtime relying on the V8 engine and non-blocking event loop.",
  },
  {
    skill: "Express",
    prerequisites: ["Node.js", "REST API"],
    rationale: "Minimalist web framework for Node.js specifically designed to build RESTful HTTP APIs.",
  },
  {
    skill: "Django",
    prerequisites: ["Python", "SQL", "REST API"],
    rationale: "Batteries-included Python web framework with built-in ORM, migrations, and model architecture.",
  },
  {
    skill: "Flask",
    prerequisites: ["Python", "REST API"],
    rationale: "Micro-framework for Python requiring understanding of HTTP routing and Python programming.",
  },
  {
    skill: "Spring Boot",
    prerequisites: ["Java", "OOP", "REST API"],
    rationale: "Enterprise Java framework utilizing inversion of control and dependency injection to expose APIs.",
  },

  // --- Databases Track ---
  {
    skill: "SQL",
    prerequisites: ["DBMS"],
    rationale: "Declarative query language for interacting with relational database management systems.",
  },
  {
    skill: "PostgreSQL",
    prerequisites: ["SQL"],
    rationale: "Advanced open-source object-relational database system implementing the ANSI SQL standard.",
  },
  {
    skill: "MySQL",
    prerequisites: ["SQL"],
    rationale: "Popular relational database management system using standard SQL dialect.",
  },
  {
    skill: "MongoDB",
    prerequisites: ["DBMS"],
    rationale: "Document-oriented NoSQL database requiring understanding of database indexing and data modeling.",
  },
  {
    skill: "Redis",
    prerequisites: ["DBMS"],
    rationale: "In-memory key-value data store used for high-speed caching and pub/sub messaging.",
  },

  // --- DevOps & Cloud Track ---
  {
    skill: "Linux",
    prerequisites: ["Operating Systems"],
    rationale: "Primary operating system environment for server deployments, shell scripting, and container runtimes.",
  },
  {
    skill: "Git",
    prerequisites: [],
    rationale: "Distributed version control system for tracking source code changes and branch workflows.",
  },
  {
    skill: "GitHub",
    prerequisites: ["Git"],
    rationale: "Cloud-hosted repository platform with pull request reviews, collaboration, and Actions workflows.",
  },
  {
    skill: "GitLab",
    prerequisites: ["Git"],
    rationale: "DevOps platform combining git repository management with native CI/CD pipelines.",
  },
  {
    skill: "Cloud Computing",
    prerequisites: ["Computer Networks", "Operating Systems"],
    rationale: "On-demand availability of computing resources, virtualization, object storage, and managed networks.",
  },
  {
    skill: "Docker",
    prerequisites: ["Linux"],
    rationale: "Containerization platform utilizing Linux namespaces, cgroups, and layered image filesystems.",
  },
  {
    skill: "CI/CD",
    prerequisites: ["Git", "Docker"],
    rationale: "Automated continuous integration and deployment pipelines triggered by version control events.",
  },
  {
    skill: "AWS",
    prerequisites: ["Cloud Computing", "Linux"],
    rationale: "Leading cloud infrastructure provider requiring understanding of cloud security, VPCs, and IAM.",
  },
  {
    skill: "Microsoft Azure",
    prerequisites: ["Cloud Computing"],
    rationale: "Enterprise cloud computing service providing VMs, App Services, and identity integration.",
  },
  {
    skill: "Google Cloud",
    prerequisites: ["Cloud Computing"],
    rationale: "Google cloud infrastructure specialized in containerized workloads, BigQuery, and AI services.",
  },
  {
    skill: "Kubernetes",
    prerequisites: ["Docker", "Cloud Computing"],
    rationale: "Production-grade container orchestration system for automating deployment, scaling, and operations.",
  },
  {
    skill: "Jenkins",
    prerequisites: ["CI/CD", "Linux"],
    rationale: "Open-source automation server for building custom declarative and scripted CI/CD pipelines.",
  },
  {
    skill: "Terraform",
    prerequisites: ["Cloud Computing", "Docker"],
    rationale: "Infrastructure as Code tool for declaratively provisioning and managing multi-cloud resources.",
  },

  // --- Data Science & AI/ML Track ---
  {
    skill: "Data Analysis",
    prerequisites: ["Python", "SQL"],
    rationale: "Extracting insights from structured datasets using programmatic transformation and querying.",
  },
  {
    skill: "NumPy",
    prerequisites: ["Python"],
    rationale: "Core library for multidimensional array operations and vectorized mathematical computations.",
  },
  {
    skill: "Pandas",
    prerequisites: ["NumPy", "Data Analysis"],
    rationale: "High-performance data manipulation library built directly on NumPy ndarrays.",
  },
  {
    skill: "Machine Learning",
    prerequisites: ["Python", "Data Analysis"],
    rationale: "Algorithms that learn patterns from training data, requiring solid data preparation skills.",
  },
  {
    skill: "Scikit-learn",
    prerequisites: ["Python", "NumPy", "Pandas", "Machine Learning"],
    rationale: "Standard Python machine learning library implementing classification, regression, and clustering.",
  },
  {
    skill: "TensorFlow",
    prerequisites: ["Python", "Machine Learning"],
    rationale: "End-to-end platform and tensor computation graph framework for training deep neural networks.",
  },
  {
    skill: "PyTorch",
    prerequisites: ["Python", "Machine Learning"],
    rationale: "Dynamic computational graph deep learning framework widely used in research and modern AI.",
  },
  {
    skill: "Natural Language Processing",
    prerequisites: ["Machine Learning", "Python"],
    rationale: "Field of AI enabling computers to process, tokenize, embed, and comprehend human languages.",
  },
  {
    skill: "Generative AI",
    prerequisites: ["Machine Learning", "Natural Language Processing"],
    rationale: "Advanced AI models (LLMs, diffusion) generating novel content from natural language prompts.",
  },

  // --- Mobile, Testing & Security ---
  {
    skill: "Android",
    prerequisites: ["Java", "OOP"],
    rationale: "Mobile OS platform development utilizing Java/Kotlin SDKs and activity lifecycle architecture.",
  },
  {
    skill: "iOS",
    prerequisites: ["Swift", "OOP"],
    rationale: "Apple mobile operating system platform development utilizing Swift and UIKit/SwiftUI.",
  },
  {
    skill: "React Native",
    prerequisites: ["React", "JavaScript"],
    rationale: "Cross-platform mobile framework allowing React developers to write native iOS and Android apps.",
  },
  {
    skill: "Jest",
    prerequisites: ["JavaScript"],
    rationale: "JavaScript testing framework designed to ensure correctness of codebases with zero-config runners.",
  },
  {
    skill: "Cypress",
    prerequisites: ["JavaScript", "HTML"],
    rationale: "Modern end-to-end testing tool operating directly inside real browser DOM runtimes.",
  },
  {
    skill: "Selenium",
    prerequisites: ["Python", "HTML"],
    rationale: "Browser automation suite enabling programmatic interaction across multiple browser drivers.",
  },
  {
    skill: "OAuth",
    prerequisites: ["HTTP", "REST API"],
    rationale: "Industry-standard open authorization protocol for secure delegated third-party access.",
  },
  {
    skill: "Cybersecurity",
    prerequisites: ["Computer Networks", "Operating Systems"],
    rationale: "Practice of protecting systems, networks, and programs from digital attacks and vulnerabilities.",
  },
  {
    skill: "Jira",
    prerequisites: [],
    rationale: "Issue and project tracking software for agile software development teams.",
  },
  {
    skill: "Figma",
    prerequisites: ["UI/UX Design"],
    rationale: "Collaborative web-based interface design and interactive vector prototyping tool.",
  },
  {
    skill: "Windows",
    prerequisites: ["Operating Systems"],
    rationale: "Enterprise operating system platform with PowerShell and Windows subsystem workflows.",
  },
  {
    skill: "TCP/IP",
    prerequisites: ["Computer Networks"],
    rationale: "Suite of communication protocols used to interconnect network devices on the internet.",
  },
];

// Pre-build index of canonical names and aliases
const CANONICAL_MAP = new Map<string, string>();
for (const item of SKILL_TAXONOMY) {
  CANONICAL_MAP.set(item.name.toLowerCase(), item.name);
  for (const alias of item.aliases) {
    CANONICAL_MAP.set(alias.toLowerCase(), item.name);
  }
}

/**
 * Normalizes any skill name or alias to its canonical form from SKILL_TAXONOMY.
 * Returns the canonical name if recognized, or the original trimmed string if not recognized.
 */
export const canonicalizeSkillName = (name: string): string => {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  const canonical = CANONICAL_MAP.get(trimmed.toLowerCase());
  return canonical || trimmed;
};

/**
 * Lookup table from canonical skill name to its prerequisite definition.
 */
export const PREREQUISITE_MAP = new Map<string, SkillPrerequisiteDefinition>(
  SKILL_PREREQUISITES.map((def) => [def.skill, def])
);
