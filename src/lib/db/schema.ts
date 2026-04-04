import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, serial, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const projectCategoryEnum = pgEnum('project_category', ['marketing', 'trading', 'ml', 'product', 'business', 'custom']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'paused', 'archived']);
export const hypothesisStatusEnum = pgEnum('hypothesis_status', ['draft', 'active', 'completed', 'discarded']);
export const iterationStatusEnum = pgEnum('iteration_status', ['hypothesis', 'modifying', 'running', 'evaluating', 'decided']);
export const runTypeEnum = pgEnum('run_type', ['manual', 'scheduled', 'quick']);
export const runStatusEnum = pgEnum('run_status', ['pending', 'running', 'completed', 'failed']);
export const decisionEnum = pgEnum('decision', ['keep', 'discard']);
export const evaluationStatusEnum = pgEnum('evaluation_status', ['pending', 'pass', 'fail', 'review']);

// Users table (extends NextAuth)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Accounts (NextAuth)
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: timestamp('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

// Sessions (NextAuth)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

// Verification Tokens (NextAuth)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
});

// Projects
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  category: projectCategoryEnum('category').default('custom'),
  goal: text('goal'),
  defaultMetrics: jsonb('default_metrics').$type<string[]>().default([]),
  defaultTargets: jsonb('default_targets').$type<Record<string, number>>().default({}),
  status: projectStatusEnum('status').default('active'),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Hypotheses
export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  statement: text('statement').notNull(),
  rationale: text('rationale'),
  variablesChanged: text('variables_changed'),
  expectedImpact: text('expected_impact'),
  successCriteria: text('success_criteria'),
  notes: text('notes'),
  status: hypothesisStatusEnum('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Experiment Iterations
export const experimentIterations = pgTable('experiment_iterations', {
  id: uuid('id').defaultRandom().primaryKey(),
  hypothesisId: uuid('hypothesis_id').notNull().references(() => hypotheses.id, { onDelete: 'cascade' }),
  iterationNumber: serial('iteration_number').notNull(),
  codeVersionId: uuid('code_version_id'),
  runId: uuid('run_id'),
  evaluationId: uuid('evaluation_id'),
  decisionId: uuid('decision_id'),
  status: iterationStatusEnum('status').default('hypothesis'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Code Versions
export const codeVersions = pgTable('code_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  iterationId: uuid('iteration_id').notNull().references(() => experimentIterations.id, { onDelete: 'cascade' }),
  codeContent: jsonb('code_content').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  description: text('description'),
  versionNumber: serial('version_number').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Experiment Runs
export const experimentRuns = pgTable('experiment_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  iterationId: uuid('iteration_id').notNull().references(() => experimentIterations.id, { onDelete: 'cascade' }),
  runType: runTypeEnum('run_type').default('manual'),
  status: runStatusEnum('status').default('pending'),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  logs: text('logs'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Metrics
export const metrics = pgTable('metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => experimentRuns.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  metricValue: real('metric_value').notNull(),
  targetValue: real('target_value'),
  unit: text('unit'),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

// Evaluations
export const evaluations = pgTable('evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => experimentRuns.id, { onDelete: 'cascade' }),
  summary: text('summary'),
  score: real('score'),
  status: evaluationStatusEnum('status').default('pending'),
  recommendations: jsonb('recommendations').$type<string[]>().default([]),
  chartsData: jsonb('charts_data').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Decisions
export const decisions = pgTable('decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  iterationId: uuid('iteration_id').notNull().references(() => experimentIterations.id, { onDelete: 'cascade' }),
  decision: decisionEnum('decision').notNull(),
  reason: text('reason'),
  notes: text('notes'),
  decidedAt: timestamp('decided_at').defaultNow(),
  decidedBy: uuid('decided_by').references(() => users.id),
});

// Schedules
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  iterationId: uuid('iteration_id'),
  cronExpression: text('cron_expression'),
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});