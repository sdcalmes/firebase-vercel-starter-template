import { assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeEach, describe, it } from 'vitest';
import { initRulesTestEnv, getAuthCtx } from '../helpers/firebase-test-utils';

let testEnv: RulesTestEnvironment;

describe('users collection rules', () => {
  beforeEach(async () => {
    testEnv = await initRulesTestEnv('demo-starter-users');
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('lets a user create their own doc with role=user', async () => {
    const alice = getAuthCtx(testEnv, 'alice').firestore();
    await assertSucceeds(
      alice.doc('users/alice').set({ uid: 'alice', email: 'a@x.com', role: 'user' }),
    );
  });

  it('forbids creating your doc with role=admin', async () => {
    const mallory = getAuthCtx(testEnv, 'mallory').firestore();
    await assertFails(
      mallory.doc('users/mallory').set({ uid: 'mallory', role: 'admin' }),
    );
  });

  it('forbids writing someone else’s user doc', async () => {
    const alice = getAuthCtx(testEnv, 'alice').firestore();
    await assertFails(
      alice.doc('users/bob').set({ uid: 'bob', role: 'user' }),
    );
  });
});
