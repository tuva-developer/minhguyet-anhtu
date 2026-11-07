"""Visual typography checks: readable supporting type, fitting names and controls."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5173')
args=parser.parse_args()
out=Path('artifacts/typography');out.mkdir(parents=True,exist_ok=True)

def seek(page,selector,fraction):
    page.locator(selector).evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})',fraction)
    page.wait_for_timeout(650)

with sync_playwright() as p:
    browser=p.chromium.launch()
    errors=[]
    for width,height in [(320,740),(390,844),(768,1024),(1024,768),(1440,900),(1280,600)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror',lambda e:errors.append(str(e)))
        open_site(page, args.url,wait_until='networkidle')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        fonts=page.locator('.hero-prelude,.reading-content>p,.family-role,.family-career,.scene-tabs button,.hud-scroll,.wish-form>label,.wish-form input,.storage-note,.date-primary-time>small,.screen-button').evaluate_all('(els)=>els.map(el=>({name:el.className||el.tagName,size:parseFloat(getComputedStyle(el).fontSize)}))')
        assert all(font['size']>=10 for font in fonts),fonts
        assert page.locator('.wish-form input').first.evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')>=16
        assert page.locator('.name-upper').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')<=120
        for selector,fraction,name in [('#home',0,'cover'),('#opening',.4,'letter'),('.reel-film',.53,'album'),('#couple',.3,'families'),('#couple',.95,'families-end'),('.wave-film',.9,'wave'),('#event',.16,'date-1'),('#event',.5,'date-2'),('#wishes',0,'wishes'),('#closing',1,'closing')]:
            seek(page,selector,fraction)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,name)
            if width in [320,390,1440] or (height==600 and name in ['families','date-1']):page.screenshot(path=str(out/f'{width}x{height}-{name}.png'))
            if name=='cover':
                bounds=page.locator('h1>span').evaluate_all('(els)=>els.map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))')
                assert all(b['left']>=0 and b['right']<=width for b in bounds),(width,bounds)
            if name=='families':
                limit=page.locator('.profiles-stage .scene-hud').bounding_box()['y']
                for el in page.locator('.family-name').all():
                    r=el.bounding_box()
                    assert r['y']+r['height']<limit-4,(width,'family copy hits footer',r,limit)
                assert page.locator('.family-name h3').evaluate_all('(els)=>els.every(el=>el.scrollWidth<=el.clientWidth+1)'),width
            if name.startswith('date-'):
                limit=page.locator('.dates-stage .scene-hud').bounding_box()['y']
                r=page.locator('.date-panel.is-active .date-main-copy').bounding_box()
                assert r['y']+r['height']<limit-4,(width,'date copy hits footer',r,limit)
        print(f'PASS {width}x{height}: readable type scale, complete names, family/event controls fit; no horizontal overflow.',flush=True)
        if width in [320,1440]:
            page.locator('.header-rsvp' if width>900 else '.contents-toggle').click()
            page.wait_for_timeout(400)
            if width<900:
                page.get_by_role('button',name='Xác nhận tham dự',exact=False).click();page.wait_for_timeout(500)
            page.screenshot(path=str(out/f'{width}-rsvp.png'))
            assert page.get_by_label('TÊN CỦA BẠN',exact=True).evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')>=16
            page.keyboard.press('Escape')
        page.close()
    assert not errors,errors
    browser.close()
