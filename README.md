# Resume Tailor (Free)

**Resume Tailor** is a free, open-source tool to help job seekers quickly tailor their resumes to specific job descriptions.
It compares your resume with a given JD, highlights missing keywords, and provides actionable insights to improve alignment.

Live Demo: [https://resume-tailor-free-8hy3.vercel.app/] 
( Portfolio - https://rajatsavdekar.dev/ )

---

## ✨ Features

* **Paste or Import Resumes**

  * Copy-paste your resume text, or import directly from PDF.

* **Job Description Analysis**

  * Paste in a job description alongside your resume.
  * Automatic keyword extraction + comparison.

* **Highlights & Insights**

  * Shows *what matches* and *what’s missing*.
  * Helps you identify gaps between your resume and the target role.

* **Sample Data**

  * Includes example resume & job description for quick testing.

---

## Roadmap

We’re actively improving the tool:

* **AI-Powered Suggestions**
  Integrating a lightweight LLM (e.g. via WebLLM or server fallback) to generate tailored bullet point suggestions for missing skills/keywords.

* **Customizable PDF Export**
  Export an improved resume draft with missing keywords naturally woven into your experience.

* **Multi-Project Hosting**
  Subdomains for different live demos (e.g. `resume.rajatsavdekar.dev`).

---

## Tech Stack

* **Frontend**: [Next.js 14](https://nextjs.org/), React, Tailwind CSS
* **Backend (API Routes)**: Next.js Serverless Functions
* **PDF Parsing**: [pdf.js](https://mozilla.github.io/pdf.js/)
* **Deployment**: [Vercel](https://vercel.com/)
* **Version Control**: GitHub

---

## 🚀 Getting Started

### Prerequisites

* Node.js ≥ 18
* npm or yarn

### Setup

```bash
git clone https://github.com/RDX-Rajat-Savdekar/resume-tailor-free.git
cd resume-tailor-free
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploying to Vercel

```bash
vercel
```

Or import the repo directly from GitHub in the Vercel dashboard.

---

## Project Structure

```
resume-tailor-free/
├── app/
│   ├── api/          # API routes (analysis, suggestions, etc.)
│   ├── page.jsx      # Main UI
│   └── layout.jsx    # App layout
├── lib/              # Keyword extraction logic
├── public/           # PDF worker, static assets
├── package.json
└── README.md
```

---

## 🤝 Contributing

Pull requests welcome! Here’s what we’re especially looking for:

* AI/LLM integrations (local lightweight models or hosted APIs)
* Improved resume parsing (PDF → structured data)
* Export to DOCX/LaTeX resume formats
* UI/UX enhancements

---

## 📜 License

MIT License — feel free to use, share, and build on top of Resume Tailor.
