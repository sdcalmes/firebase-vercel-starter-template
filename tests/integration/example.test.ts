/**
 * Example integration test. Each integration test file should use its OWN
 * projectId (e.g. `demo-app-<suite>`) so parallel suites don't clobber each
 * other's data in the shared Firestore emulator.
 */
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-starter-integration',
    firestore: { host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('example integration', () => {
  it('writes and reads back a document via the admin context', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc('widgets/w1').set({ name: 'hello' });
      const snap = await db.doc('widgets/w1').get();
      expect(snap.data()?.name).toBe('hello');
    });
  });
});
