"""Regression: one visible cover photo while entering/leaving the album."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/soi-duyen')
out.mkdir(parents=True, exist_ok=True)

def state(page):
    return page.evaluate('''()=>{
      const camera=document.querySelector('.travel-photo');
      const tile=document.querySelector('.montage-tile');
      const a=camera.getBoundingClientRect(), b=tile.getBoundingClientRect();
      return {camera:+getComputedStyle(camera).opacity,tile:+getComputedStyle(tile).opacity,
        gap:Math.max(...['x','y','width','height'].map(k=>Math.abs(a[k]-b[k])))};
    }''')

def front_photo(page):
    # Hit testing normally omits inert cards and the decorative pointer-events:
    # none camera. Enable these only while inspecting the actual painted order.
    return page.evaluate('''()=>{
      const camera=document.querySelector('.travel-photo');
      const tile=document.querySelector('.montage-tile');
      const r=camera.getBoundingClientRect();
      const saved=camera.style.pointerEvents;
      const inert=[...document.querySelectorAll('.montage-tile[inert]')];
      camera.style.pointerEvents='auto';inert.forEach(el=>el.inert=false);
      const visible=el=>{for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(+s.opacity<.01||s.visibility==='hidden')return false;}return true;};
      const owners=[];
      for(const x of [.3,.5,.7])for(const y of [.3,.5,.7]){
        const hit=document.elementsFromPoint(r.x+r.width*x,r.y+r.height*y)
          .find(el=>(el.closest('.travel-photo')||el.closest('.montage-tile'))&&visible(el));
        owners.push(hit?.closest('.travel-photo')?'camera':hit?.closest('.montage-tile')?.dataset.photoId||'none');
      }
      camera.style.pointerEvents=saved;inert.forEach(el=>el.inert=true);
      return {owners,lead:tile.dataset.photoId};
    }''')

with sync_playwright() as p:
    browser = p.chromium.launch()
    # Mobile has independent scene photos; check-mobile-flow.py covers that path.
    for name, width, height in [('tablet',768,1024),('laptop',1024,768),('desktop',1440,900)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        open_site(page, args.url, wait_until='networkidle')
        album = page.locator('.reel-film').evaluate('(el)=>({top:el.getBoundingClientRect().top+scrollY,travel:el.offsetHeight-innerHeight})')
        start = album['top'] - height * .55
        end = album['top'] + album['travel'] * .2
        samples = 0
        # Sample actual animated frames in both directions, not only the pinned
        # endpoints: the duplicate previously appeared as the next stage entered.
        for points in [range(25), range(24,-1,-1)]:
            for i in points:
                y = start + (end-start)*i/24
                page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', y)
                page.wait_for_timeout(55)
                current = state(page)
                assert min(current['camera'],current['tile']) < .01, current
                assert max(current['camera'],current['tile']) > .99, current
                samples += 1
        for fraction, owner in [(.079, 'camera'),(.081, 'tile')]:
            page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', album['top']+album['travel']*fraction)
            page.wait_for_timeout(800)
            current=state(page)
            assert current[owner] > .99, current
            assert current['gap'] < 2, current
            painted=front_photo(page)
            assert all(top==('camera' if owner=='camera' else painted['lead']) for top in painted['owners']), painted
            page.screenshot(path=str(out/f'{name}-stack-{owner}.png'))
        # Reproduce the boundary in the user's screenshot.
        page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', album['top']-height*.24)
        page.wait_for_timeout(800)
        page.screenshot(path=str(out/f'{name}-handoff-fixed.png'))
        # The album photo must still open normally after the handoff.
        page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', album['top']+album['travel']*.12)
        page.wait_for_timeout(800)
        page.locator('.is-current .reel-photo-button').click()
        assert page.get_by_role('dialog',name='Album ảnh cưới').is_visible()
        page.keyboard.press('Escape')
        assert not errors, errors
        print(f'PASS {name}: {samples} forward/reverse samples, single photo owner, matching dock geometry, stable front layer, lightbox.', flush=True)
        page.close()
    browser.close()
