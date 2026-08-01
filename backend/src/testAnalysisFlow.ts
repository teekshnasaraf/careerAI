import { generateResumeAnalysis } from "./services/ai.service";

async function testAnalysis() {
  console.log("Testing generateResumeAnalysis with candidate resume text...");
  const result = await generateResumeAnalysis(
    `John Doe
Email: john@example.com | Phone: 1234567890 | LinkedIn: linkedin.com/in/johndoe
SUMMARY:
Full stack developer with experience in C++, C, Java, Python, HTML, CSS, JavaScript, SQL.

SKILLS:
Languages: C++, C, Java, Python, JavaScript
Web: HTML, CSS, SQL

EDUCATION:
Bachelor of Technology in Computer Science, 2024

PROJECTS:
CareerAI Platform - Built an AI career companion using C++, Java, SQL.`,
    {
      summary: "Full stack developer with experience in C++, C, Java, Python",
      skills: ["C++", "C", "Java", "Python", "HTML", "CSS", "JavaScript", "SQL"],
      experience: [],
      education: [{ degree: "B.Tech Computer Science" }],
      projects: [{ title: "CareerAI Platform" }],
    }
  );

  console.log("SUCCESS! Single Source Analysis Result:\n", JSON.stringify(result, null, 2));
}

testAnalysis();
