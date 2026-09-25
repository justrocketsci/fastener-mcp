import fs from 'fs';
import path from 'path';
import fasteners from '../data/fasteners.json';
import type { Fastener } from '../lib/types';
import { buildPlacementPacket } from '../lib/placement-packet';
import { buildPlacementRecipe, calculatePlacementTransform, type TargetHole, type Vector3 } from '../lib/placement-recipe';

/**
 * Test verification for placement recipe
 * Tests iso-1207-m5-20 placement in a tilted hole
 */

interface TestResult {
  passed: boolean;
  partId: string;
  testCase: string;
  axisCollinearityError: {
    angleDegrees: number;
    passed: boolean;
  };
  headSeatingError: {
    distanceMm: number;
    passed: boolean;
  };
  kclGenerated: boolean;
  kclPath?: string;
  details: string;
}

// Tolerance constants
const AXIS_ANGLE_TOLERANCE_DEG = 0.01;
const DISTANCE_TOLERANCE_MM = 0.01;

/**
 * Normalize a vector to unit length
 */
function normalizeVector(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) {
    throw new Error('Cannot normalize zero-length vector');
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Dot product
 */
function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Apply 4x4 transformation matrix to a point
 */
function applyTransform(matrix: number[][], point: Vector3): Vector3 {
  return {
    x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z + matrix[0][3],
    y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z + matrix[1][3],
    z: matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z + matrix[2][3],
  };
}

/**
 * Apply 4x4 transformation matrix to a direction vector (no translation)
 */
function applyTransformDirection(matrix: number[][], direction: Vector3): Vector3 {
  return {
    x: matrix[0][0] * direction.x + matrix[0][1] * direction.y + matrix[0][2] * direction.z,
    y: matrix[1][0] * direction.x + matrix[1][1] * direction.y + matrix[1][2] * direction.z,
    z: matrix[2][0] * direction.x + matrix[2][1] * direction.y + matrix[2][2] * direction.z,
  };
}

/**
 * Calculate distance between two points
 */
function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle between two vectors in degrees
 */
function angleBetween(a: Vector3, b: Vector3): number {
  const dotProduct = dot(normalizeVector(a), normalizeVector(b));
  const clamped = Math.max(-1, Math.min(1, dotProduct));
  return Math.acos(clamped) * 180 / Math.PI;
}

/**
 * Verify placement transform numerically
 */
function verifyPlacement(
  partId: string,
  targetHole: TargetHole,
  testName: string
): TestResult {
  // Get fastener
  const fastener = fasteners.find(f => f.id === partId) as Fastener;
  if (!fastener) {
    throw new Error(`Fastener ${partId} not found`);
  }

  // Build placement packet
  const baseUrl = 'https://fastener-mcp.vercel.app';
  const placementPacket = buildPlacementPacket(fastener, baseUrl);

  // Calculate placement recipe
  const recipe = buildPlacementRecipe(placementPacket, targetHole);
  const { transform } = recipe;

  // Fastener frame: origin at head bearing face center, +Z along shank toward tip
  const fastenerOrigin: Vector3 = { x: 0, y: 0, z: 0 };
  const fastenerAxis: Vector3 = { x: 0, y: 0, z: 1 };

  // Apply transform
  const transformedOrigin = applyTransform(transform.matrix4x4, fastenerOrigin);
  const transformedAxis = applyTransformDirection(transform.matrix4x4, fastenerAxis);

  // Check 1: Axis collinearity
  const holeAxis = normalizeVector(targetHole.axisDirection);
  const angleError = angleBetween(transformedAxis, holeAxis);
  const axisCollinearityPassed = angleError < AXIS_ANGLE_TOLERANCE_DEG;

  // Check 2: Head seating at entry face
  const headSeatingError = distance(transformedOrigin, targetHole.entryPoint);
  const headSeatingPassed = headSeatingError < DISTANCE_TOLERANCE_MM;

  // Generate KCL file
  const kclPath = path.join(process.cwd(), 'test-artifacts', `${testName}.kcl`);
  const kclContent = generateTestKcl(partId, targetHole, recipe.kclSnippet);
  fs.writeFileSync(kclPath, kclContent);

  const passed = axisCollinearityPassed && headSeatingPassed;

  return {
    passed,
    partId,
    testCase: testName,
    axisCollinearityError: {
      angleDegrees: angleError,
      passed: axisCollinearityPassed,
    },
    headSeatingError: {
      distanceMm: headSeatingError,
      passed: headSeatingPassed,
    },
    kclGenerated: true,
    kclPath,
    details: `Transform verification:
  - Fastener axis angle error: ${angleError.toFixed(6)}° (tolerance: ${AXIS_ANGLE_TOLERANCE_DEG}°)
  - Head seating distance error: ${headSeatingError.toFixed(6)} mm (tolerance: ${DISTANCE_TOLERANCE_MM} mm)
  - Transform matrix:
${JSON.stringify(transform.matrix4x4, null, 2)}
  - Rotation (axis-angle): ${transform.rotation.axisAngle.angleDegrees.toFixed(3)}° about [${transform.rotation.axisAngle.axis.x.toFixed(3)}, ${transform.rotation.axisAngle.axis.y.toFixed(3)}, ${transform.rotation.axisAngle.axis.z.toFixed(3)}]
  - Translation: [${transform.translation.x.toFixed(3)}, ${transform.translation.y.toFixed(3)}, ${transform.translation.z.toFixed(3)}] mm`,
  };
}

/**
 * Generate a complete KCL test file with block, hole, and placed fastener
 */
function generateTestKcl(
  partId: string,
  targetHole: TargetHole,
  fastenerSnippet: string
): string {
  // Create a test block (30x30x15 mm) with a tilted M5 clearance hole
  const kcl = `@settings(kclVersion = 2.0)

// Test block: 30x30x15 mm
testBlock = startSketchOn('XY')
  |> startProfileAt([0, 0], %)
  |> line([30, 0], %)
  |> line([0, 30], %)
  |> line([-30, 0], %)
  |> close(%)
  |> extrude(15, %)

// Hole specification (in assembly frame):
// Entry point: [${targetHole.entryPoint.x}, ${targetHole.entryPoint.y}, ${targetHole.entryPoint.z}] mm
// Axis direction: [${targetHole.axisDirection.x}, ${targetHole.axisDirection.y}, ${targetHole.axisDirection.z}]
// Rotation: ${targetHole.rotationDegrees || 0}°

// M5 clearance hole (5.3mm diameter) - would be created with appropriate transforms
// Note: Full hole creation with arbitrary axis requires shell/sweep operations
// For verification purposes, the fastener placement is the key output

${fastenerSnippet}

// Expected result: fastener axis collinear with hole axis,
// head bearing face at entry point
`;

  return kcl;
}

/**
 * Run all test cases
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('PLACEMENT RECIPE VERIFICATION TESTS');
  console.log('='.repeat(80));
  console.log();

  const results: TestResult[] = [];

  // Test 1: Axis-aligned hole (sanity check)
  console.log('Test 1: Axis-aligned hole (along +Z)');
  console.log('-'.repeat(80));
  const test1Hole: TargetHole = {
    axisDirection: { x: 0, y: 0, z: 1 },
    entryPoint: { x: 15, y: 15, z: 15 },
    rotationDegrees: 0,
  };
  const result1 = verifyPlacement('iso-1207-m5-20', test1Hole, 'test1_axis_aligned');
  results.push(result1);
  console.log(result1.details);
  console.log(`\nResult: ${result1.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log();

  // Test 2: Tilted hole (45° about X axis)
  console.log('Test 2: Tilted hole (45° about X axis)');
  console.log('-'.repeat(80));
  const angle45 = Math.PI / 4;
  const test2Hole: TargetHole = {
    axisDirection: { x: 0, y: Math.sin(angle45), z: Math.cos(angle45) },
    entryPoint: { x: 15, y: 10, z: 10 },
    rotationDegrees: 0,
  };
  const result2 = verifyPlacement('iso-1207-m5-20', test2Hole, 'test2_tilted_45deg');
  results.push(result2);
  console.log(result2.details);
  console.log(`\nResult: ${result2.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log();

  // Test 3: Anti-parallel (180° flip)
  console.log('Test 3: Anti-parallel hole (pointing down -Z)');
  console.log('-'.repeat(80));
  const test3Hole: TargetHole = {
    axisDirection: { x: 0, y: 0, z: -1 },
    entryPoint: { x: 15, y: 15, z: 15 },
    rotationDegrees: 0,
  };
  const result3 = verifyPlacement('iso-1207-m5-20', test3Hole, 'test3_antiparallel');
  results.push(result3);
  console.log(result3.details);
  console.log(`\nResult: ${result3.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log();

  // Test 4: Complex tilted hole with rotation
  console.log('Test 4: Complex tilt (30° about X, 20° about Y) with 45° axial rotation');
  console.log('-'.repeat(80));
  const angle30 = 30 * Math.PI / 180;
  const angle20 = 20 * Math.PI / 180;
  // Combined rotation: Ry(20°) * Rx(30°) applied to [0,0,1]
  const nx = Math.sin(angle30);
  const ny = Math.sin(angle20) * Math.cos(angle30);
  const nz = Math.cos(angle20) * Math.cos(angle30);
  const test4Hole: TargetHole = {
    axisDirection: { x: nx, y: ny, z: nz },
    entryPoint: { x: 20, y: 12, z: 8 },
    rotationDegrees: 45,
  };
  const result4 = verifyPlacement('iso-1207-m5-20', test4Hole, 'test4_complex_with_rotation');
  results.push(result4);
  console.log(result4.details);
  console.log(`\nResult: ${result4.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${results.length - passedCount}`);
  console.log();
  console.log('Generated KCL files:');
  for (const result of results) {
    console.log(`  - ${result.kclPath}`);
  }
  console.log();

  // Save summary
  const summaryPath = path.join(process.cwd(), 'test-artifacts', 'verification-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`Summary saved to: ${summaryPath}`);
  console.log();

  process.exit(passedCount === results.length ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
