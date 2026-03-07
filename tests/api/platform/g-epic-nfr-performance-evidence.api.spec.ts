import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';

type Sample = {
  durationMs: number;
  status: number;
  ok: boolean;
};

type Series = {
  name: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p95: number;
  p99: number;
  errorRate: number;
};

const ARTIFACTS_DIR = path.resolve(process.cwd(), '_bmad-output/test-artifacts');
const PERFORMANCE_JSON = path.join(ARTIFACTS_DIR, 'epic-g-performance-evidence.json');
const PERFORMANCE_MD = path.join(ARTIFACTS_DIR, 'epic-g-performance-evidence.md');

const QUEUE_THREAD_P95_BUDGET_MS = 750;
const QUEUE_THREAD_P99_BUDGET_MS = 1500;
const WEBHOOK_P95_BUDGET_MS = 1000;
const WEBHOOK_P99_BUDGET_MS = 2000;
const SAMPLE_ITERATIONS = 30;
const WARMUP_ITERATIONS = 3;

const percentile = (values: number[], pct: number): number => {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * pct) - 1);
  return sorted[index] ?? Number.POSITIVE_INFINITY;
};

const average = (values: number[]): number => {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const summarize = (name: string, samples: Sample[]): Series => {
  const durations = samples.map((sample) => sample.durationMs);
  const failures = samples.filter((sample) => !sample.ok).length;
  return {
    name,
    count: samples.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: average(durations),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    errorRate: failures / Math.max(1, samples.length),
  };
};

const writeJson = (filePath: string, payload: unknown): void => {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const writeMarkdown = (
  filePath: string,
  title: string,
  generatedAt: string,
  series: Array<{ label: string; summary: Series }>,
): void => {
  const rows = series.flatMap(({ label, summary }) => [
    `| ${label} sample count | ${summary.count} |`,
    `| ${label} p95 (ms) | ${summary.p95.toFixed(2)} |`,
    `| ${label} p99 (ms) | ${summary.p99.toFixed(2)} |`,
    `| ${label} avg (ms) | ${summary.avg.toFixed(2)} |`,
    `| ${label} max (ms) | ${summary.max.toFixed(2)} |`,
    `| ${label} error rate | ${(summary.errorRate * 100).toFixed(2)}% |`,
  ]);

  const markdown = [
    `# ${title}`,
    '',
    `- Generated at: ${generatedAt}`,
    `- Scope: Epic G volunteer UX runtime endpoints (inbox, mine, thread detail, inbound webhook)`,
    `- Sample size per endpoint: ${SAMPLE_ITERATIONS} (${WARMUP_ITERATIONS} warm-up calls)`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    ...rows,
    '',
  ].join('\n');

  writeFileSync(filePath, markdown, 'utf8');
};

test.describe('Epic G NFR runtime evidence capture', () => {
  test(
    '[P1] captures Epic G p95/p99 runtime evidence for release readiness packet @P1',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6AdminHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
      storyG6InboundClosedPayload,
    }) => {
      mkdirSync(ARTIFACTS_DIR, { recursive: true });

      const inboxPath = `${storyG6Context.paths.inbox}${storyG6InboxQuery}`;
      const minePath = `${storyG6Context.paths.inbox}${storyG6MineQuery}`;
      const threadPath = `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}`;

      const record = async (execute: () => Promise<number>): Promise<Sample> => {
        const startedAt = Date.now();
        const status = await execute();
        return {
          durationMs: Date.now() - startedAt,
          status,
          ok: status >= 200 && status < 300,
        };
      };

      const warmup = async (): Promise<void> => {
        await apiRequest(request, {
          method: 'GET',
          path: inboxPath,
          headers: storyG6VolunteerHeaders,
        });
        await apiRequest(request, {
          method: 'GET',
          path: minePath,
          headers: storyG6VolunteerHeaders,
        });
        await apiRequest(request, {
          method: 'GET',
          path: threadPath,
          headers: storyG6VolunteerHeaders,
        });
        await apiRequest(request, {
          method: 'POST',
          path: storyG6Context.paths.inboundWebhook,
          headers: storyG6AdminHeaders,
          data: {
            ...storyG6InboundClosedPayload,
            providerEventId: `epic-g-perf-warmup-${randomUUID().slice(0, 8)}`,
            providerLegId: `epic-g-perf-warmup-leg-${randomUUID().slice(0, 8)}`,
          },
        });
      };

      for (let index = 0; index < WARMUP_ITERATIONS; index += 1) {
        await warmup();
      }

      const inboxSamples: Sample[] = [];
      const mineSamples: Sample[] = [];
      const threadSamples: Sample[] = [];
      const webhookSamples: Sample[] = [];

      for (let index = 0; index < SAMPLE_ITERATIONS; index += 1) {
        inboxSamples.push(
          await record(async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: inboxPath,
              headers: storyG6VolunteerHeaders,
            });
            return response.status();
          }),
        );

        mineSamples.push(
          await record(async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: minePath,
              headers: storyG6VolunteerHeaders,
            });
            return response.status();
          }),
        );

        threadSamples.push(
          await record(async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: threadPath,
              headers: storyG6VolunteerHeaders,
            });
            return response.status();
          }),
        );

        webhookSamples.push(
          await record(async () => {
            const response = await apiRequest(request, {
              method: 'POST',
              path: storyG6Context.paths.inboundWebhook,
              headers: storyG6AdminHeaders,
              data: {
                ...storyG6InboundClosedPayload,
                providerEventId: `epic-g-perf-${index + 1}-${randomUUID().slice(0, 8)}`,
                providerLegId: `epic-g-perf-leg-${index + 1}-${randomUUID().slice(0, 8)}`,
              },
            });
            return response.status();
          }),
        );
      }

      const inboxSeries = summarize('inbox', inboxSamples);
      const mineSeries = summarize('mine', mineSamples);
      const threadSeries = summarize('thread_detail', threadSamples);
      const webhookSeries = summarize('inbound_webhook', webhookSamples);

      expect(inboxSeries.p95).toBeLessThanOrEqual(QUEUE_THREAD_P95_BUDGET_MS);
      expect(inboxSeries.p99).toBeLessThanOrEqual(QUEUE_THREAD_P99_BUDGET_MS);
      expect(mineSeries.p95).toBeLessThanOrEqual(QUEUE_THREAD_P95_BUDGET_MS);
      expect(mineSeries.p99).toBeLessThanOrEqual(QUEUE_THREAD_P99_BUDGET_MS);
      expect(threadSeries.p95).toBeLessThanOrEqual(QUEUE_THREAD_P95_BUDGET_MS);
      expect(threadSeries.p99).toBeLessThanOrEqual(QUEUE_THREAD_P99_BUDGET_MS);
      expect(webhookSeries.p95).toBeLessThanOrEqual(WEBHOOK_P95_BUDGET_MS);
      expect(webhookSeries.p99).toBeLessThanOrEqual(WEBHOOK_P99_BUDGET_MS);
      expect(inboxSeries.errorRate).toBe(0);
      expect(mineSeries.errorRate).toBe(0);
      expect(threadSeries.errorRate).toBe(0);
      expect(webhookSeries.errorRate).toBe(0);

      const generatedAt = new Date().toISOString();
      const performanceEvidence = {
        generatedAt,
        storyScope: 'epic-g',
        thresholdsMs: {
          queueAndThread: {
            p95: QUEUE_THREAD_P95_BUDGET_MS,
            p99: QUEUE_THREAD_P99_BUDGET_MS,
          },
          inboundWebhook: {
            p95: WEBHOOK_P95_BUDGET_MS,
            p99: WEBHOOK_P99_BUDGET_MS,
          },
        },
        sampleSize: SAMPLE_ITERATIONS,
        warmupCalls: WARMUP_ITERATIONS,
        results: {
          inbox: inboxSeries,
          mine: mineSeries,
          threadDetail: threadSeries,
          inboundWebhook: webhookSeries,
        },
        gate: {
          queueAndThreadWithinBudget:
            inboxSeries.p95 <= QUEUE_THREAD_P95_BUDGET_MS
            && inboxSeries.p99 <= QUEUE_THREAD_P99_BUDGET_MS
            && mineSeries.p95 <= QUEUE_THREAD_P95_BUDGET_MS
            && mineSeries.p99 <= QUEUE_THREAD_P99_BUDGET_MS
            && threadSeries.p95 <= QUEUE_THREAD_P95_BUDGET_MS
            && threadSeries.p99 <= QUEUE_THREAD_P99_BUDGET_MS,
          webhookWithinBudget:
            webhookSeries.p95 <= WEBHOOK_P95_BUDGET_MS
            && webhookSeries.p99 <= WEBHOOK_P99_BUDGET_MS,
          zeroErrorRate:
            inboxSeries.errorRate === 0
            && mineSeries.errorRate === 0
            && threadSeries.errorRate === 0
            && webhookSeries.errorRate === 0,
        },
        evidenceSources: [
          'tests/api/platform/g-epic-nfr-performance-evidence.api.spec.ts',
          'tests/api/platform/g-epic-volunteer-ux-regression.automate.api.spec.ts',
          'tests/e2e/platform/g-epic-volunteer-ux-regression.automate.spec.ts',
        ],
      };

      writeJson(PERFORMANCE_JSON, performanceEvidence);
      writeMarkdown(PERFORMANCE_MD, 'Epic G Performance Evidence', generatedAt, [
        { label: 'Inbox', summary: inboxSeries },
        { label: 'Mine', summary: mineSeries },
        { label: 'Thread detail', summary: threadSeries },
        { label: 'Inbound webhook', summary: webhookSeries },
      ]);
    },
  );
});
