"""Offline validation of deployment inputs. Does not install, start, or expose anything."""
import json, re
from pathlib import Path
BASE = Path(__file__).resolve().parent

def check():
    values = {}
    for line in (BASE / '.env').read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            values[k.strip()] = v.strip().strip('"').strip("'")
    for name in ['NODE_IMAGE', 'OLLAMA_IMAGE', 'CLOUDFLARED_IMAGE']:
        if not re.fullmatch(r'[a-zA-Z0-9._/:\-]+@sha256:[a-f0-9]{64}', values.get(name, '')):
            raise ValueError(f'{name}: reviewed immutable image digest required')
    models = Path(values.get('LOCAL_MODEL_DIR', 'MISSING'))
    if not (models / 'blobs').is_dir() or not (models / 'manifests').is_dir():
        raise ValueError('Existing Ollama model directory not found; no model will be downloaded.')
    cfg = json.loads((BASE / '.local/model.json').read_text())
    if cfg.get('origin') != 'http://model:11434' or not re.fullmatch(r'[a-f0-9]{64}', cfg.get('digest','')):
        raise ValueError('Isolated model configuration is incomplete')
    if not cfg.get('model') or 'cloud' in cfg['model'].lower() or 'REPLACE' in cfg['model']:
        raise ValueError('Exact local model name is required')
    for name in ['bridge-key', 'tunnel-token', 'corpus.json']:
        if not (BASE / '.local' / name).is_file():
            raise ValueError(f'Missing local input: {name}')
    if not re.fullmatch(r'[a-f0-9]{64}', (BASE / '.local/bridge-key').read_text().strip()):
        raise ValueError('Dedicated random 32-byte bridge key required')
    corpus = json.loads((BASE / '.local/corpus.json').read_text())
    if not corpus.get('chunks'):
        raise ValueError('No reviewed sources indexed')
    print('Inputs pass offline checks. This is NOT a live security or model verification.')

if __name__ == '__main__':
    try:
        check()
    except (OSError, ValueError, KeyError) as exc:
        raise SystemExit(f'Preflight refused: {exc}')
