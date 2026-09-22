"""Offline staged STEP generation. No network, CAD accounts, or request-time kernel.
Run publish.py after reviewing staging previews, or --verify to recheck published files.
Never overwrites a published version. A recipe/parameter/toolchain change produces a new build key.
"""
import argparse,hashlib,json,math,pathlib,platform,shutil,sys,tempfile,datetime
import cadquery as cq
import OCP
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
ROOT=pathlib.Path(__file__).resolve().parents[2]
V='fastener-mcp.v2'; RECIPE='2.0.0'; TOL=.01
TOOLCHAIN={'python':platform.python_version(),'cadquery':cq.__version__,'ocp':OCP.__version__}

def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2)+'\n')
def dims(p):
 assert p['status']=='active' and p['verified_at'], 'Only checked active records can generate geometry'
 for d in p['dimensions'].values():
  assert d['evidence']['verification']=='checked'
  assert d['value']>0
  if d['limits']:assert d['limits'][0]<=d['value']<=d['limits'][1]
 return {k:(v['normalized_mm'] if v['unit']!='deg' else v['value']) for k,v in p['dimensions'].items()}
def build_key(p,detail,recipe_version=RECIPE,toolchain=None,source_hash=None):
 parameter_hash=hashlib.sha256(canonical(dims(p))).hexdigest()
 key=hashlib.sha256(canonical([p['category'],recipe_version,parameter_hash,toolchain or TOOLCHAIN,detail,p['revision'],source_hash or sha(pathlib.Path(__file__))])).hexdigest()
 return parameter_hash,key
def hexbody(af,h,z=0):return cq.Workplane('XY').polygon(6,2*af/math.sqrt(3)).extrude(h).translate((0,0,z))
def cylinder(r,h,z=0):return cq.Workplane('XY').circle(r).extrude(h).translate((0,0,z))
def recipe(p,detail):
 d=dims(p);f=p['category'];L=d.get('length');D=d.get('diameter');H=d.get('head_height');omitted=['Thread helices and tolerance-class fit','Small edge breaks, chamfers and fillets']
 if f in ['hex_bolt','socket_screw']:
  head=hexbody(d['head_af'],H,-H) if f=='hex_bolt' else cylinder(d['head_diameter']/2,H,-H)
  part=head.union(cylinder(D/2,L))
  if f=='socket_screw':
   if detail=='detailed':part=part.cut(hexbody(d['drive_af'],d['drive_depth']+.001,-H-.001))
   else:omitted.append('Hex socket recess')
 elif f=='countersunk_screw':
  cone=(d['head_diameter']-D)/2/math.tan(math.radians(d['cone_angle']/2));rim=H-cone
  assert rim>=0 and L>H
  part=cylinder(d['head_diameter']/2,rim).union(cq.Workplane(obj=cq.Solid.makeCone(d['head_diameter']/2,D/2,cone,cq.Vector(0,0,rim)))).union(cylinder(D/2,L-H,H))
  omitted.append('Hex socket recess')
 elif f in ['hex_nut','flat_washer','wire_insert']:
  H=d.get('thickness',L)
  part=hexbody(d['width_af'],H) if f=='hex_nut' else cylinder(d['outer_diameter']/2,H)
  part=part.cut(cylinder(d['bore_diameter']/2,H+2,-1))
  if f=='wire_insert':omitted+=['Actual wire coil, tang, free-state geometry and maximum clearance envelope']
 else:raise ValueError('Unsupported family: '+f)
 if detail=='detailed' and f!='socket_screw':raise ValueError('Unsupported detail')
 return part,omitted

def frame(p):
 d=dims(p);cat=p['category']; zmin=-d['head_height'] if cat in ['hex_bolt','socket_screw'] else 0
 end=d.get('length',d.get('thickness'))
 datum='head_bearing_face' if zmin<0 else 'flush_top_plane' if cat=='countersunk_screw' else 'insertion_reference_plane' if cat=='wire_insert' else 'lower_seating_face'
 return dict(origin=[0,0,0],axis=[0,0,1],origin_datum=datum,positive_z='Shank extends +Z; head extends -Z' if zmin<0 else 'Body extends +Z',x_reference='Hex vertex along +X; opposite flats parallel to X (normals ±Y). Circular bodies have arbitrary X.',datums={datum:0,'minimum_z':zmin,'maximum_z':end},handedness='right')
def inspect(file,p,detail):
 d=dims(p);cat=p['category'];solid=cq.importers.importStep(str(file)).val();ss=solid.Solids()
 assert len(ss)==1 and solid.isValid() and solid.Volume()>0, 'Topology/solid/volume failure'
 box=solid.BoundingBox();bbox={'min':[box.xmin,box.ymin,box.zmin],'max':[box.xmax,box.ymax,box.zmax]}
 assert all(math.isfinite(x) for v in bbox.values() for x in v)
 checks=['STEP reopened with OpenCascade','one solid; valid topology; finite bounds; positive volume']
 def close(a,b,label):assert abs(a-b)<=TOL,f'{label}: measured {a}, expected {b}';checks.append(label)
 fr=frame(p);close(box.zmin,fr['datums']['minimum_z'],'origin/minimum Z');close(box.zmax,fr['datums']['maximum_z'],'length/maximum Z')
 # Measure planar cross sections from the saved BREP, independent of construction operations.
 def section(z):
  face=cq.Face.makePlane(200,200,cq.Vector(0,0,z),cq.Vector(0,0,1))
  cut=solid.intersect(face);assert len(cut.Faces())>0,'empty section';return cut
 def diameter(z,expected,label):
  sec=section(z).BoundingBox();close(sec.xlen,expected,label+' X');close(sec.ylen,expected,label+' Y')
 if cat in ['hex_bolt','socket_screw','countersunk_screw']:
  L=d['length'];H=d['head_height'];diameter((L+H)/2,d['diameter'],'shank diameter')
  if cat=='hex_bolt':close(section(-H/2).BoundingBox().ylen,d['head_af'],'hex head across flats')
  elif cat=='socket_screw':diameter(-H/2,d['head_diameter'],'head diameter')
  else:
   # The exported conical face exposes its actual semi-angle through the kernel surface adaptor.
   from OCP.BRepAdaptor import BRepAdaptor_Surface
   cones=[BRepAdaptor_Surface(f.wrapped).Cone() for f in solid.Faces() if f.geomType()=='CONE']
   assert len(cones)==1
   close(math.degrees(cones[0].SemiAngle())*2,d['cone_angle'],'countersink included angle')
   diameter(.0001,d['head_diameter'],'top head diameter')
  assert solid.isInside(cq.Vector(0,0,.01),TOL/100),'head to shank continuity'
  checks.append('head/shank continuity at origin')
  if detail=='detailed':
   depth=d['drive_depth'];H=d['head_height']
   assert not solid.isInside(cq.Vector(0,0,-H+.01))
   assert solid.isInside(cq.Vector(0,0,-H+depth+.02))
   sec=section(-H+depth/2)
   holes=[w for f in sec.Faces() for w in f.innerWires()];assert len(holes)==1
   close(holes[0].BoundingBox().ylen,d['drive_af'],'socket across flats')
   checks.append('socket open at head top; sourced recess depth and solid floor')
 else:
  H=d.get('thickness',d.get('length'));dia=d['bore_diameter']
  for z in [.001,H/2,H-.001]:
   assert not solid.isInside(cq.Vector(0,0,z)), 'Blocked axial bore'
   sec=section(z);holes=[w for f in sec.Faces() for w in f.innerWires()];assert len(holes)==1
   close(holes[0].BoundingBox().xlen,dia,'open bore diameter')
  if cat=='hex_nut':close(box.ylen,d['width_af'],'nut across flats')
  else:close(box.xlen,d['outer_diameter'],'outer diameter');close(box.ylen,d['outer_diameter'],'outer diameter Y')
  checks.append('open axial bore through three independent sections')
 return solid,bbox,checks

def preview(shape,p,path):
 vertices,faces=shape.tessellate(.08);v=[x.toTuple() for x in vertices];triangles=[[v[i] for i in f] for f in faces]
 b=shape.BoundingBox();center=[(b.xmin+b.xmax)/2,(b.ymin+b.ymax)/2,(b.zmin+b.zmax)/2];radius=max(b.xlen,b.ylen,b.zlen)*.6
 fig=plt.figure(figsize=(9,4.5),facecolor='#f8fafc')
 for i,elev in enumerate([28,-28]):
  ax=fig.add_subplot(1,2,i+1,projection='3d');ax.set_facecolor('#f8fafc');ax.add_collection3d(Poly3DCollection(triangles,facecolors='#9aa8d6',edgecolors='#485579',linewidths=.16,alpha=1));ax.set(xlim=(center[0]-radius,center[0]+radius),ylim=(center[1]-radius,center[1]+radius),zlim=(center[2]-radius,center[2]+radius));ax.set_box_aspect((1,1,1));ax.view_init(elev=elev,azim=38);ax.set_xlabel('X mm');ax.set_ylabel('Y mm');ax.set_zlabel('Z mm');ax.tick_params(labelsize=6)
 fig.suptitle(p['id']+'\nNominal reference geometry · +Z body direction',fontsize=10);fig.tight_layout();fig.savefig(path,dpi=120);plt.close(fig)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');parser.add_argument('--verify',action='store_true');parser.add_argument('--ids',nargs='*');args=parser.parse_args()
 parts=json.loads((ROOT/'data/catalog/parts.json').read_text())['items'];history=json.loads((ROOT/'data/catalog/history/revisions.json').read_text())['items'];byref={(p['id'],p['revision']):p for p in parts+history};manifest=json.loads((ROOT/'data/geometry/manifest.json').read_text());items=manifest['items'];now=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
 if args.ids:
  unsupported=set(args.ids)-{p['id'] for p in parts if p['status']=='active'}
  if unsupported:raise SystemExit('Unsupported or unverified part IDs: '+', '.join(sorted(unsupported)))
 if args.verify:
  for g in items:
   if g['validation']['status']=='withdrawn':continue
   path=ROOT/'public'/g['asset_path'].lstrip('/');assert sha(path)==g['sha256'] and path.stat().st_size==g['bytes']
   for ref in g['parts']:
    part=byref[(ref['id'],ref['revision'])]
    assert hashlib.sha256(canonical(dims(part))).hexdigest()==g['parameter_hash'],'Geometry parameters changed without a new version'
    inspect(path,part,g['detail'])
  print('Verified',len(items),'published STEP files');return
 staged=[]
 staging=ROOT/'.cache/geometry-staging';staging.mkdir(parents=True,exist_ok=True)
 for p in parts:
  if p['status']!='active' or (args.ids and p['id'] not in args.ids):continue
  for gid in p['geometry_ids']:
   detail='detailed' if gid.endswith('-detailed') else 'simplified';param,key=build_key(p,detail);version='v1-'+key[:12]
   prior=next((g for g in items if g['id']==gid and g['build_key']==key and g['validation']['status']=='passed'),None)
   if prior and (ROOT/'public'/prior['asset_path'].lstrip('/')).exists() and sha(ROOT/'public'/prior['asset_path'].lstrip('/'))==prior['sha256']:
    print('cached',gid);continue
   folder=staging/gid/version;folder.mkdir(parents=True,exist_ok=True);file=folder/'model.step'
   try:
    shape,omitted=recipe(p,detail);cq.exporters.export(shape,str(file));saved,bbox,checks=inspect(file,p,detail);preview(saved,p,folder/'preview.png')
   except Exception as e:
    write(folder/'failed.json',{'part':p['id'],'error':str(e)});raise
   asset=f'/models/{gid}/{version}/';report=dict(schema_version=V,part=p['id'],revision=p['revision'],checks=checks,tolerance_mm=TOL,volume_mm3=saved.Volume(),visual_review='pending',checked_at=now)
   write(folder/'checks.json',report)
   g=dict(id=gid,version=version,parts=[dict(id=p['id'],revision=p['revision'])],recipe_id=p['category'],recipe_version=RECIPE,parameter_hash=param,build_key=key,toolchain=TOOLCHAIN,detail=detail,state='installed' if p['category']=='wire_insert' else 'not_applicable',format='step',units='mm',asset_path=asset+'model.step',bytes=file.stat().st_size,sha256=sha(file),preview_paths=[asset+'preview.png'],bounds_mm=bbox,frame=frame(p),validation=dict(status='passed',checked_at=now,tolerance_mm=TOL,report_path=asset+'checks.json',checks=checks,visual_review='pending',withdrawal_reason=None),represented_features=list(dims(p).keys()) if detail=='detailed' else [k for k in dims(p) if not k.startswith('drive_')],omitted_features=omitted,intended_uses=['layout','reference'],representation='installed_nominal_reference_envelope' if p['category']=='wire_insert' else 'standard_nominal')
   staged.append(g);print('staged',gid,flush=True)
 write(staging/'manifest.json',{'schema_version':V,'items':staged})
 if args.publish:
  raise SystemExit('Review staged previews, then run scripts/geometry/publish.py. Build never auto-approves visual review.')
 print('Staged',len(staged),'variants at',staging)
if __name__=='__main__':main()
