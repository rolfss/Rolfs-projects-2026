"""Encode real runtime KTX2 assets with smaller WebP fallbacks. No runtime network APIs."""
from pathlib import Path
from PIL import Image
import json, hashlib, os, subprocess, shutil
root=Path(__file__).resolve().parents[2];work=root/'graphics-work';out=root/'public/assets/visual-preview';out.mkdir(parents=True,exist_ok=True)
encoder=os.environ.get('MUSEUM_KTX')
if not encoder:raise RuntimeError('MUSEUM_KTX must name the reviewed toktx executable')
entries=[]
def encode(image,name,color=False):
    png=work/(name+'.png');image.save(png)
    output=out/(name+'.ktx2')
    args=[encoder,'--t2','--genmipmap','--assign_oetf','srgb' if color else 'linear','--encode','etc1s' if color else 'uastc']
    args+=['--qlevel','180'] if color else ['--uastc_quality','2','--zcmp','18']
    subprocess.run(args+[str(output),str(png)],check=True)
    image.save(out/(name+'.webp'),quality=86,method=6)
for n in (512,1024,2048):
    for material in ('limestone','floor','oak'):
        for channel in ('color','normal','orm'):
            with Image.open(work/'textures'/f'{material}-{channel}.png') as im:
                resized=im.resize((n,n),Image.Resampling.LANCZOS)
                encode(resized,f'{material}-{channel}-{n}',channel=='color')
for kind in ('ao','indirect'):
    with Image.open(work/f'hall-{kind}.png') as image:encode(image.convert('RGB'),f'hall-{kind}')
shutil.copy2(work/'tokke-display.glb',out/'tokke-display.glb')
for path in sorted(out.iterdir()):
    if path.is_file() and path.name!='manifest.json':
        data=path.read_bytes();entries.append({'file':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'version':1,'createdBy':'Original procedural PBR authoring + Blender Cycles architectural-proxy bake','license':'MIT (project-original assets)','materials':[512,1024,2048],'entries':entries},indent=2))
print('Runtime assets:',sum(e['bytes'] for e in entries),'bytes across',len(entries),'files')
