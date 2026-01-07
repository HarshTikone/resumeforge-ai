// src/pages/NewResumePage.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";
import { generateSummaryAndCoverLetter } from "../lib/aiClient";

// ⬇️ updated import
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import jsPDF from "jspdf";


console.log(
  "Gemini key loaded?",
  import.meta.env.VITE_GEMINI_API_KEY ? "YES" : "NO"
);

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "this",
  "that",
  "will",
  "are",
  "as",
  "to",
  "in",
  "of",
  "a",
  "an",
  "on",
  "or",
  "we",
  "they",
  "be",
  "is",
  "at",
  "by",
  "from",
]);

function extractKeywords(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+.# ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

function scoreItem(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += 1;
  }
  return score;
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// -----------------------------
// Resume text builder
// -----------------------------
function buildResumeLines(
  profile,
  experiences,
  projects,
  jobTitle,
  company,
  aiSummary,
  skills,
  education,
  certifications
) {
  if (!profile) return [];

  const lines = [];

  // ---------- HEADER ----------
  lines.push(profile.full_name || "");
  const contactParts = [];
  if (profile.city || profile.state) {
    contactParts.push(
      `${profile.city || ""}${profile.state ? ", " + profile.state : ""}`
    );
  }
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.linkedin_url) contactParts.push(profile.linkedin_url);
  if (profile.github_url) contactParts.push(profile.github_url);
  if (profile.portfolio_url) contactParts.push(profile.portfolio_url);
  lines.push(contactParts.join(" | "));
  lines.push("");

  // ❌ No explicit "Target Role" line – targeting happens via content

  // ---------- SUMMARY ----------
  const summaryToUse = aiSummary || profile.professional_summary || "";
  if (summaryToUse) {
    lines.push("SUMMARY");
    lines.push(summaryToUse);
    lines.push("");
  }

  // ---------- SKILLS ----------
  if (skills && skills.length > 0) {
    lines.push("SKILLS");

    // Group skills by category
    const byCategory = {};
    skills.forEach((s) => {
      const cat = s.category || "Skills";
      if (!byCategory[cat]) byCategory[cat] = [];
      if (s.skill_name) {
        byCategory[cat].push(s.skill_name);
      }
    });

    Object.entries(byCategory).forEach(([cat, list]) => {
      const unique = Array.from(new Set(list));
      if (unique.length) {
        lines.push(`${cat}: ${unique.join(", ")}`);
      }
    });

    lines.push("");
  }

  // ---------- EDUCATION ----------
  if (education && education.length > 0) {
    lines.push("EDUCATION");
    education.forEach((e) => {
      const degreeLine = [e.degree, e.major].filter(Boolean).join(", ");
      const uniLine = [e.university, e.location].filter(Boolean).join(" – ");

      if (degreeLine) {
        lines.push(degreeLine);
      } else if (e.university) {
        lines.push(e.university);
      }

      if (uniLine) lines.push(uniLine);

      const extraBits = [];
      if (e.graduation_date) {
        extraBits.push("Graduation: " + formatDateShort(e.graduation_date));
      }
      if (e.gpa) {
        extraBits.push("GPA: " + e.gpa);
      }
      if (extraBits.length) {
        lines.push(extraBits.join(" | "));
      }

      if (e.relevant_coursework?.length) {
        lines.push(
          "Relevant coursework: " + e.relevant_coursework.join(", ")
        );
      }

      lines.push("");
    });
  }

  // ---------- EXPERIENCE ----------
  if (experiences.length > 0) {
    lines.push("EXPERIENCE");
    experiences.forEach((exp) => {
      lines.push(
        `${exp.job_title} · ${exp.company_name} (${exp.location || "Location"})`
      );
      lines.push(
        `${formatDateShort(exp.start_date) || "Start"} – ${
          exp.is_current ? "Present" : formatDateShort(exp.end_date) || "End"
        }`
      );
      (exp.description || []).forEach((b) => {
        lines.push(`- ${b}`);
      });
      lines.push("");
    });
  }

  // ---------- PROJECTS ----------
  if (projects.length > 0) {
    lines.push("PROJECTS");
    projects.forEach((p) => {
      lines.push(p.project_name);
      if (p.description) lines.push(`- ${p.description}`);
      if (p.impact) lines.push(`- Impact: ${p.impact}`);
      if (p.technologies?.length) {
        lines.push(`- Tech: ${p.technologies.join(", ")}`);
      }
      lines.push("");
    });
  }

  // ---------- CERTIFICATIONS & ACHIEVEMENTS ----------
  if (certifications && certifications.length > 0) {
    lines.push("CERTIFICATIONS & ACHIEVEMENTS");
    certifications.forEach((c) => {
      const title = c.certification_name;
      const orgLine = [
        c.issuing_organization,
        c.issue_date ? formatDateShort(c.issue_date) : "",
      ]
        .filter(Boolean)
        .join(" | ");

      if (title) lines.push(`- ${title}`);
      if (orgLine) lines.push(`  ${orgLine}`);
    });
    lines.push("");
  }

  return lines;
}
// Build a styled Word doc from plain resume lines
function buildStyledResumeDoc(resumeLines) {
  const children = [];

  const SECTION_HEADERS = new Set([
    "SUMMARY",
    "SKILLS",
    "EDUCATION",
    "EXPERIENCE",
    "PROJECTS",
    "CERTIFICATIONS & ACHIEVEMENTS",
  ]);

  resumeLines.forEach((rawLine, idx) => {
    const line = rawLine || "";
    const trimmed = line.trim();

    // Name (first line)
    if (idx === 0 && trimmed) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 32, // 16pt
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
      return;
    }

    // Contact line (second line)
    if (idx === 1 && trimmed) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              size: 22, // ~11pt
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        })
      );
      return;
    }

    // Empty line → small vertical gap
    if (!trimmed) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 80 },
        })
      );
      return;
    }

    // Section headers in ALL CAPS
    if (SECTION_HEADERS.has(trimmed)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24, // 12pt
            }),
          ],
          spacing: { before: 200, after: 80 },
        })
      );
      return;
    }

    // Bullet points (lines starting with "- ")
    if (trimmed.startsWith("- ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.slice(2),
              size: 22,
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      );
      return;
    }

    // Default body line
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 22,
          }),
        ],
        spacing: { after: 40 },
      })
    );
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // ~1"
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });
}

const MAX_RESUME_LINES = 70; // tunable: how much we allow before we start trimming

function fitExperiencesAndProjectsForPage(
  profile,
  experiences,
  projects,
  jobTitle,
  companyName,
  aiSummary,
  skills,
  education,
  certifications
) {
  // Work on copies so we don't mutate React state directly
  let fittedExperiences = experiences.map((e) => ({
    ...e,
    description: Array.isArray(e.description) ? [...e.description] : [],
  }));

  let fittedProjects = projects.map((p) => ({ ...p }));

  function currentLineCount() {
    return buildResumeLines(
      profile,
      fittedExperiences,
      fittedProjects,
      jobTitle,
      companyName,
      aiSummary,
      skills,
      education,
      certifications
    ).length;
  }

  let lines = currentLineCount();
  if (lines <= MAX_RESUME_LINES) {
    // Already fits nicely, no trimming needed
    return { fittedExperiences, fittedProjects };
  }

  let safety = 0;
  while (lines > MAX_RESUME_LINES && safety < 200) {
    safety++;

    let changed = false;

    // 1) First priority: trim bullets on the experience
    // that currently has the most bullets (but keep at least 1)
    let expIdxWithMostBullets = -1;
    let maxBullets = 0;

    fittedExperiences.forEach((e, idx) => {
      const n = e.description ? e.description.length : 0;
      if (n > maxBullets && n > 1) {
        maxBullets = n;
        expIdxWithMostBullets = idx;
      }
    });

    if (expIdxWithMostBullets >= 0) {
      const exp = fittedExperiences[expIdxWithMostBullets];
      fittedExperiences[expIdxWithMostBullets] = {
        ...exp,
        description: exp.description.slice(0, exp.description.length - 1),
      };
      changed = true;
    } else {
      // 2) No more bullets to trim → try shortening project descriptions
      let projIdxToShorten = -1;
      let longestLen = 0;

      fittedProjects.forEach((p, idx) => {
        const desc = p.description || "";
        if (desc.length > longestLen && desc.length > 120) {
          longestLen = desc.length;
          projIdxToShorten = idx;
        }
      });

      if (projIdxToShorten >= 0) {
        const proj = fittedProjects[projIdxToShorten];
        const desc = proj.description || "";

        // Very simple sentence split: by ". "
        const sentences = desc.split(". ");
        if (sentences.length > 1) {
          const shortened = sentences.slice(0, 1).join(". ") + ".";
          fittedProjects[projIdxToShorten] = {
            ...proj,
            description: shortened,
          };
          changed = true;
        }
      }
    }

    if (!changed) {
      // Nothing else we can trim without deleting whole sections
      break;
    }

    lines = currentLineCount();
  }

  return { fittedExperiences, fittedProjects };
}


// -----------------------------
// Page component
// -----------------------------
export default function NewResumePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [projects, setProjects] = useState([]);

  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState([]);
  const [certifications, setCertifications] = useState([]);

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [message, setMessage] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);

  // AI-related state
  const [aiSummary, setAiSummary] = useState("");
  const [aiCoverLetter, setAiCoverLetter] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadAll() {
      setMessage("");

      const [
        { data: userRow },
        { data: expRows },
        { data: projRows },
        { data: eduRows },
        { data: skillRows },
        { data: certRows },
      ] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase
          .from("work_experiences")
          .select("*")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false }),
        supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false }),
        supabase
          .from("education")
          .select("*")
          .eq("user_id", user.id)
          .order("graduation_date", { ascending: false }),
        supabase.from("skills").select("*").eq("user_id", user.id),
        supabase
          .from("certifications")
          .select("*")
          .eq("user_id", user.id)
          .order("issue_date", { ascending: false }),
      ]);

      setProfile(userRow || null);
      setExperiences(expRows || []);
      setProjects(projRows || []);
      setEducation(eduRows || []);
      setSkills(skillRows || []);
      setCertifications(certRows || []);
    }

    loadAll();
  }, [user]);

  function analyzeJD() {
    if (!jobDescription.trim()) {
      setKeywords([]);
      setMessage("Paste a job description first.");
      return;
    }
    const kws = extractKeywords(jobDescription);
    setKeywords(kws);
    setMessage(
      `Found ${kws.length} key terms. ResumeForge will auto-pick your best experiences and projects for this job.`
    );
  }

  // ---------- Ranking & auto-selection ----------
  const rankedExperiences = useMemo(() => {
    if (!keywords.length) return experiences;
    return [...experiences]
      .map((exp) => {
        const text = [
          exp.job_title,
          exp.company_name,
          exp.location,
          ...(exp.description || []),
          ...(exp.technologies || []),
        ]
          .filter(Boolean)
          .join(" ");
        return { ...exp, _score: scoreItem(text, keywords) };
      })
      .sort((a, b) => b._score - a._score);
  }, [experiences, keywords]);

  const rankedProjects = useMemo(() => {
    if (!keywords.length) return projects;
    return [...projects]
      .map((p) => {
        const text = [
          p.project_name,
          p.description,
          p.impact,
          ...(p.technologies || []),
        ]
          .filter(Boolean)
          .join(" ");
        return { ...p, _score: scoreItem(text, keywords) };
      })
      .sort((a, b) => b._score - a._score);
  }, [projects, keywords]);

  const rankedCertifications = useMemo(() => {
    if (!keywords.length) return certifications;
    return [...certifications]
      .map((c) => {
        const text = [
          c.certification_name,
          c.issuing_organization,
          c.credential_id,
        ]
          .filter(Boolean)
          .join(" ");
        return { ...c, _score: scoreItem(text, keywords) };
      })
      .sort((a, b) => b._score - a._score);
  }, [certifications, keywords]);

  // Auto-selected items (user does NOT choose)
  const selectedExperiences = useMemo(() => {
    const list = rankedExperiences;
    const n = Math.min(3, list.length); // top 3 experiences
    return list.slice(0, n);
  }, [rankedExperiences]);

  const selectedProjects = useMemo(() => {
    const list = rankedProjects;
    const n = Math.min(2, list.length); // top 2 projects
    return list.slice(0, n);
  }, [rankedProjects]);

  const selectedCertifications = useMemo(() => {
    const list = rankedCertifications;
    const n = Math.min(3, list.length); // top 3 certs/achievements
    return list.slice(0, n);
  }, [rankedCertifications]);

  const resumeLines = useMemo(() => {
    if (!profile) return [];
  
    // 🔹 Auto-fit experiences/projects so content stays around 1 page
    const { fittedExperiences, fittedProjects } =
      fitExperiencesAndProjectsForPage(
        profile,
        selectedExperiences,
        selectedProjects,
        jobTitle,
        companyName,
        aiSummary,
        skills,
        education,
        selectedCertifications
      );
  
    return buildResumeLines(
      profile,
      fittedExperiences,
      fittedProjects,
      jobTitle,
      companyName,
      aiSummary,
      skills,
      education,
      selectedCertifications
    );
  }, [
    profile,
    selectedExperiences,
    selectedProjects,
    jobTitle,
    companyName,
    aiSummary,
    skills,
    education,
    selectedCertifications,
  ]);
  

  async function copyPlainText() {
    const text = resumeLines.join("\n");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setMessage("Resume copied to clipboard as plain text.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to copy. You can still select text manually.");
    }
  }

  async function saveToHistory() {
    if (!user) return;
    if (!jobTitle && !companyName && !jobDescription.trim()) {
      setMessage("Add at least a job title or description before saving.");
      return;
    }

    setSavingHistory(true);
    setMessage("");

    const atsScore = keywords.length
      ? Math.min(100, keywords.length * 3)
      : null;

    const selectedExpIds = selectedExperiences.map((e) => e.id);
    const selectedProjectIds = selectedProjects.map((p) => p.id);

    try {
      const { error } = await supabase.from("generated_resumes").insert({
        user_id: user.id,
        job_title: jobTitle || null,
        company_name: companyName || null,
        job_description: jobDescription || null,
        selected_experiences: selectedExpIds,
        selected_projects: selectedProjectIds,
        selected_skills: [], // can extend later
        customized_summary: aiSummary || profile?.professional_summary || null,
        ats_score: atsScore,
        keyword_matches: keywords,
      });

      if (error) throw error;
      setMessage("Resume saved to history.");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to save resume to history.");
    } finally {
      setSavingHistory(false);
    }
  }

  // -----------------------------
  // AI: summary + cover letter + bullets
  // -----------------------------
  async function handleGenerateAi() {
    if (!profile) {
      setMessage("Fill your profile first before using AI.");
      return;
    }

    if (
      !jobDescription.trim() &&
      !jobTitle?.trim() &&
      !companyName?.trim()
    ) {
      setMessage("Provide at least a job title or job description for AI.");
      return;
    }

    setAiLoading(true);
    setMessage(
      "Asking AI to humanize your summary, optimize bullets, and write a tailored cover letter…"
    );

    try {
      const {
        summary,
        coverLetter,
        optimizedExperiences,
        optimizedProjects,
      } = await generateSummaryAndCoverLetter({
        profile,
        experiences: selectedExperiences,
        projects: selectedProjects,
        jobTitle,
        companyName,
        jobDescription,
      });

      console.log("✅ AI summary:", summary);
      console.log("✅ AI cover letter:", coverLetter);
      console.log("✅ AI optimized experiences:", optimizedExperiences);
      console.log("✅ AI optimized projects:", optimizedProjects);

      // 1) Update SUMMARY & COVER LETTER in UI state
      setAiSummary(summary || "");
      setAiCoverLetter(coverLetter || "");

      // 2) Apply optimized bullets to the main EXPERIENCES array
      if (optimizedExperiences?.length) {
        setExperiences((prev) =>
          prev.map((exp) => {
            // find the index of this experience in the *selected* list
            const selectedIdx = selectedExperiences.findIndex(
              (s) => s.id === exp.id
            );
            if (selectedIdx === -1) return exp; // not selected → unchanged

            const opt = optimizedExperiences.find(
              (item) => item.index === selectedIdx
            );
            if (!opt || !Array.isArray(opt.bullets) || !opt.bullets.length) {
              return exp;
            }

            return {
              ...exp,
              description: opt.bullets, // array of bullet strings
            };
          })
        );
      }

      // 3) Apply optimized bullets to the main PROJECTS array
      if (optimizedProjects?.length) {
        setProjects((prev) =>
          prev.map((proj) => {
            const selectedIdx = selectedProjects.findIndex(
              (s) => s.id === proj.id
            );
            if (selectedIdx === -1) return proj;

            const opt = optimizedProjects.find(
              (item) => item.index === selectedIdx
            );
            if (!opt || !Array.isArray(opt.bullets) || !opt.bullets.length) {
              return proj;
            }

            // If your DB schema only has a single description string:
            return {
              ...proj,
              description: opt.bullets.join(" "),
            };
          })
        );
      }

      setMessage(
        "AI summary, cover letter, and bullets optimized. Review and tweak anything before exporting."
      );
    } catch (err) {
      console.error("❌ AI error:", err);
      setMessage(
        err.message ||
          "AI request failed. Check console or your Gemini API configuration."
      );
    } finally {
      setAiLoading(false);
    }
  }

  // -----------------------------
  // Downloads: DOCX/PDF for resume & cover letter
  // -----------------------------
  async function downloadResumeDocx() {
    const textLines = resumeLines;
    if (!textLines.length) {
      setMessage("Nothing to download yet. Generate a resume first.");
      return;
    }
  
    const doc = buildStyledResumeDoc(textLines);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.docx";
    a.click();
    URL.revokeObjectURL(url);
  }
  

  function downloadResumePdf() {
    const textLines = resumeLines;
    if (!textLines.length) {
      setMessage("Nothing to download yet. Generate a resume first.");
      return;
    }
  
    // A4 portrait, points
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 50;
    let y = 60;
    const lineHeight = 14;
  
    const SECTION_HEADERS = new Set([
      "SUMMARY",
      "SKILLS",
      "EDUCATION",
      "EXPERIENCE",
      "PROJECTS",
      "CERTIFICATIONS & ACHIEVEMENTS",
    ]);
  
    textLines.forEach((rawLine, idx) => {
      const line = rawLine || "";
      const trimmed = line.trim();
  
      // New page if we reach bottom
      if (y > 780) {
        doc.addPage();
        y = 60;
      }
  
      // ---------- NAME (line 0) ----------
      if (idx === 0 && trimmed) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(trimmed, pageWidth / 2, y, { align: "center" });
        y += lineHeight * 2;
        return;
      }
  
      // ---------- CONTACT LINE (line 1) ----------
      if (idx === 1 && trimmed) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text(trimmed, pageWidth / 2, y, { align: "center" });
        y += lineHeight * 2;
        return;
      }
  
      // ---------- BLANK LINE ----------
      if (!trimmed) {
        y += lineHeight * 0.8;
        return;
      }
  
      // ---------- SECTION HEADER ----------
      if (SECTION_HEADERS.has(trimmed)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.text(trimmed, marginX, y);
        y += lineHeight * 1.2;
        return;
      }
  
      // ---------- BULLET POINT ----------
      if (trimmed.startsWith("- ")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const bulletText = "• " + trimmed.slice(2);
  
        const wrapped = doc.splitTextToSize(
          bulletText,
          pageWidth - marginX * 2 - 10
        );
  
        wrapped.forEach((wLine, i) => {
          if (y > 780) {
            doc.addPage();
            y = 60;
          }
          // indent bullets a bit
          doc.text(wLine, marginX + 10, y);
          y += lineHeight;
        });
  
        y += 2; // tiny gap after a bullet block
        return;
      }
  
      // ---------- NORMAL LINE (job titles, school, tech line, etc.) ----------
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
  
      const wrapped = doc.splitTextToSize(
        trimmed,
        pageWidth - marginX * 2
      );
  
      wrapped.forEach((wLine) => {
        if (y > 780) {
          doc.addPage();
          y = 60;
        }
        doc.text(wLine, marginX, y);
        y += lineHeight;
      });
  
      y += 2; // small spacing after each logical line
    });
  
    doc.save("resume.pdf");
  }
  
  

  async function downloadCoverLetterDocx() {
    if (!aiCoverLetter.trim()) {
      setMessage("Generate a cover letter first.");
      return;
    }
  
    const lines = aiCoverLetter.split(/\r?\n/);
  
    const paragraphs = lines.map((line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 22,
          }),
        ],
        spacing: { after: 120 },
      })
    );
  
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });
  
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover_letter.docx";
    a.click();
    URL.revokeObjectURL(url);
  }
  

  function downloadCoverLetterPdf() {
    if (!aiCoverLetter.trim()) {
      setMessage("Generate a cover letter first.");
      return;
    }
  
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 60;
    let y = 60;
    const lineHeight = 16;
  
    const lines = aiCoverLetter.split(/\r?\n/);
  
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  
    lines.forEach((raw) => {
      const line = raw || "";
      const trimmed = line.trim();
  
      // Paragraph break
      if (!trimmed) {
        y += lineHeight; // gap between paragraphs
        return;
      }
  
      const wrapped = doc.splitTextToSize(
        trimmed,
        pageWidth - marginX * 2
      );
  
      wrapped.forEach((wLine) => {
        if (y > 780) {
          doc.addPage();
          y = 60;
        }
        doc.text(wLine, marginX, y);
        y += lineHeight;
      });
  
      // small gap after each logical line block
      y += 2;
    });
  
    doc.save("cover_letter.pdf");
  }
  
  async function copyCoverLetter() {
    if (!aiCoverLetter) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(aiCoverLetter);
      } else {
        const temp = document.createElement("textarea");
        temp.value = aiCoverLetter;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setMessage("Cover letter copied to clipboard.");
    } catch (err) {
      console.error(err);
      setMessage(
        "Failed to copy cover letter. You can still select text manually."
      );
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: JD input and auto-ranking */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">New Tailored Resume</h1>
          <p className="text-sm text-slate-400 mt-1">
            Paste a job description, and ResumeForge will automatically pick the
            most relevant experiences, projects, and achievements from your
            profile — then AI will humanize the summary and write a cover letter
            in your voice.
          </p>
        </div>

        {message && (
          <div className="text-xs bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200">
            {message}
          </div>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">
                Target job title
              </label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Machine Learning Intern"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Company</label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Emonics LLC, Google, Netflix..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">
              Job description (paste full posting)
            </label>
            <textarea
              className="w-full min-h-[160px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here…"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={analyzeJD}
              className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2"
            >
              Analyze JD & auto-pick best matches
            </button>
            <button
              onClick={handleGenerateAi}
              disabled={aiLoading}
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium px-4 py-2 disabled:opacity-60"
            >
              {aiLoading ? "Generating with AI..." : "AI: Humanize & Optimize"}
            </button>
          </div>
        </div>

        {/* Keyword summary */}
        {keywords.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Extracted keywords
            </h2>
            <div className="flex flex-wrap gap-1 text-[11px]">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Auto-selected experiences */}
        {experiences.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Experiences auto-selected for this resume
            </h2>
            <p className="text-[11px] text-slate-500">
              Top matches are chosen based on keyword overlap with the job
              description.
            </p>
            <div className="space-y-1 max-h-64 overflow-auto pr-1">
              {selectedExperiences.map((exp) => (
                <div
                  key={exp.id}
                  className="w-full text-left rounded-md border px-3 py-2 text-xs mb-1 border-sky-500 bg-sky-500/10"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="font-medium">
                      {exp.job_title} ·{" "}
                      <span className="text-slate-300">
                        {exp.company_name}
                      </span>
                    </div>
                    {keywords.length > 0 && (
                      <div className="text-[10px] text-slate-500">
                        Match score: {exp._score ?? 0}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {(exp.description || [])[0] || "No bullets yet"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-selected projects */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Projects auto-selected for this resume
            </h2>
            <p className="text-[11px] text-slate-500">
              These are the top project matches for this specific role.
            </p>
            <div className="space-y-1 max-h-48 overflow-auto pr-1">
              {selectedProjects.map((p) => (
                <div
                  key={p.id}
                  className="w-full text-left rounded-md border px-3 py-2 text-xs mb-1 border-sky-500 bg-sky-500/10"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="font-medium">{p.project_name}</div>
                    {keywords.length > 0 && (
                      <div className="text-[10px] text-slate-500">
                        Match score: {p._score ?? 0}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {p.description || "No description yet"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-selected certifications / research / achievements */}
        {selectedCertifications.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Certifications & achievements included
            </h2>
            <p className="text-[11px] text-slate-500">
              Add research papers and co-curricular achievements as
              “certifications” in your profile (title + organization), and the
              most relevant ones will be picked here.
            </p>
            <div className="space-y-1 max-h-40 overflow-auto pr-1">
              {selectedCertifications.map((c) => (
                <div
                  key={c.id}
                  className="w-full text-left rounded-md border px-3 py-2 text-xs mb-1 border-slate-700 bg-slate-900/60"
                >
                  <div className="font-medium">
                    {c.certification_name || "Untitled achievement"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {c.issuing_organization || ""}{" "}
                    {c.issue_date
                      ? "• " + formatDateShort(c.issue_date)
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Resume preview + copy + save + cover letter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Generated resume
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyPlainText}
              className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900"
            >
              Copy as plain text
            </button>
            <button
              type="button"
              onClick={saveToHistory}
              disabled={savingHistory}
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1 disabled:opacity-60"
            >
              {savingHistory ? "Saving…" : "Save to history"}
            </button>
            <button
              type="button"
              onClick={downloadResumeDocx}
              className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900"
            >
              Download .docx
            </button>
            <button
              type="button"
              onClick={downloadResumePdf}
              className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900"
            >
              Download .pdf
            </button>
          </div>
        </div>

        <div className="border border-slate-800 rounded-lg bg-slate-950/60 p-3 text-xs whitespace-pre-wrap font-mono text-slate-100 max-h-[320px] overflow-auto">
          {resumeLines.join("\n")}
        </div>

        {/* AI Cover Letter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-200">
              AI-generated cover letter (edit before sending)
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyCoverLetter}
                disabled={!aiCoverLetter}
                className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900 disabled:opacity-50"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={downloadCoverLetterDocx}
                disabled={!aiCoverLetter}
                className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900 disabled:opacity-50"
              >
                .docx
              </button>
              <button
                type="button"
                onClick={downloadCoverLetterPdf}
                disabled={!aiCoverLetter}
                className="rounded-md border border-slate-700 text-xs px-3 py-1 hover:bg-slate-900 disabled:opacity-50"
              >
                .pdf
              </button>
            </div>
          </div>
          <textarea
            className="w-full min-h-[200px] rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-500"
            value={aiCoverLetter}
            onChange={(e) => setAiCoverLetter(e.target.value)}
            placeholder="Use the AI button on the left to generate a tailored cover letter. You can freely edit it here."
          />
          <p className="text-[11px] text-slate-500">
            Export this as Word or PDF, then tweak formatting in your editor so
            it stays one page and looks sharp while remaining ATS-friendly.
          </p>
        </div>
      </div>
    </div>
  );
}
