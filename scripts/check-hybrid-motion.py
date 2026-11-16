"""Timed entrances finish without more scrolling; cinematic scroll clocks remain reversible."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/hybrid-motion'); out.mkdir(parents=True, exist_ok=True)


def park(page, selector, fraction):
    page.locator(selector).evaluate('''(el,p)=>scrollTo({
      top:el.getBoundingClientRect().top+scrollY-innerHeight*p,behavior:'instant'
    })''', fraction)


def pose(page, selector):
    return page.locator(selector).first.evaluate('''el=>{
      const s=getComputedStyle(el);
      return [s.transform,s.opacity,s.strokeDasharray];
    }''')


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(390, 844), (1440, 900)]:
        groups = [('.reading-content', '.reading-rule'), ('.family-spread', '.family-subject-frame'), ('.wave-type', '.wave-row')]
        if width <= 700:
            groups = [('.reading-image', '.reading-image'), groups[0], ('.montage-space', '.mobile-album-tile'), *groups[1:]]
        for target, artwork in groups:
            page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width <= 700, is_mobile=width <= 700)
            page.on('pageerror', lambda error: errors.append(str(error)))
            open_site(page, args.url + '/#home', wait_until='networkidle')
            park(page, target, .9)
            page.wait_for_timeout(150)
            expect(page.locator(target)).to_have_attribute('data-enter-state', 'pending')
            park(page, target, .55)
            expect(page.locator(target)).to_have_attribute('data-enter-state', 'running')
            page.wait_for_timeout(80)
            early = pose(page, artwork)
            scroll = page.evaluate('scrollY')
            page.wait_for_timeout(1300)
            expect(page.locator(target)).to_have_attribute('data-enter-state', 'complete')
            final = pose(page, artwork)
            assert early != final, (width, target, early, final)
            assert abs(page.evaluate('scrollY') - scroll) < 1
            park(page, target, .9); page.wait_for_timeout(200)
            park(page, target, .55); page.wait_for_timeout(200)
            assert pose(page, artwork) == final, (width, target, 'entry replayed on reverse')
            for resized in [700, 701, width]:
                page.set_viewport_size({'width': resized, 'height': height})
                page.wait_for_timeout(80)
                expect(page.locator(target)).to_have_attribute('data-enter-state', 'complete')
            print(f'PASS {width}px {target}: starts at viewport entry, finishes while paused, stable on reverse/resize.', flush=True)
            page.close()
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.on('pageerror', lambda error: errors.append(str(error)))
        open_site(page, args.url + '/#home', wait_until='networkidle')
        page.locator('#closing').evaluate('el=>el.scrollIntoView({behavior:"instant"})')
        page.wait_for_timeout(1400)
        expect(page.locator('.closing-rings')).to_have_attribute('data-enter-state', 'complete')
        assert page.locator('.closing-rings path').evaluate_all('els=>els.every(el=>parseFloat(getComputedStyle(el).strokeDasharray)>.99)')
        for target in ['.reading-content', '.family-spread', '.wave-type']:
            expect(page.locator(target)).to_have_attribute('data-enter-state', 'complete')
        assert page.evaluate('scrollY < document.documentElement.scrollHeight-innerHeight-20')
        page.screenshot(path=str(out / f'{width}-thanks.png'))
        for scene in ['#opening', '.reel-film', '#couple', '.wave-film', '#event']:
            page.locator(scene).evaluate('el=>el.scrollIntoView({behavior:"instant"})')
            page.wait_for_timeout(1400)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if scene in ['#couple', '.wave-film']:
                assert page.locator(scene + ' .scene-progress').count() == 0
                if width > 700:
                    assert abs(page.locator(scene).bounding_box()['height']-height) < 1
            page.screenshot(path=str(out / f'{width}-{scene.replace("#", "").replace(".", "")}.png'))
        page.close()
    # Future entrances stay gated behind the opening; reduced motion is immediately readable.
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.url, wait_until='domcontentloaded')
    expect(page.locator('.opening-intro')).to_be_visible()
    page.wait_for_timeout(300)
    for target in ['.reading-content', '.montage-space', '.family-spread', '.wave-type', '.closing-rings']:
        expect(page.locator(target)).to_have_attribute('data-enter-state', 'pending')
    assert page.locator('.opening-intro .thread-cat').count() == 0
    page.get_by_role('button', name='Bỏ qua', exact=False).click()
    page.locator('.opening-intro').wait_for(state='detached')
    page.emulate_media(reduced_motion='reduce')
    for target in ['.reading-content', '.montage-space', '.family-spread', '.wave-type', '.closing-rings']:
        expect(page.locator(target)).to_have_attribute('data-enter-state', 'complete')
    assert page.locator('.thread-cat,.red-thread').count() == 0
    assert page.locator('.family-subject-frame').evaluate_all('els=>els.every(el=>getComputedStyle(el).transform==="none")')
    assert not errors, errors
    browser.close()
    print('PASS fast skips, rings finish before the page bottom, fullscreen layout, intro gating and live reduced motion; no JavaScript errors.', flush=True)
