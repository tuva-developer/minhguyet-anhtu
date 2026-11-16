"""Uncapped local wishes and mouse/touch/keyboard rearrangement."""
import argparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, total, reduced in [(390, 25, False), (1440, 101, False), (390, 1, True)]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, has_touch=width < 700,
            is_mobile=width < 700, reduced_motion='reduce' if reduced else 'no-preference')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('''if(!localStorage.getItem('wedding-messages'))localStorage.setItem('wedding-messages',
          JSON.stringify(Array.from({length:TOTAL},(_,i)=>({id:'note-'+i,name:'Guest '+i,
          text:'Wishing you many happy memories together.',date:'16/11/2026'}))))'''.replace('TOTAL', str(total)))
        page.goto(args.url + '/#wishes', wait_until='networkidle'); page.wait_for_timeout(700)
        note = page.locator('.pinned-note').first
        pin = note.locator('.note-pin')
        pin.scroll_into_view_if_needed(); page.wait_for_timeout(100)
        before = note.bounding_box(); handle = pin.bounding_box()
        x, y = handle['x'] + handle['width'] / 2, handle['y'] + handle['height'] / 2
        if width < 700:
            session = page.context.new_cdp_session(page)
            session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
            for i in range(1, 11):
                session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + i * 6, 'y': y + i * 3}]})
                page.wait_for_timeout(20)
            session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            # Whole-paper dragging on desktop, not just the pin.
            body = note.locator('.wish-read-button').bounding_box()
            x, y = body['x'] + body['width'] / 2, body['y'] + 38
            page.mouse.move(x, y); page.mouse.down()
            page.mouse.move(x + 65, y + 35, steps=15); page.mouse.up()
        page.wait_for_timeout(300)
        after = note.bounding_box()
        assert abs(after['x'] - before['x']) + abs(after['y'] - before['y']) > 20
        assert page.get_by_role('dialog').count() == 0, 'Dragging must not open a wish'
        pin.focus(); before_key = note.bounding_box()
        page.keyboard.press('ArrowUp'); page.wait_for_timeout(100)
        assert note.bounding_box()['y'] < before_key['y'] - 5
        page.keyboard.press('Home'); page.wait_for_timeout(100)
        assert abs(note.bounding_box()['x'] - before['x']) < 2
        note.locator('.wish-read-button').focus(); page.keyboard.press('Enter')
        page.get_by_role('dialog').wait_for(); page.keyboard.press('Escape')
        page.get_by_role('dialog').wait_for(state='detached')
        assert note.evaluate('el=>getComputedStyle(el,"::before").clipPath.startsWith("polygon(")')
        if width < 700:
            assert note.evaluate('el=>getComputedStyle(el).touchAction') == 'pan-y'
            assert pin.evaluate('el=>getComputedStyle(el).touchAction') == 'none'
        poses = page.locator('.pinned-note').evaluate_all('''els=>Object.fromEntries(els.map(el=>[el.dataset.messageId,
          ['--wish-left','--wish-top','--wish-width','--wish-angle'].map(key=>el.style.getPropertyValue(key))]))''')
        page.locator('#wish-name').fill('New guest')
        page.locator('#wish-message').fill('A happy day together.')
        page.locator('.letter-form button[type=submit]').click(); page.wait_for_timeout(700)
        stored = page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))')
        assert len(stored) == total + 1 and stored[-1]['id'] == f'note-{total - 1}'
        if total >= 3:
            after = page.locator('.pinned-note').evaluate_all('''els=>Object.fromEntries(els.map(el=>[el.dataset.messageId,
              ['--wish-left','--wish-top','--wish-width','--wish-angle'].map(key=>el.style.getPropertyValue(key))]))''')
            assert all(after[key] == pose for key, pose in poses.items()), 'Submission reshuffled existing notes'
        page.reload(wait_until='networkidle')
        assert page.locator('.pinned-note').count() == total + 1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.set_viewport_size({'width': 768, 'height': 900}); page.wait_for_timeout(250)
        assert page.locator('.pinned-note').evaluate_all('els=>els.every(el=>{const t=getComputedStyle(el).transform;return t==="none" || (Math.abs(new DOMMatrix(t).m41)<1&&Math.abs(new DOMMatrix(t).m42)<1)})')
        print(f'PASS {width}px/{total + 1} notes/reduced={reduced}: no pruning, drag, keyboard, read, reload and resize.', flush=True)
        page.close()
    assert not errors, errors
    browser.close()
