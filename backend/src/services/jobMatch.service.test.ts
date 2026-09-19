import assert from "node:assert/strict";
import test from "node:test";
import { parseJobDescription } from "./jobDescription.service";
import { calculateJobMatch } from "./jobMatch.service";

const makeResumeSkill = (name: string, sections = ["skills"], occurrences = 2) => ({
  name,
  category: "Test",
  kind: "technical-skill" as const,
  weight: 5,
  occurrences,
  sections,
  matchedTexts: [name],
  rankingScore: 10,
  rank: 1,
});

// 1. Exact skill match
test("1. Exact skill match: matches exact canonical skill names and returns evidence", () => {
  const parsed = parseJobDescription("Requirements:\nReact\nDocker");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React", ["skills", "experience"]),
    makeResumeSkill("Docker", ["skills"]),
  ]);
  assert.equal(match.matchedRequired.length, 2);
  assert.deepEqual(
    match.matchedRequired.map((s) => s.name).sort(),
    ["Docker", "React"]
  );
  assert.equal(match.matchedRequired[0].matched, true);
  assert.ok(match.matchedRequired[0].resumeEvidence);
});

// 2. Alias match
test("2. Alias match: maps JD aliases (ReactJS, NodeJS) to canonical names (React, Node.js)", () => {
  const parsed = parseJobDescription("Must have: ReactJS and NodeJS");
  assert.deepEqual(
    parsed.requirements.map((r) => r.name).sort(),
    ["Node.js", "React"]
  );
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React"),
    makeResumeSkill("Node.js"),
  ]);
  assert.equal(match.matchedRequired.length, 2);
  assert.deepEqual(
    match.matchedRequired.map((r) => r.name).sort(),
    ["Node.js", "React"]
  );
});

// 3. Case-insensitive match
test("3. Case-insensitive match: matches skills regardless of text casing", () => {
  const parsed = parseJobDescription("Requirements:\nREACT, nodejs, TyPeScRiPt");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("react"),
    makeResumeSkill("Node.js"),
    makeResumeSkill("typescript"),
  ]);
  assert.equal(match.matchedRequired.length, 3);
  assert.equal(match.overallScore, 100);
});

// 4. Missing required skill
test("4. Missing required skill: correctly categorizes unfulfilled required skills", () => {
  const parsed = parseJobDescription("Requirements:\nReact\nJava\nSQL");
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("React")]);
  assert.deepEqual(
    match.matchedRequired.map((s) => s.name),
    ["React"]
  );
  assert.deepEqual(
    match.missingRequired.map((s) => s.name).sort(),
    ["Java", "SQL"]
  );
  assert.equal(match.missingRequired[0].matched, false);
  assert.equal(match.missingRequired[0].contribution, 0);
});

// 5. Missing preferred skill
test("5. Missing preferred skill: correctly categorizes unfulfilled preferred skills", () => {
  const parsed = parseJobDescription("Nice to have:\nDocker\nKubernetes");
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("Docker")]);
  assert.deepEqual(
    match.matchedPreferred.map((s) => s.name),
    ["Docker"]
  );
  assert.deepEqual(
    match.missingPreferred.map((s) => s.name),
    ["Kubernetes"]
  );
  assert.equal(match.missingPreferred[0].matched, false);
});

// 6. Required priority detection
test("6. Required priority detection: recognizes required keyword variants", () => {
  const jd = `
    Required: React
    Must have: Node.js
    Mandatory: SQL
    Essential: TypeScript
    Minimum qualifications: Python
  `;
  const parsed = parseJobDescription(jd);
  assert.equal(parsed.requirements.length, 5);
  for (const req of parsed.requirements) {
    assert.equal(req.priority, "required", `${req.name} should be marked required`);
  }
});

// 7. Preferred priority detection
test("7. Preferred priority detection: recognizes preferred keyword variants", () => {
  const jd = `
    Preferred: Docker
    Nice to have: Kubernetes
    Bonus: Redis
    Desired: GraphQL
    Plus: Jenkins
    Preferred qualifications: Terraform
  `;
  const parsed = parseJobDescription(jd);
  assert.equal(parsed.requirements.length, 6);
  for (const req of parsed.requirements) {
    assert.equal(req.priority, "preferred", `${req.name} should be marked preferred`);
  }
});

// 8. Unspecified priority
test("8. Unspecified priority: skills without explicit priority keywords are marked unspecified", () => {
  const jd = `
    Our engineers frequently work with MongoDB, Express, and Redis on daily tasks.
  `;
  const parsed = parseJobDescription(jd);
  assert.ok(parsed.requirements.length >= 3);
  for (const req of parsed.requirements) {
    assert.equal(req.priority, "unspecified", `${req.name} should be unspecified`);
  }
});

// 9. Duplicate JD skill mentions
test("9. Duplicate JD skill mentions: deduplicates multiple mentions into one requirement and tracks occurrences", () => {
  const jd = `
    Requirements:
    React experience is essential.
    We build apps using React.js and ReactJS.
  `;
  const parsed = parseJobDescription(jd);
  const reactReq = parsed.requirements.find((r) => r.name === "React");
  assert.ok(reactReq);
  assert.equal(parsed.requirements.length, 1);
  assert.equal(reactReq.occurrences, 3);
  assert.deepEqual(reactReq.matchedTexts.sort(), ["React", "React.js", "ReactJS"].sort());
  assert.equal(reactReq.priority, "required");

  // Ensure score does not multiply
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("React")]);
  assert.equal(match.overallScore, 100);
});

// 10. Additional resume skills
test("10. Additional resume skills: identifies extra resume skills without increasing match score", () => {
  const parsed = parseJobDescription("Requirements: React");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React"),
    makeResumeSkill("Python"),
    makeResumeSkill("PostgreSQL"),
    makeResumeSkill("AWS"),
  ]);
  assert.equal(match.overallScore, 100);
  assert.deepEqual(
    match.additionalResumeSkills.map((s) => s.name).sort(),
    ["AWS", "PostgreSQL", "Python"]
  );
});

// 11. Java vs JavaScript
test("11. Java vs JavaScript: maintains distinct boundaries between Java and JavaScript", () => {
  const parsed = parseJobDescription("Requirements: Java");
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("JavaScript")]);
  assert.equal(match.matchedRequired.length, 0);
  assert.deepEqual(
    match.missingRequired.map((s) => s.name),
    ["Java"]
  );
  assert.deepEqual(
    match.additionalResumeSkills.map((s) => s.name),
    ["JavaScript"]
  );
  assert.equal(match.overallScore, 0);
});

// 12. Git vs GitHub
test("12. Git vs GitHub: maintains distinct boundaries between Git and GitHub", () => {
  const parsed = parseJobDescription("Requirements: Git");
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("GitHub")]);
  assert.equal(match.matchedRequired.length, 0);
  assert.deepEqual(
    match.missingRequired.map((s) => s.name),
    ["Git"]
  );
  assert.deepEqual(
    match.additionalResumeSkills.map((s) => s.name),
    ["GitHub"]
  );
  assert.equal(match.overallScore, 0);
});

// 13. SQL vs PostgreSQL
test("13. SQL vs PostgreSQL: maintains distinct boundaries between generic SQL and PostgreSQL", () => {
  const parsed = parseJobDescription("Requirements: SQL");
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("PostgreSQL")]);
  assert.equal(match.matchedRequired.length, 0);
  assert.deepEqual(
    match.missingRequired.map((s) => s.name),
    ["SQL"]
  );
  assert.deepEqual(
    match.additionalResumeSkills.map((s) => s.name),
    ["PostgreSQL"]
  );
  assert.equal(match.overallScore, 0);
});

// 14. Multiple required skills
test("14. Multiple required skills: calculates partial match across multiple required skills", () => {
  const parsed = parseJobDescription("Requirements: React, Node.js, SQL, TypeScript");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React"),
    makeResumeSkill("Node.js"),
  ]);
  assert.equal(match.matchedRequired.length, 2);
  assert.equal(match.missingRequired.length, 2);
  assert.equal(match.overallScore, 50);
});

// 15. Multiple preferred skills
test("15. Multiple preferred skills: calculates partial match across multiple preferred skills", () => {
  const parsed = parseJobDescription("Nice to have: Docker, Kubernetes, Terraform");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("Docker"),
    makeResumeSkill("Kubernetes"),
  ]);
  assert.equal(match.matchedPreferred.length, 2);
  assert.equal(match.missingPreferred.length, 1);
  // 2 matched preferred (0.5 * 2 = 1.0) / 3 total preferred (0.5 * 3 = 1.5) = 66.67%
  assert.equal(match.overallScore, 66.67);
});

// 16. Correct weighted score
test("16. Correct weighted score: matches exact prompt example (71.43%)", () => {
  // Prompt specification:
  // Required: React (1.0), Node.js (1.0), SQL (1.0)
  // Preferred: AWS (0.5)
  // Resume matches: React, Node.js, AWS
  // Matched weight = 1.0 + 1.0 + 0.5 = 2.5
  // Total weight = 1.0 + 1.0 + 1.0 + 0.5 = 3.5
  // Score = 2.5 / 3.5 * 100 = 71.43
  const parsed = parseJobDescription("Required: React, Node.js, SQL\nPreferred: AWS");
  const match = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React"),
    makeResumeSkill("Node.js"),
    makeResumeSkill("AWS"),
  ]);
  assert.equal(match.overallScore, 71.43);
  assert.deepEqual(
    match.matchedRequired.map((s) => s.name).sort(),
    ["Node.js", "React"]
  );
  assert.deepEqual(
    match.missingRequired.map((s) => s.name),
    ["SQL"]
  );
  assert.deepEqual(
    match.matchedPreferred.map((s) => s.name),
    ["AWS"]
  );
});

// 17. Score remains 0–100
test("17. Score remains 0–100: bounds checks across various scenarios", () => {
  const parsed = parseJobDescription("Required: React, Python\nPreferred: Docker\nUnspecified: Redis");
  
  // 0% match
  const noneMatch = calculateJobMatch(parsed.requirements, []);
  assert.equal(noneMatch.overallScore, 0);

  // 100% match
  const allMatch = calculateJobMatch(parsed.requirements, [
    makeResumeSkill("React"),
    makeResumeSkill("Python"),
    makeResumeSkill("Docker"),
    makeResumeSkill("Redis"),
  ]);
  assert.equal(allMatch.overallScore, 100);

  // Partial match
  const partial = calculateJobMatch(parsed.requirements, [makeResumeSkill("React")]);
  assert.ok(partial.overallScore !== null && partial.overallScore >= 0 && partial.overallScore <= 100);
});

// 18. Empty JD
test("18. Empty JD: returns null score and explanatory message instead of 0%", () => {
  const parsed = parseJobDescription("");
  assert.equal(parsed.totalDetectedRequirements, 0);
  assert.deepEqual(parsed.requirements, []);

  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("React")]);
  assert.equal(match.overallScore, null);
  assert.equal(match.scoreExplanation, "No recognized skills were found in the job description.");
  assert.equal(match.additionalResumeSkills.length, 1);
});

// 19. JD with no recognized skills
test("19. JD with no recognized skills: returns null score and explanatory message", () => {
  const parsed = parseJobDescription("Seeking a motivated self-starter with excellent communication skills and great teamwork.");
  assert.equal(parsed.totalDetectedRequirements, 0);

  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("React")]);
  assert.equal(match.overallScore, null);
  assert.equal(match.scoreExplanation, "No recognized skills were found in the job description.");
});

// 20. Resume with no extracted skills
test("20. Resume with no extracted skills: returns 0% when JD has skills, and lists all as missing", () => {
  const parsed = parseJobDescription("Required: React, TypeScript");
  const match = calculateJobMatch(parsed.requirements, []);
  assert.equal(match.overallScore, 0);
  assert.deepEqual(
    match.missingRequired.map((s) => s.name).sort(),
    ["React", "TypeScript"]
  );
  assert.equal(match.matchedRequired.length, 0);
});

// 21. Deterministic repeatability
test("21. Deterministic repeatability: multiple executions with identical inputs produce identical outputs", () => {
  const parsed = parseJobDescription("Required: React, TypeScript\nPreferred: Docker\nMongoDB");
  const skills = [makeResumeSkill("React"), makeResumeSkill("MongoDB")];

  const first = calculateJobMatch(parsed.requirements, skills);
  const second = calculateJobMatch(parsed.requirements, skills);

  assert.deepEqual(first, second);
  assert.equal(typeof first.overallScore, "number");
});

// 22. New taxonomy entries — domain keywords recognized in JD
test("22. Domain keyword taxonomy: DSA, UI/UX, and OOP are recognized from the central taxonomy", () => {
  const parsed = parseJobDescription("Required: DSA, OOP\nPreferred: UI/UX");
  const dsaReq = parsed.requirements.find((r) => r.name === "Data Structures and Algorithms");
  const oopReq = parsed.requirements.find((r) => r.name === "OOP");
  const uiuxReq = parsed.requirements.find((r) => r.name === "UI/UX Design");
  assert.ok(dsaReq, "DSA alias should resolve to 'Data Structures and Algorithms'");
  assert.equal(dsaReq?.priority, "required");
  assert.ok(oopReq, "OOP should be recognized");
  assert.equal(oopReq?.priority, "required");
  assert.ok(uiuxReq, "UI/UX alias should resolve to 'UI/UX Design'");
  assert.equal(uiuxReq?.priority, "preferred");
});

// 23. Inline priority classification with new taxonomy entries
test("23. Inline priority with DSA, Python, UI/UX: all three recognized and classified required", () => {
  const parsed = parseJobDescription("Software Engineer required: DSA, python, UI/UX");
  const names = parsed.requirements.map((r) => r.name);
  // All three should be found
  assert.ok(names.includes("Python"), "Python must be recognized");
  assert.ok(names.includes("Data Structures and Algorithms"), "DSA must map to canonical name");
  assert.ok(names.includes("UI/UX Design"), "UI/UX must map to canonical name");
  // All should carry the inline required priority
  for (const req of parsed.requirements) {
    assert.equal(req.priority, "required", `${req.name} should be required via inline marker`);
  }
});

// 24. Partial score when only subset of required inline skills are in resume
test("24. Inline partial score: having 1 of 3 required skills yields ~33% not 100%", () => {
  const parsed = parseJobDescription("required: DSA, Python, UI/UX");
  // Resume only contains Python
  const match = calculateJobMatch(parsed.requirements, [makeResumeSkill("Python")]);
  assert.ok(match.overallScore !== null);
  // 1 matched of 3 required → ~33.33%
  assert.ok((match.overallScore ?? 0) < 50, `Score ${match.overallScore} should be less than 50 when 1 of 3 required skills matched`);
  assert.equal(match.matchedRequired.length, 1);
  assert.equal(match.missingRequired.length, 2);
});

// 25. DBMS and Computer Networks aliases
test("25. DBMS and Computer Networks: recognized from central taxonomy via aliases", () => {
  const parsed = parseJobDescription("Required: DBMS, Computer Networks");
  const dbmsReq = parsed.requirements.find((r) => r.name === "DBMS");
  const netReq = parsed.requirements.find((r) => r.name === "Computer Networks");
  assert.ok(dbmsReq, "DBMS should be recognized");
  assert.equal(dbmsReq?.priority, "required");
  assert.ok(netReq, "Computer Networks should be recognized");
  assert.equal(netReq?.priority, "required");
});

// 26. OOP aliases (OOPS, Object-Oriented Programming)
test("26. OOP alias variants: OOPS and Object-Oriented Programming both map to canonical OOP", () => {
  const parsed1 = parseJobDescription("Required: OOPS");
  const parsed2 = parseJobDescription("Required: Object-Oriented Programming");
  const oops = parsed1.requirements.find((r) => r.name === "OOP");
  const oop2 = parsed2.requirements.find((r) => r.name === "OOP");
  assert.ok(oops, "OOPS alias must resolve to OOP");
  assert.ok(oop2, "Object-Oriented Programming alias must resolve to OOP");
});

