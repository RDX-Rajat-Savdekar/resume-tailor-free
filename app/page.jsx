"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
"use client";
import { useEffect, useRef, useState } from "react";

// Make this page dynamic to avoid static prerender (which caused DOMMatrix errors)
export const dynamic = "force-dynamic";

// ---- PDF extract helper (lazy import so it only runs in browser) ----
async function extractTextFromPDF(file) {
  // Load pdf.js only when needed, on the client
  const pdfjsLib = await import("pdfjs-dist/build/pdf");
  // Point the worker to the file we copy during postinstall
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let full = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    full += content.items.map((i) => i.str).join(" ") + "\n\n";
  }
  return full.replace(/\s+\n/g, "\n").replace(/\s{2,}/g, " ").trim();
}


// // app/page.jsx (top)
// import * as pdfjsLib from "pdfjs-dist";

// pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// async function extractTextFromPDF(file) {
//   const data = await file.arrayBuffer();
//   const pdf = await pdfjsLib.getDocument({ data }).promise;
//   let full = "";
//   for (let p = 1; p <= pdf.numPages; p++) {
//     const page = await pdf.getPage(p);
//     const content = await page.getTextContent();
//     full += content.items.map(i => i.str).join(" ") + "\n\n";
//   }
//   return full.replace(/\s+\n/g, "\n").replace(/\s{2,}/g, " ").trim();
// }


// ------- Sample data -------
const SAMPLE_RESUME = `Built React & Flask dashboards exposing realtime stock and payouts; reduced spoilage.
Refactored monolith to Flask microservices; implemented CI/CD with GitHub Actions and Docker.
Designed PostgreSQL schemas and added indexes to cut query latency.
Automated CSV ingestion pipeline in Python; added unit tests with Pytest.`;

const SAMPLE_JD = `We're hiring an SDE to build scalable web apps.
Required: React, Node.js/Express or Flask, REST, PostgreSQL/MySQL, Docker, CI/CD (GitHub Actions), AWS, system design.
Nice: Redis, Kubernetes, GraphQL, testing frameworks like Jest or Pytest.`;

// ------- Small utility -------
const hasWebGPU = () =>
  typeof navigator !== "undefined" && "gpu" in navigator;

// ------- Prompt builder for LLM -------
function buildSuggestionPrompt({ resume, jd, matched, missing }) {
  return `
You are a precise resume coach. Only write suggestions grounded in the resume; do not invent employers or projects.

RESUME:
${resume}

JOB DESCRIPTION:
${jd}

Matched keywords:
${matched.join(", ")}

Missing keywords:
${missing.join(", ")}

Write 4 concise bullet suggestions that improve the resume by naturally incorporating items from Missing.
Each bullet:
- starts with an action verb,
- references real achievements implied by the resume (not fabricated),
- includes 1–2 missing keywords if relevant,
- ends with an impact metric when present (otherwise keep neutral).
Return bullets only, one per line, prefixed with "• ".
`.trim();
}

export default function Home() {
  const [resume, setResume] = useState(SAMPLE_RESUME);
  const [jd, setJd] = useState(SAMPLE_JD);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // AI (WebLLM)
  const [useAI, setUseAI] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const engineRef = useRef(null);

  // Initialize WebLLM lazily when toggle is enabled
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!useAI || engineRef.current || !hasWebGPU()) return;
      try {
        setAiLoading(true);
        // pick a small on-device model id (shipped by WebLLM)
        const engine = await CreateMLCEngine({
          // You can try other IDs like "Phi-3-mini-4k-instruct-q4f16_1"
          model: "Llama-3.2-3B-instruct-q4f16_1",
        });
        if (!cancelled) {
          engineRef.current = engine;
          setAiReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError("WebLLM failed to initialize. Your browser/device may not support WebGPU.");
          setUseAI(false);
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useAI]);

  const onAnalyze = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setAiOutput("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resume, jdText: jd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to analyze");
      setData(json);

      // If AI is enabled and ready, generate AI suggestions
      if (useAI && aiReady && engineRef.current) {
        const engine = engineRef.current;
        const prompt = buildSuggestionPrompt({
          resume,
          jd,
          matched: json.matchedKeywords || [],
          missing: json.missingKeywords || [],
        });
        setAiLoading(true);
        let collected = "";
        await engine.chat.completions.create(
          {
            messages: [
              { role: "system", content: "You produce concise, resume-ready suggestions grounded in user content." },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 240,
          },
          (chunk) => {
            const delta = chunk?.choices?.[0]?.delta?.content || "";
            collected += delta;
            // live stream (optional): setAiOutput(collected);
          }
        );
        setAiOutput(collected.trim());
        setAiLoading(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF import handlers
  const onPickResumePDF = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setLoading(true);
      const txt = await extractTextFromPDF(f);
      setResume(txt);
    } catch (err) {
      setError("Failed to read PDF. Try exporting your resume as text.");
    } finally {
      setLoading(false);
      e.target.value = ""; // reset input so same file can be picked again
    }
  };
  const onPickJdPDF = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setLoading(true);
      const txt = await extractTextFromPDF(f);
      setJd(txt);
    } catch (err) {
      setError("Failed to read JD PDF.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Resume Tailor (100% Free)</h1>
        <p className="text-neutral-600">
          Paste or import your resume/JD to see ATS-style coverage, gaps, and suggestions.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={() => setResume(SAMPLE_RESUME)}>Use sample resume</button>
        <button className="btn" onClick={() => setJd(SAMPLE_JD)}>Use sample JD</button>

        {/* AI toggle */}
        <label className="inline-flex items-center gap-2 ml-auto">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={useAI}
            onChange={(e) => {
              if (!hasWebGPU() && e.target.checked) {
                setError("WebGPU not available in this browser/device. Try Chrome/Edge on desktop.");
                return;
              }
              setUseAI(e.target.checked);
            }}
          />
          <span className="text-sm">
            AI suggestions (on-device, beta){useAI && (aiLoading ? " — loading model…" : aiReady ? " — ready" : "")}
          </span>
        </label>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Your Resume</h2>
            <div className="flex items-center gap-2">
              <label className="btn cursor-pointer">
                Import PDF
                <input type="file" accept="application/pdf" onChange={onPickResumePDF} hidden />
              </label>
            </div>
          </div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="w-full h-64 resize-vertical rounded-xl border border-neutral-300 p-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Paste your resume text (or Import PDF)"
          />
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Job Description</h2>
            <div className="flex items-center gap-2">
              <label className="btn cursor-pointer">
                Import PDF
                <input type="file" accept="application/pdf" onChange={onPickJdPDF} hidden />
              </label>
            </div>
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="w-full h-64 resize-vertical rounded-xl border border-neutral-300 p-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Paste the JD text (or Import PDF)"
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={onAnalyze} disabled={loading || aiLoading}>
          {(loading || aiLoading) ? "Working…" : "Analyze"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {data && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-1 card p-4 space-y-3">
            <h3 className="font-semibold">Summary</h3>
            <div className="flex items-center gap-2">
              <span className="badge">Coverage</span>
              <span className="text-lg font-bold">{data.coveragePercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">ATS Score</span>
              <span className="text-lg font-bold">{data.atsScore}/100</span>
            </div>
            <div>
              <h4 className="font-semibold mt-2">JD Keywords</h4>
              <p className="text-sm text-neutral-700">{data.jdKeywords.join(", ") || "—"}</p>
            </div>
            <div>
              <h4 className="font-semibold mt-2">Matched</h4>
              <p className="text-sm text-green-700">{data.matchedKeywords.join(", ") || "—"}</p>
            </div>
            <div>
              <h4 className="font-semibold mt-2">Missing</h4>
              <p className="text-sm text-red-700">{data.missingKeywords.join(", ") || "—"}</p>
            </div>
            <div>
              <h4 className="font-semibold mt-2">Extra (in resume, not JD)</h4>
              <p className="text-sm text-neutral-700">{data.extraKeywords.join(", ") || "—"}</p>
            </div>
          </div>

          <div className="col-span-1 card p-4 space-y-3">
            <h3 className="font-semibold">Suggestions</h3>

            {/* Rule-based (always available) */}
            {(!data.suggestions || data.suggestions.length === 0) ? (
              <p className="text-sm text-neutral-700">No missing keywords 🎉</p>
            ) : (
              <>
                <p className="text-xs text-neutral-500">Rule-based (from missing keywords)</p>
                <ul className="list-disc list-inside space-y-1 text-sm mb-3">
                  {data.suggestions.map((s, i) => (<li key={`r-${i}`}>{s}</li>))}
                </ul>
              </>
            )}

            {/* AI (optional) */}
            {useAI && (
              <div className="pt-2 border-t">
                <p className="text-xs text-neutral-500">
                  AI (on-device) {aiReady ? "" : " — initializing…"}
                </p>
                <pre className="text-sm whitespace-pre-wrap">{aiOutput || (aiLoading ? "Generating…" : "")}</pre>
              </div>
            )}
          </div>

          <div className="col-span-1 card p-4 space-y-3">
            <h3 className="font-semibold">Resume with JD Keywords Highlighted</h3>
            <div
              className="prose max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: data.highlightedResumeHTML }}
            />
          </div>
        </section>
      )}

      <footer className="text-xs text-neutral-500 pt-6">
        <p>
          On-device AI runs via WebGPU. If unavailable, toggle is disabled. PDF import uses pdf.js and runs fully in your browser.
        </p>
      </footer>
    </main>
  );
}
