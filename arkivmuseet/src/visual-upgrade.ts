import * as T from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { graphicsPolicy, type GraphicsProfile } from './graphics-settings.ts';

type Materials = { stone: T.MeshStandardMaterial[]; oak: T.MeshStandardMaterial; brass: T.MeshStandardMaterial };
type Host = { scene: T.Scene; renderer: T.WebGLRenderer; sun: T.DirectionalLight; invalidate: () => void };
const base = (import.meta.env?.BASE_URL ?? './') + 'assets/visual-preview/';
/** Additive preview visuals must never prevent the factual exhibition from opening. */
export class MuseumVisuals {
  readonly root = new T.Group();
  readonly floorMaterial = new T.MeshStandardMaterial({ color: 0xc6baa1, roughness: .64 });
  readonly floor: T.Mesh;
  readonly enabled = new URLSearchParams(location.search).get('visual') !== 'baseline';
  profile: GraphicsProfile = 'auto'; textureSize = 0; state = 'loading'; failures: string[] = [];
  private ktx: KTX2Loader;
  private serial = 0;
  private textures: T.Texture[] = [];
  private bakes: T.Texture[] = [];
  private tokkeRoot?: T.Group;
  private tokkeDisplay?: T.Mesh;
  private tokkeMode: 'stored' | 'usable' = 'stored';
  private tokkePromise?: Promise<void>;
  private disposed = false;
  private host: Host; private materials: Materials;
  constructor(host: Host, materials: Materials) {
    this.host=host;this.materials=materials;
    this.root.name = 'GraphicsPreview';
    const geometry = new T.PlaneGeometry(20, 60); geometry.rotateX(-Math.PI / 2);
    geometry.setAttribute('uv1', geometry.getAttribute('uv').clone());
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 30);
    this.floor = new T.Mesh(geometry, this.floorMaterial); this.floor.name = 'BakedHallFloor';
    this.floor.position.set(0, .045, 22); this.floor.receiveShadow = true;
    this.ktx = new KTX2Loader().setTranscoderPath(base + 'basis/').detectSupport(host.renderer);
    this.ktx.setWorkerLimit(2);
  }
  async init(profile: GraphicsProfile, economy = false) {
    if (!this.enabled) { this.state = 'baseline'; return; }
    this.host.scene.add(this.root); this.root.add(this.floor); this.hallDetails();
    this.host.scene.environmentIntensity = .45;
    this.host.renderer.toneMappingExposure = 1.02;
    this.host.sun.intensity = 2.6;
    this.host.scene.traverse(o => { if (o instanceof T.HemisphereLight) o.intensity = 1.35; });
    await Promise.all([this.setProfile(profile, economy), this.loadBakes()]);
    if (this.disposed) return;
    this.state = this.failures.length ? 'fallback' : 'ready'; this.host.invalidate();
  }
  private async texture(name: string, color = false) {
    let texture: T.Texture;
    try { texture = await this.ktx.loadAsync(base + name + '.ktx2'); }
    catch {
      this.failures.push(name + ': KTX2 unavailable; used image fallback');
      texture = await new T.TextureLoader().loadAsync(base + name + '.webp');
      texture.flipY = false;
    }
    texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    return texture;
  }
  async setProfile(profile: GraphicsProfile, economy = false) {
    this.profile = profile;
    if (!this.enabled || this.disposed) return;
    const policy = graphicsPolicy(profile, innerWidth, innerHeight, devicePixelRatio,
      matchMedia('(pointer: coarse)').matches, economy);
    this.host.renderer.setPixelRatio(policy.ratio);
    this.host.renderer.shadowMap.enabled = policy.shadows;
    if (this.host.sun.shadow.mapSize.x !== policy.shadowSize) {
      this.host.sun.shadow.map?.dispose(); this.host.sun.shadow.map = null;
      this.host.sun.shadow.mapSize.set(policy.shadowSize, policy.shadowSize);
    }
    this.host.renderer.shadowMap.needsUpdate = true;
    const serial = ++this.serial; // Cancel an older in-flight tier before an early return.
    if (this.textureSize === policy.textureSize) { this.host.invalidate(); return; }
    const pending: T.Texture[] = [];
    try {
      for (const name of ['limestone', 'floor', 'oak']) {
        for (const channel of ['color', 'normal', 'orm']) {
          const texture = await this.texture(`${name}-${channel}-${policy.textureSize}`, channel === 'color');
          texture.anisotropy = Math.min(policy.anisotropy, this.host.renderer.capabilities.getMaxAnisotropy());
          pending.push(texture);
          if (serial !== this.serial || this.disposed) { pending.forEach(t => t.dispose()); return; }
        }
      }
      const assign = (material: T.MeshStandardMaterial, index: number, color: number, normal: number) => {
        material.color.setHex(color); material.map = pending[index]; material.normalMap = pending[index + 1];
        material.roughnessMap = pending[index + 2]; material.roughness = 1;
        material.bumpMap = null; material.normalScale.set(normal, normal); material.needsUpdate = true;
      };
      this.materials.stone.forEach((material,i)=>assign(material,0,[0xffffff,0xfff5e2,0xd4c3a4][i]??0xffffff,.40));
      assign(this.floorMaterial, 3, 0xffffff, .55); assign(this.materials.oak, 6, 0xffffff, .30);
      this.textures.forEach(t => t.dispose()); this.textures = pending; this.textureSize = policy.textureSize;
      this.host.invalidate();
    } catch (error) {
      pending.forEach(t => t.dispose()); this.failures.push(String(error)); this.state = 'fallback'; this.host.invalidate();
    }
  }
  private async loadBakes() {
    try {
      const maps = await Promise.all([this.texture('hall-ao'), this.texture('hall-indirect')]);
      if (this.disposed) { maps.forEach(t => t.dispose()); return; }
      maps.forEach(t => { t.channel = 1; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; });
      this.bakes = maps; this.floorMaterial.aoMap = maps[0]; this.floorMaterial.aoMapIntensity = .65;
      this.floorMaterial.lightMap = maps[1]; this.floorMaterial.lightMapIntensity = .8;
      this.floorMaterial.needsUpdate = true; this.host.invalidate();
    } catch (error) { this.failures.push('Baked lighting: ' + String(error)); }
  }
  private hallDetails() {
    const { brass, oak } = this.materials;
    const pale = this.materials.stone[0];
    const bins = new Map<T.Material, T.BufferGeometry[]>();
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: T.Material, rounded = false) => {
      let g: T.BufferGeometry = rounded ? new RoundedBoxGeometry(w,h,d,2,Math.min(.025,h/5,d/5,w/5)) : new T.BoxGeometry(w,h,d);
      const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv');
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getY(i)) > .5) uv.setXY(i,p.getX(i)/2,p.getZ(i)/2);
        else if (Math.abs(n.getX(i)) > .5) uv.setXY(i,p.getZ(i)/2,p.getY(i)/2);
        else uv.setXY(i,p.getX(i)/2,p.getY(i)/2);
      }
      if (g.index) { const original=g;g=g.toNonIndexed();original.dispose(); }
      g.translate(x,y,z); const list=bins.get(material)??[];list.push(g);bins.set(material,list);
    };
    const glow = new T.MeshBasicMaterial({ color:0xffdf9b, toneMapped:false });
    for (const side of [-1,1]) {
      for (const [z,length] of [[-3,12],[18,12],[36,12],[51,6]]) {
        box(side*9.60,.76,z,.13,1.42,length-.12,oak);
        box(side*9.48,.14,z,.16,.22,length-.12,pale,true);
        box(side*9.46,1.48,z,.19,.09,length-.12,brass,true);
        for(let at=z-length/2+.6;at<z+length/2;at+=2) box(side*9.49,.80,at,.12,1.16,.038,brass);
        box(side*9.38,4.75,z,.12,1.14,.08,brass,true);
        box(side*9.29,4.75,z,.06,.84,.045,glow);
      }
      for(const [y,depth] of [[6.10,.18],[6.28,.25],[6.41,.12]]) box(side*9.48,y,22,depth,.095,59.7,pale,true);
      box(side*9.27,6.32,22,.045,.025,59.4,glow);
    }
    // Inlays leave the existing memory sculpture and circulation untouched.
    for(let i=0;i<12;i++) {
      const angle=i*Math.PI/6;
      const geo=new T.BoxGeometry(.017,.008,1.05);
      geo.rotateY(angle);geo.translate(Math.sin(angle)*2.88,.094,20+Math.cos(angle)*2.88);
      const list=bins.get(brass)??[];list.push(geo.toNonIndexed());geo.dispose();bins.set(brass,list);
    }
    for(const [material,geos] of bins) {
      const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(!geometry)continue;
      const mesh=new T.Mesh(geometry,material);mesh.name='HallDetailBatch';mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);
    }
  }
  loadTokke(parent: T.Group) {
    if (!this.enabled || this.tokkePromise) return this.tokkePromise;
    this.tokkePromise = (async()=>{
      try {
        const model=(await new GLTFLoader().loadAsync(base+'tokke-display.glb')).scene;
        if(this.disposed)return;
        model.name='TokkeDetailedDisplay';
        model.traverse(o=>{
          if(!(o instanceof T.Mesh))return;
          const material=o.material as T.MeshStandardMaterial;
          if(material.name==='Dark oak')o.material=this.materials.oak;
          if(material.name==='Brushed brass')o.material=this.materials.brass;
          o.castShadow=true;o.receiveShadow=true;
        });
        const previous=parent.getObjectByName('tokke-machines');if(previous)previous.visible=false;
        parent.add(model);this.tokkeRoot=model;
        const display=new T.Mesh(new T.PlaneGeometry(1.20,.90),new T.MeshBasicMaterial({toneMapped:false}));
        display.position.set(.92,1.77,-.168);parent.add(display);this.tokkeDisplay=display;
        this.setTokkeMode(this.tokkeMode);this.host.renderer.shadowMap.needsUpdate=true;this.host.invalidate();
      }catch(error){this.failures.push('Tokke model: '+String(error));this.host.invalidate();}
    })();
    return this.tokkePromise;
  }
  setTokkeMode(mode:'stored'|'usable') {
    this.tokkeMode=mode;if(!this.tokkeDisplay)return;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#112720';ctx.fillRect(0,0,1024,768);
    ctx.strokeStyle='#c2a772';ctx.lineWidth=3;ctx.strokeRect(25,25,974,718);
    ctx.fillStyle='#dfcd9d';ctx.font='26px sans-serif';ctx.fillText('ILLUSTRERT PRINSIPP · IKKE ORIGINALDOKUMENT',52,79);
    ctx.fillStyle='#f0e8d4';ctx.font='48px Georgia';ctx.fillText(mode==='usable'?'Finn. Forstå. Etterprøv.':'Lagret – men brukbart?',52,170);
    const lines=mode==='usable'?['01  Innholdet kan finnes','02  Opphav og sammenheng følger med','03  Lesbarheten er prøvd']:['01  En kopi finnes','02  Sammenhengen må avklares','03  Lesbarheten må prøves'];
    ctx.font='35px sans-serif';lines.forEach((line,i)=>{ctx.fillStyle=mode==='usable'?'#c6dfc5':'#c2c8bc';ctx.fillText(line,52,290+i*112);ctx.fillStyle='#496252';ctx.fillRect(52,318+i*112,916,2);});
    ctx.fillStyle='#e4d8b9';ctx.font='26px sans-serif';ctx.fillText('Ingen påstand om Tokkes faktiske utbedring.',52,690);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const material=this.tokkeDisplay.material as T.MeshBasicMaterial;
    material.map?.dispose();material.map=texture;material.needsUpdate=true;this.host.invalidate();
  }
  diagnostics(){return{enabled:this.enabled,state:this.state,profile:this.profile,textureSize:this.textureSize,bakedMaps:this.bakes.length,tokkeDetailed:!!this.tokkeRoot,tokkeMode:this.tokkeMode,failures:[...this.failures]};}
  dispose(){this.disposed=true;++this.serial;this.ktx.dispose();this.textures.forEach(t=>t.dispose());this.bakes.forEach(t=>t.dispose());this.root.removeFromParent();this.floor.geometry.dispose();this.floorMaterial.dispose();}
}
