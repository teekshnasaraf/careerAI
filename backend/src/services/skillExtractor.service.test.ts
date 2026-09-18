import assert from "node:assert/strict";
import test from "node:test";
import { extractSkills } from "./skillExtractor.service";

test("normalizes aliases, tracks section evidence, and ranks deterministically", () => {
  const result = extractSkills({ cleanedText: "", sections: { skills: "React.js, ReactJS, NodeJS, TypeScript, Git, GitHub, SQL", projects: "Built a React frontend with TypeScript and Node.js REST APIs." } });
  const react = result.skills.find((skill) => skill.name === "React"); const node = result.skills.find((skill) => skill.name === "Node.js"); const git = result.skills.find((skill) => skill.name === "Git"); const github = result.skills.find((skill) => skill.name === "GitHub");
  assert.deepEqual(react?.sections, ["skills", "projects"]); assert.equal(react?.occurrences, 3); assert.deepEqual(react?.matchedTexts, ["React.js", "ReactJS", "React"]); assert.equal(node?.name, "Node.js"); assert.equal(git?.occurrences, 1); assert.equal(github?.occurrences, 1); assert.ok((react?.rank ?? 99) < (git?.rank ?? 0));
});
test("uses section content before fallback and supports case-insensitive multi-word matches", () => {
  const result = extractSkills({ cleanedText: "React appears outside detected sections.", sections: { experience: "Built RESTful APIs with MACHINE LEARNING." } });
  assert.equal(result.skills.some((skill) => skill.name === "React"), false); assert.equal(result.skills.find((skill) => skill.name === "REST API")?.occurrences, 1); assert.equal(result.skills.find((skill) => skill.name === "Machine Learning")?.category, "Machine Learning");
});
test("does not confuse related skills or match ambiguous language names in prose", () => {
  const result = extractSkills({ cleanedText: "I go to school and received a grade of C. JavaScript is different from Java." });
  assert.equal(result.skills.some((skill) => skill.name === "Go"), false); assert.equal(result.skills.some((skill) => skill.name === "C"), false); assert.equal(result.skills.some((skill) => skill.name === "Java"), true); assert.equal(result.skills.some((skill) => skill.name === "JavaScript"), true); assert.equal(result.skills.some((skill) => skill.name === "Git"), false); assert.equal(result.skills.some((skill) => skill.name === "PostgreSQL"), false);
});
test("allows C and Go when explicitly listed in Skills", () => {
  const result = extractSkills({ cleanedText: "", sections: { skills: "C, Go, SQL" } }); assert.deepEqual(result.skills.map((skill) => skill.name), ["C", "Go", "SQL"]); assert.equal(result.skills.find((skill) => skill.name === "SQL")?.weight, 5);
});
