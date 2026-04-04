'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, Beaker } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { hypotheses, experimentIterations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default function NewHypothesisPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    statement: '',
    rationale: '',
    variablesChanged: '',
    expectedImpact: '',
    successCriteria: '',
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      // Create hypothesis
      const hypothesisResult = await db.insert(hypotheses).values({
        projectId,
        title: formData.title,
        statement: formData.statement,
        rationale: formData.rationale,
        variablesChanged: formData.variablesChanged,
        expectedImpact: formData.expectedImpact,
        successCriteria: formData.successCriteria,
        notes: formData.notes,
        status: 'active',
      }).returning();

      const hypothesisId = hypothesisResult[0].id;

      // Create first iteration
      await db.insert(experimentIterations).values({
        hypothesisId,
        iterationNumber: 1,
        status: 'hypothesis',
      });

      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating hypothesis:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/projects/${projectId}`} 
          className="p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">New Hypothesis</h1>
          <p className="text-text-secondary">Define your testable idea</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          {/* Title */}
          <div>
            <label className="label">Hypothesis Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Better subject lines improve open rates"
              className="input"
              required
            />
          </div>

          {/* Statement */}
          <div>
            <label className="label">Hypothesis Statement *</label>
            <textarea
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              placeholder="If [action], then [expected outcome] because [rationale]"
              className="input min-h-[100px]"
              rows={3}
              required
            />
          </div>

          {/* Rationale */}
          <div>
            <label className="label">Why This Might Work</label>
            <textarea
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
              placeholder="Explain the reasoning behind your hypothesis..."
              className="input min-h-[80px]"
              rows={3}
            />
          </div>

          {/* Variables */}
          <div>
            <label className="label">Variables Being Changed</label>
            <textarea
              value={formData.variablesChanged}
              onChange={(e) => setFormData({ ...formData, variablesChanged: e.target.value })}
              placeholder="What specific elements are you testing?"
              className="input"
              rows={2}
            />
          </div>

          {/* Expected Impact */}
          <div>
            <label className="label">Expected Impact</label>
            <input
              type="text"
              value={formData.expectedImpact}
              onChange={(e) => setFormData({ ...formData, expectedImpact: e.target.value })}
              placeholder="e.g., Open rate increase from 35% to 40%"
              className="input"
            />
          </div>

          {/* Success Criteria */}
          <div>
            <label className="label">Success Criteria</label>
            <textarea
              value={formData.successCriteria}
              onChange={(e) => setFormData({ ...formData, successCriteria: e.target.value })}
              placeholder="What metrics define success for this experiment?"
              className="input"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any assumptions, constraints, or context..."
              className="input"
              rows={2}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href={`/projects/${projectId}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.title || !formData.statement}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Create Hypothesis
          </button>
        </div>
      </form>
    </div>
  );
}