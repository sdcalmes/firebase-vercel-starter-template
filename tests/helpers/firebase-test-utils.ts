import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function initRulesTestEnv(projectId = 'demo-starter-test'): Promise<RulesTestEnvironment> {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  return initializeTestEnvironment({
    projectId,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

export function getAuthCtx(testEnv: RulesTestEnvironment, uid: string, adminRole = false) {
  return testEnv.authenticatedContext(uid, adminRole ? { role: 'admin' } : {});
}

export function getUnauthCtx(testEnv: RulesTestEnvironment) {
  return testEnv.unauthenticatedContext();
}

export async function seedFirestore(
  testEnv: RulesTestEnvironment,
  data: Record<string, Record<string, unknown>>,
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [path, docData] of Object.entries(data)) {
      await db.doc(path).set(docData);
    }
  });
}
