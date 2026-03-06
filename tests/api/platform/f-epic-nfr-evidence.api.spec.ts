import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryF2.fixture';

type Sample = {
  durationMs: number;
  status: number;
  ok: boolean;
};

type Series = {
  name: string;
  samples: Sample[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  successRate: number;
  errorRate: number;
};

type ResourceSample = {
  at: string;
  phase: string;
  pid: number | null;
  cpuPct: number | null;
  rssMb: number | null;
  vszMb: number | null;
};

const TEST_ARTIFACTS_DIR = path.resolve(process.cwd(), '_bmad-output/test-artifacts');
const PERFORMANCE_ARTIFACT_JSON = path.join(TEST_ARTIFACTS_DIR, 'epic-f-performance-evidence.json');
const PERFORMANCE_ARTIFACT_MD = path.join(TEST_ARTIFACTS_DIR, 'epic-f-performance-evidence.md');
const RELIABILITY_ARTIFACT_JSON = path.join(TEST_ARTIFACTS_DIR, 'epic-f-reliability-evidence.json');
const RELIABILITY_ARTIFACT_MD = path.join(TEST_ARTIFACTS_DIR, 'epic-f-reliability-evidence.md');
const STRESS_ARTIFACT_JSON = path.join(TEST_ARTIFACTS_DIR, 'epic-f-stress-resource-evidence.json');
const STRESS_ARTIFACT_MD = path.join(TEST_ARTIFACTS_DIR, 'epic-f-stress-resource-evidence.md');

const CONNECTSHYFT_INBOX_P95_BUDGET_MS = 750;
const CONNECTSHYFT_INBOX_P99_BUDGET_MS = 1500;
const CONNECTSHYFT_WEBHOOK_P95_BUDGET_MS = 1000;
const CONNECTSHYFT_WEBHOOK_P99_BUDGET_MS = 2000;

const METRIC_ITERATIONS = 25;
const WARMUP_ITERATIONS = 3;
const RELIABILITY_PROBES = 60;
const STRESS_BATCHES = 20;
const STRESS_CONCURRENCY = 20;
const STRESS_P95_BUDGET_MS = 1000;
const STRESS_P99_BUDGET_MS = 2000;

const percentile = (values: number[], pct: number): number => {
  if (values.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * pct) - 1);
  return sorted[index] ?? Number.POSITIVE_INFINITY;
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const summarizeSeries = (name: string, samples: Sample[]): Series => {
  const durations = samples.map((sample) => sample.durationMs);
  const successCount = samples.filter((sample) => sample.ok).length;
  const total = samples.length || 1;

  return {
    name,
    samples,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: average(durations),
    successRate: successCount / total,
    errorRate: (total - successCount) / total,
  };
};

const nowIso = (): string => new Date().toISOString();

const writeJsonArtifact = (filePath: string, payload: unknown): void => {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const toMarkdownTable = (rows: Array<{ metric: string; value: string }>): string => {
  const lines = ['| Metric | Value |', '| --- | --- |'];
  for (const row of rows) {
    lines.push(`| ${row.metric} | ${row.value} |`);
  }
  return lines.join('\n');
};

const writeMarkdownArtifact = (
  filePath: string,
  title: string,
  contextLines: string[],
  rows: Array<{ metric: string; value: string }>,
): void => {
  const markdown = [
    `# ${title}`,
    '',
    ...contextLines,
    '',
    toMarkdownTable(rows),
    '',
  ].join('\n');
  writeFileSync(filePath, markdown, 'utf8');
};

const buildApiBaseUrl = (): string => {
  const defaultApiBaseUrl = 'http://127.0.0.1:3000';
  return process.env.API_URL || process.env.API_BASE_URL || defaultApiBaseUrl;
};

const parsePortFromBaseUrl = (baseUrl: string): string => {
  try {
    const url = new URL(baseUrl);
    if (url.port) {
      return url.port;
    }
    return url.protocol === 'https:' ? '443' : '80';
  } catch (_error) {
    return '3000';
  }
};

const resolveServerPid = (baseUrl: string): number | null => {
  const port = parsePortFromBaseUrl(baseUrl);
  const commands: Array<{ bin: string; args: string[] }> = [
    { bin: 'lsof', args: ['-ti', `tcp:${port}`, '-sTCP:LISTEN'] },
    { bin: 'pgrep', args: ['-f', 'src/server.ts'] },
    { bin: 'pgrep', args: ['-f', 'dist/server.js'] },
    { bin: 'pgrep', args: ['-f', 'ts-node --transpile-only src/server.ts'] },
  ];

  for (const cmd of commands) {
    try {
      const output = execFileSync(cmd.bin, cmd.args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (!output) {
        continue;
      }
      const firstLine = output.split('\n').map((line) => line.trim()).find((line) => line.length > 0);
      if (!firstLine) {
        continue;
      }
      const parsed = Number.parseInt(firstLine, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    } catch (_error) {
      // Best-effort process discovery; continue with alternate probes.
    }
  }

  return null;
};

const readResourceSample = (pid: number | null, phase: string): ResourceSample => {
  if (!pid) {
    return {
      at: nowIso(),
      phase,
      pid: null,
      cpuPct: null,
      rssMb: null,
      vszMb: null,
    };
  }

  try {
    const output = execFileSync(
      'ps',
      ['-p', String(pid), '-o', '%cpu=', '-o', 'rss=', '-o', 'vsz='],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    const [cpuRaw, rssRaw, vszRaw] = output.split(/\s+/);
    const cpu = Number.parseFloat(cpuRaw ?? '');
    const rssKb = Number.parseFloat(rssRaw ?? '');
    const vszKb = Number.parseFloat(vszRaw ?? '');

    return {
      at: nowIso(),
      phase,
      pid,
      cpuPct: Number.isFinite(cpu) ? cpu : null,
      rssMb: Number.isFinite(rssKb) ? rssKb / 1024 : null,
      vszMb: Number.isFinite(vszKb) ? vszKb / 1024 : null,
    };
  } catch (_error) {
    return {
      at: nowIso(),
      phase,
      pid,
      cpuPct: null,
      rssMb: null,
      vszMb: null,
    };
  }
};

test.describe(
  'Epic F NFR evidence capture (performance + reliability + stress/resource)',
  () => {
    test(
      '[P1] generates measured Epic F performance, reliability, and stress/resource evidence artifacts for release-gate packet @P1',
      async ({ request, storyF2Context, storyF2OperatorHeaders, storyF2AdminHeaders }, testInfo) => {
        mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true });

        const inboxPath = '/api/v1/connectshyft/inbox?bucket=inbox';
        const threadPath = `/api/v1/connectshyft/threads/${storyF2Context.threadIds.unclaimed}`;
        const eventsPath = (() => {
          const params = new URLSearchParams({
            tenantId: storyF2Context.tenantId,
            orgUnitId: storyF2Context.orgUnitId,
            aggregateId: storyF2Context.threadIds.unclaimed,
            aggregateType: 'Thread',
            eventType: storyF2Context.canonicalEventTypes.callConnected,
            limit: '50',
          });
          return `${storyF2Context.paths.events}?${params.toString()}`;
        })();

        const seededMessageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyF2Context.paths.threads}/${storyF2Context.threadIds.unclaimed}/messages`,
          headers: storyF2OperatorHeaders,
          data: {
            orgUnitId: storyF2Context.orgUnitId,
            providerKey: storyF2Context.providers.enabledPrimary,
            channel: 'sms',
            body: 'Epic F NFR evidence seed message for webhook latency sampling.',
          },
        });
        expect(seededMessageResponse.status()).toBe(200);
        const seededMessageBody = await seededMessageResponse.json();
        const providerMessageId = seededMessageBody?.data?.dispatch?.providerMessageId as string;
        expect(typeof providerMessageId).toBe('string');
        expect(providerMessageId.length).toBeGreaterThan(0);

        const warmup = async (): Promise<void> => {
          await apiRequest(request, {
            method: 'GET',
            path: inboxPath,
            headers: storyF2OperatorHeaders,
          });
          await apiRequest(request, {
            method: 'GET',
            path: threadPath,
            headers: storyF2OperatorHeaders,
          });
          await apiRequest(request, {
            method: 'GET',
            path: eventsPath,
            headers: storyF2OperatorHeaders,
          });
          await apiRequest(request, {
            method: 'POST',
            path: storyF2Context.paths.inboundWebhook,
            headers: storyF2AdminHeaders,
            data: {
              eventType: 'sms.delivered',
              providerKey: storyF2Context.providers.enabledPrimary,
              providerMessageId,
              providerEventId: `perf-seed-${randomUUID().slice(0, 8)}`,
            },
          });
        };

        for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
          await warmup();
        }

        const inboxSamples: Sample[] = [];
        const threadSamples: Sample[] = [];
        const eventsSamples: Sample[] = [];
        const webhookSamples: Sample[] = [];

        const recordSample = async (
          label: string,
          action: () => Promise<number>,
        ): Promise<Sample> => {
          const startedAt = Date.now();
          const status = await action();
          const endedAt = Date.now();
          const sample = {
            durationMs: endedAt - startedAt,
            status,
            ok: status >= 200 && status < 300,
          };
          testInfo.attach(`${label}-sample`, {
            body: Buffer.from(JSON.stringify(sample)),
            contentType: 'application/json',
          });
          return sample;
        };

        for (let i = 0; i < METRIC_ITERATIONS; i += 1) {
          inboxSamples.push(await recordSample('inbox', async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: inboxPath,
              headers: storyF2OperatorHeaders,
            });
            return response.status();
          }));

          threadSamples.push(await recordSample('thread', async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: threadPath,
              headers: storyF2OperatorHeaders,
            });
            return response.status();
          }));

          eventsSamples.push(await recordSample('events', async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: eventsPath,
              headers: storyF2OperatorHeaders,
            });
            return response.status();
          }));

          webhookSamples.push(await recordSample('webhook', async () => {
            const response = await apiRequest(request, {
              method: 'POST',
              path: storyF2Context.paths.inboundWebhook,
              headers: storyF2AdminHeaders,
              data: {
                eventType: 'sms.delivered',
                providerKey: storyF2Context.providers.enabledPrimary,
                providerMessageId,
                providerEventId: `perf-webhook-${i + 1}-${randomUUID().slice(0, 8)}`,
              },
            });
            return response.status();
          }));
        }

        const inboxSeries = summarizeSeries('inbox', inboxSamples);
        const threadSeries = summarizeSeries('thread_detail', threadSamples);
        const eventsSeries = summarizeSeries('events', eventsSamples);
        const webhookSeries = summarizeSeries('webhook_ingestion', webhookSamples);

        expect(inboxSeries.p95).toBeLessThanOrEqual(CONNECTSHYFT_INBOX_P95_BUDGET_MS);
        expect(inboxSeries.p99).toBeLessThanOrEqual(CONNECTSHYFT_INBOX_P99_BUDGET_MS);
        expect(threadSeries.p95).toBeLessThanOrEqual(CONNECTSHYFT_INBOX_P95_BUDGET_MS);
        expect(threadSeries.p99).toBeLessThanOrEqual(CONNECTSHYFT_INBOX_P99_BUDGET_MS);
        expect(webhookSeries.p95).toBeLessThanOrEqual(CONNECTSHYFT_WEBHOOK_P95_BUDGET_MS);
        expect(webhookSeries.p99).toBeLessThanOrEqual(CONNECTSHYFT_WEBHOOK_P99_BUDGET_MS);
        expect(inboxSeries.errorRate).toBe(0);
        expect(threadSeries.errorRate).toBe(0);
        expect(eventsSeries.errorRate).toBe(0);
        expect(webhookSeries.errorRate).toBe(0);

        const performanceEvidence = {
          generatedAt: nowIso(),
          storyScope: 'epic-f',
          sampleCounts: {
            inbox: inboxSamples.length,
            threadDetail: threadSamples.length,
            events: eventsSamples.length,
            webhookIngestion: webhookSamples.length,
          },
          thresholdsMs: {
            inbox: {
              p95: CONNECTSHYFT_INBOX_P95_BUDGET_MS,
              p99: CONNECTSHYFT_INBOX_P99_BUDGET_MS,
            },
            threadDetail: {
              p95: CONNECTSHYFT_INBOX_P95_BUDGET_MS,
              p99: CONNECTSHYFT_INBOX_P99_BUDGET_MS,
            },
            webhookIngestion: {
              p95: CONNECTSHYFT_WEBHOOK_P95_BUDGET_MS,
              p99: CONNECTSHYFT_WEBHOOK_P99_BUDGET_MS,
            },
          },
          results: {
            inbox: inboxSeries,
            threadDetail: threadSeries,
            events: eventsSeries,
            webhookIngestion: webhookSeries,
          },
          gate: {
            inboxAndThreadWithinBudget:
              inboxSeries.p95 <= CONNECTSHYFT_INBOX_P95_BUDGET_MS
              && inboxSeries.p99 <= CONNECTSHYFT_INBOX_P99_BUDGET_MS
              && threadSeries.p95 <= CONNECTSHYFT_INBOX_P95_BUDGET_MS
              && threadSeries.p99 <= CONNECTSHYFT_INBOX_P99_BUDGET_MS,
            webhookWithinBudget:
              webhookSeries.p95 <= CONNECTSHYFT_WEBHOOK_P95_BUDGET_MS
              && webhookSeries.p99 <= CONNECTSHYFT_WEBHOOK_P99_BUDGET_MS,
          },
          evidenceSources: [
            'tests/api/platform/f-epic-nfr-evidence.api.spec.ts',
            'apps/routeshyft-api/src/routes/api/v1/connectshyft.ts',
          ],
        };

        writeJsonArtifact(PERFORMANCE_ARTIFACT_JSON, performanceEvidence);
        writeMarkdownArtifact(
          PERFORMANCE_ARTIFACT_MD,
          'Epic F Performance Evidence',
          [
            `- Generated at: ${performanceEvidence.generatedAt}`,
            '- Scope: ConnectShyft Epic F endpoints (`inbox`, `thread detail`, `events`, `webhook ingestion`)',
            `- Sample size per endpoint: ${METRIC_ITERATIONS} (with ${WARMUP_ITERATIONS} warm-up calls)`,
          ],
          [
            { metric: 'Inbox p95 (ms)', value: inboxSeries.p95.toFixed(2) },
            { metric: 'Inbox p99 (ms)', value: inboxSeries.p99.toFixed(2) },
            { metric: 'Thread p95 (ms)', value: threadSeries.p95.toFixed(2) },
            { metric: 'Thread p99 (ms)', value: threadSeries.p99.toFixed(2) },
            { metric: 'Webhook p95 (ms)', value: webhookSeries.p95.toFixed(2) },
            { metric: 'Webhook p99 (ms)', value: webhookSeries.p99.toFixed(2) },
            { metric: 'Inbox error rate', value: `${(inboxSeries.errorRate * 100).toFixed(2)}%` },
            { metric: 'Thread error rate', value: `${(threadSeries.errorRate * 100).toFixed(2)}%` },
            { metric: 'Events error rate', value: `${(eventsSeries.errorRate * 100).toFixed(2)}%` },
            { metric: 'Webhook error rate', value: `${(webhookSeries.errorRate * 100).toFixed(2)}%` },
          ],
        );

        const apiBaseUrl = buildApiBaseUrl();
        const serverPid = resolveServerPid(apiBaseUrl);

        const stressSamples: Sample[] = [];
        const resourceSamples: ResourceSample[] = [];
        resourceSamples.push(readResourceSample(serverPid, 'before-stress'));
        const stressStartedAt = Date.now();

        for (let batch = 0; batch < STRESS_BATCHES; batch += 1) {
          const batchResults = await Promise.all(
            Array.from({ length: STRESS_CONCURRENCY }, async (_value, slot) => {
              const startedAt = Date.now();
              let status = 500;
              const mode = slot % 4;

              if (mode === 0) {
                const response = await apiRequest(request, {
                  method: 'GET',
                  path: inboxPath,
                  headers: storyF2OperatorHeaders,
                });
                status = response.status();
              } else if (mode === 1) {
                const response = await apiRequest(request, {
                  method: 'GET',
                  path: threadPath,
                  headers: storyF2OperatorHeaders,
                });
                status = response.status();
              } else if (mode === 2) {
                const response = await apiRequest(request, {
                  method: 'GET',
                  path: eventsPath,
                  headers: storyF2OperatorHeaders,
                });
                status = response.status();
              } else {
                const response = await apiRequest(request, {
                  method: 'POST',
                  path: storyF2Context.paths.inboundWebhook,
                  headers: storyF2AdminHeaders,
                  data: {
                    eventType: 'sms.delivered',
                    providerKey: storyF2Context.providers.enabledPrimary,
                    providerMessageId,
                    providerEventId: `stress-webhook-${batch + 1}-${slot + 1}-${randomUUID().slice(0, 8)}`,
                  },
                });
                status = response.status();
              }

              return {
                durationMs: Date.now() - startedAt,
                status,
                ok: status >= 200 && status < 300,
              } satisfies Sample;
            }),
          );

          stressSamples.push(...batchResults);
          resourceSamples.push(readResourceSample(serverPid, `batch-${batch + 1}`));
        }

        const stressEndedAt = Date.now();
        resourceSamples.push(readResourceSample(serverPid, 'after-stress'));

        const stressSeries = summarizeSeries('concurrent_mixed_workload', stressSamples);
        const stressDurationMs = Math.max(1, stressEndedAt - stressStartedAt);
        const stressThroughputRps = (stressSamples.length / stressDurationMs) * 1000;

        const cpuSamples = resourceSamples
          .map((sample) => sample.cpuPct)
          .filter((value): value is number => value !== null);
        const rssSamples = resourceSamples
          .map((sample) => sample.rssMb)
          .filter((value): value is number => value !== null);
        const vszSamples = resourceSamples
          .map((sample) => sample.vszMb)
          .filter((value): value is number => value !== null);

        const resourceSummary = {
          cpu: {
            sampleCount: cpuSamples.length,
            peakPct: cpuSamples.length > 0 ? Math.max(...cpuSamples) : null,
            avgPct: cpuSamples.length > 0 ? average(cpuSamples) : null,
          },
          memory: {
            sampleCount: rssSamples.length,
            peakRssMb: rssSamples.length > 0 ? Math.max(...rssSamples) : null,
            avgRssMb: rssSamples.length > 0 ? average(rssSamples) : null,
            peakVszMb: vszSamples.length > 0 ? Math.max(...vszSamples) : null,
            avgVszMb: vszSamples.length > 0 ? average(vszSamples) : null,
          },
        };

        const resourceSamplingAvailable = resourceSamples.some((sample) => sample.rssMb !== null);

        expect(stressSeries.p95).toBeLessThanOrEqual(STRESS_P95_BUDGET_MS);
        expect(stressSeries.p99).toBeLessThanOrEqual(STRESS_P99_BUDGET_MS);
        expect(stressSeries.errorRate).toBe(0);
        expect(resourceSamplingAvailable).toBe(true);

        const stressEvidence = {
          generatedAt: nowIso(),
          storyScope: 'epic-f',
          stressProfile: {
            batches: STRESS_BATCHES,
            concurrency: STRESS_CONCURRENCY,
            totalRequests: stressSamples.length,
            durationMs: stressDurationMs,
            throughputRps: Number(stressThroughputRps.toFixed(2)),
          },
          latencyBudgetsMs: {
            p95: STRESS_P95_BUDGET_MS,
            p99: STRESS_P99_BUDGET_MS,
          },
          stressSeries,
          resourceSampling: {
            serverPid,
            available: resourceSamplingAvailable,
            samples: resourceSamples,
            summary: resourceSummary,
          },
          gate: {
            stressLatencyWithinBudget:
              stressSeries.p95 <= STRESS_P95_BUDGET_MS && stressSeries.p99 <= STRESS_P99_BUDGET_MS,
            zeroErrorRate: stressSeries.errorRate === 0,
            resourceSamplingAvailable,
          },
          evidenceSources: [
            'tests/api/platform/f-epic-nfr-evidence.api.spec.ts',
            'apps/routeshyft-api/src/routes/api/v1/connectshyft.ts',
          ],
        };

        writeJsonArtifact(STRESS_ARTIFACT_JSON, stressEvidence);
        writeMarkdownArtifact(
          STRESS_ARTIFACT_MD,
          'Epic F Stress and Resource Evidence',
          [
            `- Generated at: ${stressEvidence.generatedAt}`,
            `- Workload: ${STRESS_BATCHES} batches x ${STRESS_CONCURRENCY} concurrent requests`,
            '- Mixed endpoint profile: inbox, thread detail, events, inbound webhook',
          ],
          [
            { metric: 'Total requests', value: String(stressEvidence.stressProfile.totalRequests) },
            { metric: 'Duration (ms)', value: String(stressEvidence.stressProfile.durationMs) },
            { metric: 'Throughput (req/s)', value: String(stressEvidence.stressProfile.throughputRps) },
            { metric: 'Stress p95 (ms)', value: stressSeries.p95.toFixed(2) },
            { metric: 'Stress p99 (ms)', value: stressSeries.p99.toFixed(2) },
            { metric: 'Stress error rate', value: `${(stressSeries.errorRate * 100).toFixed(2)}%` },
            {
              metric: 'Resource sample availability',
              value: stressEvidence.resourceSampling.available ? 'yes' : 'no',
            },
            {
              metric: 'Peak CPU (%)',
              value: stressEvidence.resourceSampling.summary.cpu.peakPct === null
                ? 'n/a'
                : stressEvidence.resourceSampling.summary.cpu.peakPct.toFixed(2),
            },
            {
              metric: 'Peak RSS (MB)',
              value: stressEvidence.resourceSampling.summary.memory.peakRssMb === null
                ? 'n/a'
                : stressEvidence.resourceSampling.summary.memory.peakRssMb.toFixed(2),
            },
          ],
        );

        const healthUrl = new URL('/health', apiBaseUrl).toString();
        const kernelHealthPath = '/api/v1/platform/_kernel/health';

        const healthSamples: Sample[] = [];
        const kernelHealthSamples: Sample[] = [];
        const failures: Array<{ endpoint: string; index: number; status: number; at: string }> = [];
        const probesStartedAt = Date.now();

        for (let i = 0; i < RELIABILITY_PROBES; i += 1) {
          const healthStartedAt = Date.now();
          const healthResponse = await request.fetch(healthUrl, { method: 'GET' });
          const healthSample: Sample = {
            durationMs: Date.now() - healthStartedAt,
            status: healthResponse.status(),
            ok: healthResponse.ok(),
          };
          healthSamples.push(healthSample);
          if (!healthSample.ok) {
            failures.push({
              endpoint: '/health',
              index: i + 1,
              status: healthSample.status,
              at: nowIso(),
            });
          }

          const kernelStartedAt = Date.now();
          const kernelResponse = await apiRequest(request, {
            method: 'GET',
            path: kernelHealthPath,
            headers: storyF2OperatorHeaders,
          });
          const kernelSample: Sample = {
            durationMs: Date.now() - kernelStartedAt,
            status: kernelResponse.status(),
            ok: kernelResponse.status() >= 200 && kernelResponse.status() < 300,
          };
          kernelHealthSamples.push(kernelSample);
          if (!kernelSample.ok) {
            failures.push({
              endpoint: kernelHealthPath,
              index: i + 1,
              status: kernelSample.status,
              at: nowIso(),
            });
          }
        }
        const probesEndedAt = Date.now();

        const healthSeries = summarizeSeries('health', healthSamples);
        const kernelSeries = summarizeSeries('kernel_health', kernelHealthSamples);
        const totalSamples = healthSamples.length + kernelHealthSamples.length;
        const totalFailures = failures.length;
        const uptimeRatio = totalSamples === 0 ? 0 : (totalSamples - totalFailures) / totalSamples;
        const errorRate = totalSamples === 0 ? 1 : totalFailures / totalSamples;

        // MTTR derivation for this synthetic probe run:
        // if there are no incidents, MTTR is zero because no recovery was required.
        // if incidents exist, use probe-window divided by number of incidents as a deterministic proxy.
        const mttrSeconds = totalFailures === 0
          ? 0
          : ((probesEndedAt - probesStartedAt) / 1000) / totalFailures;

        expect(uptimeRatio).toBeGreaterThanOrEqual(0.99);
        expect(errorRate).toBeLessThanOrEqual(0.01);

        const reliabilityEvidence = {
          generatedAt: nowIso(),
          storyScope: 'epic-f',
          probeWindowMs: probesEndedAt - probesStartedAt,
          probesPerEndpoint: RELIABILITY_PROBES,
          totalSamples,
          totalFailures,
          uptimeRatio,
          errorRate,
          mttrSeconds,
          endpoints: {
            health: healthSeries,
            kernelHealth: kernelSeries,
          },
          incidents: failures,
          gate: {
            uptimeAtLeast99: uptimeRatio >= 0.99,
            errorRateAtMost1Pct: errorRate <= 0.01,
          },
          evidenceSources: [
            'tests/api/platform/f-epic-nfr-evidence.api.spec.ts',
            'apps/routeshyft-api/src/app.ts',
            'apps/routeshyft-api/src/routes/api/v1/platform-contracts.ts',
          ],
        };

        writeJsonArtifact(RELIABILITY_ARTIFACT_JSON, reliabilityEvidence);
        writeMarkdownArtifact(
          RELIABILITY_ARTIFACT_MD,
          'Epic F Reliability Evidence',
          [
            `- Generated at: ${reliabilityEvidence.generatedAt}`,
            '- Scope: synthetic probe health reliability (`/health`, `/api/v1/platform/_kernel/health`)',
            `- Probe count per endpoint: ${RELIABILITY_PROBES}`,
          ],
          [
            { metric: 'Total samples', value: String(totalSamples) },
            { metric: 'Total failures', value: String(totalFailures) },
            { metric: 'Uptime', value: `${(uptimeRatio * 100).toFixed(2)}%` },
            { metric: 'Error rate', value: `${(errorRate * 100).toFixed(2)}%` },
            { metric: 'MTTR (seconds)', value: mttrSeconds.toFixed(2) },
            { metric: '/health p95 (ms)', value: healthSeries.p95.toFixed(2) },
            { metric: '/health p99 (ms)', value: healthSeries.p99.toFixed(2) },
            { metric: 'kernel health p95 (ms)', value: kernelSeries.p95.toFixed(2) },
            { metric: 'kernel health p99 (ms)', value: kernelSeries.p99.toFixed(2) },
          ],
        );
      },
    );
  },
);
