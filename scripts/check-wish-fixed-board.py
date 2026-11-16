"""Fixed-height pinboard: randomized new notes cover old notes without pruning."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/fixed-pinboard'); out.mkdir(parents=True, exist_ok=True)

def poses(page):
    return page.locator('.pinned-note').evaluate_all('''els=>Object.fromEntries(els.map(el=>[
      el.dataset.messageId,['--wish-left','--wish-top','--wish-width','--wish-angle'].map(key=>el.style.getPropertyValue(key))]))''')

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, count in [(320, 0), (390, 6), (768, 25), (1440, 101)]:
        page = browser.new_page(viewport={'width': width, 'height': 900})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('''if(!localStorage.getItem('wedding-messages'))localStorage.setItem('wedding-messages',
          JSON.stringify(Array.from({length:TOTAL},(_,i)=>({id:'stable-'+i,name:'Guest '+i,
          text:'Wishing you many happy memories together. '.repeat(3),date:'16/11/2026'}))))'''.replace('TOTAL', str(count)))
        page.goto(args.url + '/#wishes', wait_until='networkidle'); page.wait_for_timeout(700)
        height = page.locator('.wish-board').bounding_box()['height']
        assert page.locator('.wish-piles').bounding_box()['height'] == (320 if width <= 700 else 360)
        original = poses(page)
        new_positions = []
        for i in range(3):
            page.locator('#wish-name').fill(f'New guest {i}')
            page.locator('#wish-message').fill('A happy day together.')
            page.locator('.letter-form button[type=submit]').click(); page.wait_for_timeout(550)
            page.mouse.move(0, 0)
            assert page.locator('.wish-board').bounding_box()['height'] == height
            latest = page.locator('.pinned-note').first
            assert f'New guest {i}' in latest.inner_text()
            latest.scroll_into_view_if_needed()
            assert latest.evaluate('''el=>{
              const r=el.getBoundingClientRect();
              const hit=document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).find(node=>node.closest('.pinned-note'));
              return hit?.closest('.pinned-note')===el;
            }'''), 'New wish is not in front'
            new_positions.append(latest.evaluate('el=>[el.style.getPropertyValue("--wish-left"),el.style.getPropertyValue("--wish-top")]'))
        assert len(set(map(str, new_positions))) == 3
        after = poses(page)
        assert all(after[key] == pose for key, pose in original.items())
        assert len(page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))')) == count + 3
        box = page.locator('.wish-board').bounding_box()
        for card in page.locator('.pinned-note').all():
            r = card.bounding_box()
            assert r['x'] >= box['x'] and r['x'] + r['width'] <= box['x'] + box['width']
            assert r['y'] >= box['y'] and r['y'] + r['height'] <= box['y'] + box['height']
        page.locator('.wish-board').scroll_into_view_if_needed(); page.mouse.move(0, 0)
        page.screenshot(path=str(out / f'{width}-{count+3}.png'))
        page.reload(wait_until='networkidle')
        assert page.locator('.wish-board').bounding_box()['height'] == height
        assert page.locator('.pinned-note').count() == count + 3
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        print(f'PASS {width}px/{count+3} notes: fixed height, newest on top, random placement, old positions/data retained.', flush=True)
        page.close()
    assert not errors, errors
    browser.close()
