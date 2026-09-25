import type { PlacementPacket } from '@/lib/placement-packet';

/**
 * Vector3 type for 3D coordinates (in mm)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Rotation representation in multiple formats
 */
export interface Rotation {
  /** Axis-angle: axis direction (unit vector) and angle in degrees */
  axisAngle: {
    axis: Vector3;
    angleDegrees: number;
  };
  /** Euler angles in degrees (XYZ convention, intrinsic rotations) */
  eulerXYZ: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Rigid transform (translation + rotation)
 */
export interface RigidTransform {
  /** Translation in mm */
  translation: Vector3;
  /** Rotation in multiple formats */
  rotation: Rotation;
  /** 4x4 homogeneous transformation matrix (row-major) */
  matrix4x4: number[][];
}

/**
 * Target hole specification in assembly frame
 */
export interface TargetHole {
  /** Hole axis direction (unit vector, points into hole) */
  axisDirection: Vector3;
  /** Point on hole axis at entry face (mm, assembly frame) */
  entryPoint: Vector3;
  /** Optional rotation about hole axis in degrees (0 = default orientation) */
  rotationDegrees?: number;
}

/**
 * Placement recipe output
 */
export interface PlacementRecipe {
  /** Part ID */
  partId: string;
  /** Target hole specification */
  targetHole: TargetHole;
  /** Rigid transform to place fastener */
  transform: RigidTransform;
  /** Ready-to-run KCL snippet */
  kclSnippet: string;
  /** Plain-language recipe */
  recipe: {
    steps: string[];
    mateIntent: {
      axisCoincident: string;
      faceCoincident: string;
      optionalRotation?: string;
    };
  };
  /** Fastener frame definition for reference */
  fastenerFrame: {
    origin: string;
    axis: string;
    units: string;
  };
}

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
 * Cross product of two vectors
 */
function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Dot product of two vectors
 */
function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Convert axis-angle to rotation matrix (3x3)
 */
function axisAngleToMatrix(axis: Vector3, angleDegrees: number): number[][] {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;
  const { x, y, z } = axis;

  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

/**
 * Convert rotation matrix (3x3) to axis-angle
 */
function matrixToAxisAngle(m: number[][]): { axis: Vector3; angleDegrees: number } {
  // Calculate angle from trace
  const trace = m[0][0] + m[1][1] + m[2][2];
  const angleRad = Math.acos((trace - 1) / 2);
  const angleDegrees = (angleRad * 180) / Math.PI;

  // Handle special cases
  if (Math.abs(angleDegrees) < 1e-6) {
    // Identity rotation
    return { axis: { x: 0, y: 0, z: 1 }, angleDegrees: 0 };
  }

  if (Math.abs(angleDegrees - 180) < 1e-6) {
    // 180-degree rotation
    const i = m[0][0] > m[1][1] ? (m[0][0] > m[2][2] ? 0 : 2) : (m[1][1] > m[2][2] ? 1 : 2);
    const axis = { x: 0, y: 0, z: 0 };
    if (i === 0) {
      axis.x = Math.sqrt((m[0][0] + 1) / 2);
      axis.y = m[0][1] / (2 * axis.x);
      axis.z = m[0][2] / (2 * axis.x);
    } else if (i === 1) {
      axis.y = Math.sqrt((m[1][1] + 1) / 2);
      axis.x = m[0][1] / (2 * axis.y);
      axis.z = m[1][2] / (2 * axis.y);
    } else {
      axis.z = Math.sqrt((m[2][2] + 1) / 2);
      axis.x = m[0][2] / (2 * axis.z);
      axis.y = m[1][2] / (2 * axis.z);
    }
    return { axis: normalizeVector(axis), angleDegrees: 180 };
  }

  // General case
  const axis = {
    x: m[2][1] - m[1][2],
    y: m[0][2] - m[2][0],
    z: m[1][0] - m[0][1],
  };

  return { axis: normalizeVector(axis), angleDegrees };
}

/**
 * Convert rotation matrix (3x3) to Euler XYZ angles
 */
function matrixToEulerXYZ(m: number[][]): { x: number; y: number; z: number } {
  // XYZ intrinsic Euler angles (Tait-Bryan angles)
  const sy = Math.sqrt(m[0][0] * m[0][0] + m[1][0] * m[1][0]);
  
  const singular = sy < 1e-6;
  
  let x, y, z;
  if (!singular) {
    x = Math.atan2(m[2][1], m[2][2]);
    y = Math.atan2(-m[2][0], sy);
    z = Math.atan2(m[1][0], m[0][0]);
  } else {
    x = Math.atan2(-m[1][2], m[1][1]);
    y = Math.atan2(-m[2][0], sy);
    z = 0;
  }

  return {
    x: (x * 180) / Math.PI,
    y: (y * 180) / Math.PI,
    z: (z * 180) / Math.PI,
  };
}

/**
 * Create 4x4 homogeneous transformation matrix from rotation matrix and translation
 */
function createTransformMatrix(rotation: number[][], translation: Vector3): number[][] {
  return [
    [rotation[0][0], rotation[0][1], rotation[0][2], translation.x],
    [rotation[1][0], rotation[1][1], rotation[1][2], translation.y],
    [rotation[2][0], rotation[2][1], rotation[2][2], translation.z],
    [0, 0, 0, 1],
  ];
}

/**
 * Calculate the rigid transform to place a fastener into a target hole
 * 
 * Fastener frame (from placement packet):
 * - Origin: head bearing face center
 * - +Z axis: along shank toward tip
 * - Units: mm
 * 
 * Transform brings fastener from its local frame to assembly frame such that:
 * - Fastener +Z axis is collinear with hole axis (pointing into hole)
 * - Head bearing face center is at hole entry point
 * - Optional rotation about axis
 */
export function calculatePlacementTransform(
  placementPacket: PlacementPacket,
  targetHole: TargetHole
): RigidTransform {
  // Normalize hole axis direction
  const holeAxis = normalizeVector(targetHole.axisDirection);

  // Fastener's local +Z axis (from placement packet)
  const fastenerAxis: Vector3 = { x: 0, y: 0, z: 1 };

  // Calculate rotation to align fastener +Z with hole axis
  // Use Rodrigues' rotation formula via axis-angle
  
  const axis = cross(fastenerAxis, holeAxis);
  const axisLength = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
  
  let rotationMatrix: number[][];
  
  if (axisLength < 1e-6) {
    // Axes are parallel or anti-parallel
    const dotProduct = dot(fastenerAxis, holeAxis);
    if (dotProduct > 0) {
      // Already aligned
      rotationMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
    } else {
      // Anti-parallel (180-degree rotation)
      // Rotate about X axis
      rotationMatrix = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
      ];
    }
  } else {
    // General case: rotate about cross product axis
    const normalizedAxis = { x: axis.x / axisLength, y: axis.y / axisLength, z: axis.z / axisLength };
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(fastenerAxis, holeAxis))));
    const angleDegrees = (angle * 180) / Math.PI;
    rotationMatrix = axisAngleToMatrix(normalizedAxis, angleDegrees);
  }

  // Apply additional rotation about hole axis if specified
  if (targetHole.rotationDegrees && Math.abs(targetHole.rotationDegrees) > 1e-6) {
    const axialRotation = axisAngleToMatrix(holeAxis, targetHole.rotationDegrees);
    // Multiply: axialRotation * rotationMatrix
    const combined: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        combined[i][j] = 
          axialRotation[i][0] * rotationMatrix[0][j] +
          axialRotation[i][1] * rotationMatrix[1][j] +
          axialRotation[i][2] * rotationMatrix[2][j];
      }
    }
    rotationMatrix = combined;
  }

  // Translation: we want the head bearing face (frame origin) at the entry point
  // The placement packet defines the frame origin as the head bearing face center
  // For the catalog STEP files, this is NOT at (0,0,0) in STEP coordinates
  // From inspection: iso-1207 has head underside at Z=-3.3 in native STEP coords
  // So we need: R @ (0,0,-3.3) + t = entryPoint
  // Therefore: t = entryPoint - R @ (0,0,-3.3)
  
  // TODO: This offset should come from the placement packet or catalog metadata
  // For now, hardcode the known offset for this STEP
  const frameOriginInStepCoords = { x: 0, y: 0, z: -3.3 };  // Head underside location
  
  // Calculate where the frame origin ends up after rotation
  const rotatedOrigin = {
    x: rotationMatrix[0][0] * frameOriginInStepCoords.x + 
       rotationMatrix[0][1] * frameOriginInStepCoords.y + 
       rotationMatrix[0][2] * frameOriginInStepCoords.z,
    y: rotationMatrix[1][0] * frameOriginInStepCoords.x + 
       rotationMatrix[1][1] * frameOriginInStepCoords.y + 
       rotationMatrix[1][2] * frameOriginInStepCoords.z,
    z: rotationMatrix[2][0] * frameOriginInStepCoords.x + 
       rotationMatrix[2][1] * frameOriginInStepCoords.y + 
       rotationMatrix[2][2] * frameOriginInStepCoords.z,
  };
  
  // Translation should place the rotated frame origin at the entry point
  const translation = {
    x: targetHole.entryPoint.x - rotatedOrigin.x,
    y: targetHole.entryPoint.y - rotatedOrigin.y,
    z: targetHole.entryPoint.z - rotatedOrigin.z,
  };

  // Convert to various rotation representations
  const axisAngle = matrixToAxisAngle(rotationMatrix);
  const eulerXYZ = matrixToEulerXYZ(rotationMatrix);

  const rotation: Rotation = {
    axisAngle,
    eulerXYZ,
  };

  // Create 4x4 matrix
  const matrix4x4 = createTransformMatrix(rotationMatrix, translation);

  return {
    translation,
    rotation,
    matrix4x4,
  };
}

/**
 * Generate a KCL snippet that imports the fastener STEP and applies the placement transform
 */
export function generateKclSnippet(
  partId: string,
  transform: RigidTransform
): string {
  const { translation, rotation } = transform;
  const stepFilename = `${partId}.step`;

  // KCL uses degrees for rotation
  // Format: rotate(axis = [x, y, z], angle = Ndeg)
  const { axis, angleDegrees } = rotation.axisAngle;

  let snippet = `// Import fastener STEP model\nimport "${stepFilename}" as fastener\n\n`;
  snippet += `// Apply placement transform\n`;
  snippet += `fastener\n`;
  
  // Apply translation using xyz parameter
  snippet += `  |> translate(xyz = [${translation.x.toFixed(6)}, ${translation.y.toFixed(6)}, ${translation.z.toFixed(6)}])\n`;
  
  // Apply rotation if non-zero
  if (Math.abs(angleDegrees) > 1e-6) {
    snippet += `  |> rotate(axis = [${axis.x.toFixed(6)}, ${axis.y.toFixed(6)}, ${axis.z.toFixed(6)}], angle = ${angleDegrees.toFixed(6)}deg)\n`;
  }

  return snippet;
}

/**
 * Generate a plain-language placement recipe
 */
export function generatePlainLanguageRecipe(
  placementPacket: PlacementPacket,
  targetHole: TargetHole
): PlacementRecipe['recipe'] {
  const steps = [
    '1. Import the fastener STEP model into your assembly',
    '2. Make the fastener axis (shank centerline) coincident with the hole axis',
    '3. Orient the fastener so the shank points into the hole (not out)',
    '4. Make the head underside (bearing face) coincident with the hole entry face',
  ];

  if (targetHole.rotationDegrees && Math.abs(targetHole.rotationDegrees) > 1e-6) {
    steps.push(`5. Rotate the fastener ${targetHole.rotationDegrees.toFixed(1)}° about the hole axis`);
  }

  const mateIntent = {
    axisCoincident: 'Fastener shank centerline coincident with hole axis',
    faceCoincident: 'Fastener head bearing surface (underside) coincident with hole entry face',
    optionalRotation: targetHole.rotationDegrees 
      ? `Rotate ${targetHole.rotationDegrees.toFixed(1)}° about axis`
      : undefined,
  };

  return { steps, mateIntent };
}

/**
 * Build complete placement recipe
 */
export function buildPlacementRecipe(
  placementPacket: PlacementPacket,
  targetHole: TargetHole
): PlacementRecipe {
  const transform = calculatePlacementTransform(placementPacket, targetHole);
  const kclSnippet = generateKclSnippet(placementPacket.id, transform);
  const recipe = generatePlainLanguageRecipe(placementPacket, targetHole);

  return {
    partId: placementPacket.id,
    targetHole,
    transform,
    kclSnippet,
    recipe,
    fastenerFrame: {
      origin: placementPacket.frame.origin,
      axis: placementPacket.frame.axis,
      units: placementPacket.frame.units,
    },
  };
}
