"""Publish the reviewed staging manifest, preserving every prior immutable version.
Requires a review record listing every staged geometry ID and its preview checksum.
"""
import json,pathlib,hashlib,shutil,os
from build import ROOT,sha,write
staging=ROOT/'.cache/geometry-staging'; staged=json.loads((staging/'manifest.json').read_text())['items']
review=json.loads((ROOT/'data/geometry/visual-review.json').read_text()); reviewed={(i['id'],i['preview_sha256']):i for i in review['items']}
current=json.loads((ROOT/'data/geometry/manifest.json').read_text());old={(g['id'],g['version']):g for g in current['items']}
for g in staged:
 folder=staging/g['id']/g['version'];r=reviewed[(g['id'],sha(folder/'preview.png'))]
 assert r['status']=='passed' and r['preview_sha256']==sha(folder/'preview.png')
 assert sha(folder/'model.step')==g['sha256']
 g['validation']['visual_review']='passed'; report=json.loads((folder/'checks.json').read_text());report['visual_review']='passed';report['reviewed_at']=review['reviewed_at'];write(folder/'checks.json',report)
 target=ROOT/'public/models'/g['id']/g['version']
 if target.exists():
  assert sha(target/'model.step')==g['sha256'],'Refusing to overwrite pinned STEP bytes'
  assert sha(target/'preview.png')==sha(folder/'preview.png'),'Refusing to overwrite pinned preview'
 else:target.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(folder,target)
 old[(g['id'],g['version'])]=g
candidate=ROOT/'data/geometry/manifest.candidate.json';write(candidate,{'schema_version':'fastener-mcp.v2','items':list(old.values())});os.replace(candidate,ROOT/'data/geometry/manifest.json')
print('Published',len(staged),'reviewed models')
