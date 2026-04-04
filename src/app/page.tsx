import Link from 'next/link';
import { Beaker, ArrowRight, CheckCircle, GitBranch, Play, BarChart3, RefreshCw } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Hero Section */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-cyan flex items-center justify-center">
              <Beaker className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary">Nova Research</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="text-text-secondary hover:text-text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signin" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-accent-primary/10 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6 tracking-tight">
                Run Experiments at
                <span className="text-gradient block mt-2">Lightspeed</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed">
                Transform your research workflow with the experiment loop: 
                Hypothesis → Modify → Run → Evaluate → Keep/Discard → Repeat
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signin" className="btn-primary inline-flex items-center justify-center gap-2 text-lg px-8 py-3">
                  Start Experimenting <ArrowRight size={20} />
                </Link>
                <Link href="#how-it-works" className="btn-secondary inline-flex items-center justify-center gap-2 text-lg px-8 py-3">
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Experiment Loop */}
        <section id="how-it-works" className="py-20 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">The Experiment Loop</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                A systematic approach to research that turns hypotheses into measurable outcomes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { icon: Beaker, label: 'Hypothesis', desc: 'Define your testable idea' },
                { icon: GitBranch, label: 'Modify', desc: 'Update code or config' },
                { icon: Play, label: 'Run', desc: 'Execute the experiment' },
                { icon: BarChart3, label: 'Evaluate', desc: 'Analyze results' },
                { icon: CheckCircle, label: 'Decide', desc: 'Keep or discard' },
                { icon: RefreshCw, label: 'Repeat', desc: 'Iterate and improve' },
              ].map((step, index) => (
                <div key={step.label} className="card text-center group hover:border-accent-primary transition-colors">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-primary/20 flex items-center justify-center group-hover:bg-accent-primary/30 transition-colors">
                    <step.icon className="w-6 h-6 text-accent-primary" />
                  </div>
                  <div className="text-xs text-accent-cyan font-medium mb-1">Step {index + 1}</div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{step.label}</h3>
                  <p className="text-sm text-text-secondary">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">Everything You Need</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                Build, test, and iterate on research projects with powerful tools
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Multi-Category Support',
                  desc: 'Marketing, Trading, ML, Product, Business experiments - all in one platform',
                  icon: '🎯'
                },
                {
                  title: 'Automated Runs',
                  desc: 'Manual triggers, scheduled runs, or quick 5-minute experiments',
                  icon: '⚡'
                },
                {
                  title: 'Clear Metrics',
                  desc: 'Visual charts, target comparisons, and AI-generated insights',
                  icon: '📊'
                },
                {
                  title: 'Keep/Discard Decisions',
                  desc: 'Git-like commit/reset workflow for your iterations',
                  icon: '🔀'
                },
                {
                  title: 'Claude Agent SDK',
                  desc: 'AI-powered suggestions and automated research tasks',
                  icon: '🤖'
                },
                {
                  title: 'Version History',
                  desc: 'Track every code change and iteration across experiments',
                  icon: '📜'
                },
              ].map((feature) => (
                <div key={feature.title} className="card hover:border-accent-primary/50 transition-colors">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
                  <p className="text-text-secondary">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">Research Use Cases</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">
                From marketing campaigns to ML experiments, power any research workflow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { category: 'Marketing', examples: 'A/B testing, email campaigns, copy variants' },
                { category: 'Trading', examples: 'Strategy parameters, risk rules, signal combinations' },
                { category: 'Machine Learning', examples: 'Prompt engineering, model configs, data pipelines' },
                { category: 'Product / UX', examples: 'Feature flags, UI layouts, user flows' },
                { category: 'Business', examples: 'Pricing models, operational workflows' },
                { category: 'Custom', examples: 'Any research workflow you can imagine' },
              ].map((useCase) => (
                <div key={useCase.category} className="card flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{useCase.category}</h3>
                    <p className="text-text-secondary">{useCase.examples}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Ready to Transform Your Research?
            </h2>
            <p className="text-text-secondary mb-8">
              Join researchers who are iterating faster and making better decisions
            </p>
            <Link href="/auth/signin" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
              Start Your First Experiment <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-cyan flex items-center justify-center">
              <Beaker className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-text-secondary">Nova Research</span>
          </div>
          <p className="text-sm text-text-secondary">
            © 2024 Nova Research. Powered by{' '}
            <a 
              href="https://www.tertiarycourses.com.sg/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              Tertiary Infotech Academy Pte Ltd
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
