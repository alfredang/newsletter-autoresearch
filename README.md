# Nova Research

A modern, sleek web application for running automated research experiments using an iterative loop: **Hypothesis → Modify Code → Run → Evaluate → Keep/Discard → Repeat**.

![Nova Research](https://img.shields.io/badge/Version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

- **Experiment Loop Workflow**: Systematic research iteration with clear stages
- **Multi-Category Support**: Marketing, Trading, ML, Product, Business, Custom projects
- **Hypothesis Management**: Define testable ideas with detailed parameters
- **Code Versioning**: Track changes to experiment logic per iteration
- **Run Execution**: Manual runs, quick runs (5 min), and scheduled runs
- **Evaluation System**: Metrics, charts, pass/fail status
- **Keep/Discard Decisions**: Git-like commit/reset workflow
- **Dark Mode**: Default dark theme with light mode toggle
- **Responsive Design**: Mobile-friendly interface

## 🖥️ Screenshot

![Nova Research Dashboard](https://placehold.co/1200x800/0a0a0f/6366f1?text=Nova+Research+Dashboard)

## �️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon DB (PostgreSQL)
- **Authentication**: NextAuth.js (Google, GitHub)
- **AI Agent**: Claude Agent SDK integration
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18.x or later
- npm or yarn
- Neon DB account (free tier available)
- Google OAuth app (for sign-in)
- GitHub OAuth app (for sign-in)
- Anthropic API key (for Claude Agent SDK)

## 🔧 Installation

1. **Clone the repository**:
```bash
git clone https://github.com/alfredang/novaresearch.git
cd novaresearch/app
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
```

4. **Configure environment variables** in `.env.local`:

```env
# Database (Neon DB)
DATABASE_URL=postgres://user:pass@host.neon.tech/db?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Claude Agent SDK (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

5. **Run the development server**:
```bash
npm run dev
```

6. **Open**: http://localhost:3000

## 🎯 Usage Guide

### 1. Create a Project
- Click "New Project" on the Dashboard
- Select a category (Marketing, Trading, ML, etc.)
- Set a goal and optional tags

### 2. Create a Hypothesis
- Open your project and click "New Hypothesis"
- Define your testable statement
- Set success criteria and expected impact

### 3. Modify Code
- In the iteration, click "Modify"
- Update experiment logic, prompts, or config
- Optionally use "AI Suggest" for Claude-powered help

### 4. Run Experiment
- Choose Manual or Quick Run (5 min)
- Watch progress and logs
- Wait for completion

### 5. Evaluate Results
- Review metrics and score
- Check pass/fail status
- Read AI-generated summary

### 6. Make Decision
- **Keep**: Accept iteration as new baseline (like git commit)
- **Discard**: Reject and revert (like git reset)

### 7. Repeat
- Create a new hypothesis
- Continue iterating!

## 📁 Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   └── auth/          # NextAuth endpoints
│   │   ├── auth/              # Auth pages
│   │   ├── dashboard/         # Dashboard
│   │   ├── projects/          # Projects CRUD
│   │   ├── settings/          # Settings page
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── layout/            # Layout components
│   │   └── providers/         # Context providers
│   ├── lib/                   # Core libraries
│   │   ├── auth.ts           # NextAuth config
│   │   ├── db/               # Database schema & connection
│   │   └── utils.ts          # Utility functions
│   └── types/                 # TypeScript definitions
├── public/                    # Static assets
├── tailwind.config.ts        # Tailwind config
├── next.config.ts            # Next.js config
└── package.json              # Dependencies
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon DB connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Yes |
| `NEXTAUTH_URL` | Your app's URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Yes |
| `ANTHROPIC_API_KEY` | For Claude Agent SDK | Optional |

## 🚀 Deployment to Vercel

1. **Push to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Set up Neon DB**:
   - Create a new project on [neon.tech](https://neon.tech)
   - Get your connection string
   - Add to Vercel environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by [Karpathy's Autoresearch](https://github.com/karpathy/autoresearch)
- Built with [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com), and [Neon DB](https://neon.tech)
- Powered by [Claude Agent SDK](https://www.anthropic.com/claude)
- Powered by [Tertiary Infotech Academy Pte Ltd](https://www.tertiarycourses.com.sg/)

---

<p align="center">Built with ❤️ for researchers, by researchers</p>
