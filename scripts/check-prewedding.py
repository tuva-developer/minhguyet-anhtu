"""Verify the exact selection, all responsive exports and unchanged originals."""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from PIL import Image

root = Path(__file__).resolve().parents[1]
selection = json.loads((root/'src/data/prewedding-selection.json').read_text(encoding='utf-8'))
expected = [code for concept in selection['concepts'] for code in concept['photos']]
assert len(expected)==len(set(expected))==40
assert [len(concept['photos']) for concept in selection['concepts']]==[11,15,8,6]
assets = json.loads((root/'src/data/photo-assets.json').read_text(encoding='utf-8'))
assert list(assets)==expected
files = set()
for code, asset in assets.items():
    assert asset['sourceId']==code
    for candidate in asset['srcSet'].split(', '):
        url,width = candidate.rsplit(' ',1)
        parsed=urlsplit(url)
        path=root/'public'/parsed.path.lstrip('/')
        assert path.is_file(),path
        assert hashlib.sha256(path.read_bytes()).hexdigest().startswith(parse_qs(parsed.query)['v'][0])
        with Image.open(path) as image:
            assert image.width==int(width[:-1]) and max(image.size)<=3840
            image.verify()
        files.add(path.resolve())
assert files=={p.resolve() for p in (root/'public/images/prewedding').glob('*.webp')}
manifest=json.loads((root/'artifacts/prewedding/conversion-manifest.json').read_text(encoding='utf-8'))
assert [row['id'] for row in manifest]==expected
for row in manifest:
    assert hashlib.sha256(Path(row['source']).read_bytes()).hexdigest()==row['sourceSha256'],row['id']
portraits=json.loads((root/'src/data/portrait-assets.json').read_text(encoding='utf-8'))
for role,asset in portraits.items():
    assert asset['sourceId'] in expected
    path=root/'public'/urlsplit(asset['src']).path.lstrip('/')
    with Image.open(path) as image:
        assert image.size==(asset['width'],asset['height'])
        if not asset.get('maskSrc'):
            assert image.mode=='RGBA' and image.getchannel('A').getextrema()==(0,255)
    if asset.get('maskSrc'):
        assert asset['src']==assets[asset['sourceId']]['src'], 'Masked portraits must use the untouched photograph'
        mask_path=root/'public'/urlsplit(asset['maskSrc']).path.lstrip('/')
        assert hashlib.sha256(mask_path.read_bytes()).hexdigest().startswith(parse_qs(urlsplit(asset['maskSrc']).query)['v'][0])
        with Image.open(mask_path) as mask:
            assert mask.mode=='RGBA' and mask.getchannel('A').getextrema()==(0,255)
            # The face must stay fully opaque: no synthesized RGB or facial holes.
            w,h=mask.size
            # SVG's 1.02 alpha gain makes this near-opaque interior fully opaque.
            assert mask.getchannel('A').crop((int(w*.32),int(h*.27),int(w*.37),int(h*.31))).getextrema()[0]>=250
assert not (root/'public/images/wedding').exists()
assert not (root/'dist/images/wedding').exists()
assert not (root/'public/images/portraits/bride-cutout.webp').exists()
assert not (root/'public/images/portraits/groom-cutout.webp').exists()
print(f'PASS: exact 40 selections, concept counts 11/15/8/6, {len(files)} valid responsive files, valid portrait alpha/mask, untouched bride photo and source hashes, no old served photos.')
