import { calculatePlacementTransform, type TargetHole, type Vector3 } from '../lib/placement-recipe';
import { buildPlacementPacket } from '../lib/placement-packet';
import type { Fastener } from '../lib/types';

/**
 * Unit tests for placement recipe transform calculations
 * Run with: npx tsx scripts/test-placement-recipe.ts
 */

interface TestCase {
  name: string;
  targetHole: TargetHole;
  expectedTranslation: Vector3;
  expectedAxisCollinear: boolean;
}

const EPSILON = 1e-6;

function vectorsEqual(a: Vector3, b: Vector3, epsilon = EPSILON): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.z - b.z) < epsilon
  );
}

function normalizeVector(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function applyTransformDirection(matrix: number[][], direction: Vector3): Vector3 {
  return {
    x: matrix[0][0] * direction.x + matrix[0][1] * direction.y + matrix[0][2] * direction.z,
    y: matrix[1][0] * direction.x + matrix[1][1] * direction.y + matrix[1][2] * direction.z,
    z: matrix[2][0] * direction.x + matrix[2][1] * direction.y + matrix[2][2] * direction.z,
  };
}

function applyTransform(matrix: number[][], point: Vector3): Vector3 {
  return {
    x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z + matrix[0][3],
    y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z + matrix[1][3],
    z: matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z + matrix[2][3],
  };
}

function runTest(testCase: TestCase, placementPacket: any): boolean {
  console.log(`\nTest: ${testCase.name}`);
  console.log('-'.repeat(60));

  try {
    const transform = calculatePlacementTransform(placementPacket, testCase.targetHole);

    // Check translation
    const translationMatch = vectorsEqual(transform.translation, testCase.expectedTranslation);
    console.log(`Translation: ${translationMatch ? '✓' : '✗'}`);
    console.log(`  Expected: [${testCase.expectedTranslation.x}, ${testCase.expectedTranslation.y}, ${testCase.expectedTranslation.z}]`);
    console.log(`  Got:      [${transform.translation.x.toFixed(6)}, ${transform.translation.y.toFixed(6)}, ${transform.translation.z.toFixed(6)}]`);

    // Check axis alignment
    const fastenerAxis: Vector3 = { x: 0, y: 0, z: 1 };
    const transformedAxis = applyTransformDirection(transform.matrix4x4, fastenerAxis);
    const normalizedTransformed = normalizeVector(transformedAxis);
    const normalizedTarget = normalizeVector(testCase.targetHole.axisDirection);
    
    const axisMatch = vectorsEqual(normalizedTransformed, normalizedTarget, 1e-3);
    console.log(`Axis alignment: ${axisMatch ? '✓' : '✗'}`);
    console.log(`  Target:      [${normalizedTarget.x.toFixed(6)}, ${normalizedTarget.y.toFixed(6)}, ${normalizedTarget.z.toFixed(6)}]`);
    console.log(`  Transformed: [${normalizedTransformed.x.toFixed(6)}, ${normalizedTransformed.y.toFixed(6)}, ${normalizedTransformed.z.toFixed(6)}]`);

    // Check origin placement
    const fastenerOrigin: Vector3 = { x: 0, y: 0, z: 0 };
    const transformedOrigin = applyTransform(transform.matrix4x4, fastenerOrigin);
    const originMatch = vectorsEqual(transformedOrigin, testCase.targetHole.entryPoint);
    console.log(`Origin placement: ${originMatch ? '✓' : '✗'}`);
    console.log(`  Expected: [${testCase.targetHole.entryPoint.x}, ${testCase.targetHole.entryPoint.y}, ${testCase.targetHole.entryPoint.z}]`);
    console.log(`  Got:      [${transformedOrigin.x.toFixed(6)}, ${transformedOrigin.y.toFixed(6)}, ${transformedOrigin.z.toFixed(6)}]`);

    // Check rotation representation consistency
    const { axisAngle, eulerXYZ } = transform.rotation;
    console.log(`Rotation (axis-angle): ${axisAngle.angleDegrees.toFixed(3)}° about [${axisAngle.axis.x.toFixed(3)}, ${axisAngle.axis.y.toFixed(3)}, ${axisAngle.axis.z.toFixed(3)}]`);
    console.log(`Rotation (Euler XYZ): [${eulerXYZ.x.toFixed(3)}°, ${eulerXYZ.y.toFixed(3)}°, ${eulerXYZ.z.toFixed(3)}°]`);

    const passed = translationMatch && axisMatch && originMatch;
    console.log(`\nResult: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
    return passed;
  } catch (error) {
    console.error(`✗ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('PLACEMENT RECIPE UNIT TESTS');
  console.log('='.repeat(80));

  // Create mock fastener for testing
  const mockFastener: Fastener = {
    id: 'test-m5-20',
    designation: 'Test M5x20',
    family: 'iso',
    diameter: 5,
    length_mm: 20,
    thread: 'M5',
    material: 'Steel',
    coating: 'None',
    notes: 'Test fastener',
    capabilities: [],
  };

  const placementPacket = buildPlacementPacket(mockFastener, 'https://test.com');

  const testCases: TestCase[] = [
    {
      name: 'Identity transform (axis-aligned, origin at zero)',
      targetHole: {
        axisDirection: { x: 0, y: 0, z: 1 },
        entryPoint: { x: 0, y: 0, z: 0 },
        rotationDegrees: 0,
      },
      expectedTranslation: { x: 0, y: 0, z: 0 },
      expectedAxisCollinear: true,
    },
    {
      name: 'Translation only (axis-aligned, non-zero entry point)',
      targetHole: {
        axisDirection: { x: 0, y: 0, z: 1 },
        entryPoint: { x: 10, y: 20, z: 30 },
        rotationDegrees: 0,
      },
      expectedTranslation: { x: 10, y: 20, z: 30 },
      expectedAxisCollinear: true,
    },
    {
      name: 'Rotation only (45° about X axis)',
      targetHole: {
        axisDirection: { x: 0, y: Math.sin(Math.PI / 4), z: Math.cos(Math.PI / 4) },
        entryPoint: { x: 0, y: 0, z: 0 },
        rotationDegrees: 0,
      },
      expectedTranslation: { x: 0, y: 0, z: 0 },
      expectedAxisCollinear: true,
    },
    {
      name: 'Anti-parallel (180° flip)',
      targetHole: {
        axisDirection: { x: 0, y: 0, z: -1 },
        entryPoint: { x: 5, y: 5, z: 5 },
        rotationDegrees: 0,
      },
      expectedTranslation: { x: 5, y: 5, z: 5 },
      expectedAxisCollinear: true,
    },
    {
      name: 'Complex rotation (30° about X, 20° about Y)',
      targetHole: {
        axisDirection: {
          x: Math.sin(30 * Math.PI / 180),
          y: Math.sin(20 * Math.PI / 180) * Math.cos(30 * Math.PI / 180),
          z: Math.cos(20 * Math.PI / 180) * Math.cos(30 * Math.PI / 180),
        },
        entryPoint: { x: 15, y: 10, z: 8 },
        rotationDegrees: 0,
      },
      expectedTranslation: { x: 15, y: 10, z: 8 },
      expectedAxisCollinear: true,
    },
    {
      name: 'With axial rotation (45° tilt + 90° axial rotation)',
      targetHole: {
        axisDirection: { x: 0, y: Math.sin(Math.PI / 4), z: Math.cos(Math.PI / 4) },
        entryPoint: { x: 10, y: 10, z: 10 },
        rotationDegrees: 90,
      },
      expectedTranslation: { x: 10, y: 10, z: 10 },
      expectedAxisCollinear: true,
    },
  ];

  const results = testCases.map(testCase => runTest(testCase, placementPacket));
  
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
