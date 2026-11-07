"""The incoming stack and outgoing fullscreen use different, stable album tiles."""
import argparse
import copy
import json
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5173')
args=parser.parse_args()
out=Path('artifacts/soi-duyen');out.mkdir(parents=True,exist_ok=True)

def seek(page,p):
    page.locator('.reel-film').evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*p,behavior:"instant"})',p)
    page.wait_for_timeout(750)

def fixture_route(code):
    return lambda route:route.fulfill(content_type='application/javascript',body=code)

with sync_playwright() as p:
    browser=p.chromium.launch()
    errors=[]
    site=None
    # The mobile grid deliberately does not grow an outgoing fullscreen tile.
    for label,width,height in [('desktop',1440,900)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror',lambda e:errors.append(str(e)))
        open_site(page, args.url,wait_until='networkidle')
        site=page.evaluate('async()=>JSON.parse(JSON.stringify((await import("/src/data/site.js")).wedding))')
        incoming=site['albumLeadPhotoId']
        outgoing=site['albumFinalPhotoId']
        assert incoming!=outgoing
        final=page.locator(f'.montage-tile[data-photo-id="{outgoing}"]')
        handle=final.element_handle()
        for progress,expected,name in [(.12,incoming,'entry'),(.519,incoming,None),(.521,outgoing,None),(.85,outgoing,'growing'),(.99,outgoing,'exit')]:
            seek(page,progress)
            expect(page.locator('.montage-stage')).to_have_attribute('data-primary-photo',expected)
            expect(page.locator('.montage-tile.is-current')).to_have_attribute('data-photo-id',expected)
            assert final.count()==1
            assert handle.evaluate('(el,id)=>el===[...document.querySelectorAll(".montage-tile")].find(node=>node.dataset.photoId===id)',outgoing)
            if name:page.screenshot(path=str(out/f'{label}-primary-{name}.png'))
        rect=final.bounding_box()
        assert rect['width']>=width-1 and rect['height']>=height-1,rect
        assert float(page.locator('.montage-tile').first.evaluate('(el)=>getComputedStyle(el).opacity'))<.01
        final.locator('button').click()
        index=next(i for i,photo in enumerate(site['photos']) if photo['id']==outgoing)
        expect(page.locator('.photo-caption')).to_contain_text(f'{index+1} / {len(site["photos"])}')
        page.keyboard.press('Escape');page.wait_for_timeout(400)
        page.locator('.montage-view-grid').click();page.wait_for_timeout(1500)
        expect(page.locator('.montage-stage')).to_have_attribute('data-phase','grid')
        seek(page,.12)
        expect(page.locator('.montage-stage')).to_have_attribute('data-primary-photo',incoming)
        print(f'PASS {label}: incoming -> different outgoing photo; same DOM tile grows, correct lightbox, grid return, reverse scroll.',flush=True)
        page.close()

    for name,count,preferred in [('empty',0,'missing'),('single',1,'missing'),('two',2,'missing'),('preferred-outside-preview',13,site['photos'][-1]['id']),('preferred-missing',13,'missing')]:
        fixture=copy.deepcopy(site)
        fixture['photos']=fixture['photos'][:count]
        fixture['albumFinalPhotoId']=preferred
        fixture['musicUrl']=''
        page=browser.new_page(viewport={'width':1440,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        code='export const wedding='+json.dumps(fixture,ensure_ascii=False)+';'
        page.route('**/src/data/site.js*',fixture_route(code))
        open_site(page, args.url,wait_until='networkidle')
        if not count:assert page.locator('#story').count()==0
        else:
            incoming=next((photo for photo in fixture['photos'] if photo['id']==fixture['albumLeadPhotoId']),fixture['photos'][0])
            expected=preferred if any(photo['id']==preferred and photo['src']!=incoming['src'] for photo in fixture['photos']) else next((photo['id'] for photo in fixture['photos'] if photo['src']!=incoming['src']),incoming['id'])
            seek(page,.99)
            expect(page.locator('.montage-stage')).to_have_attribute('data-primary-photo',expected)
            ids=page.locator('.montage-tile').evaluate_all('(els)=>els.map(el=>el.dataset.photoId)')
            assert len(ids)==len(set(ids))==min(count,6),ids
            assert page.locator('.is-current').bounding_box()['width']>=1439
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        print(f'PASS {name}: valid outgoing photo and no duplicated tiles.',flush=True)
        page.close()
    assert not errors,errors
    browser.close()
