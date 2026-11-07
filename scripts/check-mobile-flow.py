"""Mobile scroll scrubbing, natural flow, interactions and breakpoint regressions.

Run against Vite: python scripts/check-mobile-flow.py --url http://127.0.0.1:5173
Screenshots are written to ignored artifacts/mobile-flow/.
"""
import argparse
import copy
import json
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--extra-only', action='store_true', help='Run fast-skip, resize, fixture and reduced-motion checks only.')
parser.add_argument('--width', type=int, choices=[320, 390, 430], help='Run the main responsive flow at one width.')
args = parser.parse_args()
out = Path('artifacts/mobile-flow')
out.mkdir(parents=True, exist_ok=True)


def jump(page, selector, wait=1300):
    page.locator(selector).evaluate('(el)=>el.scrollIntoView({behavior:"instant",block:"start"})')
    page.wait_for_timeout(wait)


def scrub(page, selector, fraction):
    page.locator(selector).evaluate('(el,p)=>scrollTo({top:el.getBoundingClientRect().top+scrollY-innerHeight*.9+innerHeight*.75*p,behavior:"instant"})', fraction)
    page.wait_for_timeout(700)


def motion_state(page, selector):
    return page.locator(selector).first.evaluate('el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return [m.a,m.b,m.c,m.d,m.m41,m.m42]}')


def healthy(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Horizontal overflow'
    assert page.locator('img').evaluate_all('(els)=>els.every(el=>!el.complete||el.naturalWidth>0)'), 'Broken image'


def fixture_route(site):
    code = 'export const wedding = ' + json.dumps(site, ensure_ascii=False) + ';'
    return lambda route: route.fulfill(content_type='application/javascript', body=code)


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []

    def mobile(width=390, height=844, **options):
        page = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, **options)
        page.on('pageerror', lambda error: errors.append(str(error)))
        return page

    for width, height in ([] if args.extra_only else [(320, 740), (390, 844), (430, 932)]):
        if args.width and width != args.width:
            continue
        page = mobile(width, height)
        page.goto(args.url, wait_until='domcontentloaded')
        page.locator('.opening-intro').wait_for(state='visible')
        if page.locator('.opening-intro').count():
            expect(page.locator('#opening')).to_have_attribute('data-scene-mode', 'scroll')
            assert page.locator('.reading-content h2 > span').first.evaluate('el=>+getComputedStyle(el).opacity') <= .18
            page.get_by_role('button', name='Bỏ qua').click()
        page.locator('.opening-intro').wait_for(state='detached')
        page.wait_for_timeout(500)
        site = page.evaluate('async()=>JSON.parse(JSON.stringify((await import("/src/data/site.js")).wedding))')
        assert page.locator('.travel-photo').count() == 0
        assert page.locator('.scene-progress').count() == 0
        assert page.evaluate('document.querySelector("audio").paused')
        assert page.locator('.hero-revelation').count() == 0
        healthy(page)
        page.screenshot(path=str(out / f'{width}-home.png'))

        # Scroll is the clock: reverse restores the pose; pausing does not autoplay.
        for selector, name in [('#opening', 'letter'), ('.reel-film', 'album'), ('#couple', 'profiles'), ('.wave-film', 'wave')]:
            child = {'letter': '.reading-rule', 'album': '.mobile-album-tile', 'profiles': '.family-subject-frame', 'wave': '.wave-row'}[name]
            scrub(page, selector, .2)
            early = motion_state(page, selector + ' ' + child)
            scrub(page, selector, .8)
            later = motion_state(page, selector + ' ' + child)
            assert max(abs(a-b) for a,b in zip(early,later)) > .05, (width,name,early,later)
            scroll = page.evaluate('scrollY')
            page.wait_for_timeout(400)
            paused = motion_state(page, selector + ' ' + child)
            assert abs(page.evaluate('scrollY') - scroll) < 1
            assert max(abs(a-b) for a,b in zip(paused,later)) < .5, (width,name,'autoplay while paused')
            scrub(page, selector, .2)
            reverse = motion_state(page, selector + ' ' + child)
            assert max(abs(a-b) for a,b in zip(early,reverse)) < 1.5, (width,name,early,reverse)
            jump(page, selector, 700)
            expect(page.locator(selector)).to_have_attribute('data-scene-mode', 'scroll')
            stage = page.locator(selector + ' > .film-stage')
            assert stage.evaluate('(el)=>getComputedStyle(el).position') == 'relative'
            scene_height = page.locator(selector).bounding_box()['height']
            minimum = 350 if name in ['letter', 'profiles', 'wave'] else height - 1
            assert minimum <= scene_height < height * 1.55, (width, name, scene_height)
            healthy(page)
            page.screenshot(path=str(out / f'{width}-{name}.png'))

        assert page.locator('.family-name h3').evaluate_all('(els)=>els.every(el=>el.scrollWidth<=el.clientWidth+1)')
        assert page.locator('.family-person').evaluate_all('''els=>els.every(el=>{
          const name=el.querySelector('h3').getBoundingClientRect();
          const badge=el.querySelector('.family-career').getBoundingClientRect();
          const portrait=el.querySelector('.family-portrait').getBoundingClientRect();
          return name.bottom<badge.top && badge.bottom<portrait.top;
        })''')
        assert page.locator('.family-career').all_text_contents() == ['Developer', 'Designer']
        assert page.locator('.family-bride svg.family-subject').get_attribute('data-original-src') == site['bridePortrait']['src']
        assert page.locator('.family-stage .scene-hud > div:first-child > span:last-child').is_visible()

        jump(page, '.reel-film')  # Fully in view, the scrubbed fan reaches its grid.
        expect(page.locator('.reel-film')).to_have_attribute('data-scene-mode', 'scroll')
        tiles = page.locator('.mobile-album-tile')
        ids = tiles.evaluate_all('(els)=>els.map(el=>el.dataset.photoId)')
        assert len(ids) == len(set(ids)) == 4
        assert tiles.evaluate_all('(els)=>els.every(el=>Math.abs(new DOMMatrix(getComputedStyle(el).transform).m41)<1)')
        tiles.first.locator('button').tap()
        expect(page.get_by_role('dialog', name='Album ảnh cưới')).to_be_visible()
        lead = next(i for i, photo in enumerate(site['photos']) if photo['id'] == ids[0])
        page.keyboard.press('ArrowRight')
        expect(page.locator('.photo-caption')).to_contain_text(f'{(lead+1)%40+1} / 40')
        if width == 390:
            page.wait_for_timeout(400)
            client = page.context.new_cdp_session(page)
            client.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 300, 'y': 350}]})
            for x in [260, 220, 180, 140, 90]:
                client.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': 350}]})
            client.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            expect(page.locator('.photo-caption')).to_contain_text(f'{(lead+2)%40+1} / 40')
            page.get_by_role('button', name='Phát slideshow', exact=True).click()
            page.wait_for_timeout(3650)
            expect(page.locator('.photo-caption')).to_contain_text(f'{(lead+3)%40+1} / 40')
            page.keyboard.press('Shift+Tab')
            assert page.evaluate('document.activeElement.closest("[role=dialog]")!==null')
        page.keyboard.press('Escape')
        page.get_by_role('dialog').wait_for(state='detached')
        page.get_by_role('button', name='Xem toàn bộ album', exact=True).tap()
        expect(page.locator('.album-photo-button')).to_have_count(12)
        while page.get_by_role('button', name='Xem thêm những trang ảnh').count():
            page.get_by_role('button', name='Xem thêm những trang ảnh').click()
        expect(page.locator('.album-photo-button')).to_have_count(40)
        page.get_by_role('button', name='Gấp album lại', exact=False).click()
        page.wait_for_function('Math.abs(document.getElementById("story").getBoundingClientRect().top)<2')

        # Every invitation stays in normal flow with an independently usable RSVP.
        assert page.locator('.date-panel').count() == 3
        for i, event in enumerate(site['events']):
            selector = f'#event-{event["id"]}'
            jump(page, selector)
            panel = page.locator(selector)
            nav = page.locator('.mobile-date-nav')
            assert nav.evaluate('el=>getComputedStyle(el).position') == 'sticky'
            assert 44 <= nav.bounding_box()['height'] <= 56
            # Native scrollIntoView can round fractional document positions.
            assert abs(nav.bounding_box()['y'] - 66) < 2, (width,event['id'],nav.bounding_box(),panel.bounding_box(),page.evaluate('scrollY'))
            expect(nav.locator('button[aria-current]')).to_have_attribute('aria-controls', f'event-{event["id"]}')
            expect(panel).to_have_attribute('data-scene-mode', 'scroll')
            assert panel.evaluate('(el)=>getComputedStyle(el).position') == 'relative'
            assert panel.get_attribute('aria-hidden') == 'false'
            assert panel.get_attribute('inert') is None
            assert panel.bounding_box()['height'] >= height - 1
            copy_rect = panel.locator('.date-main-copy').bounding_box()
            hud_rect = panel.locator('.scene-hud').bounding_box()
            assert copy_rect['y'] + copy_rect['height'] < hud_rect['y'] - 4
            assert panel.locator('time').get_attribute('datetime') == event['dateTime']
            assert event['time'] in panel.locator('.date-primary-time').inner_text()
            assert panel.locator('.date-actions button').count() == 1
            page.screenshot(path=str(out / f'{width}-{event["id"]}.png'))
            panel.locator('.date-rsvp-link').tap()
            expect(page.get_by_role('dialog', name='Xác nhận tham dự')).to_be_visible()
            if i == 2 and width == 390:
                page.locator('#rsvp-name').fill('Mobile guest')
                page.get_by_role('button', name='Gửi lời hẹn', exact=False).click()
                expect(page.locator('.rsvp-success')).to_be_visible()
            page.keyboard.press('Escape')
            page.get_by_role('dialog').wait_for(state='detached')

        jump(page, '#event')
        page.locator('.mobile-date-nav button').last.tap()
        last = site['events'][-1]['id']
        page.wait_for_function('id=>{const el=document.getElementById(id);return Math.abs(el.getBoundingClientRect().top-parseFloat(getComputedStyle(el).scrollMarginTop))<2}', arg=f'event-{last}')
        page.get_by_role('button', name='Mở mục lục').tap()
        page.get_by_role('dialog', name='Mục lục').get_by_role('button', name='Lời ngỏ', exact=False).tap()
        page.wait_for_function('Math.abs(document.getElementById("opening").getBoundingClientRect().top)<2')
        expect(page.locator('#opening')).to_have_attribute('data-scene-mode', 'scroll')
        if width == 390:
            jump(page, '#wishes')
            page.locator('#wish-name').fill('Mobile guest')
            page.locator('#wish-message').fill('A happy day together.')
            # No moving ancestor while the guest is typing.
            before = page.locator('.letter-form').bounding_box()
            page.wait_for_timeout(500)
            after = page.locator('.letter-form').bounding_box()
            assert abs(before['y'] - after['y']) < 1
            page.locator('.letter-form button[type=submit]').click()
            assert page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))[0].name') == 'Mobile guest'
            assert page.evaluate('JSON.parse(localStorage.getItem("wedding-rsvp")).at(-1).name') == 'Mobile guest'
        jump(page, '#closing')
        page.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})')
        page.wait_for_timeout(700)
        expect(page.locator('#closing')).to_have_attribute('data-scene-mode', 'scroll')
        assert page.locator('.closing-rings path').evaluate_all('(els)=>els.every(el=>parseFloat(el.getAttribute("stroke-dasharray"))>.99)')
        page.screenshot(path=str(out / f'{width}-closing.png'))
        healthy(page)
        print(f'PASS {width}px: reversible scroll scrubbing, no autoplay, compact flow, grid, keyboard/lightbox, 3 RSVP, menu, rings, no overflow.', flush=True)
        if width == 390:
            page.reload(wait_until='domcontentloaded')
            page.locator('.opening-intro').wait_for(state='visible')
            page.get_by_role('button', name='Bỏ qua').click()
            page.locator('.opening-intro').wait_for(state='detached')
            assert page.evaluate('scrollY') == 0
            assert page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))[0].name') == 'Mobile guest'
        page.close()

    # Direct jumps and native touch input stay on the actual scroll clock.
    page = mobile()
    open_site(page, args.url + '/#home', wait_until='networkidle')
    site = page.evaluate('async()=>JSON.parse(JSON.stringify((await import("/src/data/site.js")).wedding))')
    client = page.context.new_cdp_session(page)
    client.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 340, 'y': 650}]})
    for y in [610, 570, 530, 490, 450]:
        client.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 340, 'y': y}]})
    client.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_timeout(700)
    assert page.evaluate('scrollY') > 100
    assert page.locator('.cinema-names').evaluate('el=>+getComputedStyle(el).opacity') < 1
    jump(page, '#home', 700)
    assert page.locator('.cinema-names').evaluate('el=>+getComputedStyle(el).opacity') == 1
    jump(page, '#closing', 120)
    for selector in ['#opening', '.reel-film', '#couple', '.wave-film', '.date-panel']:
        assert page.locator(selector).evaluate_all('(els)=>els.every(el=>el.dataset.sceneMode==="scroll")'), selector
    jump(page, '#couple', 50)
    expect(page.locator('#couple')).to_have_attribute('data-scene-mode', 'scroll')
    for width in [701, 768, 1024, 1440, 700, 390]:
        page.set_viewport_size({'width': width, 'height': 900 if width > 700 else 844})
        jump(page, '#home', 700)
        assert page.locator('.opening-intro').count() == 0
        assert page.locator('.travel-photo').count() == (1 if width > 700 else 0)
        assert page.locator('.hero-stage').evaluate('(el)=>getComputedStyle(el).position') == ('sticky' if width > 700 else 'relative')
        healthy(page)
    # Resizing must preserve a partially entered form and an open dialog.
    jump(page, '#wishes', 0)
    form_before = page.locator('.letter-form').bounding_box()
    assert page.locator('.letter-form-wrap').evaluate('el=>+getComputedStyle(el).opacity') == 1
    page.locator('#wish-name').fill('Keep this draft')
    page.wait_for_timeout(450)
    assert abs(page.locator('.letter-form').bounding_box()['y'] - form_before['y']) < 1
    page.set_viewport_size({'width': 1024, 'height': 768})
    expect(page.locator('#wish-name')).to_have_value('Keep this draft')
    page.locator('.header-rsvp').click()
    page.locator('#rsvp-name').fill('Keep this RSVP')
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.locator('#rsvp-name')).to_have_value('Keep this RSVP')
    page.keyboard.press('Escape')
    page.get_by_role('dialog').wait_for(state='detached')
    assert page.evaluate('document.body.style.overflow') != 'hidden'
    page.close()
    print('PASS fast skips, reverse scroll, 700/701 breakpoint, resize preserves draft/dialog and does not replay intro.', flush=True)

    page = mobile()
    last_event = site['events'][-1]['id']
    open_site(page, args.url + f'/#event-{last_event}', wait_until='networkidle')
    page.wait_for_function('id=>{const el=document.getElementById(id);return Math.abs(el.getBoundingClientRect().top-parseFloat(getComputedStyle(el).scrollMarginTop))<2}', arg=f'event-{last_event}')
    assert page.locator('.opening-intro').count() == 0
    assert page.locator('.travel-photo').count() == 0
    assert page.evaluate('document.querySelector("audio").paused')
    page.locator('.sound-button').tap()
    page.wait_for_function('!document.querySelector("audio").paused')
    page.locator('.sound-button').tap()
    page.wait_for_function('document.querySelector("audio").paused')
    page.close()
    print('PASS direct invitation link and music starts/stops only on request.', flush=True)

    for count in [0, 1, 2, 13, 30]:
        fixture = copy.deepcopy(site)
        fixture['photos'] = fixture['photos'][:count]
        fixture['heroPhoto'] = fixture['couplePhoto'] = fixture['groomPortrait'] = fixture['bridePortrait'] = None
        fixture['musicUrl'] = ''
        page = mobile()
        page.route('**/src/data/site.js*', fixture_route(fixture))
        open_site(page, args.url + '/#closing', wait_until='networkidle')
        assert page.locator('.family-subject-frame').count() == 0
        if count:
            jump(page, '.reel-film')
            expect(page.locator('.mobile-album-tile')).to_have_count(min(4, count))
            assert page.locator('.mobile-album-tile').evaluate_all('(els)=>new Set(els.map(el=>el.dataset.photoId)).size===els.length')
            page.locator('.mobile-album-tile button').first.tap()
            expect(page.get_by_role('dialog', name='Album ảnh cưới')).to_be_visible()
            assert page.get_by_role('button', name='Ảnh tiếp', exact=True).count() == (1 if count > 1 else 0)
            assert page.get_by_role('button', name='Phát slideshow', exact=True).count() == (1 if count > 1 else 0)
            page.keyboard.press('Escape')
            page.get_by_role('dialog').wait_for(state='detached')
        else:
            assert page.locator('#story').count() == 0
            page.get_by_role('button', name='Mở mục lục').tap()
            assert page.get_by_role('dialog').get_by_role('button', name='Trang ảnh', exact=False).count() == 0
            page.keyboard.press('Escape')
        healthy(page)
        page.close()
        print(f'PASS album {count}: missing roles, responsive photo count, single-photo controls, no duplicates/broken image.', flush=True)

    broken = copy.deepcopy(site)
    broken['photos'] = [{'id': 'broken', 'src': '/missing-photo.webp', 'alt': 'Missing'}, site['photos'][0]]
    broken['heroPhoto'] = {'src': '/missing-cover.webp', 'alt': 'Missing cover'}
    page = mobile()
    page.route('**/src/data/site.js*', fixture_route(broken))
    page.route('**/images/portraits/*', lambda route: route.fulfill(status=404, body=''))
    open_site(page, args.url + '/#home', wait_until='networkidle')
    jump(page, '.reel-film')
    expect(page.locator('.mobile-album-tile')).to_have_count(1)
    jump(page, '#couple')
    expect(page.locator('.family-portrait.has-original')).to_have_count(2)
    healthy(page)
    page.close()

    page = mobile(reduced_motion='reduce')
    open_site(page, args.url, wait_until='networkidle')
    assert page.locator('.opening-intro').count() == 0
    for selector in ['#home', '#opening', '.reel-film', '#couple', '.wave-film', '.date-panel', '#closing']:
        assert page.locator(selector).evaluate_all('(els)=>els.every(el=>el.dataset.sceneMode==="static")'), selector
    assert page.locator('.family-subject-frame').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).transform==="none")')
    jump(page, '#event')
    assert page.locator('.date-panel[inert]').count() == 0
    healthy(page)
    page.close()
    assert not errors, errors
    print('PASS failed images/cutouts, static reduced motion, opt-in music, no JavaScript errors.', flush=True)
    browser.close()
