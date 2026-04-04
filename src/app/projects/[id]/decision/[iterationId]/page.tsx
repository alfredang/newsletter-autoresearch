'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle, XCircle, GitCommit, RotateCcw, AlertCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { experimentIterations, experimentRuns, evaluations, decisions, metrics } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default function DecisionPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const iterationId = params.iterationId as string;
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [iteration, setIteration] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [metricsList, setMetricsList] = useState<any[]>([]);
  const [decision, setDecision] = useState<'keep' | 'discard' | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (iterationId) {
      fetchData();
    }
  }, [iterationId]);

  async function fetchData() {
    // Get iteration
    const iterResult = await db.select()
      .from(experimentIterations)
      .where(eq(experimentIterations.id, iterationId))
      .limit(1);
    
    if (iterResult[0]) {
      setIteration(iterResult[0]);

      // Get run
      if (iterResult[0].runId) {
        const runResult = await db.select()
          .from(experimentRuns)
          .where(eq(experimentRuns.id, iterResult[0].runId))
          .limit(1);
        if (runResult[0]) {
          setRun(runResult[0]);

          // Get evaluation
          if (iterResult[0].evaluationId) {
            const evalResult = await db.select()
              .from(evaluations)
              .where(eq(evaluations.id, iterResult[0].evaluationId))
              .limit(1);
            if (evalResult[0]) {
              setEvaluation(evalResult[0]);
            }
          }

          // Get metrics
          const metricsResult = await db.select()
            .from(metrics)
            .where(eq(metrics.runId, runResult[0].id));
          setMetricsList(metricsResult);
        }
      }
    }
  }

  async function handleDecision(choice: 'keep' | 'discard') {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const decisionResult = await db.insert(decisions).values({
        iterationId,
        decision: choice,
        reason,
        decidedBy: session.user.id,
      }).returning();

      // Update iteration status
      await db.update(experimentIterations)
        .set({
          decisionId: decisionResult[0].id,
          status: 'decided',
        })
        .where(eq(experimentIterations.id, iterationId));

      // Update hypothesis status based on decision
      if (iteration?.hypothesisId) {
        // In a full implementation, we'd update the hypothesis status here
      }

      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error saving decision:', error);
    } finally {
      setLoading(false);
    }
  }

  const score = evaluation?.score || 0;
  const isPass = evaluation?.status === 'pass';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/projects/${projectId}`} 
          className="p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Decision</h1>
          <p className="text-text-secondary">Iteration #{iteration?.iterationNumber || 1}</p>
        </div>
      </div>

      {/* Evaluation Results */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Evaluation Results</h2>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between p-6 bg-background-tertiary rounded-lg mb-6">
          <div>
            <div className="text-sm text-text-secondary mb-1">Overall Score</div>
            <div className="text-3xl font-bold text-text-primary">{score.toFixed(4)}</div>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isPass ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-danger/20 text-accent-danger'
          }`}>
            <span className="font-semibold">{isPass ? 'PASS' : 'FAIL'}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3 mb-6">
          <h3 className="font-medium text-text-primary">Metrics</h3>
          {metricsList.map((metric) => (
            <div key={metric.id} className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
              <div>
                <div className="font-medium text-text-primary">{metric.metricName}</div>
                {metric.targetValue && (
                  <div className="text-sm text-text-secondary">Target: {metric.targetValue.toFixed(4)}</div>
                )}
              </div>
              <div className="text-right">
                <div className={`font-bold ${
                  metric.targetValue ? (metric.metricValue >= metric.targetValue ? 'text-accent-success' : 'text-accent-danger') : 'text-text-primary'
                }`}>
                  {metric.metricValue.toFixed(4)}
                </div>
                <div className="text-xs text-text-secondary">{metric.unit}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {evaluation?.summary && (
          <div className="p-4 bg-background-tertiary rounded-lg">
            <h3 className="font-medium text-text-primary mb-2">Summary</h3>
            <p className="text-text-secondary">{evaluation.summary}</p>
          </div>
        )}
      </div>

      {/* Decision Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Make Your Decision</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Keep Option */}
          <button
            onClick={() => setDecision('keep')}
            disabled={loading}
            className={`p-6 rounded-lg border text-left transition-all ${
              decision === 'keep'
                ? 'border-accent-success bg-accent-success/10'
                : 'border-border hover:border-accent-success/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent-success/20 flex items-center justify-center">
                <GitCommit className="w-5 h-5 text-accent-success" />
              </div>
              <div className="font-semibold text-text-primary">Keep</div>
            </div>
            <p className="text-sm text-text-secondary">
              Accept this iteration as the new baseline. Like a git commit, this marks a successful improvement.
            </p>
          </button>

          {/* Discard Option */}
          <button
            onClick={() => setDecision('discard')}
            disabled={loading}
            className={`p-6 rounded-lg border text-left transition-all ${
              decision === 'discard'
                ? 'border-accent-danger bg-accent-danger/10'
                : 'border-border hover:border-accent-danger/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent-danger/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-accent-danger" />
              </div>
              <div className="font-semibold text-text-primary">Discard</div>
            </div>
            <p className="text-sm text-text-secondary">
              Reject this iteration. Like a git reset, you'll revert to the previous accepted baseline.
            </p>
          </button>
        </div>

        {/* Reason Input */}
        {decision && (
          <div className="mb-6">
            <label className="label">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you making this decision?"
              className="input"
              rows={3}
            />
          </div>
        )}

        {/* Submit */}
        {decision && (
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision(decision)}
              disabled={loading}
              className={decision === 'keep' ? 'btn-success' : 'btn-danger'}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : decision === 'keep' ? (
                <>
                  <CheckCircle size={18} className="mr-2" />
                  Confirm Keep
                </>
              ) : (
                <>
                  <XCircle size={18} className="mr-2" />
                  Confirm Discard
                </>
              )}
            </button>
            <button
              onClick={() => setDecision(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="card bg-accent-cyan/5 border-accent-cyan/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-text-primary">Remember the Loop</h3>
            <p className="text-sm text-text-secondary mt-1">
              After making your decision, you can create a new hypothesis and repeat the experiment loop!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}