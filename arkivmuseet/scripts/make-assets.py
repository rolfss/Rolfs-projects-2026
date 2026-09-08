"""Original low-poly museum kit. Run with Blender --background --python this-file."""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
out=os.path.abspath(os.path.join(os.path.dirname(__file__),'../public/assets/museum-kit.glb'))
def material(name,color,metal=0,rough=.6):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
stone=material('Warm limestone',(.66,.60,.47)); brass=material('Brushed brass',(.51,.32,.11),.78,.3); wood=material('Smoked oak',(.065,.043,.028)); paper=material('Unmarked paper',(.87,.83,.71)); dark=material('Archive steel',(.055,.09,.085),.5)
def group(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
def finish(o,mat,parent):
 o.data.materials.append(mat);o.parent=parent;return o
def box(name,loc,scale,mat,parent,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Edge highlights','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,mat,parent)
def cylinder(name,radius,depth,z,mat,parent,vertices=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=(0,0,z));o=bpy.context.object;o.name=name
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return finish(o,mat,parent)
p=group('column')
box('plinth',(0,0,.14),(1.3,1.3,.28),stone,p,.03)
for r,d,z in [(.65,.13,.33),(.55,.12,.44),(.49,.12,.53),(.47,.08,5.72),(.55,.15,5.84),(.63,.14,5.98)]:cylinder('moulding',r,d,z,stone,p)
verts=[];faces=[];n=96
for z,r in [(.57,.46),(1.6,.475),(4.5,.42),(5.7,.405)]:
 for i in range(n):
  a=i/n*math.tau;rr=r-(.023 if i%4 in [1,2] else 0);verts.append((rr*math.cos(a),rr*math.sin(a),z))
for j in range(3):
 for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
mesh=bpy.data.meshes.new('Fluted shaft');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('shaft',mesh);bpy.context.collection.objects.link(o);finish(o,stone,p)
box('abacus',(0,0,6.12),(1.4,1.4,.16),stone,p,.025)
p=group('arch');verts=[];faces=[];n=32
for depth in [-.28,.28]:
 for radius in [2.45,2.9]:
  for i in range(n+1):
   a=i/n*math.pi;verts.append((math.cos(a)*radius,depth,math.sin(a)*radius))
for j,k in [(0,1),(1,3),(3,2),(2,0)]:
 for i in range(n):faces.append((j*(n+1)+i,k*(n+1)+i,k*(n+1)+i+1,j*(n+1)+i+1))
mesh=bpy.data.meshes.new('Voussoir arch');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('arch-stone',mesh);bpy.context.collection.objects.link(o);finish(o,stone,p)
for i in range(1,n,2):
 a=i/n*math.pi
 o=box('arch-joint',(math.cos(a)*2.675,-.288,math.sin(a)*2.675),(.008,.008,.43),wood,p);o.rotation_euler[1]=math.pi/2-a
p=group('cabinet');box('case',(0,0,1.1),(1.8,.68,2.2),dark,p,.02)
for z in [.3,.82,1.34,1.86]:
 box('drawer',(0,-.365,z),(1.7,.06,.47),dark,p,.012);box('brass-handle',(0,-.43,z+.07),(.36,.06,.055),brass,p,.01);box('blank-label',(0,-.404,z-.08),(.4,.01,.13),paper,p)
p=group('desk');box('desktop',(0,0,1.02),(3.1,1.35,.15),wood,p,.045)
for x in [-1.32,1.32]:
 for y in [-.46,.46]:box('leg',(x,y,.5),(.1,.1,1),brass,p,.02)
p=group('folder');box('folder',(0,0,.015),(.43,.59,.025),paper,p,.008);box('spine',(-.21,0,.03),(.025,.59,.035),brass,p)
for i in range(4):box('leaf',(0,0,.03+i*.003),(.41,.56,.002),paper,p)
p=group('server');box('rack',(0,0,1.4),(1.25,.8,2.8),dark,p,.025)
for z in range(12):
 box('unit',(0,-.42,.19+z*.22),(1.1,.06,.17),wood,p,.01)
 for x in [-.45,-.3,-.15,0,.15]:box('vent',(x,-.456,.19+z*.22),(.055,.008,.09),dark,p)
box('rack-top',(0,0,2.82),(1.3,.86,.05),brass,p)
p=group('memory');
for i in range(17):
 a=i*.17
 o=box('floating-page',(math.sin(a)*.8,math.cos(a)*.35,.25+i*.16),(1.45,.93,.045),brass if i in [0,8,16] else paper,p,.015);o.rotation_euler=(.04*i,.06*i,a)
os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True,export_apply=True,export_extras=True)
print('Museum kit:',out,os.path.getsize(out),'bytes')
