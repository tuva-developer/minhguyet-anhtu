"""Export only the selected prewedding photos; never modify originals."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--selection', type=Path, default=ROOT/'src/data/prewedding-selection.json')
parser.add_argument('--output', type=Path, default=ROOT/'public/images/prewedding')
parser.add_argument('--quality', type=int, default=90)
parser.add_argument('--max-edge', type=int, default=3840)
parser.add_argument('--workers', type=int, default=2)
args = parser.parse_args()
selection = json.loads(args.selection.read_text(encoding='utf-8'))
jobs = [(code, concept['id']) for concept in selection['concepts'] for code in concept['photos']]
if len({code for code, _ in jobs}) != len(jobs):
    raise ValueError('Duplicate IDs in the selected-photo list')
sources = {p.stem.upper():p for p in args.source.iterdir() if p.is_file() and p.suffix.lower() in {'.jpg','.jpeg','.png','.webp'}}
missing = [code for code, _ in jobs if code not in sources]
if missing:
    raise FileNotFoundError('Missing selected photos: '+', '.join(missing))
args.output.mkdir(parents=True, exist_ok=True)
srgb = ImageCms.createProfile('sRGB')

def export(job):
    code, concept = job
    source = sources[code]
    with Image.open(source) as original:
        icc = original.info.get('icc_profile')
        image = ImageOps.exif_transpose(original).convert('RGB')
        source_size = image.size
        if icc:
            image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(icc)), srgb, outputMode='RGB')
    image.thumbnail((args.max_edge,args.max_edge),Image.Resampling.LANCZOS)
    stem = code.lower().replace('_','-')
    candidates = []
    sizes = sorted({width for width in [640,1280,1920,image.width] if width <= image.width})
    output_bytes = 0
    for width in sizes:
        resized = image if width == image.width else image.resize((width,round(image.height*width/image.width)),Image.Resampling.LANCZOS)
        filename = f'{stem}.webp' if width == image.width else f'{stem}-{width}.webp'
        path = args.output/filename
        resized.save(path,'WEBP',quality=args.quality,method=5)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:10]
        url = f'/images/prewedding/{filename}?v={digest}'
        candidates.append((url,width))
        output_bytes += path.stat().st_size
    return code, {
        'src':candidates[-1][0], 'width':image.width, 'height':image.height,
        'srcSet':', '.join(f'{url} {width}w' for url,width in candidates),
        'sourceId':code,'concept':concept,
    }, {
        'id':code,'concept':concept,'source':str(source),'sourceWidth':source_size[0],'sourceHeight':source_size[1],
        'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'sourceBytes':source.stat().st_size,'webpBytes':output_bytes,
    }

assets, manifest = {}, {}
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    for result in as_completed([pool.submit(export,job) for job in jobs]):
        code, asset, entry = result.result()
        assets[code], manifest[code] = asset, entry
        print(f'{len(assets):02}/{len(jobs)} {code}: {asset["width"]}x{asset["height"]}, {entry["webpBytes"]//1024} KB including variants',flush=True)
ordered = {code:assets[code] for code,_ in jobs}
(ROOT/'src/data/photo-assets.json').write_text(json.dumps(ordered,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
artifact = ROOT/'artifacts/prewedding'
artifact.mkdir(parents=True,exist_ok=True)
(artifact/'conversion-manifest.json').write_text(json.dumps([manifest[code] for code,_ in jobs],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Exported {len(ordered)} selected photos. Sources unchanged. {sum(v["webpBytes"] for v in manifest.values())/1024/1024:.1f} MB including responsive variants.',flush=True)
