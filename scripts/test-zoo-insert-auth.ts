/**
 * Integration tests for Zoo insert endpoint authentication
 * Run with: FASTENER_WRITE_KEY=test-key npx tsx scripts/test-zoo-insert-auth.ts
 */

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
}

const TEST_KEY = 'test-integration-key-1234567890abcdef';
const WRONG_KEY = 'wrong-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

async function testZooInsertAuth(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  const baseUrl = 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/adapters/zoo/insert`;
  const testId = 'iso-1207-m5-20';

  console.log('='.repeat(80));
  console.log('ZOO INSERT ENDPOINT AUTHENTICATION INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log();
  console.log('Prerequisites:');
  console.log('1. Server must be running (npm run dev)');
  console.log('2. FASTENER_WRITE_KEY must be set in environment');
  console.log();

  // Test 1: No key
  console.log('Test 1: Request without API key');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: testId }),
    });
    const data = await response.json();
    const passed = response.status === 401 && !data.ok;
    results.push({
      name: 'No API key',
      passed,
      status: response.status,
      error: data.error,
    });
    console.log(`Status: ${response.status}`);
    console.log(`Error: ${data.error}`);
    console.log(`Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  } catch (error) {
    results.push({
      name: 'No API key',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  // Test 2: Wrong key via x-api-key
  console.log('Test 2: Request with wrong API key (x-api-key)');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WRONG_KEY,
      },
      body: JSON.stringify({ id: testId }),
    });
    const data = await response.json();
    const passed = response.status === 401 && !data.ok;
    results.push({
      name: 'Wrong API key (x-api-key)',
      passed,
      status: response.status,
      error: data.error,
    });
    console.log(`Status: ${response.status}`);
    console.log(`Error: ${data.error}`);
    console.log(`Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  } catch (error) {
    results.push({
      name: 'Wrong API key (x-api-key)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  // Test 3: Wrong key via Bearer
  console.log('Test 3: Request with wrong API key (Bearer)');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WRONG_KEY}`,
      },
      body: JSON.stringify({ id: testId }),
    });
    const data = await response.json();
    const passed = response.status === 401 && !data.ok;
    results.push({
      name: 'Wrong API key (Bearer)',
      passed,
      status: response.status,
      error: data.error,
    });
    console.log(`Status: ${response.status}`);
    console.log(`Error: ${data.error}`);
    console.log(`Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  } catch (error) {
    results.push({
      name: 'Wrong API key (Bearer)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  // Test 4: Correct key via x-api-key (will fail if ZOO_API_TOKEN not set, but auth should pass)
  console.log('Test 4: Request with correct API key (x-api-key)');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_KEY,
      },
      body: JSON.stringify({ id: testId }),
    });
    const data = await response.json();
    // Auth should pass, but Zoo operation may fail if ZOO_API_TOKEN not set
    // We consider it passed if we get past auth (401) - either success or 503/404/500
    const passed = response.status !== 401 || data.error?.includes('not configured');
    results.push({
      name: 'Correct API key (x-api-key)',
      passed,
      status: response.status,
      error: data.error,
    });
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    console.log(`Result: ${passed ? '✓ PASSED (auth succeeded)' : '✗ FAILED (auth failed)'}`);
  } catch (error) {
    results.push({
      name: 'Correct API key (x-api-key)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  // Test 5: Correct key via Bearer
  console.log('Test 5: Request with correct API key (Bearer)');
  console.log('-'.repeat(60));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_KEY}`,
      },
      body: JSON.stringify({ id: testId }),
    });
    const data = await response.json();
    const passed = response.status !== 401 || data.error?.includes('not configured');
    results.push({
      name: 'Correct API key (Bearer)',
      passed,
      status: response.status,
      error: data.error,
    });
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    console.log(`Result: ${passed ? '✓ PASSED (auth succeeded)' : '✗ FAILED (auth failed)'}`);
  } catch (error) {
    results.push({
      name: 'Correct API key (Bearer)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  return results;
}

async function main() {
  // Check if server is likely running
  console.log('Checking if development server is running...');
  try {
    const response = await fetch('http://localhost:3000/api/fasteners');
    if (!response.ok) {
      console.log('⚠️  Warning: Server responded with status', response.status);
    } else {
      console.log('✓ Server is running');
    }
  } catch (error) {
    console.error('\n✗ Cannot connect to development server.');
    console.error('Please start the server with: npm run dev');
    console.error('Then run this test again.\n');
    process.exit(1);
  }

  console.log();

  // Check environment
  if (!process.env.FASTENER_WRITE_KEY) {
    console.error('✗ FASTENER_WRITE_KEY not set in environment');
    console.error(`Set it to the test key: export FASTENER_WRITE_KEY="${TEST_KEY}"`);
    console.error('Then run this test again.\n');
    process.exit(1);
  }

  if (process.env.FASTENER_WRITE_KEY !== TEST_KEY) {
    console.log(`⚠️  Warning: FASTENER_WRITE_KEY is set to a different value than the test key.`);
    console.log(`Expected: ${TEST_KEY}`);
    console.log(`Got: ${process.env.FASTENER_WRITE_KEY}`);
    console.log('Tests will use the expected test key, which will be treated as wrong.\n');
  }

  const results = await testZooInsertAuth();

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);
  console.log();

  if (passed === total) {
    console.log('✓ All integration tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some integration tests failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
