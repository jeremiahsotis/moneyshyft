import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import {
  collectPrimaryCopy,
  type QueueEnvelope,
  readItems,
  type ThreadDetailEnvelope,
  UUID_PATTERN,
} from './g-6-volunteer-contract-boundary-and-regression-hardening.shared';
import './g-6-volunteer-contract-boundary-and-regression-hardening.atdd.api.lifecycle-and-feedback.cases';

test.describe('Story g.6 Volunteer Contract Boundary and Regression Hardening (ATDD API RED)', () => {
  test(
    '[G6-ATDD-API-001][P0] volunteer queue display contracts suppress raw internal metadata and only expose display-safe fields @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
        headers: storyG6VolunteerHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
      const mineBody = (await mineResponse.json()) as QueueEnvelope;
      const items = [...readItems(inboxBody), ...readItems(mineBody)];

      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        expect(item.display).toBeDefined();

        for (const forbiddenField of storyG6Context.forbiddenDisplayFields) {
          expect(item.display).not.toHaveProperty(forbiddenField);
        }

        const loweredCopy = collectPrimaryCopy(item).join(' ').toLowerCase();
        expect(loweredCopy.length).toBeGreaterThan(0);

        for (const token of storyG6Context.forbiddenPrimaryCopyTokens) {
          expect(loweredCopy).not.toContain(token);
        }

        expect(loweredCopy).not.toMatch(UUID_PATTERN);
      }
    },
  );

  test(
    '[G6-ATDD-API-002][P0] voicemail behavior lock keeps claimed voicemail thread in Mine and renders voicemail as first-class timeline content @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
    }) => {
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
        headers: storyG6VolunteerHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.mineVoicemail}`,
        headers: storyG6VolunteerHeaders,
      });

      expect(mineResponse.status()).toBe(200);
      expect(inboxResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const mineBody = (await mineResponse.json()) as QueueEnvelope;
      const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
      const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;

      const mineVoicemail = readItems(mineBody).find(
        (item) => item.threadId === storyG6Context.threadIds.mineVoicemail,
      );
      const inboxVoicemail = readItems(inboxBody).find(
        (item) => item.threadId === storyG6Context.threadIds.mineVoicemail,
      );

      expect(mineVoicemail).toBeDefined();
      expect(mineVoicemail?.bucket).toBe('mine');
      expect(mineVoicemail?.voicemailIndicator).toBe(true);
      expect(inboxVoicemail).toBeUndefined();

      const timeline = Array.isArray(detailBody.data?.thread?.timeline)
        ? detailBody.data.thread.timeline
        : [];
      expect(timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            conversationType: 'voicemail',
            renderMode: 'inline',
            firstClass: true,
          }),
        ]),
      );
    },
  );

  test(
    '[G6-ATDD-API-003][P0] CLOSED outbound actions preserve same-thread reopen lifecycle semantics and deterministic feedback contracts @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6OutboundCallPayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
        headers: storyG6VolunteerHeaders,
        data: storyG6OutboundCallPayload,
      });

      expect(response.status()).toBe(200);

      const body = (await response.json()) as ThreadDetailEnvelope;
      expect(body.ok).toBe(true);
      expect(body.data?.thread).toMatchObject({
        threadId: storyG6Context.threadIds.closedOutbound,
        state: 'UNCLAIMED',
      });
      expect(body.data?.lifecycle).toMatchObject({
        priorState: 'CLOSED',
        nextState: 'UNCLAIMED',
        reopenedFromClosed: true,
        reopenedByInbound: false,
        sameThreadId: true,
        noInboundAutoReopenSideEffects: true,
      });
      expect(body.data?.uiFeedback).toMatchObject({
        severity: 'success',
        ariaLive: 'polite',
        presentation: 'contextual-action-feedback',
      });
    },
  );
});
