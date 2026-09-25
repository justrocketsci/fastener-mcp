/**
 * Tests for write operation authentication
 * Run with: npx tsx scripts/test-write-auth.ts
 */

import { validateWriteKey } from '../lib/auth';

interface TestCase {
  name: string;
  envKey: string | undefined;
  providedKey: string | null;
  headerType: 'x-api-key' | 'bearer' | null;
  expectedAuthenticated: boolean;
  expectedStatus?: number;
}

function createHeaders(key: string | null, type: 'x-api-key' | 'bearer' | null): Headers {
  const headers = new Headers();
  if (key && type === 'x-api-key') {
    headers.set('x-api-key', key);
  } else if (key && type === 'bearer') {
    headers.set('authorization', `Bearer ${key}`);
  }
  return headers;
}

function runTest(testCase: TestCase): boolean {
  console.log(`\nTest: ${testCase.name}`);
  console.log('-'.repeat(60));

  // Set environment
  const originalEnv = process.env.FASTENER_WRITE_KEY;
  if (testCase.envKey === undefined) {
    delete process.env.FASTENER_WRITE_KEY;
  } else {
    process.env.FASTENER_WRITE_KEY = testCase.envKey;
  }

  try {
    const headers = createHeaders(testCase.providedKey, testCase.headerType);
    const result = validateWriteKey(headers);

    const passed = 
      result.authenticated === testCase.expectedAuthenticated &&
      (!testCase.expectedStatus || result.status === testCase.expectedStatus);

    console.log(`Expected authenticated: ${testCase.expectedAuthenticated}`);
    console.log(`Got authenticated: ${result.authenticated}`);
    if (testCase.expectedStatus) {
      console.log(`Expected status: ${testCase.expectedStatus}`);
      console.log(`Got status: ${result.status}`);
    }
    if (result.error) {
      console.log(`Error message: ${result.error}`);
    }
    console.log(`Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);

    return passed;
  } finally {
    // Restore environment
    if (originalEnv === undefined) {
      delete process.env.FASTENER_WRITE_KEY;
    } else {
      process.env.FASTENER_WRITE_KEY = originalEnv;
    }
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('WRITE AUTHENTICATION TESTS');
  console.log('='.repeat(80));

  const VALID_KEY = 'test-key-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd';
  const WRONG_KEY = 'wrong-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const testCases: TestCase[] = [
    // Environment not set
    {
      name: 'Environment key not set',
      envKey: undefined,
      providedKey: VALID_KEY,
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 503,
    },
    {
      name: 'Environment key empty string',
      envKey: '',
      providedKey: VALID_KEY,
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 503,
    },
    {
      name: 'Environment key whitespace only',
      envKey: '   ',
      providedKey: VALID_KEY,
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 503,
    },

    // Missing key from client
    {
      name: 'No key provided (x-api-key)',
      envKey: VALID_KEY,
      providedKey: null,
      headerType: null,
      expectedAuthenticated: false,
      expectedStatus: 401,
    },
    {
      name: 'Empty key provided',
      envKey: VALID_KEY,
      providedKey: '',
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },
    {
      name: 'Whitespace-only key provided',
      envKey: VALID_KEY,
      providedKey: '   ',
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },

    // Wrong key
    {
      name: 'Wrong key via x-api-key',
      envKey: VALID_KEY,
      providedKey: WRONG_KEY,
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },
    {
      name: 'Wrong key via Bearer',
      envKey: VALID_KEY,
      providedKey: WRONG_KEY,
      headerType: 'bearer',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },
    {
      name: 'Key with different length',
      envKey: VALID_KEY,
      providedKey: 'short',
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },

    // Correct key
    {
      name: 'Correct key via x-api-key',
      envKey: VALID_KEY,
      providedKey: VALID_KEY,
      headerType: 'x-api-key',
      expectedAuthenticated: true,
    },
    {
      name: 'Correct key via Bearer',
      envKey: VALID_KEY,
      providedKey: VALID_KEY,
      headerType: 'bearer',
      expectedAuthenticated: true,
    },

    // Case sensitivity
    {
      name: 'Key with wrong case (should fail)',
      envKey: VALID_KEY,
      providedKey: VALID_KEY.toUpperCase(),
      headerType: 'x-api-key',
      expectedAuthenticated: false,
      expectedStatus: 401,
    },

    // Special characters
    {
      name: 'Key with special characters',
      envKey: 'key-with-special!@#$%^&*()_+={}[]|:;<>?,./~`',
      providedKey: 'key-with-special!@#$%^&*()_+={}[]|:;<>?,./~`',
      headerType: 'x-api-key',
      expectedAuthenticated: true,
    },
  ];

  const results = testCases.map(runTest);

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
