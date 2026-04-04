'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, Code, Sparkles, History } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { experimentIterations, codeVersions, hypotheses, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default function ModifyCodePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const iterationId = params.iterationId as string;
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [iteration, setIteration] = useState<any>(null);
  const [codeContent, setCodeContent] = useState('');
  const [config, setConfig] = useState('{}');
  const [description, setDescription] = useState('');

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
      
      // Load existing code version if any
      if (result[0].codeVersionId) {
        const cv = await db.select()
          .from(codeVersions)
          .where(eq(codeVersions.id, result[0].codeVersionId))
          .limit(1);
        if (cv[0]) {
          setCodeContent(JSON.stringify(cv[0].codeContent, null, 2));
          setConfig(JSON.stringify(cv[0].config, null, 2));
          setDescription(cv[0].description || '');
        }
      }
    }
  }

  async function handleSave() {
    if (!iteration) return;

    setLoading(true);
    try {
      let codeVersionId = iteration.codeVersionId;

      if (!codeVersionId) {
        // Create new code version
        const cvResult = await db.insert(codeVersions).values({
          iterationId,
          codeContent: JSON.parse(codeContent || '{}'),
          config: JSON.parse(config || '{}'),
          description,
          versionNumber: 1,
        }).returning();
        codeVersionId = cvResult[0].id;
      } else {
        // Update existing code version
        await db.update(codeVersions)
          .set({
            codeContent: JSON.parse(codeContent || '{}'),
            config: JSON.parse(config || '{}'),
            description,
          })
          .where(eq(codeVersions.id, codeVersionId));
      }

      // Update iteration status
      await db.update(experimentIterations)
        .set({
          codeVersionId,
          status: 'modifying',
        })
        .where(eq(experimentIterations.id, iterationId));

      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error saving code:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAIAutomate() {
    setLoading(true);
    try {
      // This would call Claude Agent SDK to suggest code changes
      // For now, we'll add a placeholder
      const currentCode = codeContent ? JSON.parse(codeContent) : {};
      const suggestedCode = {
        ...currentCode,
        _aiSuggestion: "Claude Agent would analyze the hypothesis and suggest code modifications here",
        _timestamp: new Date().toISOString(),
      };
      setCodeContent(JSON.stringify(suggestedCode, null, 2));
    } catch (error) {
      console.error('Error with AI automate:', error);
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
          <h1 className="text-3xl font-bold text-text-primary">Modify Code</h1>
          <p className="text-text-secondary">Experiment iteration #{iteration?.iterationNumber || 1}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-accent-primary/5 border-accent-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
            <Code className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Modify Code Stage</h3>
            <p className="text-sm text-text-secondary mt-1">
              Update your experiment logic, parameters, prompts, or configuration. 
              This code will be executed when you run the experiment.
            </p>
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Code Content (JSON)</label>
          <button
            onClick={handleAIAutomate}
            disabled={loading}
            className="btn-secondary text-sm inline-flex items-center gap-2"
          >
            <Sparkles size={14} />
            AI Suggest
          </button>
        </div>
        
        <textarea
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          placeholder='{ "prompt": "Your experiment prompt here", "parameters": { ... } }'
          className="input font-mono text-sm min-h-[300px]"
          rows={15}
        />

        {/* Config */}
        <div>
          <label className="label">Configuration</label>
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            placeholder='{ "timeout": 300, "retries": 3 }'
            className="input font-mono text-sm"
            rows={4}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Change Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you change in this version?"
            className="input"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Link href={`/projects/${projectId}`} className="btn-secondary">
          Cancel
        </Link>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}