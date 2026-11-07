"""Opening animation: automatic reveal, skip, focus, slow images and deep links."""
import argparse
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5174')
args = parser.parse_args()
out = Path('artifacts/opening')
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(320,740),(390,844),(768,1024),(1440,900),(1280,600)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.url, wait_until='domcontentloaded')
        page.locator('.opening-intro').wait_for(state='visible')
        assert page.locator('.wedding-content').get_attribute('inert') is not None
        assert page.evaluate('document.body.style.overflow') == 'hidden'
        assert page.evaluate('document.querySelector("audio").paused')
        samples=page.evaluate('''async()=>{
            const result=[];
            const svg=document.querySelector('.intro-thread');
            const path=svg.querySelector('path');
            const cat=svg.querySelector('.intro-thread-cat');
            const started=performance.now();
            while(result.length<5 && performance.now()-started<2500){
                await new Promise(requestAnimationFrame);
                const ratio=parseFloat(getComputedStyle(path).strokeDasharray);
                if(ratio<.1 || ratio>.9 || !cat.querySelector('img').complete)continue;
                const p=path.getPointAtLength(path.getTotalLength()*ratio);
                const screen=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());
                const r=cat.getBoundingClientRect();
                result.push({ratio,gap:Math.hypot(r.x+r.width/2-screen.x,r.y+r.height/2-screen.y),
                    x:r.x,y:r.y,opacity:+getComputedStyle(cat).opacity,pointer:getComputedStyle(cat).pointerEvents});
            }
            return result;
        }''')
        assert len(samples)==5,(width,samples)
        assert all(sample['gap']<3 and sample['opacity']==1 and sample['pointer']=='none' for sample in samples),(width,samples)
        assert any(abs(sample['x']-samples[0]['x'])+abs(sample['y']-samples[0]['y'])>.5 for sample in samples[1:]),samples
        assert page.locator('.opening-intro').get_attribute('data-phase') == 'drawing'
        assert page.locator('.name-enter').evaluate_all('(els)=>els.length===2 && els.every(el=>+getComputedStyle(el).opacity===0)')
        snapshot = page.context.new_cdp_session(page).send('Page.captureScreenshot', {'format':'png'})
        (out/f'{width}-thread.png').write_bytes(base64.b64decode(snapshot['data']))
        assert page.locator('.intro-thread path').evaluate('(el)=>parseFloat(getComputedStyle(el).strokeDasharray)>0')
        camera = lambda: page.locator('.cover-camera').evaluate('(el)=>{const m=new DOMMatrix(getComputedStyle(el).transform);return Math.hypot(m.a,m.b)}')
        # Names and camera must already move while the curtain still covers
        # both edges. Observe all three in the same animation frame; separate
        # Python/browser calls can miss this short overlap under rendering load.
        overlap=page.evaluate('''async()=>{
            const started=performance.now();let first=null,last=null;
            while(performance.now()-started<6000){
                await new Promise(requestAnimationFrame);
                const intro=document.querySelector('.opening-intro');
                if(!intro)break;
                if(intro.dataset.phase!=='opening')continue;
                const m=new DOMMatrix(getComputedStyle(document.querySelector('.cover-camera')).transform);
                const scale=Math.hypot(m.a,m.b);first??=scale;
                const names=[...document.querySelectorAll('.name-enter')].map(el=>{
                    const s=getComputedStyle(el);return {x:new DOMMatrix(s.transform).m41,opacity:+s.opacity};
                });
                const edge=document.querySelector('.intro-paper-left').getBoundingClientRect().right;
                last={scale,first,names,edge};
                if(scale>first+.01&&names[0].x<0&&names[1].x>0&&names.every(n=>n.opacity>.5)&&edge>20)return {ok:true,...last};
            }
            return {ok:false,last};
        }''')
        assert overlap['ok'],(width,overlap)
        page.locator('.opening-intro').wait_for(state='detached', timeout=5000)
        assert camera() > 1.15, (width,camera())
        page.wait_for_function('''() => [...document.querySelectorAll('.name-enter')].every(el => {
            const s=getComputedStyle(el);return Math.abs(new DOMMatrix(s.transform).m41)<.5 && +s.opacity>.99;
        })''')
        assert page.locator('.cinema-names .love-mark').count()==0
        assert page.locator('.wedding-content').get_attribute('inert') is None
        assert page.evaluate('document.body.style.overflow') == ''
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.evaluate('scrollY<2')
        page.screenshot(path=str(out/f'{width}-cover.png'))
        page.locator('.cinema-quick-date').click()
        page.wait_for_function('Math.abs(document.getElementById("event").getBoundingClientRect().top)<5')
        assert page.locator('.opening-intro').count()==0
        print(f'PASS {width}px: thread drawing, paper reveal, interaction restored, no overflow or autoplay.',flush=True)
        page.close()

    for action in ['click','escape']:
        page=browser.new_page(viewport={'width':390,'height':844})
        page.goto(args.url,wait_until='domcontentloaded')
        page.locator('.opening-intro').wait_for(state='visible')
        page.keyboard.press('Tab')
        assert page.evaluate('document.activeElement.closest(".opening-intro")!==null')
        if action=='click':page.locator('.intro-bottom button').click()
        else:page.keyboard.press('Escape')
        page.locator('.opening-intro').wait_for(state='detached',timeout=1500)
        page.wait_for_timeout(50)
        assert page.evaluate('document.activeElement.classList.contains("cinema-quick-date")')
        assert page.evaluate('document.body.style.overflow')==''
        page.close()
    print('PASS immediate skip, Escape, keyboard focus and scroll cleanup.',flush=True)

    for url,reduced in [(args.url,True),(args.url+'/#event',False)]:
        page=browser.new_page(reduced_motion='reduce' if reduced else 'no-preference')
        page.goto(url,wait_until='networkidle')
        assert page.locator('.opening-intro').count()==0
        assert page.locator('.wedding-content').get_attribute('inert') is None
        page.close()
    print('PASS reduced motion and direct links skip opening.',flush=True)

    page=browser.new_page()
    pending=[]
    page.route('**/images/prewedding/*',lambda route:pending.append(route))
    page.goto(args.url,wait_until='domcontentloaded')
    page.locator('.opening-intro').wait_for(state='visible')
    page.locator('.opening-intro').wait_for(state='detached',timeout=6500)
    assert page.evaluate('document.body.style.overflow')==''
    for route in pending:route.abort()
    page.close()
    print('PASS slow cover cannot hold the opening indefinitely.',flush=True)
    assert not errors,errors
    browser.close()
