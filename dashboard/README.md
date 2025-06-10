# Translation Management Dashboard

A web-based dashboard for managing and analyzing Insly translations locally.

## Features

- **Overview Tab**: Visual coverage statistics for all languages
- **Translation Browser**: Search, filter, and edit translations
- **Analytics Tab**: Charts and detailed missing translation reports
- **Export Tab**: Export modified, missing, or full reports

## How to Use

### Running the Dashboard

1. **Using Python** (recommended):
   ```bash
   cd dashboard
   python -m http.server 8000
   ```
   Then open http://localhost:8000

2. **Using Node.js**:
   ```bash
   cd dashboard
   npx http-server -p 8000
   ```
   Then open http://localhost:8000

3. **Using VS Code Live Server**:
   - Install "Live Server" extension
   - Right-click on `dashboard/index.html`
   - Select "Open with Live Server"

### Dashboard Features

#### Overview Tab
- See coverage percentage for each language
- Click on any language card to browse its translations
- Color-coded progress bars (green >80%, yellow >50%, red <50%)

#### Translation Browser
- Select a language from the dropdown
- Search by key, English text, or translation
- Filter by status: All, Missing, Identical, or Translated
- Click "Edit" to modify any translation

#### Analytics Tab
- Bar chart showing coverage by language
- Pie chart showing translation status distribution
- Table of missing translations with quick access buttons

#### Export Tab
- **Export Modified**: Downloads only translations you've edited
- **Export Missing**: Downloads all missing translations by language
- **Export Report**: Downloads comprehensive coverage analysis

### Editing Translations

1. Navigate to Translation Browser
2. Select a language
3. Find the translation you want to edit
4. Click "Edit" button
5. Modify the translation
6. Click "Save" (or press Ctrl/Cmd+S)

### Keyboard Shortcuts

- `Escape`: Close edit modal
- `Ctrl/Cmd + S`: Save translation (when editing)

### Important Notes

- All edits are saved locally in browser storage
- Translations are NOT automatically uploaded to Locize
- Export modified translations to upload them via the main workflow
- The dashboard works completely offline once loaded

## Technical Details

- Pure JavaScript, HTML, and CSS (no build process)
- Reads translation files from `../translations/current/`
- Stores modifications in localStorage
- Responsive design for mobile devices
- Canvas API for charts (no external dependencies)

## Deployment

This dashboard can be deployed as a static site on GitHub Pages:

1. The main branch workflow will be set up to deploy automatically
2. Access at: https://inslyai.github.io/insly-locize-translations/dashboard/

Note: GitHub Pages for private repos requires a paid GitHub plan.