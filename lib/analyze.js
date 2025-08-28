
import { TECH_KEYWORDS, ACTION_VERBS } from "./keywords";

const uniq = (arr) => [...new Set(arr)];
const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9+.#/\-\s]/g, " ");

const detectKeywords = (text) => {
  const low = normalize(text);
  const found = [];
  for (const kw of TECH_KEYWORDS) {
    const pat = new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^a-z0-9]|$)`,"i");
    if (pat.test(low)) found.push(kw);
  }
  return uniq(found).sort();
};

const countNumbers = (text) => {
  const matches = text.match(/\b\d+(?:\.\d+)?%?|(?:\$)?\d+[km]?\b/gi);
  return matches ? matches.length : 0;
};

const containsActionVerbs = (text) => {
  const low = normalize(text);
  return ACTION_VERBS.some(v => new RegExp(`(^|\\s)${v}(\\s|$)`).test(low));
};

const highlightKeywords = (text, keywords) => {
  let html = text;
  const ordered = [...keywords].sort((a,b)=>b.length - a.length);
  for (const kw of ordered) {
    const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,"ig");
    html = html.replace(re, "<mark>$1</mark>");
  }
  html = html.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
  return `<p>${html}</p>`;
};

const suggestionTemplates = [
  (kw) => `Implemented ${kw} in production services, adding metrics and error handling to improve reliability.`,
  (kw) => `Designed data models using ${kw} and optimized queries/indexes to reduce latency.`,
  (kw) => `Containerized services with ${kw} and automated deployments to cut manual steps.`,
  (kw) => `Built responsive UI with ${kw}, added lazy loading and code-splitting to improve performance.`,
  (kw) => `Integrated external APIs using ${kw}, added retries and backoff for robustness.`
];

const generateSuggestions = (missingKeywords) => {
  const suggestions = [];
  for (const kw of missingKeywords) {
    let idx = 0;
    const l = kw.toLowerCase();
    if (/(postgres|mysql|mongo|redis|sqlite|elastic)/.test(l)) idx = 1;
    else if (/(docker|kubernetes|k8s|terraform)/.test(l)) idx = 2;
    else if (/(react|next|angular|vue|svelte|css|html|tailwind)/.test(l)) idx = 3;
    else if (/(rest|graphql|grpc|api)/.test(l)) idx = 4;
    suggestions.push(`• ${suggestionTemplates[idx](kw)}`);
  }
  return suggestions;
};
// damn 
export function analyzeResumeVsJD({ resumeText, jdText }) {
  const resumeKW = detectKeywords(resumeText);
  const jdKW = detectKeywords(jdText);

  const matched = jdKW.filter(k => resumeKW.includes(k));
  const missing = jdKW.filter(k => !resumeKW.includes(k));
  const extra = resumeKW.filter(k => !jdKW.includes(k));

  const coverage = jdKW.length === 0 ? 0 : Math.round((matched.length / jdKW.length) * 100);

  const numScore = Math.min(countNumbers(resumeText), 4) / 4;
  const verbScore = containsActionVerbs(resumeText) ? 1 : 0;
  const score = Math.round( (0.7*(coverage/100) + 0.15*numScore + 0.15*verbScore) * 100 );

  const highlightedResumeHTML = highlightKeywords(resumeText, jdKW);
  const suggestions = generateSuggestions(missing);

  return {
    jdKeywords: jdKW,
    resumeKeywords: resumeKW,
    matchedKeywords: matched,
    missingKeywords: missing,
    extraKeywords: extra,
    coveragePercent: coverage,
    atsScore: score,
    highlightedResumeHTML,
    suggestions
  };
}
