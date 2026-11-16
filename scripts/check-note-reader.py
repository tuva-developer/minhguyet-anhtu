"""Content-sized pinned notes and the responsive, keyboard-accessible letter reader."""
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('artifacts/note-reader')
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(320, 740), (390, 844), (768, 900), (1440, 900), (844, 390)]:
        page = browser.new_page(viewport={'width': width, 'height': height},
                                reduced_motion='reduce' if height == 390 else 'no-preference')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('''localStorage.setItem('wedding-messages', JSON.stringify([
          {id:'short',name:'A friend',text:'Congratulations!',date:'16/11/2026'},
          {id:'medium',name:'Our friends',text:'Wishing you many happy memories together. '.repeat(6),date:'16/11/2026'},
          {id:'long',name:'A very long sender name '.repeat(3),text:('A full letter with many happy memories.\\n').repeat(80),date:'16/11/2026'}
        ]));''')
        page.goto('http://127.0.0.1:5173/#wishes', wait_until='networkidle')
        page.wait_for_timeout(700)
        sizes = page.locator('.pinned-note').evaluate_all('els=>els.map(el=>el.offsetHeight)')
        assert sizes[0] < sizes[1] <= sizes[2], sizes
        assert sizes[2] <= (280 if width <= 700 else 320)
        for note in page.locator('.pinned-note').all():
            read = note.locator('.wish-read-button')
            read.focus(); page.keyboard.press('Enter')
            dialog = page.get_by_role('dialog')
            dialog.wait_for(); page.wait_for_timeout(400)
            assert dialog.locator('.full-wish').inner_text() == note.locator('p').inner_text()
            assert dialog.get_attribute('aria-describedby')
            bounds = dialog.bounding_box()
            assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width + 1, bounds
            assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= height + 1, bounds
            close = dialog.locator('.modal-close')
            assert close.evaluate('el=>el===document.activeElement')
            page.keyboard.press('Shift+Tab')
            assert dialog.locator('.note-letter-footer button').evaluate('el=>el===document.activeElement')
            page.keyboard.press('Tab')
            assert close.evaluate('el=>el===document.activeElement')
            if note.get_attribute('data-message-id') == 'long':
                body = dialog.locator('.note-letter-body')
                assert body.evaluate('el=>el.scrollHeight>el.clientHeight')
                page.screenshot(path=str(out / f'{width}-long.png'))
                dialog.locator('.note-letter-footer button').click()
            else:
                page.screenshot(path=str(out / f'{width}-{note.get_attribute("data-message-id")}.png'))
                page.keyboard.press('Escape')
            dialog.wait_for(state='detached')
            assert read.evaluate('el=>el===document.activeElement')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        print(f'PASS {width}x{height}: content heights {sizes}; complete text, bounded dialog, scrolling, focus and close.', flush=True)
        page.close()
    assert not errors, errors
    browser.close()
