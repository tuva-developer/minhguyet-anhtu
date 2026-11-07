"""Refresh from a scrolled scene starts at the cover instead of restoring it."""
import argparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5174')
args = parser.parse_args()

def dismiss(page):
    page.locator('.opening-intro').wait_for(state='detached', timeout=8000)

def middle(page):
    page.locator('#event').evaluate('(el)=>scrollTo({top:el.getBoundingClientRect().top+scrollY,behavior:"instant"})')
    page.wait_for_timeout(300)
    assert page.evaluate('scrollY>innerHeight*3')

with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    for width, height in [(1440,900),(390,844)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.url,wait_until='networkidle')
        dismiss(page)
        page.evaluate('localStorage.setItem("wedding-messages",JSON.stringify([{name:"Keep me",text:"Existing wish",date:"01/11/2026"}]))')
        before=page.evaluate('localStorage.getItem("wedding-messages")')
        middle(page)
        page.reload(wait_until='domcontentloaded')
        page.locator('.opening-intro').wait_for(state='visible')
        assert page.evaluate('scrollY<2')
        assert page.evaluate('localStorage.getItem("wedding-messages")')==before
        dismiss(page)
        middle(page)
        previous=page.evaluate('scrollY')
        page.goto('about:blank')
        page.go_back(wait_until='networkidle')
        assert page.locator('.opening-intro').count()==0
        page.wait_for_function('y=>Math.abs(scrollY-y)<5',arg=previous)
        print(f'PASS {width}px: refresh returns to top and replays intro; stored wishes and Back restoration remain intact.',flush=True)
        page.close()

    page=browser.new_page(reduced_motion='reduce')
    page.goto(args.url+'/?guest=test#event',wait_until='networkidle')
    assert page.url.endswith('#event')
    assert page.locator('.opening-intro').count()==0
    middle(page)
    page.reload(wait_until='networkidle')
    assert page.evaluate('scrollY<2')
    assert page.url.endswith('?guest=test')
    assert page.locator('.opening-intro').count()==0
    print('PASS reduced-motion refresh resets to top; old fragment cleared, query preserved.',flush=True)
    assert not errors,errors
    browser.close()
