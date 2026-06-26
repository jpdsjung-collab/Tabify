# Tabify

Convert uploaded sheet music (image, PDF, or MusicXML) into beginner-friendly guitar tablature.

## Features

- **Multi-format upload** — JPEG, PNG, PDF, MusicXML, and MXL
- **Optical Music Recognition** — Audiveris integration for images and PDFs
- **Beginner fingering** — First-position guitar mapping with open-string preference
- **ASCII TAB generation** — Standard 6-string tablature output
- **Export** — Download TAB as PDF or PNG
- **Mobile-first UI** — Apple-inspired design with image/PDF preview and upload progress

## Project Structure

```
Tabify/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── middleware/      # Multer upload, error handling
│   │   ├── routes/          # REST API endpoints
│   │   ├── services/        # OMR, MusicXML, fingering, TAB, export
│   │   └── utils/           # Logger, pitch math, file helpers
│   ├── samples/             # Sample MusicXML for testing
│   ├── uploads/             # Temporary upload storage
│   └── output/              # Generated MusicXML and exports
├── frontend/                # Static HTML/CSS/JS client
│   ├── css/                 # Design tokens, layout, components
│   └── js/                  # API client, upload, preview, TAB viewer
└── package.json             # Root scripts
```

## Prerequisites

- **Node.js** 18 or later
- **Java 17+** (required for Audiveris OMR)
- **Audiveris** (optional — demo mode available without it)

### Installing Audiveris

1. Download from [github.com/Audiveris/audiveris/releases](https://github.com/Audiveris/audiveris/releases)
2. Install to your system (macOS: drag to Applications)
3. Set the path in `backend/.env`:

```env
AUDIVERIS_BIN=/Applications/Audiveris.app/Contents/MacOS/Audiveris
```

Without Audiveris, the server runs in **demo mode** and returns a sample C major scale for image/PDF uploads.

## Quick Start

```bash
# Install backend dependencies
npm run install:all

# Copy environment config
cp backend/.env.example backend/.env

# Start the server (serves API + frontend on port 3000)
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Server health and Audiveris availability |
| `POST` | `/api/convert` | Upload sheet music (`sheet` field), returns TAB |
| `GET` | `/api/export/:jobId/pdf` | Download TAB as PDF |
| `GET` | `/api/export/:jobId/png` | Download TAB as PNG |

### Example: Convert MusicXML

```bash
curl -X POST http://localhost:3000/api/convert \
  -F "sheet=@backend/samples/twinkle.xml"
```

## Tech Stack

- **Backend:** Node.js, Express, Multer, xml2js, PDFKit
- **Frontend:** HTML, CSS, Vanilla JavaScript (ES modules)
- **OMR:** Audiveris (Java)

## License

MIT
