"""Intro title: staggered entrances, stable layout and bounded font loading."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/opening-title'); out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height, slow in [(320, 740, False), (390, 844, True), (1440, 900, False), (1280, 600, True)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.on('pageerror', lambda error: errors.append(str(error)))
        if slow:
            page.add_init_script('''{
              const load=document.fonts.load.bind(document.fonts);
              document.fonts.load=(...args)=>Promise.all([load(...args),new Promise(resolve=>setTimeout(resolve,1800))]).then(([fonts])=>fonts);
            }''')
        page.goto(args.url, wait_until='domcontentloaded')
        page.locator('.intro-title').wait_for()
        frames = page.evaluate('''async()=>{
          const frames=[],start=performance.now();
          while(performance.now()-start<2350){
            await new Promise(requestAnimationFrame);
            const title=document.querySelector('.intro-title');
            if(!title)break;
            const r=title.getBoundingClientRect();
            frames.push({state:title.dataset.fontState,top:r.top,height:r.height,
              family:getComputedStyle(title).fontFamily,
              lines:[...title.querySelectorAll('.intro-line-text')].map(el=>{
                const s=getComputedStyle(el),m=new DOMMatrix(s.transform);
                return {opacity:+s.opacity,x:m.m41,y:m.m42};
              })});
          }return frames;
        }''')
        assert frames and all(len(frame['lines']) == 2 for frame in frames)
        assert max(frame['top'] for frame in frames) - min(frame['top'] for frame in frames) < 1
        assert max(frame['height'] for frame in frames) - min(frame['height'] for frame in frames) < 1
        assert any(frame['lines'][0]['opacity'] > frame['lines'][1]['opacity'] + .1 for frame in frames), 'No stagger'
        assert any(frame['lines'][0]['x'] < -3 and frame['lines'][1]['x'] > 3 for frame in frames), 'No opposing entrance'
        assert all(abs(line['x']) < .5 and abs(line['y']) < .5 and line['opacity'] > .99 for line in frames[-1]['lines'])
        if slow:
            assert any(frame['state'] == 'pending' for frame in frames)
            assert frames[-1]['state'] == 'fallback'
            assert all('Georgia' in frame['family'] for frame in frames), 'Late font swapped after fallback lock'
        assert page.locator('.intro-title-line').evaluate_all('els=>els.every(el=>el.scrollWidth<=el.clientWidth+1)')
        page.screenshot(path=str(out / f'{width}-slow-{slow}.png'))
        page.locator('.opening-intro').wait_for(state='detached', timeout=6500)
        assert page.evaluate('document.body.style.overflow') == ''
        print(f'PASS {width}px/slow={slow}: staggered title, no layout shift, stable font and normal reveal.', flush=True)
        page.close()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto(args.url, wait_until='domcontentloaded')
    page.locator('.opening-intro').wait_for()
    page.emulate_media(reduced_motion='reduce')
    page.locator('.opening-intro').wait_for(state='detached', timeout=2000)
    assert page.evaluate('document.body.style.overflow') == ''
    assert not errors, errors
    browser.close()
    print('PASS live reduced motion exits the intro without locking scroll.', flush=True)
