"""Overlapping wish columns: all cards accessible, compact layout, persistence."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/wish-columns'); out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, count, reduced in [(320, 20, False), (390, 6, False), (768, 6, False), (1440, 20, False), (1440, 1, False), (390, 0, False), (390, 6, True)]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, has_touch=width <= 700,
            is_mobile=width <= 700, reduced_motion='reduce' if reduced else 'no-preference')
        page.on('pageerror', lambda error: errors.append(str(error)))
        rows = [{'id': f'note-{i}', 'name': f'Guest {i}', 'text': 'Chúc hai bạn luôn hạnh phúc và cùng nhau giữ thật nhiều kỷ niệm đẹp. ' * 4, 'date': '16/11/2026'} for i in range(count)]
        page.add_init_script('if(!localStorage.getItem("wedding-messages"))localStorage.setItem("wedding-messages",' + json.dumps(json.dumps(rows, ensure_ascii=False)) + ')')
        page.goto(args.url + '/#wishes', wait_until='networkidle'); page.wait_for_timeout(800)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.locator('.pinned-note').count() == count
        assert page.locator('.note-pin').count() == count
        assert page.locator('.note-corner').count() == 0
        assert page.locator('.wish-deck-nav').count() == 0
        assert page.locator('.envelope,.board-handwriting,.board-hint').count() == 0
        assert page.locator('.wish-board').evaluate('el=>parseFloat(getComputedStyle(el).borderTopWidth)') >= 1
        if count:
            piles = page.locator('.wish-piles')
            assert piles.evaluate('el=>getComputedStyle(el).overflowY') == 'visible'
            assert piles.bounding_box()['height'] < 900
            # Every name is exposed at the top of its card and is a real button.
            for button in page.locator('.pinned-note .wish-read-button').all():
                button.focus()
                card = button.bounding_box()
                name = button.locator('.note-from').bounding_box()
                assert name['y'] >= card['y'] - 4
                page.keyboard.press('Enter')
                expect(page.locator('.full-wish')).to_have_text(rows[0]['text'])
                page.keyboard.press('Escape'); page.get_by_role('dialog').wait_for(state='detached')
            page.mouse.move(0, 0)
            # Click the exposed name of a middle card on touch/desktop alike.
            button = page.locator('.pinned-note .wish-read-button').nth(count // 2)
            button.focus()
            name = button.locator('.note-from')
            name.scroll_into_view_if_needed()
            name.click()
            expect(page.locator('.full-wish')).to_be_visible()
            page.keyboard.press('Escape'); page.get_by_role('dialog').wait_for(state='detached')
            piles.scroll_into_view_if_needed(); page.mouse.move(0, 0)
        else:
            expect(page.locator('.empty-notes')).to_be_visible()
        page.screenshot(path=str(out / f'{width}-{count}-{reduced}.png'))
        page.locator('#wish-name').fill('New guest')
        page.locator('#wish-message').fill('A happy day together.')
        page.locator('.letter-form button[type=submit]').click(); page.wait_for_timeout(700)
        assert 'New guest' in page.locator('.pinned-note').first.inner_text()
        expected = count + 1
        assert page.locator('.pinned-note').count() == expected
        assert page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))[0].name') == 'New guest'
        page.reload(wait_until='networkidle')
        assert page.locator('.pinned-note').count() == expected
        assert 'New guest' in page.locator('.pinned-note').first.inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        print(f'PASS {width}px/{count} notes, reduced={reduced}: overlapping columns, all cards readable, submit and persistence.', flush=True)
        page.close()
    assert not errors, errors
    browser.close()
