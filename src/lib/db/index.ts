import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

export type User = typeof schema.users.$inferSelect;
export type Project = typeof schema.projects.$inferSelect;
export type Hypothesis = typeof schema.hypotheses.$inferSelect;
export type ExperimentIteration = typeof schema.experimentIterations.$inferSelect;
export type CodeVersion = typeof schema.codeVersions.$inferSelect;
export type ExperimentRun = typeof schema.experimentRuns.$inferSelect;
export type Metric = typeof schema.metrics.$inferSelect;
export type Evaluation = typeof schema.evaluations.$inferSelect;
export type Decision = typeof schema.decisions.$inferSelect;
export type Schedule = typeof schema.schedules.$inferSelect;
export type ActivityLog = typeof schema.activityLogs.$inferSelect;