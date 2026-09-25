import fasteners from '../data/fasteners.json';
import { buildPlacementPacket } from '../lib/placement-packet';
import { buildPlacementRecipe } from '../lib/placement-recipe';
import fs from 'fs';
import path from 'path';

// Parse command line args: hole_axis_x hole_axis_y hole_axis_z entry_x entry_y entry_z
const args = process.argv.slice(2);

if (args.length < 6) {
  console.error('Usage: tsx calc-transform-helper.ts <part_id> <hole_x> <hole_y> <hole_z> <entry_x> <entry_y> <entry_z>');
  process.exit(1);
}

const partId = args[0];
const holeAxis = {
  x: parseFloat(args[1]),
  y: parseFloat(args[2]),
  z: parseFloat(args[3])
};
const entryPoint = {
  x: parseFloat(args[4]),
  y: parseFloat(args[5]),
  z: parseFloat(args[6])
};

const fastener = fasteners.find(f => f.id === partId);

if (!fastener) {
  console.error(`Fastener not found: ${partId}`);
  process.exit(1);
}

const placementPacket = buildPlacementPacket(fastener as any, 'https://test.com');

const targetHole = {
  axisDirection: holeAxis,
  entryPoint: entryPoint,
  rotationDegrees: 0
};

const recipe = buildPlacementRecipe(placementPacket, targetHole);

// Output the transform matrix to artifacts
const outputPath = path.join(process.cwd(), 'test-artifacts', 'transform-matrix.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(recipe.transform.matrix4x4, null, 2));

// Also output to stdout
console.log(JSON.stringify(recipe.transform.matrix4x4));
