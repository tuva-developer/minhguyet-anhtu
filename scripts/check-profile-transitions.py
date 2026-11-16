"""Independent cover exit, page-bound letter entrance, reversible album docking."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/profile-transitions'); out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(768, 1024), (1440, 900), (1024, 500)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(args.url + '/#home', wait_until='networkidle')
        geometry = page.evaluate('''()=>Object.fromEntries(
          ['home','couple','opening'].map(id=>{
            const el=document.getElementById(id);
            return [id,{top:el.getBoundingClientRect().top+scrollY,travel:Math.max(1,el.offsetHeight-innerHeight)}];
          }))''')
        def scroll(top):
            page.evaluate('(top)=>scrollTo({top,behavior:"instant"})', top)
            page.wait_for_timeout(650)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        hero_end = geometry['home']['top'] + geometry['home']['travel']
        scroll(hero_end)
        cover = page.locator('.hero-window').bounding_box()
        assert cover['width'] < width * .55
        assert page.locator('.hero-window .cover-camera').count() == 1
        assert page.locator('.travel-cover-layer').count() == 0
        assert float(page.locator('.travel-photo').evaluate('el=>getComputedStyle(el).opacity')) == 0
        page.screenshot(path=str(out / f'{width}-cover.png'))
        scroll(hero_end + height * .35)
        moved = page.locator('.hero-window').bounding_box()
        assert abs(moved['y'] - cover['y'] + height * .35) < 2
        assert abs(moved['width'] - cover['width']) < 1
        page.screenshot(path=str(out / f'{width}-cover-exit.png'))
        scroll(geometry['couple']['top'])
        assert float(page.locator('.travel-photo').evaluate('el=>getComputedStyle(el).opacity')) == 0
        page.screenshot(path=str(out / f'{width}-profiles.png'))
        letter_top = geometry['opening']['top']
        for offset in [-height * .55, 0, height * .25, -height * .55, -height]:
            scroll(letter_top + offset)
            camera = page.locator('.travel-photo').bounding_box()
            assert camera['y'] >= max(0, -offset) - 2
            if offset < 0:
                assert page.locator('.travel-album-layer').evaluate('el=>+getComputedStyle(el).opacity') == 0
            if offset == 0:
                local = page.locator('.travel-photo').evaluate('el=>({y:new DOMMatrix(getComputedStyle(el).transform).m42,width:el.offsetWidth})')
                assert abs(local['y'] - height * .2) < 2, local
                assert abs(local['width'] - width * .29) < 2, local
            if offset == -height:
                assert float(page.locator('.travel-photo').evaluate('el=>getComputedStyle(el).opacity')) == 0
        scroll(letter_top - height * .35)
        page.screenshot(path=str(out / f'{width}-letter-enter.png'))
        scroll(letter_top)
        page.screenshot(path=str(out / f'{width}-letter.png'))
        album = page.locator('.reel-film').evaluate('el=>({top:el.getBoundingClientRect().top+scrollY,travel:el.offsetHeight-innerHeight})')
        for fraction in [.079, .081, .53, .081, .079]:
            scroll(album['top'] + album['travel'] * fraction)
            ownership = page.evaluate('''()=>{
              const camera=document.querySelector('.travel-photo'),tile=document.querySelector('.montage-tile');
              const a=camera.getBoundingClientRect(),b=tile.getBoundingClientRect();
              return {camera:+getComputedStyle(camera).opacity,tile:+getComputedStyle(tile).opacity,
                gap:Math.max(...['x','y','width','height'].map(k=>Math.abs(a[k]-b[k])))};
            }''')
            assert min(ownership['camera'], ownership['tile']) < .01, ownership
            assert max(ownership['camera'], ownership['tile']) > .99, ownership
            if fraction < .1: assert ownership['gap'] < 2, ownership
        print(f'PASS {width}px: local cover exit, independent letter entrance, reverse scroll and album docking.', flush=True)
        page.close()
    for width in [320, 390, 1440]:
        page = browser.new_page(viewport={'width': width, 'height': 844}, reduced_motion='reduce' if width == 1440 else 'no-preference')
        page.goto(args.url + '/#opening', wait_until='networkidle')
        assert page.locator('.travel-photo').count() == 0
        assert page.locator('.reading-image').is_visible()
        assert page.locator('.hero-window').evaluate('el=>getComputedStyle(el).visibility') == 'visible'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.close()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(args.url + '/#home', wait_until='networkidle')
    page.locator('#home').evaluate('el=>scrollTo({top:el.offsetHeight-innerHeight,behavior:"instant"})')
    page.wait_for_timeout(700)
    for width, reduced in [(390, False), (1440, True)]:
        page.set_viewport_size({'width': width, 'height': 844})
        if reduced: page.emulate_media(reduced_motion='reduce')
        page.wait_for_timeout(700)
        assert page.locator('.travel-photo').count() == 0
        assert page.locator('.hero-window').evaluate('el=>Math.abs(el.offsetWidth-innerWidth)<2')
    page.close()
    assert not errors, errors
    browser.close()
    print('PASS mobile/static fallbacks, live breakpoint/reduced motion reset; no JavaScript errors.', flush=True)
