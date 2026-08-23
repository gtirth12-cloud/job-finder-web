// pages/api/jobs.js
//
// Serverless function: fetches the live, daily-updated internship list
// from jobright-ai/2026-Engineer-Internship on GitHub (covers Mechanical,
// Electrical, Robotics, Hardware, Controls, Aerospace and more), parses
// the markdown table, and returns only mechanical/electrical/mechatronics
// /robotics relevant postings as JSON.
//
// This was chosen over mtlogs/2026-internships-and-jobs after testing:
// that source's RippleMatch links were frequently stale/closed. Jobright's
// links were verified working (including direct "Apply on Employer Site",
// no account required) as of Aug 22 2026.

const SOURCE_URL =
  "https://raw.githubusercontent.com/jobright-ai/2026-Engineer-Internship/master/README.md";

const RELEVANT_KEYWORDS = [
  "mechanical", "electrical", "mechatronic", "robotic", "robotics",
  "controls", "control systems", "hardware", "manufacturing",
  "automation", "power", "systems engineering", "avionics",
  "embedded", "aerospace", "energy", "electromechanical",
];

function extractLink(cell) {
  const match = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!match) return { text: null, url: null };
  return { text: match[1], url: match[2] };
}

function cleanText(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function parseJobTable(markdown) {
  const jobs = [];
  const lines = markdown.split("\n");
  let lastCompany = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || line.includes("---")) continue;
    if (line.includes("Company") && line.includes("Job Title")) continue;

    const cells = line
      .slice(1, line.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((c) => c.trim());

    if (cells.length < 5) continue;
    const [companyCell, titleCell, location, workModel, datePosted] = cells;

    const companyLink = extractLink(companyCell);
    const companyName = companyLink.text || lastCompany;
    if (companyLink.text) lastCompany = companyLink.text;

    const titleLink = extractLink(titleCell);
    if (!titleLink.text || !titleLink.url) continue;

    jobs.push({
      company: companyName,
      title: cleanText(titleLink.text),
      url: titleLink.url,
      location: cleanText(location),
      workModel: workModel,
      datePosted: "Posted " + datePosted,
    });
  }

  return jobs;
}

function filterRelevant(jobs) {
  return jobs.filter((job) =>
    RELEVANT_KEYWORDS.some((kw) => job.title.toLowerCase().includes(kw))
  );
}

export default async function handler(req, res) {
  try {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) {
      throw new Error(`Source fetch failed: ${response.status}`);
    }
    const markdown = await response.text();
    const allJobs = parseJobTable(markdown);
    const relevantJobs = filterRelevant(allJobs);

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
    res.status(200).json({ jobs: relevantJobs, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
