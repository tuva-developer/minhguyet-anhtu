"""Check that the cat follows the drawn thread, including reverse scroll."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5173')
args=parser.parse_args()
out=Path('artifacts/soi-duyen');out.mkdir(parents=True,exist_ok=True)

def seek(page,selector,fraction):
    page.locator(selector).evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})',fraction)
    page.wait_for_timeout(750)

with sync_playwright() as p:
    browser=p.chromium.launch()
    errors=[]
    for width,height in [(1440,900),(390,844),(320,740)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror',lambda e:errors.append(str(e)))
        open_site(page, args.url,wait_until='networkidle')
        page.locator('.thread-cat img').evaluate('(el)=>el.decode()')
        page.wait_for_timeout(200)
        for selector,fraction,label in [('#home',0,'cover'),('#opening',.4,'letter'),('.reel-film',.079,'before-dock'),('.reel-film',.081,'after-dock'),('.reel-film',.53,'grid'),('#couple',.3,'families'),('.wave-film',.6,'wave'),('#event',.5,'date'),('#wishes',0,'wishes'),('#closing',1,'rings')]:
            seek(page,selector,fraction)
            metrics=page.evaluate('''()=>{const cat=document.querySelector('.thread-cat');const r=cat.getBoundingClientRect();const path=document.querySelector('.red-thread path:last-child');const ratio=parseFloat(getComputedStyle(path).strokeDasharray);const point=path.getPointAtLength(path.getTotalLength()*ratio);const p=new DOMPoint(point.x,point.y).matrixTransform(path.getScreenCTM());return {gap:Math.abs(r.y+r.height/2-p.y),left:r.left,right:r.right,top:r.top,bottom:r.bottom,opacity:+getComputedStyle(cat).opacity,overflow:document.documentElement.scrollWidth>innerWidth};}''')
            assert metrics['gap']<2,metrics
            assert metrics['left']>=0 and metrics['right']<=width+1,metrics
            assert metrics['opacity']==1 and not metrics['overflow'],metrics
            if label!='rings':assert metrics['bottom']>0 and metrics['top']<height,metrics
            if width!=320 and label in ['letter','after-dock','rings']:page.screenshot(path=str(out/f'cat-{width}-{label}.png'))
        seek(page,'#opening',.4)
        page.evaluate('scrollBy({top:100,behavior:"instant"})');page.wait_for_timeout(650)
        determinant=lambda:page.locator('.thread-cat-body').evaluate('(el)=>{const m=new DOMMatrix(getComputedStyle(el).transform);return m.a*m.d-m.b*m.c;}')
        down=determinant()
        page.evaluate('scrollBy({top:-100,behavior:"instant"})');page.wait_for_timeout(650)
        assert down*determinant()<0,'Cat should turn around when scrolling back'
        assert page.locator('.thread-cat').evaluate('(el)=>getComputedStyle(el).pointerEvents')=='none'
        print(f'PASS {width}px: cat tracks the visible line, turns on reverse, stays in bounds, does not intercept clicks.',flush=True)
        page.close()
    reduced=browser.new_page(reduced_motion='reduce')
    reduced.on('pageerror',lambda e:errors.append(str(e)))
    open_site(reduced, args.url,wait_until='networkidle')
    assert reduced.locator('.thread-cat,.red-thread').count()==0
    failed=browser.new_page()
    failed.on('pageerror',lambda e:errors.append(str(e)))
    failed.route('**/images/banhbao/**',lambda route:route.fulfill(status=404,body='missing'))
    open_site(failed, args.url,wait_until='networkidle')
    assert failed.locator('.thread-cat').count()==0
    assert failed.locator('.red-thread').count()==1
    assert not errors,errors
    print('PASS reduced motion and missing cat image; no JavaScript errors.',flush=True)
    browser.close()
