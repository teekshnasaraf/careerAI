import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeProject,
  analyzeProjects,
  extractProjectSkills,
  scoreTechnicalDepth,
  scoreDescriptionRichness,
  detectProjectDomains,
  getProjectStrengthScores,
} from "./projectAnalysis.service";
import { calculateDeterministicResumeScore } from "./resumeScoring.service";

test("extractProjectSkills: extracts skills defined in taxonomy", () => {
  const text = "Built a responsive web dashboard using React, TypeScript, and Node.js with MongoDB database.";
  const skills = extractProjectSkills(text);
  assert.ok(skills.includes("React"));
  assert.ok(skills.includes("TypeScript"));
  assert.ok(skills.includes("Node.js"));
  assert.ok(skills.includes("MongoDB"));
});

test("extractProjectSkills: does not match ambiguous prose words as skills (e.g. C or Go without skill context)", () => {
  const text = "We go to market to see how clients manage their daily routine.";
  const skills = extractProjectSkills(text);
  assert.strictEqual(skills.includes("Go"), false);
  assert.strictEqual(skills.includes("C"), false);
});

test("scoreTechnicalDepth: follows diminishing returns and caps at 25", () => {
  // 1st: 10, 2nd: 7, 3rd: 5, 4th: 3, 5th+: 0
  assert.strictEqual(scoreTechnicalDepth(0), 0);
  assert.strictEqual(scoreTechnicalDepth(1), 10);
  assert.strictEqual(scoreTechnicalDepth(2), 17);
  assert.strictEqual(scoreTechnicalDepth(3), 22);
  assert.strictEqual(scoreTechnicalDepth(4), 25);
  assert.strictEqual(scoreTechnicalDepth(10), 25); // cap at 25
});

test("scoreDescriptionRichness: rewards length brackets up to ceiling of 15", () => {
  assert.strictEqual(scoreDescriptionRichness("Short"), 0);
  assert.strictEqual(scoreDescriptionRichness("Built a real-time chat application for remote teams."), 5);
  assert.strictEqual(
    scoreDescriptionRichness(
      "Architected and deployed a distributed microservices pipeline handling thousands of messages per minute across multi-region clusters."
    ),
    10
  );
  assert.strictEqual(
    scoreDescriptionRichness(
      "Architected and deployed a distributed microservices pipeline handling thousands of messages per minute across multi-region clusters. Implemented fault-tolerance and automated alerting using Prometheus and Grafana dashboards for 99.9% uptime."
    ),
    15
  );
});

test("analyzeProject: calculates implementation evidence based on distinct verbs", () => {
  // 1 verb -> 10, 2 verbs -> 18, 3+ verbs -> 25
  const projectOneVerb = analyzeProject({
    title: "Project Alpha",
    description: "Built an internal tool for the engineering group.",
  });
  assert.strictEqual(projectOneVerb.strength.implementationEvidence, 10);

  const projectTwoVerbs = analyzeProject({
    title: "Project Beta",
    description: "Designed and implemented a data ingestion workflow.",
  });
  assert.strictEqual(projectTwoVerbs.strength.implementationEvidence, 18);

  const projectThreeVerbs = analyzeProject({
    title: "Project Gamma",
    description: "Designed, engineered, and deployed a scalable caching layer.",
  });
  assert.strictEqual(projectThreeVerbs.strength.implementationEvidence, 25);
});

test("analyzeProject: detects measurable outcomes", () => {
  const projectWithPercent = analyzeProject({
    title: "Optimization Task",
    description: "Optimized database query performance by 45% using indexed views.",
  });
  assert.strictEqual(projectWithPercent.strength.measurableOutcomes, 20);

  const projectWithUsers = analyzeProject({
    title: "Consumer App",
    description: "Scaled system to support 5000 users concurrently.",
  });
  assert.strictEqual(projectWithUsers.strength.measurableOutcomes, 20);

  const projectWithLatency = analyzeProject({
    title: "API Gateway",
    description: "Reduced API response times by 120ms.",
  });
  assert.strictEqual(projectWithLatency.strength.measurableOutcomes, 20);

  const projectWithGenericNumber = analyzeProject({
    title: "Inventory Tool",
    description: "Tracked 42 distinct items in stock.",
  });
  assert.strictEqual(projectWithGenericNumber.strength.measurableOutcomes, 10);

  const projectWithNoMetrics = analyzeProject({
    title: "Static Page",
    description: "Created landing page layout.",
  });
  assert.strictEqual(projectWithNoMetrics.strength.measurableOutcomes, 0);
});

test("analyzeProject: rewards links appropriately (live demo > repo > other)", () => {
  const demoProject = analyzeProject({
    title: "Demo",
    description: "App description",
    links: ["https://myapp.vercel.app"],
  });
  assert.strictEqual(demoProject.strength.deploymentEvidence, 15);

  const repoProject = analyzeProject({
    title: "Repo",
    description: "App description",
    links: ["https://github.com/user/project"],
  });
  assert.strictEqual(repoProject.strength.deploymentEvidence, 10);

  const genericLinkProject = analyzeProject({
    title: "Link",
    description: "App description",
    links: ["http://example.com/docs"],
  });
  assert.strictEqual(genericLinkProject.strength.deploymentEvidence, 5);

  const noLinkProject = analyzeProject({
    title: "No Link",
    description: "App description",
  });
  assert.strictEqual(noLinkProject.strength.deploymentEvidence, 0);
});

test("detectProjectDomains: correctly identifies domains above threshold", () => {
  const domains = detectProjectDomains(
    ["React", "Node.js", "REST API"],
    "Built a fullstack web dashboard with responsive frontend and REST API."
  );
  assert.ok(domains.some((d) => d.name === "Web Development"));
});

test("analyzeProjects: sorts projects by strength descending", () => {
  const weak = {
    title: "Weak Project",
    description: "Did some work on website.",
  };
  const strong = {
    title: "Strong Project",
    description:
      "Architected, built, and deployed a real-time analytics engine in React, Node.js, and Redis, improving throughput by 35% for 10000 users.",
    links: ["https://github.com/user/analytics", "https://analytics-demo.com"],
  };

  const results = analyzeProjects([weak, strong]);
  assert.strictEqual(results[0].title, "Strong Project");
  assert.strictEqual(results[1].title, "Weak Project");
  assert.ok(results[0].strength.overall > results[1].strength.overall);
});

test("portfolio diminishing returns: a portfolio with fewer strong projects beats many weak ones", () => {
  // Strong portfolio: 2 high-quality projects (strength 90 each)
  const strongScores = [90, 90];
  // Weak portfolio: 6 weak projects (strength 20 each)
  const weakScores = [20, 20, 20, 20, 20, 20];

  const strongScoreResult = calculateDeterministicResumeScore({
    cleanedText: "Sample text with summary and education.",
    sections: {
      summary: "Experienced software engineer with strong technical foundations.",
      education: "Bachelor of Science in Computer Science, University 2024.",
    },
    extractedSkills: [],
    projectStrengths: strongScores,
  });

  const weakScoreResult = calculateDeterministicResumeScore({
    cleanedText: "Sample text with summary and education.",
    sections: {
      summary: "Experienced software engineer with strong technical foundations.",
      education: "Bachelor of Science in Computer Science, University 2024.",
    },
    extractedSkills: [],
    projectStrengths: weakScores,
  });

  assert.ok(
    strongScoreResult.subscores.projectEvidence > weakScoreResult.subscores.projectEvidence,
    `Expected strong portfolio (${strongScoreResult.subscores.projectEvidence}) to beat weak portfolio (${weakScoreResult.subscores.projectEvidence})`
  );
  assert.ok(strongScoreResult.subscores.projectEvidence <= 15);
  assert.ok(weakScoreResult.subscores.projectEvidence <= 15);
});
