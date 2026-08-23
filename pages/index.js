import { useState, useEffect, useMemo } from "react";
import { parseResumePdf } from "../lib/resumeParser";

const SEEN_KEY = "jobfinder_seen_urls";
const SKILLS_KEY = "jobfinder_skills";

function loadSeenUrls() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenUrls(set) {
  window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

function scoreJob(title, skills) {
  const titleLower = title.toLowerCase();
  const matched = skills.filter((skill) => {
    const pattern = new RegExp(`\\b${skill.trim().toLowerCase()}\\b`);
    return pattern.test(titleLower);
  });
  return { score: Math.min(100, matched.length * 35), matched };
}

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [seenUrls, setSeenUrls] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");

  useEffect(() => {
    const savedSkills = window.localStorage.getItem(SKILLS_KEY);
    if (savedSkills) setSkillsInput(savedSkills);
    setSeenUrls(loadSeenUrls());

    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setJobs(data.jobs || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const skills = useMemo(
    () => skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
    [skillsInput]
  );

  const ranked = useMemo(() => {
    return jobs
      .map((job) => {
        const { score, matched } = scoreJob(job.title, skills);
        return { ...job, score, matched };
      })
      .sort((a, b) => b.score - a.score);
  }, [jobs, skills]);

  const visibleJobs = showAll ? ranked : ranked.filter((j) => !seenUrls.has(j.url));

  function handleSkillsChange(e) {
    const value = e.target.value;
    setSkillsInput(value);
    window.localStorage.setItem(SKILLS_KEY, value);
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setParseError("Please upload a PDF file.");
      return;
    }

    setParsing(true);
    setParseError(null);
    setResumeFileName(file.name);

    try {
      const { skills } = await parseResumePdf(file);
      if (skills.length === 0) {
        setParseError(
          "No known skills detected in that PDF. You can still type skills in manually below."
        );
      } else {
        const value = skills.join(", ");
        setSkillsInput(value);
        window.localStorage.setItem(SKILLS_KEY, value);
      }
    } catch (err) {
      setParseError("Couldn't read that PDF: " + err.message);
    } finally {
      setParsing(false);
    }
  }

  function markAllSeen() {
    const newSeen = new Set(seenUrls);
    jobs.forEach((j) => newSeen.add(j.url));
    setSeenUrls(newSeen);
    saveSeenUrls(newSeen);
  }

  const newCount = ranked.filter((j) => !seenUrls.has(j.url)).length;

  return (
    <div className="wrap">
      <div className="titleblock">
        <p className="eyebrow">Drawing No. 001 — Rev. Live</p>
        <h1>Engineering Internship Tracker</h1>
        <p>
          Live mechanical / electrical / mechatronics / robotics internship
          postings, pulled daily and ranked against your skills.
        </p>
        <div className="meta-row">
          <span>Source: <b>jobright-ai / 2026-Engineer-Internship</b></span>
          <span>Total postings: <b>{jobs.length}</b></span>
          <span>New since last visit: <b>{newCount}</b></span>
        </div>
      </div>

      <div className="input-panel">
        <label htmlFor="resume-upload">Upload your resume (PDF)</label>
        <input
          id="resume-upload"
          type="file"
          accept="application/pdf"
          onChange={handleResumeUpload}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            color: "var(--ink-dim)",
          }}
        />
        {parsing && <p className="input-hint">Reading your resume…</p>}
        {resumeFileName && !parsing && !parseError && (
          <p className="input-hint">
            ✓ Loaded skills from <b style={{ color: "var(--ink)" }}>{resumeFileName}</b> — edit below if anything's missing.
          </p>
        )}
        {parseError && (
          <p className="input-hint" style={{ color: "var(--accent)" }}>{parseError}</p>
        )}
        <p className="input-hint" style={{ marginTop: 4 }}>
          Your PDF is read entirely in your browser — it's never uploaded anywhere.
        </p>
      </div>

      <div className="input-panel">
        <label htmlFor="skills">Your skills (comma-separated)</label>
        <textarea
          id="skills"
          value={skillsInput}
          onChange={handleSkillsChange}
          placeholder="SolidWorks, MATLAB, Python, Robotics, Mechatronics, Arduino, CAD, Electrical Engineering"
        />
        <p className="input-hint">
          Auto-filled from your resume above, or type/edit manually. Saved automatically in your browser.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p className="job-count">
          {showAll ? `SHOWING ALL ${ranked.length} POSTINGS` : `SHOWING ${visibleJobs.length} NEW POSTINGS`}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowAll((s) => !s)}
            className="apply-btn"
            style={{ background: "transparent", color: "var(--accent)", cursor: "pointer" }}
          >
            {showAll ? "Show only new" : "Show all"}
          </button>
          <button
            onClick={markAllSeen}
            className="apply-btn"
            style={{ background: "transparent", color: "var(--accent)", cursor: "pointer" }}
          >
            Mark all seen
          </button>
        </div>
      </div>

      {loading && <p className="loading-state">Fetching today's listings…</p>}
      {error && <p className="empty-state">Couldn't load listings: {error}</p>}

      {!loading && !error && visibleJobs.length === 0 && (
        <p className="empty-state">
          No new postings right now — check back later, or click "Show all" above.
        </p>
      )}

      <div className="job-grid">
        {!loading &&
          visibleJobs.map((job) => (
            <div className="job-card" key={job.url}>
              <div>
                <h3>
                  {job.title} — <span className="company">{job.company}</span>
                </h3>
                <p className="location-row">
                  {job.location} · {job.workModel} · Posted {job.datePosted}
                </p>
                {job.matched.length > 0 && (
                  <p className="skills-row">
                    <b>Matched:</b> {job.matched.join(", ")}
                  </p>
                )}
                
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apply-btn"
                >
                  View & apply ->
                </a>
              </div>
              <div className={`stamp ${job.score === 0 ? "zero" : ""}`}>
                {job.score}% MATCH
              </div>
            </div>
          ))}
      </div>

      <footer>
        Updated daily from GitHub. Match scoring is keyword-based against
        job titles — treat it as a sorting hint, not a precise score.
      </footer>
    </div>
  );
}
