import * as T from 'three';
import type {MuseumWorld} from './world';
import type {CaseState} from './investigation-state';
import {roomEvidence} from './investigation-state';

/** Additive scenery: existing architecture, lighting and historical installations stay intact. */
export class InvestigationWorld {
  private desks = new Map<string, {group: T.Group; lamp: T.MeshBasicMaterial; pages: T.Mesh[]}>();
  private memory: T.MeshBasicMaterial[] = [];
  private decisions: T.MeshBasicMaterial[] = [];
  private targets: T.Object3D[] = [];
  private ray = new T.Raycaster();
  private paper = new T.MeshStandardMaterial({color: 0xe9ddbd, roughness: .95});
  private oak = new T.MeshStandardMaterial({color: 0x453529, roughness: .82});
  private dark = new T.MeshStandardMaterial({color: 0x243b36, roughness: .73});
  private brass = new T.MeshStandardMaterial({color: 0xa28a53, metalness: .65, roughness: .42});
  constructor(private world: MuseumWorld, private open: (room: string) => void, private secret: () => void) {
    for (const c of world.cases) this.desk(c.id, c.position, c.wing);
    this.hall();
    world.renderer.domElement.addEventListener('click', this.click, true);
  }
  private box(parent: T.Object3D, size: number[], pos: number[], material: T.Material) {
    return this.world.box(size[0], size[1], size[2], pos[0], pos[1], pos[2], material, parent);
  }
  private desk(id: string, position: number[], wing: string) {
    const side = Math.sign(position[0]);
    const g = new T.Group(); g.name = `case17-${id}`;
    g.position.set(position[0] - side * 2.4, 0, position[1] + 3.5);
    g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.world.scene.add(g);
    this.box(g, [2.5, .12, 1.2], [0, 1.1, 0], this.oak);
    for (const x of [-1.05, 1.05]) for (const z of [-.42, .42]) this.box(g, [.12, 1.04, .12], [x, .52, z], this.dark);
    this.world.solids.push({x: g.position.x, z: g.position.z, w: 1.8, d: 3.05});
    this.box(g, [.8, .05, .65], [-.35, 1.2, 0], this.dark);
    for (let i = 0; i < 6; i++) {
      const page = this.box(g, [.62, .009, .48], [-.35 + (i % 2) * .015, 1.24 + i * .012, .015], this.paper);
      page.rotation.y = i * .012;
    }
    // A handset, pencil, calendar, storage medium and half-open drawer: no downloaded assets.
    this.box(g, [.4, .09, .35], [.82, 1.2, -.18], this.dark);
    this.box(g, [.5, .055, .12], [.82, 1.3, -.18], this.dark);
    for (const x of [.61, 1.03]) this.box(g, [.11, .11, .18], [x, 1.28, -.18], this.dark);
    this.box(g, [.035, .035, .4], [.18, 1.185, .1], this.brass);
    this.box(g, [.28, .32, .055], [-.92, 1.35, -.37], this.paper);
    this.box(g, [.17, .04, .07], [.52, 1.18, .34], this.dark);
    this.box(g, [.05, .032, .066], [.62, 1.18, .34], this.brass);
    this.box(g, [.8, .13, .75], [0, .93, .25], this.oak);
    this.box(g, [.25, .04, .06], [0, .95, .67], this.brass);
    this.world.mergeStatic(g);
    this.world.label('SAK 17 · FIKTIV ØVELSE', 'Undersøk sporene · Klikk bordet', 0, 1.9, -.4, 2.65, 0, '#c8b889', g);
    const lamp = new T.MeshBasicMaterial({color: 0xc8a477});
    const light = new T.Mesh(new T.SphereGeometry(.065, 10, 8), lamp);
    light.position.set(-1.05, 1.2, .32);g.add(light);
    const pages: T.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const page = this.box(g, [.22, .015, .26], [-.64 + i * .3, 1.35, .12], new T.MeshBasicMaterial({color: 0x89bda7}));
      page.visible = false; pages.push(page);
    }
    g.userData.caseRoom = id; this.targets.push(g);
    this.desks.set(id, {group: g, lamp, pages});
    // Text and keyboard routes expose the same optional find.
    if (id === 'npe') {
      const note = this.world.label('00', 'Til etterfølgeren', 0, .96, .72, .6, 0, '#c8b889', g);
      note.userData.caseSecret = true;
    }
  }
  private hall() {
    const g = new T.Group();g.name = 'case17-memory';this.world.scene.add(g);
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI * 2 * i / 10;
      const mat = new T.MeshBasicMaterial({color: 0x51655c});this.memory.push(mat);
      const sheet = new T.Mesh(new T.BoxGeometry(.22, .035, .36), mat);
      sheet.position.set(Math.sin(angle) * 2.65, .14, 20 + Math.cos(angle) * 2.65);
      sheet.rotation.y = angle;g.add(sheet);
      const curve = new T.Line(new T.BufferGeometry().setFromPoints([
        new T.Vector3(Math.sin(angle) * 1.35, .125, 20 + Math.cos(angle) * 1.35),
        new T.Vector3(Math.sin(angle) * 2.45, .125, 20 + Math.cos(angle) * 2.45)]),
        new T.LineBasicMaterial({color: 0x9d8755}));g.add(curve);
    }
    this.world.label('TI SPOR. EN SAMMENHENG.', 'Sak 17 · Lysene følger din fiktive undersøkelse', 0, 1.12, 18.72, 2.5, Math.PI, '#c9b27f', g);
    for (let i = 0; i < 6; i++) {
      const mat = new T.MeshBasicMaterial({color: 0x51655c});this.decisions.push(mat);
      this.box(g, [.12, .06, .1], [-.55 + i * .22, .87, 18.68], mat);
    }
  }
  reflect(state: CaseState) {
    for (const [id, desk] of this.desks) {
      const count = roomEvidence(state, id);
      desk.lamp.color.setHex(count === 2 ? 0x93c7ad : 0xc8a477);
      desk.pages.forEach((p, i) => p.visible = i < count);
    }
    this.memory.forEach((m, i) => m.color.setHex(state.found.includes(`e${i + 1}`) ? 0xb6d6b8 : 0x51655c));
    this.decisions.forEach((m, i) => m.color.setHex(state.crisis[i] === null ? 0x51655c : state.crisis[i] === 1 ? 0x93c7ad : 0xc58c69));
  }
  private click = (event: MouseEvent) => {
    if (!this.world.active || this.world.paused || this.world.dragDistance > 6) return;
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new T.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.world.camera);
    const hit = this.ray.intersectObjects(this.targets, true).find(h => h.distance < 6);
    if (!hit) return;
    let object: T.Object3D | null = hit.object;
    while (object) {
      if (object.userData.caseSecret) {event.stopImmediatePropagation();this.secret();return;}
      if (object.userData.caseRoom) {event.stopImmediatePropagation();this.open(object.userData.caseRoom);return;}
      object = object.parent;
    }
  };
}
