"""One-time integration for the isolated preview branch. Never used by production builds.
Each edit requires its known source fragment; no network, installation or deployment.
The integration workflow commits the resulting normal source files after validation.
"""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[2]
def edit(p,old,new):
    s=p.read_text()
    if new in s:return
    if old not in s:raise RuntimeError('Source changed; stopped before replacing '+str(p))
    p.write_text(s.replace(old,new))
p=r/'src/world.ts'
edit(p,"import type {MuseumCase} from './types';", "import type {MuseumCase} from './types';\nimport {MuseumVisuals} from './visual-upgrade.ts';\nimport {parseGraphicsProfile,type GraphicsProfile} from './graphics-settings.ts';")
edit(p,' cases:MuseumCase[];'," graphicsProfile:GraphicsProfile='auto';visuals?:MuseumVisuals;\n setGraphicsProfile(profile:unknown){this.graphicsProfile=parseGraphicsProfile(profile);void this.visuals?.setProfile(this.graphicsProfile,this.settings.quality===.75);}\n setTokkeMode(mode:'stored'|'usable'){this.visuals?.setTokkeMode(mode);}\n cases:MuseumCase[];")
edit(p,'this.addMaterialDetail();this.buildExterior();',"this.addMaterialDetail();\n  if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('visual')!=='baseline')this.kit.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const name=o.material.name.toLowerCase();if(name.includes('limestone'))o.material=stone;else if(name.includes('smoked oak'))o.material=wood;else if(name.includes('brushed brass'))o.material=brass;}});\n  this.buildExterior();")
edit(p,'  await this.renderer.compileAsync(this.scene,this.camera);this.tick();',"  this.visuals=new MuseumVisuals(this,{stone:[stone,pale,trim],oak:wood,brass});\n  void this.visuals.init(this.graphicsProfile,this.settings.quality===.75).catch(()=>{this.invalidate();});\n  await this.renderer.compileAsync(this.scene,this.camera);this.tick();")
edit(p,'if(!ancestor.visible)return;ancestor=ancestor.parent;','if(!ancestor.visible||ancestor.userData.preserveGroup)return;ancestor=ancestor.parent;')
edit(p,"!['position','normal','uv'].includes(key)","!['position','normal','uv','uv1'].includes(key)")
edit(p,'let b=buckets.get(mat.uuid);',"if(!g.getAttribute('uv1'))g.setAttribute('uv1',g.getAttribute('uv').clone());let b=buckets.get(mat.uuid);")
edit(p,'const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);',"const geometry=new T.BoxGeometry(w,h,d);const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++){if(Math.abs(normals.getY(i))>.5)uv.setXY(i,positions.getX(i)/2,positions.getZ(i)/2);else if(Math.abs(normals.getX(i))>.5)uv.setXY(i,positions.getZ(i)/2,positions.getY(i)/2);else uv.setXY(i,positions.getX(i)/2,positions.getY(i)/2);}const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);")
s=p.read_text()
if "machines.name='tokke-machines'" not in s:
    start=s.index("  }else if(c.visualConcept==='server'){");end=s.index("  }else if(c.visualConcept==='desk'){",start)
    part=s[start:end].replace("  }else if(c.visualConcept==='server'){","  }else if(c.visualConcept==='server'){\n   const machines=new T.Group();machines.name='tokke-machines';machines.userData.preserveGroup=true;group.add(machines);")
    part=part.replace("this.model('server',-.9,.25,0,group);this.model('server',.9,.25,0,group);","this.model('server',-.9,.25,0,machines);this.model('server',.9,.25,0,machines);")
    part=part.replace('}),group);bar.userData.signal','}),machines);bar.userData.signal').replace('group.add(wire);','machines.add(wire);')
    p.write_text(s[:start]+part+s[end:])
edit(p,'glass.position.y=2.02;group.add(glass);',"glass.position.y=2.02;group.add(glass);\n  if(c.id==='tokke')void this.visuals?.loadTokke(group);")
edit(p,"this.label('LA MÉMOIRE PUBLIQUE','HUKOMMELSE · RETTIGHETER · TILLIT'","this.label('SAMFUNNETS HUKOMMELSE','KUNNSKAP · RETTIGHETER · TILLIT'")
edit(p,"this.label('Hva skjer når samfunnet mister sporene?','ARKIVMUSEET'","this.label('Det vi tar vare på, kan vi lære av.','ARKIVMUSEET'")
edit(p,'paused:this.paused};}','paused:this.paused,graphics:this.visuals?.diagnostics()};}')
# Cache static shadows. Camera movement changes the view, not shadow geometry.
edit(p,'this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=',
     'this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.shadowMap.type=')
edit(p,' invalidate(){this.renderDirty=true;}',
     ' invalidate(){this.renderDirty=true;}\n invalidateShadows(){this.invalidate();if(this.renderer?.shadowMap)this.renderer.shadowMap.needsUpdate=true;}')
edit(p,"look(){this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}",
     "look(){this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.renderDirty=true;}")
edit(p,'  const len=Math.hypot(f,s)||1;',
     '  if(!f&&!s&&!turn){this.moving=false;return;}\n  const len=Math.hypot(f,s)||1;')
edit(p,"if(this.loaded.has(c.id))return;this.loaded.add(c.id);", "if(this.loaded.has(c.id))return;this.invalidateShadows();this.loaded.add(c.id);")
edit(p,"if(this.loaded.has('leader'))return;this.loaded.add('leader');", "if(this.loaded.has('leader'))return;this.invalidateShadows();this.loaded.add('leader');")
edit(p,"if(this.active){this.doors[0].rotation.y=T.MathUtils.damp(this.doors[0].rotation.y,-1.55,1.2,dt);this.doors[1].rotation.y=T.MathUtils.damp(this.doors[1].rotation.y,1.55,1.2,dt);}",
     "if(this.active){this.doors.forEach((door,i)=>{const target=i===0?-1.55:1.55;if(Math.abs(door.rotation.y-target)>.002){door.rotation.y=this.settings.reduced?target:T.MathUtils.damp(door.rotation.y,target,2.2,Math.min(elapsed,1));if(Math.abs(door.rotation.y-target)<.002)door.rotation.y=target;this.invalidateShadows();}});}")
edit(p,"if(this.artifacts.has(c.id))this.artifacts.get(c.id)!.visible=dist<37;", "const artifact=this.artifacts.get(c.id);if(artifact&&artifact.visible!==(dist<37)){artifact.visible=dist<37;this.invalidateShadows();}")
edit(p,"if(!this.settings.reduced)this.sun.position.z=8+Math.sin((now-this.startTime)/600000)*9;", "// Fixed sun keeps baked lighting and cached shadows aligned.")
edit(p,"if((!this.active||this.paused)&&!this.renderDirty)return;", "if(!this.renderDirty)return;")
p=r/'src/main.ts'
edit(p,"import './leader-guide.css';","import './leader-guide.css';\nimport './visual-preview.css';")
edit(p,'${step===1&&c.displayMetric?', '${c.id===\'tokke\'&&step===4?`<section class="tokke-visual-demo" aria-label="Illustrert arkivprinsipp"><h3>Oppbevart eller brukbart?</h3><p>Bytt visning i installasjonen. Dette er et illustrert prinsipp, ikke Tokkes faktiske utbedring.</p><div><button id="tokke-stored" aria-pressed="true">En kopi finnes</button><button id="tokke-usable" aria-pressed="false">Innholdet kan brukes</button></div><p id="tokke-visual-status" role="status">En kopi finnes. Sammenheng og lesbarhet må fortsatt avklares.</p></section>`:\'\'}${step===1&&c.displayMetric?')
edit(p," document.querySelector<HTMLButtonElement>('#case-order')", " for(const [id,mode,text] of [['tokke-stored','stored','En kopi finnes. Sammenheng og lesbarhet må fortsatt avklares.'],['tokke-usable','usable','Illustrasjon: Innholdet kan finnes, opphavet er kjent, og lesbarheten er prøvd.']] as const){document.getElementById(id)?.addEventListener('click',()=>{world?.setTokkeMode(mode);document.querySelectorAll<HTMLButtonElement>('.tokke-visual-demo button').forEach(b=>b.setAttribute('aria-pressed',String(b.id===id)));$('#tokke-visual-status').textContent=text;});}\n document.querySelector<HTMLButtonElement>('#case-order')")
edit(p,'const c=current;const lens=',"const c=current;if(c.id==='tokke'&&step===4)world?.setTokkeMode('stored');const lens=")
edit(p,'<label><span>Bildekvalitet</span><select id="quality">','<label><span>Materialdetaljer<small>Automatisk bruker mindre teksturer på telefon. Høy laster 2K.</small></span><select id="graphics-profile"><option value="auto">Automatisk</option><option value="standard">Standard · 1K</option><option value="high">Høy · 2K</option></select></label><label><span>Bildekvalitet</span><select id="quality">')
edit(p,'quality:world?.settings.quality}', 'quality:world?.settings.quality,graphicsProfile:world?.graphicsProfile}')
edit(p,"$('#resume').onclick=closeDialog;", "($('#graphics-profile') as HTMLSelectElement).value=world?.graphicsProfile??'auto';$('#graphics-profile').onchange=()=>{world?.setGraphicsProfile(($('#graphics-profile') as HTMLSelectElement).value);save();};$('#resume').onclick=closeDialog;")
edit(p,'world.renderer.shadowMap.enabled=world.settings.quality===1;', 'world.renderer.shadowMap.enabled=world.settings.quality===1;world.setGraphicsProfile(world.graphicsProfile);')
edit(p,'if(p.quality===.75){', 'world.setGraphicsProfile(p.graphicsProfile);if(p.quality===.75){')
p=r/'scripts/make-text-version.mjs'
edit(p,'${renderCaseLens(guide.lenses.find(l=>l.caseId===c.id))}', '${renderCaseLens(guide.lenses.find(l=>l.caseId===c.id))}${c.id===\'tokke\'?\'<h3>Oppbevart eller brukbart?</h3><p>Illustrert prinsipp, ikke Tokkes faktiske utbedring: En kopi kan finnes mens sammenheng og lesbarhet fortsatt må avklares. I den alternative illustrasjonen kan innholdet finnes, opphavet er kjent og lesbarheten er prøvd. Dette er ingen påstand om nye historiske funn.</p>\':\'\'}')
p=r/'package.json';j=json.loads(p.read_text())
if 'copy-runtime.mjs' not in j['scripts']['content']:j['scripts']['content']+=' && node scripts/graphics/copy-runtime.mjs'
p.write_text(json.dumps(j,indent=2)+'\n')
p=r/'tsconfig.json';j=json.loads(p.read_text());j['compilerOptions']['allowImportingTsExtensions']=True;p.write_text(json.dumps(j,indent=2)+'\n')
p=r/'.gitignore';s=p.read_text()
for line in ['graphics-work/','graphics-review/','qa-graphics/','public/assets/visual-preview/basis/']:
    if line not in s.splitlines():s+='\n'+line+'\n'
p.write_text(s)
print('Graphics integration applied. No deployment or publication performed.')
