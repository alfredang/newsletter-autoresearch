'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Beaker, 
  GitBranch, 
  Play, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Clock,
  Settings,
  MoreVertical
} from 'lucide-react';
import { db } from '@/lib/db';
import { projects, hypotheses, experimentIterations, experimentRuns, evaluations, decisions, codeVersions } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { formatDate, getCategoryColor, getStatusColor } from '@/lib/utils';

const workflowStages = [
  { key: 'hypothesis', label: 'Hypothesis', icon: Beaker },
  { key: 'modifying', label: 'Modify Code', icon: GitBranch },
  { key: 'running', label: 'Run', icon: Play },
  { key: 'evaluating', label: 'Evaluate', icon: BarChart3 },
  { key: 'decided', label: 'Decision', icon: CheckCircle },
];

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [hypothesesList, setHypothesesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id && projectId) {
      fetchProjectData();
    }
  }, [session, projectId]);

  async function fetchProjectData() {
    try {
      const projectData = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.userId, session?.user?.id!)
        ))
        .limit(1);

      if (!projectData[0]) {
        router.push('/projects');
        return;
      }

      setProject(projectData[0]);

      // Get hypotheses with their iterations
      const hypothesesData = await db.select()
        .from(hypotheses)
        .where(eq(hypotheses.projectId, projectId))
        .orderBy(desc(hypotheses.createdAt));

      // Get iterations for each hypothesis
      const hypothesesWithIterations = await Promise.all(
        hypothesesData.map(async (hypothesis) => {
          const iterations = await db.select()
            .from(experimentIterations)
            .where(eq(experimentIterations.hypothesisId, hypothesis.id))
            .orderBy(desc(experimentIterations.iterationNumber));

          // Get latest run for each iteration
          const iterationsWithRuns = await Promise.all(
            iterations.map(async (iteration) => {
              let run = null;
              let evaluation = null;
              let decision = null;
              let codeVersion = null;

              if (iteration.runId) {
                run = await db.select()
                  .from(experimentRuns)
                  .where(eq(experimentRuns.id, iteration.runId))
                  .limit(1);
                run = run[0];

                if (run) {
                  const evals = await db.select()
                    .from(evaluations)
                    .where(eq(evaluations.runId, run.id))
                    .limit(1);
                  evaluation = evals[0];
                }
              }

              if (iteration.decisionId) {
                const decs = await db.select()
                  .from(decisions)
                  .where(eq(decisions.id, iteration.decisionId))
                  .limit(1);
                decision = decs[0];
              }

              if (iteration.codeVersionId) {
                const cv = await db.select()
                  .from(codeVersions)
                  .where(eq(codeVersions.id, iteration.codeVersionId))
                  .limit(1);
                codeVersion = cv[0];
              }

              return { ...iteration, run, evaluation, decision, codeVersion };
            })
          );

          return { ...hypothesis, iterations: iterationsWithRuns };
        })
      );

      setHypothesesList(hypothesesWithIterations);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentStage(iteration: any): string {
    if (iteration.decision) return 'decided';
    if (iteration.evaluation) return 'evaluating';
    if (iteration.run) return 'running';
    if (iteration.codeVersion) return 'modifying';
    return 'hypothesis';
  }

  if (status === 'loading' || loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link 
            href="/projects" 
            className="mt-1 p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
            <p className="text-text-secondary mt-1">{project.description || 'No description'}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`badge ${getCategoryColor(project.category)}`}>
                {project.category}
              </span>
              <span className={`badge ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              {project.goal && (
                <span className="text-sm text-text-secondary">
                  Goal: {project.goal}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/projects/${projectId}/hypothesis/new`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} /> New Hypothesis
          </Link>
        </div>
      </div>

      {/* Experiment Loop Visualization */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Experiment Workflow</h2>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {workflowStages.map((stage, index) => (
            <div key={stage.key} className="flex items-center">
              <div className="workflow-stage workflow-stage-pending">
                <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center">
                  <stage.icon className="w-5 h-5 text-text-secondary" />
                </div>
                <span className="text-sm text-text-secondary">{stage.label}</span>
              </div>
              {index < workflowStages.length - 1 && (
                <div className="w-8 h-px bg-border mx-2 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-background-tertiary rounded-lg">
          <p className="text-sm text-text-secondary">
            <span className="text-accent-cyan font-medium">Remember:</span> The experiment loop flows: 
            Hypothesis → Modify Code → Run → Evaluate → Keep/Discard → Repeat
          </p>
        </div>
      </div>

      {/* Hypotheses & Iterations */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Hypotheses & Iterations</h2>
        
        {hypothesesList.length === 0 ? (
          <div className="card text-center py-12">
            <Beaker className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No hypotheses yet</h3>
            <p className="text-text-secondary mb-6">Start your first experiment by creating a hypothesis</p>
            <Link 
              href={`/projects/${projectId}/hypothesis/new`} 
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} /> Create Hypothesis
            </Link>
          </div>
        ) : (
          hypothesesList.map((hypothesis) => (
            <div key={hypothesis.id} className="card">
              {/* Hypothesis Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">{hypothesis.title}</h3>
                    <span className={`badge ${getStatusColor(hypothesis.status)}`}>
                      {hypothesis.status}
                    </span>
                  </div>
                  <p className="text-text-secondary mb-2">{hypothesis.statement}</p>
                  {hypothesis.rationale && (
                    <p className="text-sm text-text-secondary">
                      <span className="text-text-primary">Why:</span> {hypothesis.rationale}
                    </p>
                  )}
                </div>
                <Link 
                  href={`/projects/${projectId}/hypothesis/${hypothesis.id}`}
                  className="btn-secondary text-sm"
                >
                  View Details
                </Link>
              </div>

              {/* Iterations */}
              {hypothesis.iterations && hypothesis.iterations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text-secondary">Iterations</h4>
                  {hypothesis.iterations.map((iteration: any) => {
                    const currentStage = getCurrentStage(iteration);
                    return (
                      <div 
                        key={iteration.id} 
                        className="flex items-center gap-4 p-4 bg-background-tertiary rounded-lg"
                      >
                        <div className="text-lg font-bold text-accent-primary">
                          #{iteration.iterationNumber}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${
                              currentStage === 'hypothesis' ? 'text-accent-primary' :
                              currentStage === 'modifying' ? 'text-accent-warning' :
                              currentStage === 'running' ? 'text-accent-warning' :
                              currentStage === 'evaluating' ? 'text-accent-cyan' :
                              iteration.decision?.decision === 'keep' ? 'text-accent-success' :
                              'text-accent-danger'
                            }`}>
                              {currentStage === 'hypothesis' ? 'Created' :
                               currentStage === 'modifying' ? 'Code Modified' :
                               currentStage === 'running' ? iteration.run?.status || 'Running' :
                               currentStage === 'evaluating' ? 'Evaluating' :
                               iteration.decision?.decision === 'keep' ? 'Kept' : 'Discarded'}
                            </span>
                          </div>
                          {iteration.run?.status === 'completed' && iteration.evaluation && (
                            <div className="text-sm text-text-secondary">
                              Score: {iteration.evaluation.score?.toFixed(4) || 'N/A'} | 
                              Status: {iteration.evaluation.status}
                            </div>
                          )}
                        </div>

                        {/* Action buttons based on stage */}
                        <div className="flex gap-2">
                          {!iteration.codeVersion && (
                            <Link 
                              href={`/projects/${projectId}/modify/${iteration.id}`}
                              className="btn-secondary text-sm py-1 px-3"
                            >
                              <GitBranch size={14} className="mr-1" /> Modify
                            </Link>
                          )}
                          {!iteration.run && iteration.codeVersion && (
                            <Link 
                              href={`/projects/${projectId}/run/${iteration.id}`}
                              className="btn-primary text-sm py-1 px-3"
                            >
                              <Play size={14} className="mr-1" /> Run
                            </Link>
                          )}
                          {iteration.run?.status === 'completed' && !iteration.decision && (
                            <Link 
                              href={`/projects/${projectId}/decision/${iteration.id}`}
                              className="btn-secondary text-sm py-1 px-3"
                            >
                              Decide
                            </Link>
                          )}
                          {iteration.decision && (
                            <Link 
                              href={`/projects/${projectId}/evaluate/${iteration.run?.id}`}
                              className="btn-secondary text-sm py-1 px-3"
                            >
                              View Results
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Iteration Button */}
              <div className="mt-4 pt-4 border-t border-border">
                <Link 
                  href={`/projects/${projectId}/hypothesis/${hypothesis.id}/iterate`}
                  className="text-sm text-accent-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={14} /> Add Iteration
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="card bg-gradient-to-r from-accent-primary/5 to-accent-cyan/5 border-accent-primary/20">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link 
            href={`/projects/${projectId}/schedule`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Clock size={16} /> Schedule Runs
          </Link>
          <Link 
            href={`/projects/${projectId}/settings`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Settings size={16} /> Project Settings
          </Link>
        </div>
      </div>
    </div>
  );
}