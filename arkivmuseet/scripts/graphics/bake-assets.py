"""Blender authoring source for the online hall/Tokke pilot.
Use --background --factory-startup --python-exit-code 1 --python this-file -- [--gpu] [--size 512].
Only graphics-work is written. GPU must be explicitly requested and confirmed.
The hall bake uses architectural proxies, not a claim of surveyed accuracy.
"""
import bpy, sys, argparse, json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--gpu',action='store_true');p.add_argument('--size',type=int,default=512)
a=p.parse_args(args)
if a.size not in (256,512,1024):raise ValueError('Supported lightmap widths: 256,512,1024')
root=Path(__file__).resolve().parents[2];out=root/'graphics-work';out.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.cycles.use_denoising=True;scene.cycles.seed=26;scene.render.bake.margin=8
selected_devices=[]
if a.gpu:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
    for d in prefs.devices:
        d.use=d.type=='OPTIX'
        if d.use:selected_devices.append(d.name)
    if not selected_devices:raise RuntimeError('No OptiX GPU found; stopped instead of silently falling back')
    scene.cycles.device='GPU'
else:scene.cycles.device='CPU'
def mat(name,rgb,metal=0,rough=.7):
    m=bpy.data.materials.new(name);m.use_nodes=True
    pr=m.node_tree.nodes.get('Principled BSDF');pr.inputs['Base Color'].default_value=(*rgb,1)
    pr.inputs['Roughness'].default_value=rough;pr.inputs['Metallic'].default_value=metal
    return m
stone=mat('Limestone',(.58,.51,.40));oak=mat('Dark oak',(.085,.044,.018),0,.5)
brass=mat('Brushed brass',(.48,.31,.11),.78,.34);steel=mat('Archive steel',(.025,.055,.052),.4,.48)
paper=mat('Interpretive paper',(.75,.71,.60));black=mat('Display glass',(.015,.032,.029),.15,.2)
def box(name,x,y,z,w,h,d,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Real edge profile','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(m);return o
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,-22,0));floor=bpy.context.object;floor.name='Floor bake receiver';floor.scale=(10,30,1)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);floor.data.materials.append(stone)
for side in [-1,1]:
    for z,length in [(-3,12),(18,12),(36,12),(51,6)]:box('Wall proxy',side*10,3.1,z,.65,6.2,length,stone)
    box('Upper sill',side*10,6.3,22,.7,.4,60,stone);box('Cornice proxy',side*10,11.8,22,.8,.4,60,stone)
    for z in [-3,3,15,21,33,39,51]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.48,depth=5.7,location=(side*7.6,-z,3.0))
        bpy.context.object.data.materials.append(stone);box('Column foot',side*7.6,.15,z,1.3,.3,1.3,stone)
    box('Roof proxy',side*6.7,16.4,22,6.6,.25,60,stone)
box('Rear wall',0,8,54,20,16,.65,stone);box('Memory plinth',0,.5,20,1.65,1,1.6,stone)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.60,.69,.81,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
bpy.ops.object.light_add(type='SUN',location=(-27,-8,39));sun=bpy.context.object;sun.data.energy=2.4;sun.data.angle=.08
sun.rotation_euler=(Vector((0,-24,0))-sun.location).to_track_quat('-Z','Y').to_euler()
for kind in ('ao','indirect'):
    image=bpy.data.images.new('Hall '+kind,width=a.size,height=a.size*3,alpha=False);image.colorspace_settings.name='Non-Color'
    node=stone.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;stone.node_tree.nodes.active=node
    bpy.ops.object.select_all(action='DESELECT');floor.select_set(True);bpy.context.view_layer.objects.active=floor
    scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=False
    bpy.ops.object.bake(type='AO' if kind=='ao' else 'DIFFUSE')
    image.filepath_raw=str(out/f'hall-{kind}.png');image.file_format='PNG';image.save();image.pack()
    stone.node_tree.nodes.remove(node)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'hall-lighting.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
box('Rack shell',-.95,1.62,0,1.30,2.65,.87,steel,.045);box('Rack crown',-.95,2.98,0,1.36,.08,.93,brass,.018)
for i in range(9):
    y=.50+i*.265
    box('Drive tray',-.95,y,.47,1.18,.21,.08,oak,.012);box('Drive grip',-.95,y+.025,.53,.38,.032,.035,brass,.009)
    for dx in [-.48,.48]:box('Fastener',-.95+dx,y,.524,.035,.035,.012,brass,.006)
    for j in range(5):box('Vent slot',-1.34+j*.085,y-.065,.515,.05,.012,.012,steel)
box('Reading desk',.92,1.10,0,1.50,.14,1.15,oak,.035)
for x in [.33,1.51]:
    for z in [-.43,.43]:box('Desk leg',x,.64,z,.055,.88,.055,brass,.012)
box('Display housing',.92,1.77,-.24,1.35,1.06,.095,brass,.025);box('Display face',.92,1.77,-.181,1.25,.96,.016,black,.008)
box('Reading shelf',.92,1.24,.23,1.20,.045,.53,paper,.01)
for x in [.48,.77,1.06,1.35]:box('Folder divider',x,1.37,.27,.22,.20,.40,paper,.008)
box('Connection rail',0,.34,.7,3.3,.035,.035,brass,.008)
# Re-query live scene objects after each join; joined objects no longer have valid RNA references.
for m in (oak,brass,steel,paper,black):
    bpy.ops.object.select_all(action='DESELECT')
    chosen=[o for o in list(scene.objects) if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
    for o in chosen:o.select_set(True)
    if chosen:
        bpy.context.view_layer.objects.active=chosen[0];bpy.ops.object.join();bpy.context.object.name=m.name.replace(' ','_')
for o in list(scene.objects):
    if o.type=='MESH':
        bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'tokke-display.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'tokke-display.glb'),export_format='GLB',export_yup=True,export_apply=True,export_extras=True)
(out/'blender-report.json').write_text(json.dumps({'version':bpy.app.version_string,'device':scene.cycles.device,'gpuDevices':selected_devices,'samples':24,'lightmap':[a.size,a.size*3],'scope':'architectural proxy bake + original interpretive Tokke display','notHistoricalEvidence':True},indent=2))
print('Authoring assets:',out)
