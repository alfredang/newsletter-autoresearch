'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter,
  FolderKanban,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { and, eq, or, ilike, desc } from 'drizzle-orm';

const categories = ['marketing', 'trading', 'ml', 'product', 'business', 'custom'];
const statusOptions = ['active', 'paused', 'archived'];

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session, searchQuery, selectedCategory, selectedStatus]);

  async function fetchProjects() {
    try {
      const conditions = [eq(projects.userId, session?.user?.id!)];
      
      if (searchQuery) {
        conditions.push(or(
          ilike(projects.name, `%${searchQuery}%`),
          ilike(projects.description, `%${searchQuery}%`)
        ) as any);
      }
      
      if (selectedCategory) {
        conditions.push(eq(projects.category, selectedCategory as any) as any);
      }
      
      if (selectedStatus) {
        conditions.push(eq(projects.status, selectedStatus as any) as any);
      }

      const result = await db.select()
        .from(projects)
        .where(and(...conditions) as any)
        .orderBy(desc(projects.updatedAt));

      setProjectsList(result);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
          <h1 className="text-3xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">Manage your research projects</p>
        </div>
        <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} /> New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input md:w-40"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input md:w-40"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {projectsList.length === 0 ? (
        <div className="card text-center py-12">
          <FolderKanban className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No projects found</h3>
          <p className="text-text-secondary mb-6">
            {searchQuery || selectedCategory || selectedStatus
              ? 'Try adjusting your filters'
              : 'Create your first research project to get started'}
          </p>
          <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={18} /> Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsList.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card hover:border-accent-primary/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  project.category === 'marketing' ? 'bg-accent-primary/20' :
                  project.category === 'trading' ? 'bg-accent-warning/20' :
                  project.category === 'ml' ? 'bg-accent-cyan/20' :
                  project.category === 'product' ? 'bg-accent-success/20' :
                  'bg-text-secondary/20'
                }`}>
                  <FolderKanban className={`w-6 h-6 ${
                    project.category === 'marketing' ? 'text-accent-primary' :
                    project.category === 'trading' ? 'text-accent-warning' :
                    project.category === 'ml' ? 'text-accent-cyan' :
                    project.category === 'product' ? 'text-accent-success' :
                    'text-text-secondary'
                  }`} />
                </div>
                <span className={`badge ${
                  project.status === 'active' ? 'badge-success' :
                  project.status === 'paused' ? 'badge-warning' :
                  'badge-secondary'
                }`}>
                  {project.status}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm text-text-secondary capitalize">{project.category}</span>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex gap-1">
                    {project.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-xs bg-background-tertiary px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}