'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  Beaker, 
  Play, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { db } from '@/lib/db';
import { projects, hypotheses, experimentIterations, experimentRuns, decisions } from '@/lib/db/schema';
import { eq, desc, and, sql, or, isNull } from 'drizzle-orm';

interface Stats {
  totalProjects: number;
  activeHypotheses: number;
  runningExperiments: number;
  completedRuns: number;
  keptIterations: number;
  discardedIterations: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  project: string;
  timestamp: string;
  status?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeHypotheses: 0,
    runningExperiments: 0,
    completedRuns: 0,
    keptIterations: 0,
    discardedIterations: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
    }
  }, [session]);

  async function fetchDashboardData() {
    try {
      // Get user projects
      const userProjects = await db.select()
        .from(projects)
        .where(eq(projects.userId, session?.user?.id!))
        .orderBy(desc(projects.updatedAt))
        .limit(5);
      
      setRecentProjects(userProjects);

      // Get stats
      const projectCount = await db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.userId, session?.user?.id!));
      
      const hypothesisCount = await db.select({ count: sql<number>`count(*)` })
        .from(hypotheses)
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(and(
          eq(projects.userId, session?.user?.id!),
          eq(hypotheses.status, 'active')
        ));

      const runningRuns = await db.select({ count: sql<number>`count(*)` })
        .from(experimentRuns)
        .innerJoin(experimentIterations, eq(experimentRuns.iterationId, experimentIterations.id))
        .innerJoin(hypotheses, eq(experimentIterations.hypothesisId, hypotheses.id))
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(and(
          eq(projects.userId, session?.user?.id!),
          eq(experimentRuns.status, 'running')
        ));

      const completedRuns = await db.select({ count: sql<number>`count(*)` })
        .from(experimentRuns)
        .innerJoin(experimentIterations, eq(experimentRuns.iterationId, experimentIterations.id))
        .innerJoin(hypotheses, eq(experimentIterations.hypothesisId, hypotheses.id))
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(and(
          eq(projects.userId, session?.user?.id!),
          eq(experimentRuns.status, 'completed')
        ));

      const keptDecisions = await db.select({ count: sql<number>`count(*)` })
        .from(decisions)
        .innerJoin(experimentIterations, eq(decisions.iterationId, experimentIterations.id))
        .innerJoin(hypotheses, eq(experimentIterations.hypothesisId, hypotheses.id))
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(and(
          eq(projects.userId, session?.user?.id!),
          eq(decisions.decision, 'keep')
        ));

      const discardedDecisions = await db.select({ count: sql<number>`count(*)` })
        .from(decisions)
        .innerJoin(experimentIterations, eq(decisions.iterationId, experimentIterations.id))
        .innerJoin(hypotheses, eq(experimentIterations.hypothesisId, hypotheses.id))
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(and(
          eq(projects.userId, session?.user?.id!),
          eq(decisions.decision, 'discard')
        ));

      setStats({
        totalProjects: projectCount[0]?.count || 0,
        activeHypotheses: hypothesisCount[0]?.count || 0,
        runningExperiments: runningRuns[0]?.count || 0,
        completedRuns: completedRuns[0]?.count || 0,
        keptIterations: keptDecisions[0]?.count || 0,
        discardedIterations: discardedDecisions[0]?.count || 0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const successRate = stats.keptIterations + stats.discardedIterations > 0 
    ? Math.round((stats.keptIterations / (stats.keptIterations + stats.discardedIterations)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back! Here's your research overview.</p>
        </div>
        <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} /> New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'accent-primary' },
          { label: 'Active Hypotheses', value: stats.activeHypotheses, icon: Beaker, color: 'accent-cyan' },
          { label: 'Running', value: stats.runningExperiments, icon: Play, color: 'accent-warning' },
          { label: 'Completed', value: stats.completedRuns, icon: CheckCircle, color: 'accent-success' },
          { label: 'Kept', value: stats.keptIterations, icon: TrendingUp, color: 'accent-success' },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'accent-primary' },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className={`w-10 h-10 rounded-lg bg-${stat.color}/20 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
            <div className="text-sm text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Projects & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Projects</h2>
            <Link href="/projects" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          
          {recentProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-4">No projects yet</p>
              <Link href="/projects/new" className="btn-primary">
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link 
                  key={project.id} 
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-background-tertiary hover:bg-background-tertiary/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{project.name}</h3>
                    <p className="text-sm text-text-secondary truncate">{project.category}</p>
                  </div>
                  <span className={`badge ${project.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {project.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
            <Clock size={18} className="text-text-secondary" />
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Beaker className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">No recent activity</p>
              <p className="text-sm text-text-secondary mt-1">Start an experiment to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.status === 'keep' ? 'bg-accent-success/20' : 
                    activity.status === 'discard' ? 'bg-accent-danger/20' : 'bg-accent-primary/20'
                  }`}>
                    {activity.status === 'keep' ? <CheckCircle className="w-4 h-4 text-accent-success" /> :
                     activity.status === 'discard' ? <XCircle className="w-4 h-4 text-accent-danger" /> :
                     <Play className="w-4 h-4 text-accent-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary truncate">{activity.title}</p>
                    <p className="text-sm text-text-secondary">{activity.project}</p>
                  </div>
                  <span className="text-xs text-text-secondary">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Experiment Loop Reminder */}
      <div className="card bg-gradient-to-r from-accent-primary/10 to-accent-cyan/10 border-accent-primary/30">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Running an Experiment?</h3>
            <p className="text-text-secondary">Remember the loop: Hypothesis → Modify → Run → Evaluate → Keep/Discard → Repeat</p>
          </div>
          <div className="flex gap-2">
            <Link href="/hypotheses" className="btn-primary">New Hypothesis</Link>
          </div>
        </div>
      </div>
    </div>
  );
}