"""Check occupations, readable profile headings, strong scroll motion and fallbacks."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5174')
args = parser.parse_args()
out = Path('artifacts/families-depth')
out.mkdir(parents=True, exist_ok=True)

def seek(page, fraction):
    page.locator('#couple').evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})', fraction)
    page.wait_for_timeout(650)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(320,740),(390,844),(768,1024),(1024,768),(1440,900),(1280,600)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror', lambda error: errors.append(str(error)))
        open_site(page, args.url, wait_until='networkidle')
        seek(page, .35)
        if width <= 700:
            page.wait_for_timeout(500)
        page.locator('img.family-subject').evaluate_all('(els)=>Promise.all(els.map(el=>el.decode()))')
        source=page.evaluate('async()=>(await import("/src/data/site.js")).wedding.bridePortrait.src')
        assert page.locator('.family-bride svg.family-subject').get_attribute('data-original-src')==source
        assert page.locator('.family-bride svg.family-subject>image').get_attribute('href')==source
        assert page.locator('.family-bride svg.family-subject mask image').count()==1
        assert page.locator('.family-portrait.has-cutout').count() == 2
        assert page.locator('.has-cutout .family-subject').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).filter.includes("url(")&&getComputedStyle(el).filter.includes("drop-shadow"))')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.locator('.family-parents').count()==0
        assert page.locator('.family-career').all_text_contents()==['Developer','Designer']
        assert all(name not in page.locator('#couple').inner_text() for name in ['Võ Minh Tuấn','Hoàng Thị Kiều Thu','Lương Văn Duyên','Dương Thị Hoa','Đồng Nai'])
        bounds = page.locator('.family-person').evaluate_all('''els=>els.map(el=>{
          const r=selector=>el.querySelector(selector).getBoundingClientRect();
            return {careerTop:r('.family-career').top, career:r('.family-career').bottom,
            nameBottom:r('.family-name h3').bottom, image:r('.family-portrait').top,
            nameFits:el.querySelector('h3').scrollWidth<=el.querySelector('h3').clientWidth+1,
            textSize:parseFloat(getComputedStyle(el.querySelector('.family-career')).fontSize)};
        })''')
        assert all(b['nameBottom'] < b['careerTop'] and b['career'] < b['image']+2 and b['nameFits'] and b['textSize'] >= (11 if width <= 700 else 12) for b in bounds), (width,bounds)
        name_y = page.locator('.family-name').first.bounding_box()['y']
        seek(page, .03)
        early = page.locator('.family-subject-frame').first.evaluate('(el)=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {x:m.m41,y:m.m42,scale:Math.hypot(m.a,m.b)}}')
        seek(page, .35)
        settled = page.locator('.family-subject-frame').first.evaluate('(el)=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {x:m.m41,y:m.m42,scale:Math.hypot(m.a,m.b)}}')
        if width > 700:
            assert abs(early['x']-settled['x'])>15 and early['y']-settled['y']>40 and settled['scale']-early['scale']>.12,(width,early,settled)
        else:
            assert early == settled, (width, early, settled)
            assert page.locator('#couple').get_attribute('data-scene-mode') == 'scroll'
        page.screenshot(path=str(out/f'{width}-profiles-settled.png'))
        seek(page, .85)
        assert abs(page.locator('.family-name').first.bounding_box()['y']-name_y)<1
        page.screenshot(path=str(out/f'{width}-families.png'))
        page.locator('.family-stage .hud-scroll').click()
        page.wait_for_function('()=>{const el=document.getElementById("event");return Math.abs(el.getBoundingClientRect().top-parseFloat(getComputedStyle(el).scrollMarginTop))<5}')
        print(f'PASS {width}x{height}: Developer/Designer, no parent details, full names, pronounced scroll entrance and schedule link.', flush=True)
        page.close()

    fallback = browser.new_page(viewport={'width':390,'height':844})
    fallback.on('pageerror', lambda error: errors.append(str(error)))
    fallback.route('**/images/portraits/*', lambda route: route.fulfill(status=404,body=''))
    open_site(fallback, args.url, wait_until='networkidle')
    seek(fallback,.4)
    fallback.wait_for_function('document.querySelectorAll(".family-portrait.has-original .family-subject").length===2')
    fallback.locator('.family-subject').evaluate_all('(els)=>Promise.all(els.map(el=>el.decode()))')
    fallback.screenshot(path=str(out/'fallback-originals.png'))
    assert fallback.locator('.family-portrait.has-cutout').count()==0
    assert fallback.locator('.family-subject').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).filter==="none")')
    reduced = browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    open_site(reduced, args.url,wait_until='networkidle')
    assert reduced.locator('.family-stage').evaluate('(el)=>getComputedStyle(el).position')=='relative'
    assert reduced.locator('.family-subject-frame').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).transform==="none")')
    assert reduced.locator('.family-career').all_text_contents()==['Developer','Designer']
    assert not errors, errors
    print('PASS cutout failure falls back to original portraits; reduced motion; no JavaScript errors.',flush=True)
    browser.close()
