'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Play, Clock, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { experimentIterations, experimentRuns, codeVersions, evaluations, metrics } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type RunType = 'manual' | 'quick';

export default function RunExperimentPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const iterationId = params.iterationId as string;
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [runType, setRunType] = useState<RunType>('manual');
  const [iteration, setIteration] = useState<any>(null);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (iterationId) {
      fetchIteration();
    }
  }, [iterationId]);

  async function fetchIteration() {
    const result = await db.select()
      .from(experimentIterations)
      .where(eq(experimentIterations.id, iterationId))
      .limit(1);
    
    if (result[0]) {
      setIteration(result[0]);
    }
  }

  async function handleRun() {
    if (!iteration) return;

    setLoading(true);
    setRunStatus('running');
    setLogs(['Initializing experiment run...']);
    setProgress(10);

    try {
      // Create experiment run
      const runResult = await db.insert(experimentRuns).values({
        iterationId,
        runType,
        status: 'running',
        config: { runType, startedAt: new Date().toISOString() },
        startedAt: new Date(),
      }).returning();

      const runId = runResult[0].id;

      // Update iteration
      await db.update(experimentIterations)
        .set({ runId, status: 'running' })
        .where(eq(experimentIterations.id, iterationId));

      // Simulate experiment run (in production, this would be a real execution)
      const steps = [
        { msg: 'Loading code version...', progress: 20 },
        { msg: 'Validating configuration...', progress: 30 },
        { msg: 'Executing experiment logic...', progress: 50 },
        { msg: 'Collecting metrics...', progress: 70 },
        { msg: 'Computing scores...', progress: 90 },
        { msg: 'Completed!', progress: 100 },
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLogs(prev => [...prev, step.msg]);
        setProgress(step.progress);
      }

      // Generate mock metrics
      const mockMetrics = [
        { metricName: 'score', metricValue: Math.random() * 0.5 + 0.3, targetValue: 0.4, unit: 'ratio' },
        { metricName: 'open_rate', metricValue: Math.random() * 0.3 + 0.2, targetValue: 0.4, unit: 'ratio' },
        { metricName: 'click_rate', metricValue: Math.random() * 0.2 + 0.05, targetValue: 0.15, unit: 'ratio' },
      ];

      for (const m of mockMetrics) {
        await db.insert(metrics).values({
          runId,
          ...m,
        });
      }

      // Create evaluation
      const score = mockMetrics[0].metricValue;
      const evalResult = await db.insert(evaluations).values({
        runId,
        score,
        status: score >= 0.4 ? 'pass' : 'fail',
        summary: `Experiment completed with score ${score.toFixed(4)}. ${score >= 0  ? 'Meets target threshold.' : 'Below target threshold.'}`,
        recommendations: score >= 0.4 
          ? ['Consider keeping this iteration', 'Try further improvements']
          : ['Consider discarding this iteration', 'Review the hypothesis'],
      }).returning();

      // Update run as completed
      await db.update(experimentRuns)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          logs: logs.join('\n'),
        })
        .where(eq(experimentRuns.id, runId));

      // Update iteration
      await db.update(experimentIterations)
        .set({ 
          status: 'evaluating',
          evaluationId: evalResult[0].id,
        })
        .where(eq(experimentIterations.id, iterationId));

      setRunStatus('completed');
      setLogs(prev => [...prev, `Run completed successfully! Score: ${score.toFixed(4)}`]);

    } catch (error) {
      console.error('Error running experiment:', error);
      setRunStatus('failed');
      setLogs(prev => [...prev, `Error: ${error}`]);
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-3xl font-bold text-text-primary">Run Experiment</h1>
          <p className="text-text-secondary">Iteration #{iteration?.iterationNumber || 1}</p>
        </div>
      </div>

      {/* Run Type Selection */}
      <div className="card">
        <h3 className="font-semibold text-text-primary mb-4">Select Run Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setRunType('manual')}
            className={`p-4 rounded-lg border text-left transition-all ${
              runType === 'manual'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-border hover:border-text-secondary'
            }`}
          >
            <div className="font-medium text-text-primary">Manual Run</div>
            <div className="text-sm text-text-secondary">Full execution with all configurations</div>
          </button>
          <button
            onClick={() => setRunType('quick')}
            className={`p-4 rounded-lg border text-left transition-all ${
              runType === 'quick'
                ? 'border-accent-warning bg-accent-warning/10'
                : 'border-border hover:border-text-secondary'
            }`}
          >
            <div className="font-medium text-text-primary flex items-center gap-2">
              Quick Run (5 min)
              <span className="badge badge-warning">Fast</span>
            </div>
            <div className="text-sm text-text-secondary">Accelerated execution for quick iteration</div>
          </button>
        </div>
      </div>

      {/* Run Button */}
      {runStatus === 'idle' && (
        <div className="card text-center py-8">
          <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-accent-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Ready to Run</h3>
          <p className="text-text-secondary mb-6">
            Your code is ready. Click below to execute this experiment iteration.
          </p>
          <button
            onClick={handleRun}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play size={20} />
            )}
            Start Experiment
          </button>
        </div>
      )}

      {/* Running Status */}
      {runStatus === 'running' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-accent-warning/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-accent-warning animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Experiment Running...</h3>
              <p className="text-text-secondary">Please wait while your experiment executes</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Logs */}
          <div className="bg-background-tertiary rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <div className="text-sm font-mono space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-text-secondary">
                  <span className="text-accent-cyan">›</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completed Status */}
      {runStatus === 'completed' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-accent-success/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Experiment Completed!</h3>
              <p className="text-text-secondary">Review your results and make a decision</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/projects/${projectId}/decision/${iterationId}`}
              className="btn-primary"
            >
              Make Decision (Keep/Discard)
            </Link>
            <Link
              href={`/projects/${projectId}`}
              className="btn-secondary"
            >
              Back to Project
            </Link>
          </div>
        </div>
      )}

      {/* Failed Status */}
      {runStatus === 'failed' && (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-danger/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-accent-danger" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Experiment Failed</h3>
              <p className="text-text-secondary">Check the logs for details</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}