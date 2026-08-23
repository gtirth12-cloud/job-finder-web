// pages/api/jobs.js
//
// Serverless function: fetches the live internship/co-op/entry-level
// list from mtlogs/2026-internships-and-jobs on GitHub (covers US,
// Canada, and remote roles), parses the markdown table, and returns
// only mechanical/electrical/mechatronics/robotics relevant postings
// that are internships or co-ops (not full-time roles) as JSON.

const SOURCE_URL =
  "https://raw.githubusercontent.com/mtlogs/2026-internships-and-jobs/main/README.md";

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

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || line.includes("----")) continue;
    if (line.includes("Name") && line.includes("Role") && line.includes("Location Type")) continue;

    const cells = line
      .slice(1, line.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((c) => c.trim());

    if (cells.length < 5) continue;
    const [companyName, roleCell, location, locationType, roleType] = cells;

    const roleLink = extractLink(roleCell);
    if (!roleLink.text || !roleLink.url) continue;

    jobs.push({
      company: cleanText(companyName),
      title: cleanText(roleLink.text),
      url: roleLink.url,
      location: cleanText(location.split(",").slice(0, 2).join(",")), // trim long multi-location lists
      workModel: locationType,
      datePosted: roleType, // reused field for "Internship" / "Co-op" / "Full-Time"
    });
  }

  return jobs;
}

function filterRelevant(jobs) {
  return jobs.filter((job) => {
    const titleLower = job.title.toLowerCase();
    const roleTypeLower = job.datePosted.toLowerCase();
    const isInternOrCoop = roleTypeLower.includes("intern") || roleTypeLower.includes("co-op");
    const matchesKeyword = RELEVANT_KEYWORDS.some((kw) => titleLower.includes(kw));
    return isInternOrCoop && matchesKeyword;
  });
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
