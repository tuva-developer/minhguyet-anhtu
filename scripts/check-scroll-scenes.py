"""Scroll scene regressions for short/landscape viewports, with real hit testing."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/scroll-review')
out.mkdir(parents=True, exist_ok=True)


def seek(page, selector, fraction):
    page.locator(selector).evaluate('''(el,p)=>scrollTo({
      top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,
      behavior:'instant'
    })''', fraction)
    page.wait_for_timeout(650)


def box(locator):
    return locator.evaluate('''el=>{const r=el.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};}''')


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(844, 390), (932, 430), (1024, 500), (800, 320)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=True, is_mobile=True)
        page.on('pageerror', lambda error: errors.append(str(error)))
        open_site(page, args.url + '/#home', wait_until='networkidle')
        header = box(page.locator('.masthead'))['bottom']
        for selector in ['.hero-prelude', '.name-upper', '.name-lower', '.cinema-quick-date']:
            r = box(page.locator(selector))
            assert r['top'] > header and r['bottom'] < box(page.locator('.hero-stage .scene-hud'))['top'], (width, height, selector, r)
        seek(page, '#home', .9)
        r = box(page.locator('.hero-revelation'))
        assert r['top'] > header and r['bottom'] < box(page.locator('.hero-stage .scene-hud'))['top'], (width, height, r)
        seek(page, '#opening', .3)
        r = box(page.locator('.reading-content'))
        assert r['top'] > header and r['bottom'] < box(page.locator('.reading-stage .scene-hud'))['top'], (width, height, r)
        page.screenshot(path=str(out / f'{width}-letter.png'))
        # Short-screen grid geometry must preserve the camera handoff in both directions.
        for fraction in [.079, .081, .53, .98, .081, .079, .53]:
            seek(page, '.reel-film', fraction)
            if fraction < .1:
                ownership = page.evaluate('''()=>{
                  const camera=document.querySelector('.travel-photo'),tile=document.querySelector('.montage-tile');
                  const a=camera.getBoundingClientRect(),b=tile.getBoundingClientRect();
                  return {camera:+getComputedStyle(camera).opacity,tile:+getComputedStyle(tile).opacity,
                    gap:Math.max(...['x','y','width','height'].map(k=>Math.abs(a[k]-b[k])))};
                }''')
                assert min(ownership['camera'], ownership['tile']) < .01, ownership
                assert max(ownership['camera'], ownership['tile']) > .99, ownership
                assert ownership['gap'] < 2, ownership
        controls = box(page.locator('.reel-controls'))
        hud = box(page.locator('.montage-stage .scene-hud'))
        tiles = page.locator('.montage-tile').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.top,r.bottom]})')
        assert min(t[0] for t in tiles) > header, (width, height, tiles)
        assert max(t[1] for t in tiles) < controls['top'], (width, height, tiles, controls)
        assert controls['bottom'] <= hud['top'], (width, height, controls, hud)
        if height > 360:
            heading = box(page.locator('.reel-heading'))
            assert heading['top'] > header and heading['bottom'] <= min(t[0] for t in tiles), heading
        page.screenshot(path=str(out / f'{width}-album.png'))
        page.locator('.is-current .reel-photo-button').click()
        expect(page.get_by_role('dialog', name='Album ảnh cưới')).to_be_visible()
        page.keyboard.press('Escape')
        page.get_by_role('dialog').wait_for(state='detached')
        seek(page, '#couple', .5)
        for subject in page.locator('.family-subject-frame').all():
            assert box(subject)['height'] >= (80 if height <= 360 else 120), (width, height, box(subject))
        for name in page.locator('.family-name h3').all():
            r = box(name)
            assert r['top'] > header and r['left'] >= 0 and r['right'] <= width + 1, r
        page.screenshot(path=str(out / f'{width}-profiles.png'))
        seek(page, '.wave-film', .98)
        hud = box(page.locator('.wave-stage .scene-hud'))
        for selector in ['.wave-kicker', '.wave-type', '.wave-caption']:
            r = box(page.locator(selector))
            assert r['top'] > header and r['bottom'] < hud['top'], (width, height, selector, r, hud)
        for index in [0, 1, 2, 1, 0]:
            seek(page, '#event', (index + .5) / 3)
            panel = page.locator('.date-panel.is-active')
            assert panel.get_attribute('data-event-id') == page.locator('.date-panel').nth(index).get_attribute('data-event-id')
            number = box(panel.locator('.date-scene-number'))
            title = box(panel.locator('h2'))
            button = box(panel.locator('.date-rsvp-link'))
            hud = box(page.locator('.dates-stage > .scene-hud'))
            assert number['top'] > header and title['top'] >= number['bottom'] + 3, (number, title)
            assert button['bottom'] < hud['top'] - 3, (width, height, button, hud)
            assert box(panel.locator('.date-giant'))['bottom'] < hud['top'], (width, height)
            panel.locator('.date-rsvp-link').click(timeout=3000)
            expect(page.get_by_role('dialog', name='Xác nhận tham dự')).to_be_visible()
            page.keyboard.press('Escape')
            page.get_by_role('dialog').wait_for(state='detached')
        page.screenshot(path=str(out / f'{width}-invitation.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        print(f'PASS {width}x{height}: reversible camera handoff, readable grid/portraits/wave, all 3 RSVP clickable with no header/footer overlap.', flush=True)
        page.close()
    assert not errors, errors
    browser.close()
