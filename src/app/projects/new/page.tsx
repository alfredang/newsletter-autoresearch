'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';

const categories = [
  { value: 'marketing', label: 'Marketing', desc: 'A/B tests, campaigns, copy variants' },
  { value: 'trading', label: 'Trading', desc: 'Strategy parameters, risk rules' },
  { value: 'ml', label: 'Machine Learning', desc: 'Prompts, models, data pipelines' },
  { value: 'product', label: 'Product / UX', desc: 'Features, UI, user flows' },
  { value: 'business', label: 'Business', desc: 'Pricing, operations' },
  { value: 'custom', label: 'Custom', desc: 'Any research workflow' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    goal: '',
    defaultMetrics: [] as string[],
    defaultTargets: {} as Record<string, number>,
    tags: [] as string[],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const result = await db.insert(projects).values({
        userId: session.user.id,
        name: formData.name,
        description: formData.description,
        category: formData.category as any,
        goal: formData.goal,
        defaultMetrics: formData.defaultMetrics,
        defaultTargets: formData.defaultTargets,
        tags: formData.tags,
        status: 'active',
      }).returning();

      router.push(`/projects/${result[0].id}`);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/projects" 
          className="p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">New Project</h1>
          <p className="text-text-secondary">Create a new research project</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          {/* Name */}
          <div>
            <label className="label">Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Newsletter Optimization"
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this research project about?"
              className="input min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">Category *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.category === cat.value
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border hover:border-text-secondary'
                  }`}
                >
                  <div className="font-medium text-text-primary">{cat.label}</div>
                  <div className="text-xs text-text-secondary">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="label">Research Goal</label>
            <input
              type="text"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              placeholder="e.g., Increase open rate above 40%"
              className="input"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="e.g., newsletter, optimization, email"
              className="input"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/projects" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}