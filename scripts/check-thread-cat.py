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
    for width,height in [(1440,900),(1024,768),(390,844),(320,740)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror',lambda e:errors.append(str(e)))
        open_site(page, args.url,wait_until='networkidle')
        page.locator('.thread-cat img').evaluate('(el)=>el.decode()')
        page.wait_for_timeout(200)
        geometry = page.evaluate('''async()=>{
          const {createThreadTrack,sampleThreadTrack}=await import('/src/lib/threadTrack.js');
          const path=document.querySelector('.red-thread path:last-child');
          const track=createThreadTrack(path);let error=0;
          for(let i=0;i<=256;i++){
            const length=track.total*i/256,a=sampleThreadTrack(track,length),b=path.getPointAtLength(length);
            error=Math.max(error,Math.hypot(a.x-b.x,a.y-b.y));
          }
          return {backwards:track.points.some((p,i)=>i&&p.y<track.points[i-1].y),error};
        }''')
        assert not geometry['backwards'] and geometry['error']<1,geometry
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
        # Small spring tails must not mirror the cat back and forth at rest.
        page.wait_for_timeout(300)
        jitter = page.evaluate('''async()=>{
          const base=scrollY,signs=[];
          for(let i=0;i<28;i++){
            scrollTo({top:base+(i%2),behavior:'instant'});
            await new Promise(requestAnimationFrame);
            const m=new DOMMatrix(getComputedStyle(document.querySelector('.thread-cat-body')).transform);
            signs.push(Math.sign(m.a*m.d-m.b*m.c));
          }
          return signs;
        }''')
        assert len(set(jitter))==1 and jitter[0]!=0,jitter
        # The renderer must use cached geometry even while crossing short scenes.
        perf = page.evaluate('''async()=>{
          const path=document.querySelector('.red-thread path:last-child');
          const original=path.getPointAtLength;
          let calls=0;
          path.getPointAtLength=function(...args){calls++;return original.apply(this,args);};
          const scene=document.getElementById('couple');
          const start=scene.getBoundingClientRect().top+scrollY-innerHeight*.6;
          let previous,velocity=0;
          try {
            for(let i=0;i<80;i++){
              scrollTo({top:start+i*12,behavior:'instant'});
              const time=await new Promise(requestAnimationFrame);
              const m=new DOMMatrix(getComputedStyle(document.querySelector('.thread-cat')).transform);
              const angle=Math.atan2(m.b,m.a)*180/Math.PI;
              if(previous)velocity=Math.max(velocity,Math.abs(angle-previous.angle)/Math.max(1,time-previous.time));
              previous={time,angle};
            }
          } finally {path.getPointAtLength=original;}
          return {calls,velocity};
        }''')
        assert perf['calls']==0,perf
        assert perf['velocity']<.6,perf
        if width > 700:
            # A held scene still scrolls the document. Cat and thread must share
            # viewport coordinates, not recoil against native scrolling.
            for selector, fraction in [('#home',.4),('#opening',.4),('.reel-film',.4),('#couple',.4),('.wave-film',.4),('#event',.15),('#event',.5),('#event',.83)]:
                seek(page,selector,fraction)
                assert page.locator(selector+' > .film-stage').evaluate('el=>getComputedStyle(el).position')=='sticky'
                page.mouse.move(width*.4,height*.45)
                for delta in [120,-120]:
                    page.mouse.wheel(0,delta)
                    live = page.evaluate('''async()=>{
                      const result=[];
                      for(let i=0;i<36;i++){
                        await new Promise(requestAnimationFrame);
                        const r=document.querySelector('.thread-cat').getBoundingClientRect();
                        const path=document.querySelector('.red-thread path:last-child');
                        const length=parseFloat(getComputedStyle(path).strokeDasharray)*path.getTotalLength();
                        const point=path.getPointAtLength(length);
                        const screen=new DOMPoint(point.x,point.y).matrixTransform(path.getScreenCTM());
                        result.push({y:r.y+r.height/2,gap:Math.abs(r.y+r.height/2-screen.y)});
                      }
                      return result;
                    }''')
                    assert max(row['y'] for row in live)-min(row['y'] for row in live)<2,(width,selector,delta,live)
                    assert max(row['gap'] for row in live)<2,(width,selector,delta,live)
            print(f'PASS {width}px: stable viewport anchor during live forward/reverse wheel input in every pinned scene.',flush=True)
        assert page.locator('.thread-cat').evaluate('(el)=>getComputedStyle(el).pointerEvents')=='none'
        print(f'PASS {width}px: monotonic path, subpixel cache, no per-frame SVG queries, smooth turns, no jitter flips, stays on thread/in bounds.',flush=True)
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
