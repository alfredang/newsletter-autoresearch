# Auto Research Web App - Specification

## Project Overview

- **Project Name:** AutoResearch Lab
- **Type:** Web Application (SaaS)
- **Core Functionality:** A modern auto research platform enabling users to run iterative experiment loops: Hypothesis → Modify Code → Train/Run → Evaluate → Keep/Discard → Repeat
- **Target Users:** Researchers, marketers, traders, ML engineers, product managers, growth hackers

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router), TypeScript
- **Database:** Neon DB (PostgreSQL)
- **Authentication:** NextAuth.js with Google & GitHub providers
- **AI Agent:** Claude Agent SDK (@anthropic-ai/claude-sdk)
- **Styling:** Tailwind CSS with custom dark theme
- **Deployment:** Vercel

## UI/UX Specification

### Layout Structure

**Pages:**
1. Landing Page (`/`) - Marketing page with experiment loop explanation
2. Dashboard (`/dashboard`) - Overview of all projects and stats
3. Projects List (`/projects`) - Searchable project list
4. Project Detail (`/projects/[id]`) - Full experiment loop view
5. Hypothesis Form (`/projects/[id]/hypothesis/new`) - Create new hypothesis
6. Modify Code (`/projects/[id]/modify/[iterationId]`) - Code/workflow editor
7. Run Monitor (`/projects/[id]/run/[runId]`) - Live experiment progress
8. Evaluation (`/projects/[id]/evaluate/[runId]`) - Results and metrics
9. Decision (`/projects/[id]/decision/[iterationId]`) - Keep/Discard UI
10. Settings (`/settings`) - Theme toggle, account preferences

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Visual Design

**Color Palette (Dark Theme Default):**
- Background Primary: `#0a0a0f` (deep midnight)
- Background Secondary: `#12121a` (card backgrounds)
- Background Tertiary: `#1a1a24` (elevated surfaces)
- Border: `#2a2a3a` (subtle borders)
- Text Primary: `#f0f0f5` (main text)
- Text Secondary: `#8888a0` (muted text)
- Accent Primary: `#6366f1` (indigo - main actions)
- Accent Success: `#10b981` (emerald - keep/positive)
- Accent Warning: `#f59e0b` (amber - pending/review)
- Accent Danger: `#ef4444` (red - discard/negative)
- Accent Cyan: `#06b6d4` (info/highlight)

**Typography:**
- Font Family: `Inter` for UI, `JetBrains Mono` for code
- Headings: 700 weight, tracking-tight
- Body: 400 weight, 16px base
- Code: 14px, monospace

**Spacing System:**
- Base unit: 4px
- Padding: 16px (cards), 24px (sections)
- Gaps: 8px (tight), 16px (normal), 24px (loose)
- Border radius: 8px (cards), 6px (buttons), 4px (inputs)

**Visual Effects:**
- Card shadows: `0 4px 24px rgba(0,0,0,0.4)`
- Hover transitions: 150ms ease
- Gradient accents: subtle radial gradients on key elements
- Glassmorphism: backdrop-blur on overlays

### Components

**Navigation:**
- Sidebar (desktop): 240px fixed, collapsible on tablet
- Mobile: Bottom tab bar with 5 items
- Logo + user avatar in header

**Cards:**
- Project cards: Name, category badge, status indicator, last activity
- Iteration cards: Stage indicator, timestamp, metrics summary
- Stat cards: Large number, label, trend indicator

**Buttons:**
- Primary: Indigo background, white text
- Secondary: Transparent with border
- Ghost: No background, hover highlight
- Danger: Red for destructive actions

**Forms:**
- Dark inputs with subtle borders
- Floating labels or top-aligned labels
- Validation states with colored borders

**Workflow Visualizer:**
- Horizontal timeline showing: Hypothesis → Modify → Run → Evaluate → Decision
- Current stage highlighted
- Completed stages checkmarked

**Charts:**
- Line charts for metric trends
- Bar charts for comparison
- Donut charts for distribution

## Database Schema (Neon DB)

```sql
-- Users table (extends NextAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('marketing', 'trading', 'ml', 'product', 'business', 'custom')),
  goal TEXT,
  default_metrics JSONB DEFAULT '[]',
  default_targets JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hypotheses
CREATE TABLE hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  rationale TEXT,
  variables_changed TEXT,
  expected_impact TEXT,
  success_criteria TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Experiment Iterations
CREATE TABLE experiment_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE CASCADE,
  iteration_number INTEGER NOT NULL,
  code_version_id UUID,
  run_id UUID,
  evaluation_id UUID,
  decision_id UUID,
  status TEXT DEFAULT 'hypothesis',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Code Versions (Modify Code stage)
CREATE TABLE code_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_id UUID REFERENCES experiment_iterations(id) ON DELETE CASCADE,
  code_content JSONB NOT NULL,
  config JSONB DEFAULT '{}',
  description TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Experiment Runs
CREATE TABLE experiment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_id UUID REFERENCES experiment_iterations(id) ON DELETE CASCADE,
  run_type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  config JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  logs TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Metrics
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES experiment_runs(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  target_value FLOAT,
  unit TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Evaluations
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES experiment_runs(id) ON DELETE CASCADE,
  summary TEXT,
  score FLOAT,
  status TEXT DEFAULT 'pending',
  recommendations JSONB DEFAULT '[]',
  charts_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Decisions (Keep/Discard)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iteration_id UUID REFERENCES experiment_iterations(id) ON DELETE CASCADE,
  decision TEXT CHECK (decision IN ('keep', 'discard')),
  reason TEXT,
  notes TEXT,
  decided_at TIMESTAMP DEFAULT NOW(),
  decided_by UUID REFERENCES users(id)
);

-- Schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  iteration_id UUID,
  cron_expression TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Functionality Specification

### 1. Authentication
- Sign in with Google or GitHub via NextAuth.js
- Session management with JWT
- Protected routes requiring authentication

### 2. Project Management
- Create, edit, delete research projects
- Set project category, goal, default metrics/targets
- Tag projects for organization
- Search and filter projects

### 3. Hypothesis Workflow
- Create hypothesis with title, statement, rationale
- Define variables, expected impact, success criteria
- Track hypothesis status (draft → active → completed)

### 4. Modify Code Stage
- Visual code editor for experiment logic
- Version history of changes
- Node.js-based workflow (converted from Python)
- Claude Agent SDK integration for automated modifications

### 5. Train/Run Stage
- Manual run trigger
- Quick-run mode (e.g., "Train 5 min")
- Live progress monitoring with logs
- Run configuration (metrics, targets, resources)

### 6. Evaluation Stage
- Display metrics with charts
- Compare against targets
- Show pass/fail/review status
- Agent-generated summary and recommendations

### 7. Keep/Discard Decision
- Clear visual decision UI
- Git-like commit/reset metaphor
- Track decision history
- Optional notes and reasons

### 8. Repeat Loop
- Clone previous hypothesis for iteration
- Suggest next experiments via Claude Agent
- View experiment history timeline

### 9. Scheduling
- Cron-based recurring runs
- Enable/disable schedules
- View upcoming runs

### 10. Dashboard
- Stats: total projects, active hypotheses, runs, success rate
- Recent activity feed
- Upcoming scheduled runs

## Acceptance Criteria

1. ✅ User can sign in with Google or GitHub
2. ✅ User can create a new research project with all required fields
3. ✅ User can create a hypothesis within a project
4. ✅ User can modify experiment code in the Modify Code stage
5. ✅ User can trigger a manual experiment run
6. ✅ User can view evaluation results with metrics and charts
7. ✅ User can make Keep or Discard decision with visual feedback
8. ✅ User can view experiment history and repeat the loop
9. ✅ Dashboard displays accurate statistics
10. ✅ Dark theme is default, with light theme toggle
11. ✅ Responsive design works on mobile and tablet
12. ✅ App is ready for Vercel deployment with environment variables