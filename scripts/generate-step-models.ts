#!/usr/bin/env tsx

/**
 * Generate simplified STEP AP214 models for fasteners
 * 
 * Creates basic cylindrical approximations from catalog dimensions.
 * NOT FOR CERTIFICATION - Educational/visualization only.
 */

import fs from 'fs';
import path from 'path';
import fasteners from '../data/fasteners.json';

interface FastenerDimensions {
  diameter: number;
  length: number;
  headDiameter: number;
  headHeight: number;
  socketSize: number;
  threadPitch: number;
}

function getDimensionsForFamily(fastener: any): FastenerDimensions | null {
  const diameter = fastener.diameter;
  const length = fastener.length_mm;

  if (length === 0) {
    return null;
  }

  const dims = fastener.dims || {};
  
  const headDiameter = dims.head_diameter || 
    (fastener.family === 'iso' ? diameter * 1.5 : 
     fastener.family === 'nas' ? diameter * 1.4 :
     diameter * 1.5);
  
  const headHeight = dims.head_height || 
    (fastener.family === 'iso' ? diameter * 0.7 : 
     fastener.family === 'nas' ? diameter :
     diameter * 0.65);

  const socketSize = dims.socket_size || (diameter * 0.75);

  return {
    diameter,
    length,
    headDiameter,
    headHeight,
    socketSize,
    threadPitch: dims.thread_pitch || 1.0
  };
}

function generateStepHeader(fastener: any): string {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Simplified fastener model - NOT FOR CERTIFICATION'),'2;1');
FILE_NAME('${fastener.id}.step','${new Date().toISOString()}',('Fastener MCP'),('fastener-mcp.vercel.app'),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
`;
}

function generateHexBoltStep(fastener: any, dims: FastenerDimensions): string {
  const header = generateStepHeader(fastener);
  
  return `${header}DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#2=DIRECTION('',(0.,0.,1.));
#3=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#4=DIRECTION('',(1.,0.,0.));
#5=CYLINDRICAL_SURFACE('',#3,${dims.diameter / 2});
#6=ADVANCED_FACE('',(#7),#5,.T.);
#7=FACE_OUTER_BOUND('',#8,.T.);
#8=EDGE_LOOP('',(#9));
#9=ORIENTED_EDGE('',*,*,#10,.T.);
#10=EDGE_CURVE('',#11,#12,#13,.T.);
#11=VERTEX_POINT('',#14);
#12=VERTEX_POINT('',#15);
#13=CIRCLE('',#16,${dims.diameter / 2});
#14=CARTESIAN_POINT('',(0.,0.,0.));
#15=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#16=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#20=CLOSED_SHELL('',(#6));
#21=MANIFOLD_SOLID_BREP('${fastener.designation}_shaft',#20);
#30=CYLINDRICAL_SURFACE('',#31,${dims.headDiameter / 2});
#31=AXIS2_PLACEMENT_3D('',#32,#2,#4);
#32=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#33=ADVANCED_FACE('',(#34),#30,.T.);
#34=FACE_OUTER_BOUND('',#35,.T.);
#35=EDGE_LOOP('',(#36));
#36=ORIENTED_EDGE('',*,*,#37,.T.);
#37=EDGE_CURVE('',#38,#39,#40,.T.);
#38=VERTEX_POINT('',#41);
#39=VERTEX_POINT('',#42);
#40=CIRCLE('',#43,${dims.headDiameter / 2});
#41=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#42=CARTESIAN_POINT('',(0.,0.,${dims.length + dims.headHeight}));
#43=AXIS2_PLACEMENT_3D('',#32,#2,#4);
#50=CLOSED_SHELL('',(#33));
#51=MANIFOLD_SOLID_BREP('${fastener.designation}_head',#50);
#100=PRODUCT('${fastener.id}','${fastener.designation}','',(#101));
#101=PRODUCT_CONTEXT('',#102,'mechanical');
#102=APPLICATION_CONTEXT('automotive_design');
#103=PRODUCT_DEFINITION_FORMATION('','',#100);
#104=PRODUCT_DEFINITION('design','',#103,#105);
#105=PRODUCT_DEFINITION_CONTEXT('part definition',#102,'design');
#106=PRODUCT_DEFINITION_SHAPE('','',#104);
#107=SHAPE_DEFINITION_REPRESENTATION(#106,#108);
#108=SHAPE_REPRESENTATION('',(#3,#21,#51),#109);
#109=( GEOMETRIC_REPRESENTATION_CONTEXT(3)
GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#110))
GLOBAL_UNIT_ASSIGNED_CONTEXT((#111,#112,#113))
REPRESENTATION_CONTEXT('','') );
#110=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-06),#111,'distance_accuracy_value','');
#111=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#112=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#113=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
ENDSEC;
END-ISO-10303-21;
`;
}

function generateSocketCapScrewStep(fastener: any, dims: FastenerDimensions): string {
  const header = generateStepHeader(fastener);
  
  return `${header}DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#2=DIRECTION('',(0.,0.,1.));
#3=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#4=DIRECTION('',(1.,0.,0.));
#5=CYLINDRICAL_SURFACE('',#3,${dims.diameter / 2});
#6=ADVANCED_FACE('',(#7),#5,.T.);
#7=FACE_OUTER_BOUND('',#8,.T.);
#8=EDGE_LOOP('',(#9));
#9=ORIENTED_EDGE('',*,*,#10,.T.);
#10=EDGE_CURVE('',#11,#12,#13,.T.);
#11=VERTEX_POINT('',#14);
#12=VERTEX_POINT('',#15);
#13=CIRCLE('',#16,${dims.diameter / 2});
#14=CARTESIAN_POINT('',(0.,0.,0.));
#15=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#16=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#20=CLOSED_SHELL('',(#6));
#21=MANIFOLD_SOLID_BREP('${fastener.designation}_shaft',#20);
#30=CYLINDRICAL_SURFACE('',#31,${dims.headDiameter / 2});
#31=AXIS2_PLACEMENT_3D('',#32,#2,#4);
#32=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#33=ADVANCED_FACE('',(#34,#44),#30,.T.);
#34=FACE_OUTER_BOUND('',#35,.T.);
#35=EDGE_LOOP('',(#36));
#36=ORIENTED_EDGE('',*,*,#37,.T.);
#37=EDGE_CURVE('',#38,#39,#40,.T.);
#38=VERTEX_POINT('',#41);
#39=VERTEX_POINT('',#42);
#40=CIRCLE('',#43,${dims.headDiameter / 2});
#41=CARTESIAN_POINT('',(0.,0.,${dims.length}));
#42=CARTESIAN_POINT('',(0.,0.,${dims.length + dims.headHeight}));
#43=AXIS2_PLACEMENT_3D('',#32,#2,#4);
#44=FACE_BOUND('',#45,.T.);
#45=EDGE_LOOP('',(#46));
#46=ORIENTED_EDGE('',*,*,#47,.T.);
#47=EDGE_CURVE('',#48,#49,#50,.T.);
#48=VERTEX_POINT('',#51);
#49=VERTEX_POINT('',#52);
#50=CIRCLE('',#53,${dims.socketSize / 2});
#51=CARTESIAN_POINT('',(0.,0.,${dims.length + dims.headHeight * 0.1}));
#52=CARTESIAN_POINT('',(0.,0.,${dims.length + dims.headHeight * 0.9}));
#53=AXIS2_PLACEMENT_3D('',#54,#2,#4);
#54=CARTESIAN_POINT('',(0.,0.,${dims.length + dims.headHeight * 0.5}));
#60=CLOSED_SHELL('',(#33));
#61=MANIFOLD_SOLID_BREP('${fastener.designation}_head',#60);
#100=PRODUCT('${fastener.id}','${fastener.designation}','',(#101));
#101=PRODUCT_CONTEXT('',#102,'mechanical');
#102=APPLICATION_CONTEXT('automotive_design');
#103=PRODUCT_DEFINITION_FORMATION('','',#100);
#104=PRODUCT_DEFINITION('design','',#103,#105);
#105=PRODUCT_DEFINITION_CONTEXT('part definition',#102,'design');
#106=PRODUCT_DEFINITION_SHAPE('','',#104);
#107=SHAPE_DEFINITION_REPRESENTATION(#106,#108);
#108=SHAPE_REPRESENTATION('',(#3,#21,#61),#109);
#109=( GEOMETRIC_REPRESENTATION_CONTEXT(3)
GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#110))
GLOBAL_UNIT_ASSIGNED_CONTEXT((#111,#112,#113))
REPRESENTATION_CONTEXT('','') );
#110=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-06),#111,'distance_accuracy_value','');
#111=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#112=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#113=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
ENDSEC;
END-ISO-10303-21;
`;
}

function generateNutStep(fastener: any, dims: FastenerDimensions): string {
  const header = generateStepHeader(fastener);
  const nutHeight = dims.headHeight || dims.diameter * 0.8;
  const acrossFlats = dims.headDiameter || dims.diameter * 1.5;
  
  return `${header}DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#2=DIRECTION('',(0.,0.,1.));
#3=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#4=DIRECTION('',(1.,0.,0.));
#5=CYLINDRICAL_SURFACE('',#3,${acrossFlats / 2});
#6=ADVANCED_FACE('',(#7,#17),#5,.T.);
#7=FACE_OUTER_BOUND('',#8,.T.);
#8=EDGE_LOOP('',(#9));
#9=ORIENTED_EDGE('',*,*,#10,.T.);
#10=EDGE_CURVE('',#11,#12,#13,.T.);
#11=VERTEX_POINT('',#14);
#12=VERTEX_POINT('',#15);
#13=CIRCLE('',#16,${acrossFlats / 2});
#14=CARTESIAN_POINT('',(0.,0.,0.));
#15=CARTESIAN_POINT('',(0.,0.,${nutHeight}));
#16=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#17=FACE_BOUND('',#18,.T.);
#18=EDGE_LOOP('',(#19));
#19=ORIENTED_EDGE('',*,*,#20,.T.);
#20=EDGE_CURVE('',#21,#22,#23,.T.);
#21=VERTEX_POINT('',#24);
#22=VERTEX_POINT('',#25);
#23=CIRCLE('',#26,${dims.diameter / 2});
#24=CARTESIAN_POINT('',(0.,0.,0.));
#25=CARTESIAN_POINT('',(0.,0.,${nutHeight}));
#26=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#30=CLOSED_SHELL('',(#6));
#31=MANIFOLD_SOLID_BREP('${fastener.designation}_nut',#30);
#100=PRODUCT('${fastener.id}','${fastener.designation}','',(#101));
#101=PRODUCT_CONTEXT('',#102,'mechanical');
#102=APPLICATION_CONTEXT('automotive_design');
#103=PRODUCT_DEFINITION_FORMATION('','',#100);
#104=PRODUCT_DEFINITION('design','',#103,#105);
#105=PRODUCT_DEFINITION_CONTEXT('part definition',#102,'design');
#106=PRODUCT_DEFINITION_SHAPE('','',#104);
#107=SHAPE_DEFINITION_REPRESENTATION(#106,#108);
#108=SHAPE_REPRESENTATION('',(#3,#31),#109);
#109=( GEOMETRIC_REPRESENTATION_CONTEXT(3)
GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#110))
GLOBAL_UNIT_ASSIGNED_CONTEXT((#111,#112,#113))
REPRESENTATION_CONTEXT('','') );
#110=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-06),#111,'distance_accuracy_value','');
#111=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#112=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#113=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
ENDSEC;
END-ISO-10303-21;
`;
}

function generateWasherStep(fastener: any, dims: FastenerDimensions): string {
  const header = generateStepHeader(fastener);
  const outerDiameter = dims.headDiameter || dims.diameter * 2.5;
  const thickness = dims.headHeight || dims.diameter * 0.15;
  
  return `${header}DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#2=DIRECTION('',(0.,0.,1.));
#3=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#4=DIRECTION('',(1.,0.,0.));
#5=CYLINDRICAL_SURFACE('',#3,${outerDiameter / 2});
#6=ADVANCED_FACE('',(#7,#17),#5,.T.);
#7=FACE_OUTER_BOUND('',#8,.T.);
#8=EDGE_LOOP('',(#9));
#9=ORIENTED_EDGE('',*,*,#10,.T.);
#10=EDGE_CURVE('',#11,#12,#13,.T.);
#11=VERTEX_POINT('',#14);
#12=VERTEX_POINT('',#15);
#13=CIRCLE('',#16,${outerDiameter / 2});
#14=CARTESIAN_POINT('',(0.,0.,0.));
#15=CARTESIAN_POINT('',(0.,0.,${thickness}));
#16=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#17=FACE_BOUND('',#18,.T.);
#18=EDGE_LOOP('',(#19));
#19=ORIENTED_EDGE('',*,*,#20,.T.);
#20=EDGE_CURVE('',#21,#22,#23,.T.);
#21=VERTEX_POINT('',#24);
#22=VERTEX_POINT('',#25);
#23=CIRCLE('',#26,${(dims.diameter * 1.1) / 2});
#24=CARTESIAN_POINT('',(0.,0.,0.));
#25=CARTESIAN_POINT('',(0.,0.,${thickness}));
#26=AXIS2_PLACEMENT_3D('',#1,#2,#4);
#30=CLOSED_SHELL('',(#6));
#31=MANIFOLD_SOLID_BREP('${fastener.designation}_washer',#30);
#100=PRODUCT('${fastener.id}','${fastener.designation}','',(#101));
#101=PRODUCT_CONTEXT('',#102,'mechanical');
#102=APPLICATION_CONTEXT('automotive_design');
#103=PRODUCT_DEFINITION_FORMATION('','',#100);
#104=PRODUCT_DEFINITION('design','',#103,#105);
#105=PRODUCT_DEFINITION_CONTEXT('part definition',#102,'design');
#106=PRODUCT_DEFINITION_SHAPE('','',#104);
#107=SHAPE_DEFINITION_REPRESENTATION(#106,#108);
#108=SHAPE_REPRESENTATION('',(#3,#31),#109);
#109=( GEOMETRIC_REPRESENTATION_CONTEXT(3)
GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#110))
GLOBAL_UNIT_ASSIGNED_CONTEXT((#111,#112,#113))
REPRESENTATION_CONTEXT('','') );
#110=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-06),#111,'distance_accuracy_value','');
#111=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#112=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#113=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
ENDSEC;
END-ISO-10303-21;
`;
}

function generateStepModel(fastener: any): string | null {
  const dims = getDimensionsForFamily(fastener);
  
  if (!dims) {
    return null;
  }

  const designation = fastener.designation.toLowerCase();
  const notes = fastener.notes.toLowerCase();

  if (designation.includes('nut') || notes.includes('nut')) {
    return generateNutStep(fastener, dims);
  }
  
  if (designation.includes('washer') || notes.includes('washer')) {
    return generateWasherStep(fastener, dims);
  }

  if (designation.includes('socket') || designation.includes('shcs') || 
      notes.includes('socket') || fastener.family === 'nas') {
    return generateSocketCapScrewStep(fastener, dims);
  }

  return generateHexBoltStep(fastener, dims);
}

function main() {
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const fastener of fasteners) {
    const stepContent = generateStepModel(fastener);
    
    if (!stepContent) {
      skippedCount++;
      continue;
    }

    const filename = `${fastener.id}.step`;
    const filepath = path.join(modelsDir, filename);
    
    fs.writeFileSync(filepath, stepContent, 'utf-8');
    generatedCount++;
    
    if (generatedCount % 10 === 0) {
      console.log(`Generated ${generatedCount} models...`);
    }
  }

  console.log(`\nDone! Generated ${generatedCount} STEP models, skipped ${skippedCount}`);
  console.log(`Models saved to: ${modelsDir}`);
}

main();
