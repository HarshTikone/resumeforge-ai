// src/lib/aiClient.js
// Gemini client: summary + full cover letter + optimized bullets for experience & projects

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";

export async function generateSummaryAndCoverLetter({
  profile,
  experiences,
  projects,
  jobTitle,
  companyName,
  jobDescription,
}) {
  if (!GEMINI_API_KEY) {
    console.error("❌ VITE_GEMINI_API_KEY is missing.");
    throw new Error(
      "Gemini API key missing. Set VITE_GEMINI_API_KEY in .env.local and restart dev server."
    );
  }

  // --------- Build header for RESUME & COVER LETTER ----------
  // Resume/Cover letter header we want:
  // Harsh Mahesh Tikone
  // Buffalo, NY | 7164161170 | LinkedIn | GitHub | Portfolio

  const name = profile?.full_name || "Harsh Mahesh Tikone";

  const locationLine =
    [profile?.city || "Buffalo", profile?.state || "NY"]
      .filter(Boolean)
      .join(", ") || "Buffalo, NY";

  const phone = profile?.phone || "7164161170";
  const linkedin = profile?.linkedin_url || "https://www.linkedin.com/in/harshtikone";
  const github = profile?.github_url || "https://github.com/HarshTikone";
  const portfolio =
    profile?.portfolio_url ||
    "https://harsh-website-gvzmwntih-harshtikones-projects.vercel.app/";

  const headerLineTop = name;
  const headerLineBottom = `${locationLine} | ${phone} | ${linkedin} | ${github} | ${portfolio}`;

  const resumeHeaderBlock = `${headerLineTop}\n${headerLineBottom}`;

  const tone = profile?.preferred_tone || "neutral";
  const writingSample = profile?.writing_sample || "";

  const jobContext = `
Job title: ${jobTitle || "Machine Learning Intern"}
Company: ${companyName || "Emonics LLC"}

Job description:
${jobDescription || "(not provided)"}
`.trim();

  const profileContext = `
Candidate:
Name: ${name}
Degree: ${profile?.degree || "MS in Engineering Science (Artificial Intelligence)"}
University: ${
    profile?.university ||
    "University at Buffalo, The State University of New York"
  }
Location: ${locationLine}
Base summary (if any): ${profile?.professional_summary || "(none yet)"}
`.trim();

  // Add indices so we can map optimized bullets back in order
  const expContext = (experiences || []).map((e, idx) => ({
    index: idx,
    job_title: e.job_title,
    company_name: e.company_name,
    location: e.location,
    start_date: e.start_date,
    end_date: e.is_current ? "Present" : e.end_date,
    original_bullets: e.description || [],
  }));

  const projectContext = (projects || []).map((p, idx) => ({
    index: idx,
    project_name: p.project_name,
    original_description: p.description || "",
    original_impact: p.impact || "",
    original_technologies: p.technologies || [],
  }));

  const prompt = `
You are an expert resume and cover letter writer.

Your goals:
- Write in a HUMAN, natural style that sounds like a real person.
- Avoid robotic, templated, or obviously AI-generated language.
- Use clear, grounded sentences and concrete impact.
- Keep everything truthful based on the info given.
- Do NOT mention that you are an AI or a model.

We are generating:
1) A resume SUMMARY section.
2) A full COVER LETTER.
3) Optimized bullet points for WORK EXPERIENCE and PROJECTS.

Everything should be ATS-friendly:
- No fancy symbols, columns, or tables.
- Just clean text, standard section headings, and bullet points.
- Use as many RELEVANT keywords from the job description as possible
  (machine learning, data analysis, ML pipelines, Python, PyTorch, Azure, etc.)
  but avoid obvious keyword stuffing.

---
TARGET JOB CONTEXT
${jobContext}

---
CANDIDATE PROFILE
${profileContext}

Preferred tone: ${tone}
Writing sample from candidate (their natural voice, if provided):
${writingSample || "(no sample provided)"}

---
RESUME HEADER BLOCK (USE THIS AT TOP OF RESUME / COVER LETTER)

${resumeHeaderBlock}

---
WORK EXPERIENCES (ORIGINAL)
${JSON.stringify(expContext, null, 2)}

---
PROJECTS (ORIGINAL)
${JSON.stringify(projectContext, null, 2)}

---
COVER LETTER FORMAT REQUIREMENTS (ONE PAGE MAX WHEN PRINTED)

Use this general structure:

${resumeHeaderBlock}

Date: <Month Day, Year>

Hiring Committee or Hiring Manager
${companyName || "Emonics LLC"}
<City, State if known or inferable>

Subject: Application for ${jobTitle || "Machine Learning Intern"} – <Season/Year or relevant tag>

Respected Hiring Committee,

[3–4 paragraphs of body text, personalized to the company and role, using the candidate's projects and internship as evidence. Length: about 300–400 words.]

Warm regards,
${name}
MS in Engineering Science (Artificial Intelligence)
University at Buffalo, The State University of New York

---
RESUME SUMMARY REQUIREMENTS

- 2–3 sentences, 50–90 words.
- Targeted to the job above.
- Mention key strengths: ML, Python, PyTorch, recommender systems, Azure, etc.
- Must feel human and specific, not generic.

---
BULLET OPTIMIZATION REQUIREMENTS

For each experience and project:
- Rewrite bullets/descriptions to:
  * Align strongly with the target job description.
  * Include relevant skills, tools, and metrics where possible.
  * Emphasize Machine Learning, model development, MLOps / pipelines,
    data analysis, and cloud (Azure) experience, where appropriate.
- Keep 3–5 bullets per experience and project.
- Keep it concise so that the full resume can fit on ONE page when exported.

Use the "index" field to keep order.

---
JSON OUTPUT SHAPE

Return STRICTLY valid JSON (no explanation text, no code fences) in this shape:

{
  "summary": "2-3 sentence resume summary (50-90 words).",
  "cover_letter": "Full cover letter text in the format above (around 300–400 words).",
  "optimized_experiences": [
    {
      "index": <number, same as in WORK EXPERIENCES>,
      "bullets": ["...", "...", "..."]
    }
  ],
  "optimized_projects": [
    {
      "index": <number, same as in PROJECTS>,
      "bullets": ["...", "...", "..."]
    }
  ]
}
`.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  console.log("🔹 Calling Gemini model:", GEMINI_MODEL);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ Gemini API error:", res.status, text);
    throw new Error(
      `Gemini API error (${res.status}). Check console/network tab for details.`
    );
  }

  const data = await res.json();
  console.log("✅ Gemini raw response:", data);

  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  raw = raw.trim();
  console.log("🔹 Gemini raw text:", raw);

  // Strip ```json fences if any
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-zA-Z]*\s*/, "");
    raw = raw.replace(/```[\s]*$/, "");
    raw = raw.trim();
  }

  // Grab first {...} block
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    raw = raw.slice(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse Gemini JSON:", err, raw);
    throw new Error(
      "Gemini responded, but the JSON was malformed. Check 'Gemini raw text' in the console to debug."
    );
  }

  return {
    summary: parsed.summary || "",
    coverLetter: parsed.cover_letter || "",
    optimizedExperiences: parsed.optimized_experiences || [],
    optimizedProjects: parsed.optimized_projects || [],
  };
}
