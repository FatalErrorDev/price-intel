# Sewera Price Intelligence — Claude Code Build Plan

## Project Overview

A single-page internal web app for price monitoring and scraping control.
Built with **plain HTML/CSS/JS — no framework, no build step**.

### Two core features:
1. **Scraping control** — upload input files to Google Drive folders (manual or scheduled)
2. **Price analysis** — interactive dashboard for Sewera and Dobromir branches

### Design rules (non-negotiable):
- Dark background (`#0f0f0f`) across all sections
- **Scraping page** — green accent (`#c8f060`)
- **Sewera analysis** — blue accent (`#60a0f0`)
- **Dobromir analysis** — orange accent (`#f0a040`)
- Typography: `Syne` (headings/nav), `DM Mono` (body/data)
- Top navigation — not sidebar
- No frameworks, no bundlers, no npm in production

---

## File Structure

```
/
├── index.html
├── css/
│   ├── base.css          ← shared: reset, typography, nav, variables
│   ├── scraping.css      ← green accent overrides
│   ├── sewera.css        ← blue accent overrides
│   └── dobromir.css      ← orange accent overrides
├── js/
│   ├── drive.js          ← Google Drive API: uploadFile, listFiles, downloadFile
│   ├── parser.js         ← xlsx parsing + branch-aware analysis engine
│   ├── charts.js         ← Chart.js wrappers, reusable across both branches
│   ├── scraping.js       ← scraping page logic
│   └── analysis.js       ← analysis page logic
├── lib/
│   └── xlsx.full.min.js  ← vendored SheetJS (do NOT load from CDN in production)
└── BUILD_PLAN.md
```

> Chart.js can be loaded from CDN (`cdnjs.cloudflare.com`) during development.
> SheetJS must be vendored — download from https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js

---

## Google Drive Folder Structure

```
Google Drive/
├── scraping/
│   ├── input/        ← "Run now" uploads go here
│   ├── monday/
│   ├── tuesday/
│   ├── wednesday/
│   ├── thursday/
│   ├── friday/
│   ├── saturday/
│   └── sunday/
└── analysis/
    ├── sewera/       ← output files dropped here manually
    └── dobromir/     ← output files dropped here manually
```

---

## Branch Configuration

Both branches share the same analysis engine. The config object drives all differences:

```js
// In parser.js
const BRANCH_CONFIG = {
  sewera: {
    label:       'Sewera',
    ownPrice:    'Sewera B2C KTW',
    diffColumn:  'Sewera-Najtańszy',
    competitors: ['Castorama', 'LeroyMerlin', 'OBI', 'Bednarek', 'Lubar', 'Maldrew', 'Viverto'],
    accent:      'sewera',       // maps to sewera.css
    folderId:    FOLDERS.sewera
  },
  dobromir: {
    label:       'Dobromir',
    ownPrice:    'Dobromir',
    diffColumn:  'Dobromir-Najtańszy',
    competitors: ['BricoMarche', 'Castorama'],
    accent:      'dobromir',     // maps to dobromir.css
    folderId:    FOLDERS.dobromir
  }
}
```

The `Segment` column exists in both files and maps to salespeople — used identically in both branches.
`Redystrybucja` column should be ignored in Dobromir files even if present.

---

## Folder ID Constants

All Drive folder IDs live at the top of `drive.js` as a single object.
**Fill these in before first use — never hardcode elsewhere.**

```js
// js/drive.js — top of file
const FOLDERS = {
  input:     'FOLDER_ID_HERE',
  monday:    'FOLDER_ID_HERE',
  tuesday:   'FOLDER_ID_HERE',
  wednesday: 'FOLDER_ID_HERE',
  thursday:  'FOLDER_ID_HERE',
  friday:    'FOLDER_ID_HERE',
  saturday:  'FOLDER_ID_HERE',
  sunday:    'FOLDER_ID_HERE',
  sewera:    'FOLDER_ID_HERE',
  dobromir:  'FOLDER_ID_HERE',
}
```

---

## Navigation Structure

```
[ SEWERA // PRICE INTEL ]     [ Scraping ]  [ Analysis ]          (top nav)
                                                        [ Sewera | Dobromir ]  ← only on Analysis tab
```

- Branch toggle appears **only** when Analysis tab is active
- Switching branch: swaps accent CSS class on `<body>`, reloads file list from correct Drive folder
- Active tab has accent-colored bottom border
- `<body>` carries a class: `page-scraping`, `page-sewera`, or `page-dobromir`
- CSS accent variables are defined per-class — only one accent stylesheet active at a time

---

## CSS Variable System

### base.css — always loaded
```css
:root {
  --bg:      #0f0f0f;
  --bg2:     #161616;
  --bg3:     #1e1e1e;
  --bg4:     #262626;
  --border:  rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.12);
  --text:    #f0ede8;
  --text2:   #888884;
  --text3:   #555552;
  --accent:  #888884;   /* neutral fallback — overridden by page class */
  --font-head: 'Syne', sans-serif;
  --font-mono: 'DM Mono', monospace;
}
```

### scraping.css / sewera.css / dobromir.css — scoped to body class
```css
/* scraping.css */
body.page-scraping { --accent: #c8f060; --accent-dim: rgba(200,240,96,0.08); }

/* sewera.css */
body.page-sewera   { --accent: #60a0f0; --accent-dim: rgba(96,160,240,0.08); }

/* dobromir.css */
body.page-dobromir { --accent: #f0a040; --accent-dim: rgba(240,160,64,0.08); }
```

All interactive elements (active tab border, button bg, drop zone hover, badge colors, chart colors)
reference `var(--accent)` — they automatically pick up the correct color with no JS needed.

---

---

# TASKS

---

## TASK 1 — Project scaffold and base styles

### What to build
- `index.html` with correct `<head>`: Google Fonts (Syne + DM Mono), Chart.js CDN, SheetJS local, all CSS and JS files linked
- All empty CSS files created with correct variable structure
- All empty JS files created with module-ready structure (no ES modules — use plain global functions)
- Top navigation HTML: logo + 3 tabs + branch toggle placeholder
- Three empty page sections: `#page-scraping`, `#page-sewera`, `#page-dobromir` (only one visible at a time)
- `nav.js` with `switchPage(page)` and `switchBranch(branch)` functions

### Rules
- `<body>` starts with class `page-scraping`
- Only `#page-scraping` visible on load; others `display: none`
- Branch toggle only visible when `#page-sewera` or `#page-dobromir` is active
- All three CSS accent files loaded at all times — body class controls which takes effect

### ✅ Test
1. Open `index.html` in browser — page loads with no console errors
2. Logo reads "SEWERA // PRICE INTEL" with "//" in accent color (green)
3. Clicking "Analysis" tab shows analysis section, hides scraping section
4. Branch toggle appears when Analysis is active, disappears when Scraping is active
5. Clicking "Sewera" in branch toggle: body gets `page-sewera`, accent turns blue
6. Clicking "Dobromir": body gets `page-dobromir`, accent turns orange
7. Clicking "Scraping" tab: body gets `page-scraping`, accent turns green

---

## TASK 2 — Google Drive authentication

### What to build
- `drive.js` with Google Identity Services (GSI) OAuth2 browser flow
- `FOLDERS` constant at top of file (all values `'FOLDER_ID_HERE'`)
- `initDrive()` — initializes GSI client, called on page load
- `signIn()` — triggers OAuth2 popup, stores token
- `isSignedIn()` — returns bool
- Small auth status bar below nav: shows "Connected to Drive ✓" or "Connect Google Drive" button
- Auth uses `https://www.googleapis.com/auth/drive.file` scope only (minimum required)

### Rules
- OAuth client ID goes in a `<meta name="google-client-id">` tag in index.html — easy to find and replace
- Token stored in memory only (no localStorage — no sensitive data persisted)
- All Drive functions check `isSignedIn()` and show an inline error if not authenticated

### ✅ Test
1. Page loads — auth bar shows "Connect Google Drive" button
2. Clicking button opens Google OAuth popup
3. After auth — bar shows "Connected to Drive ✓" in accent color
4. Refreshing page — user must re-authenticate (token not persisted — expected behavior)
5. No console errors during init

---

## TASK 3 — Drive core functions

### What to build
Three functions in `drive.js`:

```js
uploadFile(file, folderId)
// → uploads File object to Drive folder
// → returns { id, name, webViewLink }

listFiles(folderId)
// → lists .xlsx files in folder, newest first
// → returns [{ id, name, modifiedTime, webViewLink }]

downloadFile(fileId)
// → downloads file content
// → returns ArrayBuffer (ready for SheetJS)
```

- All three functions are `async`, return Promises
- All three check auth before executing
- Upload uses multipart form data (metadata + file content in one request)
- `listFiles` filters by `mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`

### ✅ Test
1. With a real folder ID substituted for `FOLDERS.sewera`:
   - `listFiles(FOLDERS.sewera)` returns an array (can be empty) without errors
2. Upload a test `.xlsx` file via console: `uploadFile(file, FOLDERS.input)` — file appears in Drive
3. `downloadFile(id)` with the uploaded file's ID returns an ArrayBuffer
4. All three functions reject cleanly with a readable error message if not authenticated

---

## TASK 4 — Scraping page UI

### What to build
Full scraping page inside `#page-scraping`:

**"Run now" card:**
- Drag-and-drop zone accepting `.xlsx` files only
- File chip appears after selection (filename + remove button)
- "Upload & Start Scraping" button (disabled until file selected)
- On upload: calls `uploadFile(file, FOLDERS.input)`, shows success state with Drive link
- Error state if upload fails

**"Schedule" card:**
- Same drag-and-drop zone
- Day picker: 7 buttons Mon–Sun (single select, one active at a time)
- "Schedule for [Day]" button (disabled until file AND day selected)
- On upload: calls `uploadFile(file, FOLDERS[day])`, shows success state
- If `listFiles(FOLDERS[day])` returns existing file: show warning banner
  "⚠ A file is already waiting for [Day]. Uploading will replace it." before confirming

**Layout:** two cards side by side on desktop, stacked on mobile (breakpoint: 700px)

### Rules
- Cards use `--bg3` background, `--border` border, `border-radius: 12px`
- Drop zones use dashed `--border2` border, hover/drag-over highlights with `--accent`
- Upload button uses `--accent` as background, dark text
- Success state: green checkmark icon + Drive link + "Upload another" reset button
- Loading state: spinner in accent color while upload in progress

### ✅ Test
1. Drag an `.xlsx` file onto "Run now" drop zone — file chip appears
2. Drop a non-xlsx file — file is rejected, error message shown
3. "Upload & Start Scraping" is disabled with no file, enabled after file selected
4. Upload completes — success state shows filename and Drive link
5. Schedule card: no day selected → button disabled even with file
6. Schedule card: file + day selected → button enabled, label shows correct day
7. If a file exists in that day's folder → warning banner appears before upload
8. Mobile view (resize to <700px): cards stack vertically

---

## TASK 5 — xlsx parser and analysis engine

### What to build
`parser.js` with the full analysis engine:

```js
parseXlsx(arrayBuffer)
// → parses raw ArrayBuffer via SheetJS
// → returns array of row objects

analyzeFile(rows, branch)
// → branch: 'sewera' or 'dobromir'
// → returns full analysis object (see structure below)

calcMedian(arr)
// → helper, pure function
```

**Analysis object returned by `analyzeFile()`:**
```js
{
  branch,        // 'sewera' | 'dobromir'
  total,         // total row count
  withComp,      // rows with competitor price data
  noComp,        // rows without
  cheaper,       // Sewera/Dobromir price <= competitor
  expensive,     // Sewera/Dobromir price > competitor
  median,        // median % diff (sane range only: -100% to +200%)
  compCoverage,  // { CompetitorName: count } for each competitor in branch
  segments,      // [{ name, total, cheaper, expensive, median }] sorted by total desc
  dist,          // [{ label, count }] — 8 price diff buckets
  topExpensive,  // top 10 rows where own price > competitor (pct < 200%)
  topCheapest,   // top 10 rows where own price < competitor (pct > -100%)
}
```

**Price diff parsing rules:**
- Column value may be `'-'`, empty, or a string like `'-0,25 %'` or `'9,26 %'`
- Strip `%`, replace `,` with `.`, parse as float
- `null` if not parseable or equals `'-'`
- Sane range for statistics: `-100 < pct < 200` (excludes data errors)
- `Redystrybucja` column ignored in all branches

### ✅ Test
1. `parseXlsx()` with a real Sewera file → returns array of objects with correct column names
2. `parseXlsx()` with a real Dobromir file → same
3. `analyzeFile(rows, 'sewera')` → `total` matches row count, `withComp + noComp === total`
4. `analyzeFile(rows, 'dobromir')` → `compCoverage` has only `BricoMarche` and `Castorama`
5. `median` is a reasonable number (not NaN, not 21000)
6. `topExpensive` contains no entries with `pct >= 200`
7. `topCheapest` contains no entries with `pct <= -100`
8. `segments` array — each entry's `cheaper + expensive <= total` (some rows may have no comp data)

---

## TASK 6 — Analysis page: single-file view

### What to build
Analysis page inside `#page-sewera` / `#page-dobromir` (same HTML, branch toggle switches context):

**File picker panel** (top of page):
- Calls `listFiles(FOLDERS[branch])` on branch switch
- Shows list of available `.xlsx` files from Drive (filename + date + checkbox)
- "Analyze selected" button — enabled when ≥1 file checked
- Dates extracted from filename pattern `DD-MM-YYYY`
- Files sorted newest first

**Single-file dashboard** (shown after analysis):

```
[ 6 KPI cards ]
[ Competitor coverage bars ]  [ Price distribution chart ]
[ Segment breakdown bars — stacked cheaper/expensive ]
[ Product list — tabs: "Sewera najdroższa" / "Sewera najtańsza" ]
  (label uses branch name: "Dobromir najdroższa" for Dobromir branch)
```

**KPI cards (6):**
- Total products
- Products with competitor data
- % cheapest/equal (accent color — green/blue/orange per branch)
- % more expensive (red)
- Median price diff (amber if positive, accent if negative)
- Products without competitor data

**Competitor coverage bars:**
- Horizontal bars, sorted by count descending
- Each competitor gets a fixed color (consistent across sessions)
- Count shown as number on right

**Price distribution chart:**
- Chart.js bar chart, 8 buckets
- Buckets: `≤-20%`, `-20 to -10%`, `-10 to -5%`, `-5 to 0%`, `0%`, `0-5%`, `5-15%`, `>15%`
- Color gradient: blue (cheapest) → gray (even) → orange/red (expensive)

**Segment breakdown:**
- One row per segment, sorted by total products desc
- Stacked bar: teal = cheaper, red = expensive
- Stats on right: `Xcheaper Yexpensive · med Z%`

**Product lists:**
- Two tabs: most expensive / most cheapest
- 10 rows each
- Columns: product name (truncated) | producer | diff % badge

### Rules
- All chart backgrounds: `--bg3`
- Chart.js tick/grid colors: `--text3` and `rgba(255,255,255,0.05)`
- Charts must be destroyed and recreated on branch switch (prevent canvas reuse errors)
- Loading state shown while Drive files are being fetched

### ✅ Test
1. Switch to Analysis tab → file list loads from Drive (or shows empty state if folder empty)
2. Check one file → "Analyze selected" button enables
3. Click analyze → KPI cards appear with correct numbers
4. `total` KPI matches row count in the xlsx file
5. Switching branch (Sewera → Dobromir) → file list reloads, accent color changes, charts destroy and recreate
6. Product list tab switch works — "most expensive" and "most cheapest" lists show correct data
7. No console errors after branch switch

---

## TASK 7 — Analysis page: multi-file trend view

### What to build
Activated when ≥2 files are selected in the file picker.

**Trend view layout:**
```
[ 4 KPI cards — trend summary ]
[ Median % over time (line chart) ]  [ % cheapest over time (line chart) ]
[ Segment trend table — first vs last date, delta column ]
```

**Trend KPI cards (4):**
- Number of files / dates analyzed
- Median change: first date → last date (colored red/green)
- % cheapest change in percentage points (colored red/green)
- Total products in most recent file

**Line charts:**
- X axis: dates (extracted from filenames, sorted chronologically)
- Y axis: value with % suffix
- Points at each date, line connecting them
- Chart color = `--accent` of current branch
- Fill below line with `--accent-dim`

**Segment trend table:**
- Columns: Segment name | Median (first date) | → | Median (last date) | Delta
- Delta colored: green if improved (went negative), red if worsened (went positive)
- Sorted by absolute delta descending (biggest changes first)

### Rules
- Multi-file mode auto-activates when ≥2 files selected — no separate button needed
- Single-file dashboard shown when exactly 1 file selected
- Files analyzed in chronological order (by date in filename)
- Same file parsing/analysis as single-file mode — just called for each selected file

### ✅ Test
1. Select exactly 1 file → single-file dashboard shows
2. Select 2+ files → trend view shows automatically
3. Line charts have correct number of data points (one per selected file)
4. X axis dates are in chronological order
5. Segment trend table delta values match manual calculation (last median - first median)
6. Switching branch with 2+ files selected → trend view reloads for new branch
7. Deselect files until 1 remains → view switches back to single-file dashboard

---

## TASK 8 — Polish, empty states, error handling

### What to build
- **Empty states**: file list empty (no files in Drive folder), no files selected, analysis not yet run
- **Error states**: Drive API error, file parse error, invalid file format
- **Loading states**: spinner during Drive fetch, spinner during file parse/analysis
- **Responsive layout**: scraping cards stack at <700px, analysis readable at tablet width
- **Chart resize**: charts respond to window resize without breaking
- **File validation**: reject non-xlsx files in drop zones with clear error message
- **Favicon**: simple `S//` text favicon using canvas (no external file needed)

### Empty state messages
- Drive folder empty: "No files found in Drive folder. Drop output files into the correct folder to begin."
- No files selected: "Select one or more files above to run analysis."
- Not authenticated: "Connect your Google Drive account to load files."

### ✅ Test
1. With empty Drive folder: empty state message shows (not a blank page or console error)
2. Drop a `.pdf` file on scraping zone: rejected with error message, no crash
3. Drop a malformed `.xlsx` (rename a `.txt` to `.xlsx`): parse error shown gracefully
4. Resize window to 375px width: scraping cards stack, analysis is scrollable, no overflow
5. All three loading spinners appear during their respective async operations
6. No unhandled Promise rejections in console during normal usage flow

---

## TASK 9 — Final integration check

### Full user journey tests

**Journey 1 — Manual scraping:**
1. Open app → Scraping tab active, green accent
2. Connect Google Drive
3. Drag `.xlsx` input file onto "Run now" card
4. Click "Upload & Start Scraping"
5. Success state shows Drive link ✓

**Journey 2 — Scheduled scraping:**
1. On Scraping tab, drag file onto "Schedule" card
2. Click "Wednesday"
3. App checks Wednesday folder — warning shown if file exists
4. Confirm upload → success state ✓

**Journey 3 — Single file analysis (Sewera):**
1. Click Analysis tab → branch toggle appears, "Sewera" active, blue accent
2. File list loads from Drive sewera folder
3. Check one file → "Analyze selected" enables
4. Click analyze → full dashboard renders
5. All 6 KPI cards populated, both charts rendered, segment bars visible ✓

**Journey 4 — Multi-file trend (Dobromir):**
1. Switch branch to Dobromir → orange accent, file list reloads
2. Select 3 files
3. Trend view auto-activates
4. Line charts show 3 data points each
5. Segment delta table shows improvements/regressions ✓

**Journey 5 — Branch switching mid-analysis:**
1. Run full analysis on Sewera (2 files selected, trend view active)
2. Switch to Dobromir branch
3. Old charts destroyed, new file list loads, accent changes to orange
4. No console errors ✓

---

## Implementation Notes for Claude Code

### Start with Task 1 — do not skip ahead
The CSS variable system and body class switching is the foundation everything else builds on. Getting it wrong means fixing CSS bugs in every subsequent task.

### Drive auth is the riskiest piece — do Task 2 and 3 before any UI
The Google Identity Services API has quirks (popup blockers, token expiry, scope errors). Validate the Drive connection works before building UI that depends on it.

### Chart.js canvas management
When switching branches or file selections, always call `chart.destroy()` before creating a new chart on the same canvas. Keep chart instances in a `charts` object keyed by canvas ID. Failing to do this causes "Canvas is already in use" errors.

### SheetJS parsing
```js
const workbook = XLSX.read(arrayBuffer, { type: 'array' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '-' });
```
`defval: '-'` ensures empty cells return `'-'` not `undefined` — critical for the parser's `hasPrice()` check.

### Date extraction from filenames
```js
function extractDate(filename) {
  const m = filename.match(/(\d{2}-\d{2}-\d{4})/);
  return m ? m[1] : null;
}
// "Zestawienie_Sewera_24-03-2026.xlsx" → "24-03-2026"
```

### Sorting files chronologically
Filename dates are `DD-MM-YYYY` — reverse to `YYYYMMDD` for string sort:
```js
files.sort((a, b) => {
  const toSortable = d => d.split('-').reverse().join('');
  return toSortable(a.date).localeCompare(toSortable(b.date));
});
```

### CSS accent switching
```js
function switchBranch(branch) {
  document.body.className = document.body.className
    .replace(/page-(sewera|dobromir)/, `page-${branch}`);
}
```
No JS color manipulation needed — CSS does the work via body class.

---

## Reference: Existing Dashboard

The analysis dashboard was already built and validated with real Sewera and Dobromir files.
It is saved as `reference/dashboard.html` in this repo.

Key analysis logic to port directly:
- `parsePct()` function — handles Polish number format (comma decimal, % suffix)
- `hasPrice()` function — correctly identifies empty/dash cells
- Distribution bucket logic (8 buckets, sane range filter)
- Segment stats aggregation
- Top 10 expensive/cheapest filter (`pct > -100 && pct < 200`)

Do not rewrite this logic — port it verbatim into `parser.js` and adjust for branch config.
