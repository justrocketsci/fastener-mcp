"""One-time, reviewed migration from baseline 19382b8; never a price refresh.
Facts transcribed from the linked sources on 2026-09-22. Does not fetch or invent prices.
Run once to seed a new checkout of the baseline. Subsequent edits use revision/publication tooling.
"""
import json, hashlib, pathlib, math
ROOT=pathlib.Path(__file__).resolve().parents[2]
if (ROOT/'data/catalog/parts.json').exists(): raise SystemExit('Launch migration already exists. Use revision and release workflows; do not reset verified data.')
V='fastener-mcp.v2'; AT='2026-09-22T02:50:00Z'
def dump(path,x):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
def doc(items):return {'schema_version':V,'items':items}
def ev(s,loc='Product attributes / size table'):return {'source_id':s,'locator':loc,'verification':'checked'}
def dim(v,s,loc,limits=None,unit='mm',derivation='Source nominal value'):
 return dict(value=v,unit=unit,normalized_mm=None if unit=='deg' else v*(25.4 if unit=='in' else 1),derivation=derivation,limits=limits,evidence=ev(s,loc))
def fp(p):return hashlib.sha256(json.dumps(p,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
sources=[]
def source(id,title,publisher,url,kind='vendor',revision=None,usage='Linked factual attributes only; original publication not redistributed.'):
 sources.append(dict(id=id,title=title,publisher=publisher,url=url,revision=revision,retrieved_at=AT,kind=kind,usage=usage,authority=kind,extraction='Numerical attributes checked against displayed source; no certification claim.'));return id
base='https://raw.githubusercontent.com/boltsparts/BOLTS_archive/05a2acd1f77737789a313b4c77f1f8eea35da256/data/'
for f in ['hex','hex_socket','washer']:source('bolts-'+f.replace('_','-'),'BOLTS '+f+' dimensional tables','Johannes Reinhardt / BOLTS',base+f+'.blt','open_library','05a2acd1f77737789a313b4c77f1f8eea35da256','LGPL-2.1-or-later; selected factual dimensions attributed in THIRD_PARTY_NOTICES.md. No source CAD code copied.')
source('boellhoff-0100','HELICOIL Plus thread technology, printed pages 23–24','Böllhoff','https://eshop-ro.boellhoff.com/out/media/pdf/helicoil__0100_en.pdf','manufacturer')
source('legacy-19382b8','Unverified baseline catalog','Fastener MCP','https://github.com/justrocketsci/fastener-mcp/tree/19382b8','legacy','19382b8','Historical claims retained as unverified, not accepted as source evidence.')
parts=[];inst=[];products=[];observations=[]
def part(id,cat,d,pitch,length,dims,src,standard,material='A2 stainless steel',drive=None):
 t=cat!='flat_washer';meaning='under_head' if cat in ['hex_bolt','socket_screw'] else 'overall' if cat=='countersunk_screw' else 'installed_insert_length' if cat=='wire_insert' else 'thickness'
 name=f'{standard} M{d}'+(f' × {pitch}' if t else '')+(f' × {length} mm' if length else '')+' '+cat.replace('_',' ')
 p=dict(id=id,revision=1,designation=name,category=cat,status='active',verified_at=AT,standards=[standard],aliases=[f'M{d} {cat.replace("_"," ")}'],manufacturer=None,manufacturer_part_number=None,superseded_by=None,thread=dict(system='metric' if t else 'none',designation=f'M{d}x{pitch}' if t else None,nominal_diameter_mm=d if t else None,pitch_mm=pitch if t else None,original_tpi=None,handedness='right' if t else None,**{'class':None},role='none' if not t else 'external' if cat in ['hex_bolt','socket_screw','countersunk_screw'] else 'internal'),nominal_size_mm=d,dimensions=dims,length_meaning=meaning,grip_length_mm=None,attributes=dict(material=material,grade=None,finish=None,head_type={'hex_bolt':'hex','socket_screw':'socket','countersunk_screw':'countersunk'}.get(cat),drive_type=drive,insert_type='free_running' if cat=='wire_insert' else None),evidence=[ev(src)],installation_ids=[id+'-installation'],geometry_ids=[id+'-simplified']+([id+'-detailed'] if cat=='socket_screw' and length in [10,12] else []),notes=['Geometry represents nominal reference dimensions; grade and finish remain unspecified unless recorded.'])
 parts.append(p)
 inst.append(dict(id=id+'-installation',parts=[{'id':id,'revision':1}],type='clearance' if cat in ['hex_bolt','socket_screw'] else 'countersink' if cat=='countersunk_screw' else 'seating',status='unavailable',required_context=[],conditions=[],dimensions={},instructions=[],evidence=[ev(src)],unresolved=['No checked installation table for this part/process. Supply an applicable drawing; do not infer hole dimensions from the model.']))
 return p

def product(p,sku,price,bag=None,bulk=None,pack=1,supplier='bolt-depot',variant=None):
 id=f'{supplier}-{sku}'; url=f'https://boltdepot.com/Product-Details?product={sku}' if supplier=='bolt-depot' else f'https://monsterbolts.com/products/socket-cap-a2-m6?variant={variant}'
 sid='source-'+id
 source(sid,p['designation']+' / '+str(sku),'Bolt Depot' if supplier=='bolt-depot' else 'Monster Bolts',url)
 checked={'diameter_mm':str(p['nominal_size_mm']),'material':'A2 / 18-8 stainless','category':p['category'],'standard':p['standards'][0]}
 if p['thread']['system']=='metric': checked.update(pitch_mm=str(p['thread']['pitch_mm']),handedness='right (DIN metric standard)')
 if 'length' in p['dimensions']:checked['length_mm']=str(p['dimensions']['length']['value'])
 products.append(dict(id=id,supplier_id=supplier,sku=str(sku),part={'id':p['id'],'revision':1},url=url,manufacturer=None,pack_size=pack,match_status='exact',checked_attributes=checked,unresolved=['Property class and finish are unspecified; does not satisfy a request that requires either.','Nominal CAD surfaces do not represent manufacturing tolerances.'],verified_at=AT,part_fingerprint='',model_representation='standard_nominal',evidence=[ev(sid)]))
 tiers=[dict(minimum=1,amount=price)]
 # Only publish the single-piece public price for Bolt Depot until the supplier's mixed-bag ordering policy is verified.
 observations.append(dict(product_id=id,price=dict(observed_at=AT,currency='USD',basis='pack' if pack>1 else 'each',tier_basis='items',tiers=tiers,minimum_quantity=pack,order_increment=pack,scope='public',valid_until=None),availability=dict(checked_at=AT,status='unknown',quantity=None),delivery=None,charges=[],refresh_error=None,evidence_url=url))

# Socket cap: five individually checked supplier variants; two extra sizes make useful insert/nut combinations.
for length,sku,price,var,mp in [(10,6416,'0.20',36230284044,'2.17'),(12,6417,'0.21',36230284172,'2.25'),(16,6418,'0.22',36230284300,'2.31'),(20,6419,'0.24',36230284492,'2.52'),(25,6420,'0.25',36230284620,'2.60')]:
 s='source-bolt-depot-'+str(sku)
 ds={k:dim(v,s,k,lims) for k,v,lims in [('diameter',6,None),('length',length,None),('head_diameter',10,[9.78,10.22]),('head_height',6,[5.7,6]),('drive_af',5,None)]}; ds['drive_depth']=dim(3,'bolts-hex-socket','hexsocketheadcap M6 t_min')
 p=part(f'iso4762-m6x{length}-a2','socket_screw',6,1,length,ds,s,'ISO 4762',drive='hex_socket');p['standards'].append('DIN 912')
 product(p,sku,price);product(p,str(var),mp,pack=10,supplier='monster-bolts',variant=var)
for d,pitch,hd,h,af,depth in [(3,.5,5.5,3,2.5,1.3),(4,.7,7,4,3,2)]:
 s='bolts-hex-socket';ds={k:dim(v,s,f'hexsocketheadcap M{d}: {k}') for k,v in dict(diameter=d,length=12,head_diameter=hd,head_height=h,drive_af=af,drive_depth=depth).items()}
 p=part(f'iso4762-m{d}x12-reference','socket_screw',d,pitch,12,ds,s,'ISO 4762',material=None,drive='hex_socket');p['notes'].append('Material-independent standard reference; no exact supplier mapping.')
# Open dimension tables, material-independent references. Do not claim an unverified property class.
for d,pitch,h,af in [(3,.5,2,5.5),(4,.7,2.8,7),(5,.8,3.5,8),(6,1,4,10)]:
 s='bolts-hex';ds={k:dim(v,s,f'hexscrew1 M{d}: {k}') for k,v in dict(diameter=d,length=20,head_height=h,head_af=af).items()};ds['length']['derivation']='Selected nominal under-head length, a catalog design parameter; table permits free length.'
 part(f'din933-m{d}x20-reference','hex_bolt',d,pitch,20,ds,s,'DIN 933',material=None,drive='external_hex')
for d,pitch,hd,k,af in [(3,.5,6,1.7,2),(4,.7,8,2.3,2.5),(5,.8,10,2.8,3),(6,1,12,3.3,4)]:
 s='bolts-hex-socket';ds={name:dim(v,s,f'hexsocketcountersunk M{d}: {name}') for name,v in dict(diameter=d,length=20,head_diameter=hd,head_height=k,drive_af=af).items()};ds['cone_angle']=dim(90,s,'hexsocketcountersunk alpha',unit='deg');ds['length']['derivation']='Selected nominal overall length, a catalog design parameter; table permits free length.'
 part(f'din7991-m{d}x20-reference','countersunk_screw',d,pitch,20,ds,s,'DIN 7991',material=None,drive='hex_socket')
for d,pitch,af,h,afmin,hmin,sku,price in [(3,.5,5.5,2.4,5.32,2.15,4773,'0.07'),(4,.7,7,3.2,6.78,2.9,4774,'0.07'),(5,.8,8,4,7.78,3.7,4775,'0.07'),(6,1,10,5,9.78,4.7,4776,'0.11')]:
 s='source-bolt-depot-'+str(sku);ds={'width_af':dim(af,s,'Width across flats',[afmin,af]),'thickness':dim(h,s,'Height',[hmin,h]),'bore_diameter':dim(d,s,'Nominal thread diameter',derivation='Simplified bore at nominal thread diameter; omits female thread teeth. Not a tap-drill or thread contact model.')}
 p=part(f'din934-m{d}-a2','hex_nut',d,pitch,None,ds,s,'DIN 934');product(p,sku,price)
for d,bore,outer,h,bmax,hmin,hmax,sku,price in [(3,3.2,7,.5,3.38,.45,.55,4513,'0.05'),(4,4.3,9,.8,4.48,.7,.9,4514,'0.05'),(5,5.3,10,1,5.48,.9,1.1,4515,'0.05'),(6,6.4,12,1.6,6.62,1.4,1.8,4516,'0.06')]:
 s='source-bolt-depot-'+str(sku);ds={'bore_diameter':dim(bore,s,'Inside diameter',[bore,bmax]),'outer_diameter':dim(outer,s,'Outside diameter'),'thickness':dim(h,s,'Thickness',[hmin,hmax])}
 p=part(f'din125-m{d}-a2','flat_washer',d,None,None,ds,s,'DIN 125');product(p,sku,price)
for d,pitch,length,outer,drill,corelo,corehi,runout,tang,mpn in [(3,.5,4.5,3.65,3.2,3.11,3.22,2.8,4.2,'4130 003 0045'),(4,.7,6,4.91,4.2,4.15,4.29,3.8,5.6,'4130 004 0006'),(5,.8,7.5,6.04,5.2,5.17,5.33,4.2,7.1,'4130 005 0075'),(6,1,9,7.3,6.3,6.22,6.41,5.1,8.5,'4130 006 0009')]:
 s='boellhoff-0100';ds={'length':dim(length,s,f'p24 M{d}, 1.5d t2 minimum'),'outer_diameter':dim(outer,s,f'p24 M{d} DHC minimum',derivation='Minimum receiving-thread major diameter used as nominal installed reference envelope; NOT maximum wire OD / collision clearance.'),'bore_diameter':dim(d,s,'p23 nominal screw thread d',derivation='Thread nominal bore; thread profile omitted')}
 p=part(f'helicoil-plus-m{d}-1.5d-4130','wire_insert',d,pitch,length,ds,s,'HELICOIL Plus 4130');p['manufacturer']='Böllhoff';p['manufacturer_part_number']=mpn;p['notes'].append('Installed nominal annular reference envelope. Neither actual coil surfaces nor worst-case clearance envelope. Do not use for wire-level interference/contact.')
 inst[-1].update(type='wire_insert',status='documented',required_context=['host_material','process','hole_type'],conditions=['HELICOIL Plus Free Running 4130 series only.','Cut receiving thread using the specified HELICOIL/STI tap; an ordinary M-size tap is not equivalent.','Drill choice must be checked against D1HC for the actual host material/process.'],dimensions={k:dim(v,s,f'Printed pp23–24 M{d}: {k}') for k,v in {'suggested_drill':drill,'holding_crest_min':corelo,'holding_crest_max':corehi,'holding_major_min':outer,'minimum_full_thread_depth':length,'thread_runout_e1':runout,'minimum_blind_tap_depth':length+runout,'seat_below_surface_min':.25*pitch,'seat_below_surface_max':.5*pitch,'max_screw_depth_tang_retained':tang}.items()},instructions=[f'Use HELICOIL/STI M{d} × {pitch} receiving-thread tooling.','Receiving thread has a 60 degree profile. Before tapping, countersink 90 degrees and deburr; drawing gives countersink diameter DHC + 0.1 mm.','For series production the manufacturer recommends adding at least one pitch to t1 and t2.','Break and remove the tang where required; maximum screw-in depth with tang retained is separately reported.'],unresolved=['Confirm host material/process, tap tolerances, tang procedure, wall thickness and load suitability with the manufacturer.'])
# Baseline is immutable history. No inference of missing inch/mm units.
oldpath=ROOT/'data/catalog/history/baseline-19382b8.json'
if not oldpath.exists():dump('data/catalog/history/baseline-19382b8.json',doc(json.loads((ROOT/'data/fasteners.json').read_text())))
old=json.loads(oldpath.read_text())['items'];audit=[]
for raw in old:
 id=raw['id'];unit=raw.get('diameter_unit');dims={}
 if unit in ['mm','in']:dims['diameter']=dim(raw['diameter'],'legacy-19382b8','Legacy explicit diameter unit',unit=unit);dims['diameter']['evidence']['verification']='unverified'
 model=ROOT/f'public/models/{id}.step'
 audit.append(dict(id=id,status='legacy_unverified',diameter_unit=unit,reason='Source extraction, dimensions, and coordinate frame require revalidation.',old_model_path=f'/models/{id}.step' if model.exists() else None,old_model_sha256=hashlib.sha256(model.read_bytes()).hexdigest() if model.exists() else None))
 parts.append(dict(id=id,revision=1,designation=raw['designation'],category='legacy',status='legacy_unverified',verified_at=None,standards=[raw['standard']] if raw.get('standard') else [],aliases=[],manufacturer=None,manufacturer_part_number=None,superseded_by=None,thread=dict(system='unknown',designation=raw.get('thread'),nominal_diameter_mm=None,pitch_mm=None,original_tpi=None,handedness=None,**{'class':None},role='unknown'),nominal_size_mm=None,dimensions=dims,length_meaning='unknown',grip_length_mm=None,attributes=dict(material=raw.get('material'),grade=None,finish=raw.get('coating'),head_type=None,drive_type=None,insert_type=None),evidence=[dict(source_id='legacy-19382b8',locator=id,verification='unverified')],installation_ids=[],geometry_ids=[],notes=['Historical identity preserved; geometry withdrawn pending independent checks. Missing units remain unknown.'],legacy_record=raw))
# Fingerprints bind all dependent observations to the precise checked part revision.
byid={p['id']:p for p in parts}
for p in products:p['part_fingerprint']=fp(byid[p['part']['id']])
compat=[]
for a in parts:
 if a['status']!='active' or a['thread']['role']!='external':continue
 for b in parts:
  if b['status']!='active' or b['category'] not in ['hex_nut','flat_washer','wire_insert'] or a['nominal_size_mm']!=b['nominal_size_mm']:continue
  washer=b['category']=='flat_washer'
  if washer and a['category']=='countersunk_screw':continue
  compat.append(dict(id=a['id']+'--'+b['id'],anchor={'id':a['id'],'revision':1},companion={'id':b['id'],'revision':1},relationship='seating' if washer else 'thread_interface',checked_attributes=['nominal_size','washer_bore_and_head_width'] if washer else ['thread_system','nominal_diameter','pitch','handedness'],conditions=['Nominal interface match only. Thread class and manufactured tolerances must be confirmed.'],unresolved=['Load, grip, engagement, bearing area, host material and installation process are not approved.'],rule_version='metric-interface-1',anchor_fingerprint=fp(a),companion_fingerprint=fp(b)))
for filename,items in [('parts',parts),('sources',sources),('installations',inst),('supplier-products',products),('compatibility',compat)]:dump(f'data/catalog/{filename}.json',doc(items))
dump('data/catalog/suppliers.json',doc([dict(id=id,name=name,markets=['US'],import_method='maintainer_import',price_max_age_hours=24,stock_max_age_hours=24,source_urls=[url]) for id,name,url in [('bolt-depot','Bolt Depot','https://boltdepot.com'),('monster-bolts','Monster Bolts','https://monsterbolts.com')]]))
dump('data/offers/current.json',dict(schema_version=V,snapshot='offers-20260922-0250',published_at=AT,observations=observations))
dump('data/catalog/history/legacy-audit.json',doc(audit))
dump('data/geometry/manifest.json',doc([]))
print(f'{len(parts)-len(old)} active, {len(old)} legacy, {len(products)} mappings, {len(observations)} observations')
