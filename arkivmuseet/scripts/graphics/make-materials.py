"""Original, deterministic, tileable PBR materials. No API, paid assets or AI service.
Run with a Python containing numpy and Pillow; output stays in graphics-work/.
The web assets are produced by compress-assets.py, not fetched at runtime.
"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'graphics-work' / 'textures'
OUT.mkdir(parents=True, exist_ok=True)
N = 2048
v, u = np.mgrid[0:N, 0:N].astype(np.float32) / N
rng = np.random.default_rng(20260926)
def field(bands, anisotropy=1):
    a = np.zeros((N, N), np.float32)
    for freq, weight in bands:
        for _ in range(4):
            k = rng.integers(1, freq + 1, 2)
            a += weight * np.sin(2*np.pi*(k[0]*u + k[1]*v/anisotropy) + rng.random()*6.28)/4
    return a

def save(name, albedo, height, rough, ao):
    dx = (np.roll(height, -1, 1)-np.roll(height, 1, 1))*24
    dy = (np.roll(height, -1, 0)-np.roll(height, 1, 0))*24
    normal = np.stack([-dx, -dy, np.ones_like(dx)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    maps = {'color':albedo, 'normal': (normal*.5+.5)*255,
            'orm':np.stack([ao, rough, np.zeros_like(ao)],axis=-1)*255}
    for key, values in maps.items():
        Image.fromarray(np.clip(values,0,255).astype('uint8'), 'RGB').save(OUT/f'{name}-{key}.png')
coarse = field([(4, .55), (12, .24), (45, .08)])
fine = field([(110, .018), (330, .007)])
vein = np.sin(2*np.pi*(u*3 + v*2) + coarse*2)
pore = np.maximum(0, field([(120, 1)])-.6)*.03
height = coarse*.03 + fine - pore
color = np.stack([188+coarse*12, 176+coarse*12, 151+coarse*11],axis=-1) + fine[...,None]*60
save('limestone', color, height, .75 + coarse*.075, np.clip(1-pore*5,.8,1))
gap = ((u < .004)|(v < .004)|(u > .996)|(v > .996)).astype(np.float32)
bevel = np.minimum(np.minimum(u,1-u), np.minimum(v,1-v))
edge = np.clip(bevel/.012,0,1)
floor_h = height*.4 + edge*.012
floor_c = color* (.80+.20*edge[...,None])
save('floor', floor_c, floor_h, np.clip(.59+coarse*.08+gap*.25,0,1), .85+.15*edge)
flow = 1.4*np.sin(2*np.pi*v) + .30*np.sin(2*np.pi*v*4)
grain = np.sin(2*np.pi*u*38 + flow) * .5 + np.sin(2*np.pi*u*131 + flow*2)*.20
wide = np.sin(2*np.pi*u*7 + .4*np.sin(2*np.pi*v))
wood_h = grain*.012+fine*.10
wood_c = np.stack([93+grain*13+wide*7, 64+grain*10+wide*5, 39+grain*6+wide*4],axis=-1)
save('oak', wood_c, wood_h, .52 + grain*.10, np.ones_like(u))
print('Original material masters:', OUT)
