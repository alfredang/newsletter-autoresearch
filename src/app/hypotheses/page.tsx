'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Beaker, Plus, Search, Filter, ArrowUpRight, TrendingUp, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { hypotheses, projects, experimentIterations, decisions } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export default function HypothesesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hypothesesList, setHypothesesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchHypotheses();
    }
  }, [session, searchQuery]);

  async function fetchHypotheses() {
    try {
      const result = await db.select()
        .from(hypotheses)
        .innerJoin(projects, eq(hypotheses.projectId, projects.id))
        .where(eq(projects.userId, session?.user?.id!))
        .orderBy(desc(hypotheses.createdAt));

      // Get decisions for each hypothesis
      const hypothesesWithDecisions = await Promise.all(
        result.map(async (h) => {
          const iterations = await db.select()
            .from(experimentIterations)
            .where(eq(experimentIterations.hypothesisId, h.hypotheses.id))
            .orderBy(desc(experimentIterations.iterationNumber));

          let latestDecision = null;
          for (const iter of iterations) {
            if (iter.decisionId) {
              const dec = await db.select()
                .from(decisions)
                .where(eq(decisions.id, iter.decisionId))
                .limit(1);
              if (dec[0]) {
                latestDecision = dec[0];
                break;
              }
            }
          }

          return {
            ...h.hypotheses,
            project: h.projects,
            iterations: iterations.length,
            latestDecision,
          };
        })
      );

      setHypothesesList(hypothesesWithDecisions);
    } catch (error) {
      console.error('Error fetching hypotheses:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Hypotheses</h1>
          <p className="text-text-secondary mt-1">All your research hypotheses across projects</p>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search hypotheses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Hypotheses List */}
      {hypothesesList.length === 0 ? (
        <div className="card text-center py-12">
          <Beaker className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No hypotheses yet</h3>
          <p className="text-text-secondary">
            Create a project first, then add hypotheses to start experimenting
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hypothesesList.map((hypothesis) => (
            <Link
              key={hypothesis.id}
              href={`/projects/${hypothesis.projectId}`}
              className="card hover:border-accent-primary/50 transition-all block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-text-primary">{hypothesis.title}</h3>
                    {hypothesis.latestDecision && (
                      <span className={`badge ${
                        hypothesis.latestDecision.decision === 'keep' 
                          ? 'badge-success' 
                          : 'badge-danger'
                      }`}>
                        {hypothesis.latestDecision.decision === 'keep' ? (
                          <TrendingUp size={12} className="mr-1" />
                        ) : (
                          <XCircle size={12} className="mr-1" />
                        )}
                        {hypothesis.latestDecision.decision}
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary mb-3 line-clamp-2">{hypothesis.statement}</p>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>{hypothesis.project.name}</span>
                    <span>•</span>
                    <span>{hypothesis.iterations} iteration{hypothesis.iterations !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className="capitalize">{hypothesis.status}</span>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-text-secondary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}