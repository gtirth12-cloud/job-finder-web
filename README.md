# Engineering Internship Tracker (Web)

A live, always-updating web version of the job tracker — deployable
to Vercel for free, no server to manage.

## What it does

- Fetches live mechanical/electrical/mechatronics/robotics internship
  postings daily from the jobright-ai/2026-Engineer-Internship GitHub repo
- You paste your skills in once (comma-separated) — saved in your browser
- Jobs are ranked by match score
- "New since last visit" tracking, saved in your browser (localStorage)
- Direct "View & apply" links to each posting

## Deploy to Vercel (free)

### Option A — no coding tools needed, via GitHub + Vercel website
1. Create a free account at https://github.com if you don't have one.
2. Create a new repository, and upload this entire folder to it
   (GitHub has a drag-and-drop upload in the browser — "Add file" →
   "Upload files").
3. Go to https://vercel.com, sign in with your GitHub account.
4. Click "Add New" → "Project", select the repo you just made.
5. Leave all settings as default (Vercel auto-detects Next.js) and
   click "Deploy".
6. In ~1 minute you'll get a live URL like
   `your-project-name.vercel.app` — that's your site, live on the internet.

### Option B — via terminal (if you're comfortable with it)
```
npm install -g vercel
cd job-finder-web
vercel
```
Follow the prompts (log in / sign up when asked). It'll give you a
live URL when done.

## Running it locally first (optional, to preview before deploying)

```
npm install
npm run dev
```
Then open http://localhost:3000 in your browser.

## Updating it later

Any time you want to change something (colors, matching logic, add a
feature), edit the files and either:
- push the change to GitHub (Vercel auto-redeploys), or
- run `vercel` again from the terminal

## File structure

```
job-finder-web/
├── pages/
│   ├── index.js       <- the page you see (UI, skill input, job list)
│   ├── _app.js        <- loads the global styles
│   └── api/
│       └── jobs.js     <- fetches + parses + filters live job data
├── styles/
│   └── globals.css     <- all visual styling
├── package.json
└── README.md
```
