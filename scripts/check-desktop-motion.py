"""Real wheel easing and pointer follow-through; preserve native interaction."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
args = parser.parse_args()
out = Path('artifacts/desktop-motion')
out.mkdir(parents=True, exist_ok=True)


def samples(page, frames=36):
    return page.evaluate('''async frames=>{
      const result=[];
      for(let i=0;i<frames;i++){
        await new Promise(requestAnimationFrame); result.push(scrollY);
      }
      return result;
    }''', frames)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    open_site(page, args.url + '/#home', wait_until='networkidle')
    page.mouse.move(100, 300)
    expect(page.locator('.pointer-aura')).to_have_css('opacity', '1')
    page.wait_for_timeout(250)
    page.mouse.move(900, 300)
    page.wait_for_timeout(35)
    center = lambda: page.locator('.pointer-aura').evaluate('el=>{const r=el.getBoundingClientRect();return r.x+r.width/2}')
    following = center()
    assert 100 < following < 890, following
    page.wait_for_timeout(650)
    assert abs(center() - 900) < 1
    assert page.locator('.pointer-aura').evaluate('el=>getComputedStyle(el).pointerEvents') == 'none'
    page.screenshot(path=str(out / 'pointer-follow.png'))
    print('PASS aura eases toward the pointer, settles accurately, does not intercept clicks.', flush=True)

    page.mouse.move(100, 300)
    start = page.evaluate('scrollY')
    page.mouse.wheel(0, 600)
    values = samples(page)
    assert min(values) >= start and max(values) <= start + 601, values
    assert min(values[:3]) < start + 560, values
    assert all(a <= b for a, b in zip(values, values[1:])), values
    assert abs(values[-1] - start - 600) < 1, values
    # Tiny trackpad deltas must settle too, rather than leave an endless RAF.
    start = page.evaluate('scrollY')
    page.mouse.wheel(0, 3)
    page.wait_for_timeout(250)
    assert abs(page.evaluate('scrollY') - start - 3) < 1
    page.wait_for_timeout(300)
    assert abs(page.evaluate('scrollY') - start - 3) < 1
    start = page.evaluate('scrollY')
    page.mouse.wheel(0, -250)
    reverse = samples(page)
    assert all(a >= b for a, b in zip(reverse, reverse[1:])), reverse
    assert abs(reverse[-1] - start + 250) < 1
    print('PASS wheel advances smoothly without overshoot, tiny deltas settle, reverse remains smooth.', flush=True)

    # Programmatic jumps and native keyboard navigation cancel the pending tail.
    page.mouse.wheel(0, 600)
    page.wait_for_timeout(35)
    target = page.locator('#couple').evaluate('el=>el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*.35')
    page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', target)
    page.wait_for_timeout(650)
    assert abs(page.evaluate('scrollY') - target) < 1
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(35)
    page.keyboard.press('Home')
    page.wait_for_function('scrollY<2')
    page.wait_for_timeout(650)
    assert page.evaluate('scrollY') < 2
    page.mouse.wheel(0, 600)
    page.wait_for_timeout(35)
    page.locator('.desktop-contents button').nth(3).click()
    page.wait_for_function('Math.abs(document.getElementById("event").getBoundingClientRect().top)<2')
    page.wait_for_timeout(650)
    assert abs(page.locator('#event').bounding_box()['y']) < 2
    print('PASS external anchors, Home key and menu interrupt momentum without snapping back.', flush=True)

    page.locator('.header-rsvp').click()
    expect(page.locator('.rsvp-dialog')).to_be_visible()
    page.locator('#rsvp-name').hover()
    expect(page.locator('.pointer-aura')).to_have_css('opacity', '0')
    assert page.locator('#rsvp-name').evaluate('el=>getComputedStyle(el).cursor') == 'text'
    page.set_viewport_size({'width': 1440, 'height': 650})
    dialog = page.locator('.rsvp-dialog')
    bounds = dialog.bounding_box()
    start = page.evaluate('scrollY')
    page.mouse.move(bounds['x'] + 70, bounds['y'] + 150)
    page.mouse.wheel(0, 500)
    page.wait_for_timeout(500)
    assert dialog.evaluate('el=>el.scrollTop') > 0
    assert page.evaluate('scrollY') == start
    page.keyboard.press('Escape')
    page.get_by_role('dialog').wait_for(state='detached')
    assert page.evaluate('document.body.style.overflow') != 'hidden'
    print('PASS native scrolling inside modal, body lock and text cursor.', flush=True)

    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.locator('.pointer-aura')).to_have_count(0)
    page.set_viewport_size({'width': 1440, 'height': 900})
    expect(page.locator('.pointer-aura')).to_have_count(1)
    page.evaluate('scrollTo({top:0,behavior:"instant"})')
    page.mouse.move(100, 300)
    page.mouse.wheel(0, 300)
    page.wait_for_timeout(650)
    assert abs(page.evaluate('scrollY') - 300) < 1, 'Listeners duplicated after breakpoint change'
    page.emulate_media(reduced_motion='reduce')
    expect(page.locator('.pointer-aura')).to_have_count(0)
    page.close()

    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    open_site(mobile, args.url + '/#home', wait_until='networkidle')
    assert mobile.locator('.pointer-aura').count() == 0
    assert mobile.locator('.hero-stage').evaluate('el=>getComputedStyle(el).position') == 'relative'
    mobile.close()
    assert not errors, errors
    print('PASS resize cleans listeners; reduced motion and mobile keep native interaction; no JavaScript errors.', flush=True)
    browser.close()
