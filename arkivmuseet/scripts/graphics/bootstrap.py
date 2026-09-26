"""Download verified free authoring tools and create review assets on a public CI runner.
No deployment, driver change, account creation or Windows installation is performed.
"""
from pathlib import Path
import os, sys, json, urllib.request, hashlib, tarfile, tempfile, shutil, subprocess, re
ROOT=Path(__file__).resolve().parents[2]
REVIEW=ROOT/'graphics-review';REVIEW.mkdir(exist_ok=True)
VERSION='5.2.2';KTX_VERSION='4.4.2'

def read(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Arkivmuseet-reviewed-authoring/1'})
    with urllib.request.urlopen(request,timeout=90) as response:return response.read()
def download(url,path,expected,limit=800*1024*1024):
    request=urllib.request.Request(url,headers={'User-Agent':'Arkivmuseet-reviewed-authoring/1'})
    digest=hashlib.sha256();total=0
    with urllib.request.urlopen(request,timeout=90) as response,open(path,'wb') as out:
        while chunk:=response.read(1024*1024):
            total+=len(chunk)
            if total>limit:raise RuntimeError('Download exceeded its approved size ceiling')
            digest.update(chunk);out.write(chunk)
    if digest.hexdigest().lower()!=expected.lower():
        path.unlink();raise RuntimeError('SHA-256 mismatch: '+path.name)
    return {'file':path.name,'url':url,'bytes':total,'sha256':digest.hexdigest(),'verified':True}
def run(args):subprocess.run([str(v) for v in args],cwd=ROOT,check=True)
if os.environ.get('GITHUB_ACTIONS')!='true':raise RuntimeError('CI bootstrap is not a workstation installer; use setup-graphics.ps1')
if os.environ.get('RUNNER_OS')!='Linux':raise RuntimeError('This bootstrap is restricted to a Linux review runner')
with tempfile.TemporaryDirectory(prefix='museum-free-tools-') as temp:
    temp=Path(temp)
    base='https://download.blender.org/release/Blender5.2/'
    hashes=read(base+f'blender-{VERSION}.sha256').decode()
    checks={line.split()[-1].lstrip('*'):line.split()[0] for line in hashes.splitlines() if len(line.split())==2}
    linux=f'blender-{VERSION}-linux-x64.tar.xz';windows=f'blender-{VERSION}-windows-x64.zip'
    for name in [linux,windows]:
        if not re.fullmatch('[0-9a-fA-F]{64}',checks.get(name,'')):raise RuntimeError('Missing official checksum for '+name)
    report={'blender':download(base+linux,temp/linux,checks[linux]),'windows':[],'cost':'No paid services; standard public-repository runner only'}
    with tarfile.open(temp/linux) as archive:archive.extractall(temp,filter='data')
    blender=next(temp.glob('blender-*/blender'))
    release=json.loads(read(f'https://api.github.com/repos/KhronosGroup/KTX-Software/releases/tags/v{KTX_VERSION}'))
    def asset(platform,ending):
        return next(a for a in release['assets'] if platform in a['name'] and any(s in a['name'] for s in ('x86_64','x64')) and a['name'].endswith(ending))
    ktx=asset('Linux','.tar.bz2')
    if not ktx.get('digest','').startswith('sha256:'):raise RuntimeError('Missing release SHA-256 for KTX')
    report['ktx']=download(ktx['browser_download_url'],temp/ktx['name'],ktx['digest'].split(':')[1])
    ktxdir=temp/'ktx';ktxdir.mkdir()
    with tarfile.open(temp/ktx['name']) as archive:archive.extractall(ktxdir,filter='data')
    encoder=next(ktxdir.rglob('toktx'))
    # Verify Windows downloads too, but never run or redistribute the installers.
    report['windows'].append(download(base+windows,temp/windows,checks[windows]))
    try:
        win=asset('Windows','.zip')
        if not win.get('digest','').startswith('sha256:'):raise RuntimeError('Missing Windows KTX SHA-256')
        report['windows'].append(download(win['browser_download_url'],temp/win['name'],win['digest'].split(':')[1]))
    except StopIteration: report['windowsKtx']='No portable Windows x64 ZIP found; installation requires a separately reviewed package.'
    (REVIEW/'verified-tools.json').write_text(json.dumps(report,indent=2))
    run(['sudo','apt-get','update','-qq'])
    run(['sudo','apt-get','install','-y','python3-numpy','python3-pil','libxrender1','libxi6','libxfixes3','libxkbcommon0','libsm6'])
    run(['/usr/bin/python3',ROOT/'scripts/graphics/make-materials.py'])
    run([blender,'--background','--factory-startup','--python',ROOT/'scripts/graphics/bake-assets.py','--','--size','512'])
    os.environ['MUSEUM_KTX']=str(encoder)
    run(['/usr/bin/python3',ROOT/'scripts/graphics/compress-assets.py'])
    shutil.copytree(ROOT/'public/assets/visual-preview',REVIEW/'assets',dirs_exist_ok=True)
    for name in ['hall-lighting.blend','tokke-display.blend','blender-report.json']:
        shutil.copy2(ROOT/'graphics-work'/name,REVIEW/name)
    shutil.copy2(temp/ktx['name'],REVIEW/'ktx-linux.tar.bz2')
    with tarfile.open(REVIEW/'authoring-source.tar.gz','w:gz') as archive:
        archive.add(ROOT/'scripts/graphics',arcname='scripts/graphics')
    print(json.dumps(report,indent=2))
