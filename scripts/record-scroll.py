"""Record the real native-scroll choreography for visual review (Playwright)."""
import argparse
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--mobile', action='store_true')
args = parser.parse_args()
out = Path('artifacts/soi-duyen')
out.mkdir(parents=True, exist_ok=True)
size = {'width': 390, 'height': 844} if args.mobile else {'width': 1440, 'height': 900}
name = 'mobile' if args.mobile else 'desktop'
scenes = [
    ('#home', 0, 'cover'), ('#home', .3, None), ('#home', 1, 'travel'),
    ('#opening', .1, None), ('#opening', .45, 'letter'), ('#opening', .8, None),
    ('.reel-film', .08, 'stack'), ('.reel-film', .25, None), ('.reel-film', .53, 'grid'),
    ('.reel-film', .8, None), ('.reel-film', 1, 'fullscreen'),
    ('#couple', .08, None), ('#couple', .3, 'families'), ('#couple', .62, None), ('#couple', .95, 'families-end'),
    ('.wave-film', .1, 'wave-start'), ('.wave-film', .4, None), ('.wave-film', .9, 'wave-end'),
    ('#event', .15, 'date-1'), ('#event', .28, 'fold-1'), ('#event', .36, None),
    ('#event', .5, 'date-2'), ('#event', .61, 'fold-2'), ('#event', .71, None), ('#event', .88, 'date-3'),
    ('#wishes', 0, 'wishes'), ('#closing', 1, 'rings'),
]
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport=size, is_mobile=args.mobile, has_touch=args.mobile,
                                  record_video_dir=str(out/'recording'), record_video_size=size)
    page = context.new_page()
    open_site(page, args.url, wait_until='networkidle')
    page.wait_for_timeout(500)
    for selector, fraction, label in scenes:
        page.locator(selector).evaluate('(el,p)=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"smooth"})', fraction)
        page.wait_for_timeout(1000)
        if label:
            page.screenshot(path=str(out/f'{name}-{label}.png'))
    page.wait_for_timeout(700)
    video = page.video
    context.close()
    target = out/f'scroll-{name}.webm'
    Path(video.path()).replace(target)
    print(target, target.stat().st_size, flush=True)
    browser.close()
