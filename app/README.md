# Nova Research Web App (Vanilla JS + Firebase)

This folder now contains a plain HTML/CSS/JavaScript single-page app.

## Stack

- Frontend: HTML + CSS + JavaScript (no React, no Next.js)
- Auth: Firebase Authentication (Google and GitHub social login)
- Database: Firebase Firestore
- Research automation loop: Python scripts at repository root (unchanged)

## Setup

1. Create Firebase project and enable:
   - Authentication -> Sign-in methods -> Google + GitHub
   - Firestore Database

2. Create local Firebase config file:

```bash
cp firebase-config.example.js firebase-config.js
```

3. Fill `firebase-config.js` with your Firebase Web App config values.

4. Run local server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Route Coverage

The vanilla app keeps the same functional pages via hash routes:

- `#/` landing page
- `#/signin` social login
- `#/dashboard`
- `#/projects`
- `#/projects/new`
- `#/projects/:id`
- `#/projects/:id/hypothesis/new`
- `#/projects/:id/modify/:iterationId`
- `#/projects/:id/run/:iterationId`
- `#/projects/:id/decision/:iterationId`
- `#/hypotheses`
- `#/settings`

## Important

- Python files and GitHub Actions for the auto-research loop remain at repository root.
- `firebase-config.js` is intentionally gitignored to prevent leaking credentials.
