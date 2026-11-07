"""Verify scroll follow-through and sharp responsive media in real Chromium."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/soi-duyen')
out.mkdir(parents=True, exist_ok=True)

def seek(page, selector, fraction):
    page.locator(selector).evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})', fraction)
    page.wait_for_timeout(750)

def expected_fit(photo, width):
    if width <= 700:
        return 'contain' if photo.get('mobileFit') == 'contain' else 'cover'
    return 'contain' if photo['width'] / photo['height'] < .85 else 'cover'

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for name, width, height, dpr in [('desktop', 1440, 900, 2), ('mobile', 390, 844, 3)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=dpr)
        page.on('pageerror', lambda e: errors.append(str(e)))
        open_site(page, args.url, wait_until='networkidle')
        img = page.locator('.travel-cover-layer .cinema-subject' if width > 700 else '.hero-window .cinema-subject')
        img.evaluate('(el)=>el.decode()')
        metrics = img.evaluate('''async el=>{const bitmap=await createImageBitmap(await (await fetch(el.currentSrc)).blob());const result={width:bitmap.width,height:bitmap.height,source:el.currentSrc,fit:getComputedStyle(el).objectFit};bitmap.close();return result;}''')
        site=page.evaluate('async()=>(await import("/src/data/site.js")).wedding')
        assert metrics['source'].endswith(site['heroPhoto']['src']), metrics
        assert metrics['height'] >= 2000, metrics
        assert metrics['fit'] == expected_fit(site['heroPhoto'],width), metrics
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(out/f'{name}-polished-cover.png'), scale='css')
        seek(page, '.reel-film', .98)
        final=next(photo for photo in site['photos'] if photo['id']==site['albumFinalPhotoId'])
        if width > 700:
            assert page.locator('.is-current .cinema-subject').evaluate('(el)=>getComputedStyle(el).objectFit') == expected_fit(final,width)
        else:
            assert page.locator('.mobile-album-tile').count() == 4
        page.screenshot(path=str(out/f'{name}-polished-fullscreen.png'), scale='css')
        print(f'PASS {name} DPR {dpr}: native source and correct cinema image fit: {metrics}', flush=True)
        page.close()

    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda e: errors.append(str(e)))
    open_site(page, args.url, wait_until='networkidle')
    seek(page, '#home', .62)
    width = lambda: float(page.locator('.travel-photo').evaluate('(el)=>getComputedStyle(el).width').replace('px', ''))
    start = width()
    page.evaluate('scrollBy({top:100,behavior:"instant"})')
    samples = []
    for _ in range(12):
        page.wait_for_timeout(40)
        samples.append(width())
    assert start > samples[0] > samples[-1] + 1, (start, samples)
    assert all(a + .15 >= b for a, b in zip(samples, samples[1:])), samples
    # Direct anchor jumps must never leave the traveling image over another scene.
    seek(page, '#event', .5)
    assert float(page.locator('.travel-photo').evaluate('(el)=>getComputedStyle(el).opacity')) == 0
    print('PASS short scroll continues smoothly after input, without overshoot; anchor jumps settle correctly.', flush=True)

    reduced = browser.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
    reduced.on('pageerror', lambda e: errors.append(str(e)))
    open_site(reduced, args.url, wait_until='networkidle')
    seek(reduced, '#story', 0)
    assert reduced.locator('.reel-frame').first.bounding_box()['height'] > 100
    assert reduced.locator('.travel-photo').count() == 0
    assert not errors, errors
    print('PASS reduced motion retains the first album image; no JavaScript errors.', flush=True)
    browser.close()
