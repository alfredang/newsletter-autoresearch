import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    marketing: 'badge-primary',
    trading: 'badge-warning',
    ml: 'badge-cyan',
    product: 'badge-success',
    business: 'badge-primary',
    custom: 'badge-secondary',
  };
  return colors[category] || 'badge-secondary';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'badge-success',
    paused: 'badge-warning',
    archived: 'badge-secondary',
    draft: 'badge-secondary',
    completed: 'badge-success',
    discarded: 'badge-danger',
    pending: 'badge-warning',
    running: 'badge-primary',
    failed: 'badge-danger',
    pass: 'badge-success',
    fail: 'badge-danger',
    review: 'badge-warning',
    hypothesis: 'badge-primary',
    modifying: 'badge-warning',
    evaluating: 'badge-cyan',
    decided: 'badge-success',
  };
  return colors[status] || 'badge-secondary';
}