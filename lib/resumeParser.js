// lib/resumeParser.js
//
// Client-side PDF parsing using pdfjs-dist. Runs entirely in the
// browser - your resume file never gets uploaded to any server.

// Same vocabulary used by the Python desktop version, kept in sync.
export const KNOWN_SKILLS = [
  // Mechanical
  "SolidWorks", "AutoCAD", "CAD", "CATIA", "Fusion 360", "FEA",
  "GD&T", "CNC", "3D Printing", "Manufacturing", "Machining",
  "Thermodynamics", "Fluid Mechanics", "Mechanical Design",
  // Electrical / Mechatronics
  "PCB Design", "Altium", "KiCad", "Circuit Design", "Embedded Systems",
  "Microcontrollers", "Arduino", "Raspberry Pi", "PLC", "SCADA",
  "Robotics", "Mechatronics", "Control Systems", "Sensors", "Actuators",
  "Power Electronics", "Electrical Engineering",
  // Programming / software often paired with hardware roles
  "Python", "C++", "MATLAB", "Simulink", "LabVIEW", "ROS",
  "Machine Learning", "Data Analysis", "OpenCV", "Computer Vision",
  // General engineering
  "Six Sigma", "Lean Manufacturing", "Project Management", "Testing",
  "Prototyping", "Quality Assurance", "Root Cause Analysis",
];

export async function extractTextFromPdf(file) {
  // Loaded dynamically so this only runs in the browser, never during
  // Next.js's server-side build.
  const pdfjsLib = await import("pdfjs-dist/build/pdf");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

export function detectSkills(text) {
  const textLower = text.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => {
    const pattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    return pattern.test(textLower);
  });
}

export async function parseResumePdf(file) {
  const text = await extractTextFromPdf(file);
  const skills = detectSkills(text);
  return { skills, rawText: text };
}
