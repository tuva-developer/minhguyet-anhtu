"""Distinct scene photography, continuous blending, and safe event fallbacks."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5174')
args = parser.parse_args()
out = Path('artifacts/scene-photos')
out.mkdir(parents=True, exist_ok=True)

def seek(page, selector, fraction):
    page.locator(selector).evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})', fraction)
    page.wait_for_timeout(800)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(1440,900),(390,844),(320,740)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror', lambda e: errors.append(str(e)))
        open_site(page, args.url, wait_until='networkidle')
        site = page.evaluate('async()=>(await import("/src/data/site.js")).wedding')
        ids = [site[key]['id'] for key in ['heroPhoto','couplePhoto','bridePortrait','groomPortrait']]
        ids += site['albumPreviewPhotoIds'] + [event['photo']['id'] for event in site['events']]
        assert len(ids) == len(set(ids)), ids
        assert len(site['photos']) == 40
        if width > 700:
            assert page.locator('.travel-cover-layer').get_attribute('data-photo-id') == site['heroPhoto']['id']
            seek(page, '#opening', .3)
            letter = page.locator('.travel-letter-layer')
            assert letter.get_attribute('data-photo-id') == site['couplePhoto']['id']
            assert float(letter.evaluate('(el)=>getComputedStyle(el).opacity')) > .999
            assert float(page.locator('.travel-album-layer').evaluate('(el)=>getComputedStyle(el).opacity')) < .001
            page.screenshot(path=str(out/f'{width}-letter.png'))
            # Check intermediate crossfade frames while moving in both directions.
            geometry = page.locator('#home').evaluate('(el)=>({top:el.offsetTop,travel:el.offsetHeight-innerHeight})')
            letter_top = page.locator('#opening').evaluate('el=>el.getBoundingClientRect().top+scrollY')
            start = geometry['top'] + geometry['travel']*.6
            values = []
            for amount in [0,.25,.5,.75,1,.75,.5,.25,0]:
                page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', start+(letter_top-start)*amount)
                page.wait_for_timeout(550)
                values.append(float(letter.evaluate('(el)=>getComputedStyle(el).opacity')))
            assert values[0] < .01 and values[4] > .99 and .2 < values[2] < .8, values
            assert all(a <= b+.01 for a,b in zip(values[:4],values[1:5])), values
            assert all(a+.01 >= b for a,b in zip(values[4:-1],values[5:])), values
            seek(page, '.reel-film', .079)
            lead = page.locator('.travel-album-layer')
            assert lead.get_attribute('data-photo-id') == site['albumLeadPhotoId']
            assert float(lead.evaluate('(el)=>getComputedStyle(el).opacity')) > .999
        else:
            assert page.locator('.travel-photo').count() == 0
            assert page.locator('.hero-window .cinema-subject').get_attribute('src') == site['heroPhoto']['src']
            seek(page, '#opening', 0)
            assert page.locator('.reading-image img').get_attribute('src') == site['couplePhoto']['src']
        for index, event in enumerate(site['events']):
            seek(page, '#event' if width > 700 else f'#event-{event["id"]}', (index+.5)/len(site['events']))
            panel = page.locator('.date-panel.is-active' if width > 700 else f'#event-{event["id"]}')
            assert panel.get_attribute('data-event-id') == event['id']
            assert panel.get_attribute('data-photo-id') == event['photo']['id']
            panel.locator('.date-backdrop img').evaluate('el=>el.decode()')
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            page.screenshot(path=str(out/f'{width}-{event["id"]}.png'))
            assert panel.locator('.date-actions button').count()==1
            panel.locator('.date-rsvp-link').click()
            assert page.get_by_role('dialog').is_visible()
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
        print(f'PASS {width}px: distinct scene photos, forward/reverse blending, three invitations and readable layout.',flush=True)
        page.close()

    page = browser.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
    page.on('pageerror', lambda e: errors.append(str(e)))
    for event in site['events']:
        page.route('**/'+event['photo']['src'].split('/')[-1].split('?')[0]+'*', lambda route:route.fulfill(status=404,body=''))
        # Match responsive versions as well as the full-size source.
        stem = event['photo']['src'].split('/')[-1].split('.webp')[0]
        page.route('**/'+stem+'*.webp*', lambda route:route.fulfill(status=404,body=''))
    open_site(page, args.url, wait_until='networkidle')
    page.locator('.date-panel').last.scroll_into_view_if_needed()
    page.wait_for_timeout(1000)
    fallback = page.locator('.date-panel').evaluate_all('(els)=>els.map(el=>el.dataset.photoId)')
    assert len(set(fallback)) == 3 and all(value and value not in ids for value in fallback), fallback
    assert page.locator('.date-backdrop img').evaluate_all('(els)=>els.every(el=>el.complete&&el.naturalWidth>0)')
    assert not errors, errors
    print('PASS broken invitation images: distinct unused fallback photos, reduced motion, no JavaScript errors.',flush=True)
    browser.close()
