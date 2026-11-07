"""Fullscreen scroll + interaction acceptance checks (Python / Playwright)."""
import argparse
import copy
import json
from pathlib import Path
from browser_helpers import open_site
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5173')
parser.add_argument('--fixtures-only',action='store_true')
args=parser.parse_args()
out=Path('artifacts/soi-duyen');out.mkdir(parents=True,exist_ok=True)

def seek(page,selector,fraction):
    page.locator(selector).evaluate('(el,p)=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY+Math.max(0,el.offsetHeight-innerHeight)*p,behavior:"instant"})',fraction)
    page.wait_for_timeout(300)

def healthy(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow'
    assert page.evaluate('[...document.images].every(i=>!i.complete||i.naturalWidth>0)'),'Broken visible image'

def shot(page,name):page.screenshot(path=str(out/f'{name}.png'))

def fixture_route(value):
    code='export const wedding = '+json.dumps(value,ensure_ascii=False)+';'
    return lambda route:route.fulfill(content_type='application/javascript',body=code)

with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':900})
    context.add_init_script('''if(!localStorage.getItem('wedding-messages'))localStorage.setItem('wedding-messages',JSON.stringify([{name:'Lời chúc cũ',text:'Giữ lại lời thương từ bản trước.',date:'01/11/2026'}]));if(!localStorage.getItem('wedding-rsvp'))localStorage.setItem('wedding-rsvp',JSON.stringify([{name:'Khách cũ',attendance:'yes',guests:2,note:'Giữ dữ liệu cũ'}]));''')
    page=context.new_page();page.set_default_timeout(10000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    assert open_site(page, args.url,wait_until='networkidle').status==200
    site=page.evaluate('async()=>JSON.parse(JSON.stringify((await import("/src/data/site.js")).wedding))')
    total=len(site['photos'])
    lead_index=next((i for i,photo in enumerate(site['photos']) if photo['id']==site['albumLeadPhotoId']),0)
    if not args.fixtures_only:
        expect(page.locator('h1')).to_contain_text('Anh Tú')
        expect(page.locator('h1')).to_contain_text('Minh Nguyệt')
        assert page.locator('.film-scene').count()==6
        for selector in ['.hero-film','.reading-film','.profiles-film','.reel-film','.aperture-film','.dates-film']:
            seek(page,selector,.1)
            assert page.locator(selector+' > .film-stage').evaluate('(el)=>Math.abs(el.getBoundingClientRect().height-innerHeight)<2')
            assert page.locator(selector+' > .film-stage').evaluate('(el)=>getComputedStyle(el).position')=='sticky'
        seek(page,'#home',0);first=page.locator('.travel-photo').bounding_box()['width'];shot(page,'desktop-hero')
        assert abs(first-1440)<2
        assert page.locator('h1').evaluate('(el)=>getComputedStyle(el.parentElement).zIndex')=='8'
        seek(page,'#home',.95);assert page.locator('.travel-photo').bounding_box()['width']<first*.4;shot(page,'desktop-hero-travel')
        travel=page.locator('.travel-photo').element_handle()
        seek(page,'#home',.8);assert float(page.locator('.hero-revelation').evaluate('(el)=>getComputedStyle(el).opacity'))>.8;shot(page,'desktop-hero-reveal')
        seek(page,'#opening',0);before=page.locator('.reading-content h2>span').last.evaluate('(el)=>getComputedStyle(el).opacity')
        seek(page,'#opening',.48);assert float(page.locator('.reading-content h2>span').last.evaluate('(el)=>getComputedStyle(el).opacity'))>float(before);shot(page,'desktop-reading')
        assert travel.evaluate('(el)=>el===document.querySelector(".travel-photo")')
        seek(page,'#couple',.3);assert page.locator('.family-career').all_text_contents()==['Developer','Designer'];shot(page,'desktop-families')
        seek(page,'#couple',.93);assert page.locator('.profile-reunion').count()==0;assert page.locator('.family-person').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).opacity==="1")');shot(page,'desktop-families-end')
        seek(page,'.reel-film',0);before=page.locator('.reel-frame').first.evaluate('(el)=>getComputedStyle(el).transform')
        seek(page,'.reel-film',.53);assert before!=page.locator('.reel-frame').first.evaluate('(el)=>getComputedStyle(el).transform');shot(page,'desktop-reel')
        expect(page.locator('.montage-stage')).to_have_attribute('data-phase','grid')
        assert float(page.locator('.travel-photo').evaluate('(el)=>getComputedStyle(el).opacity'))==0
        seek(page,'.reel-film',1);assert page.locator('.reel-frame.is-current').bounding_box()['width']>=1439;shot(page,'desktop-album-fullscreen')
        seek(page,'.reel-film',0)
        page.locator('.reel-frame.is-current .reel-photo-button').click()
        expect(page.get_by_role('dialog',name='Album ảnh cưới')).to_be_visible()
        page.wait_for_timeout(450);page.keyboard.press('ArrowRight');page.wait_for_timeout(350)
        expect(page.locator('.photo-caption')).to_contain_text(f'{(lead_index+1)%total+1} / {total}')
        page.get_by_role('button',name='Phát slideshow',exact=True).click();page.wait_for_timeout(3650)
        expect(page.locator('.photo-caption')).to_contain_text(f'{(lead_index+2)%total+1} / {total}')
        page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest("[role=dialog]")!==null')
        page.keyboard.press('Escape');page.wait_for_timeout(350)
        page.get_by_role('button',name='Xem toàn bộ album',exact=True).click()
        expect(page.locator('#contact-sheet')).to_be_visible()
        assert page.locator('.album-photo-button').count()==min(12,total)
        while page.get_by_role('button',name='Xem thêm những trang ảnh').count():page.get_by_role('button',name='Xem thêm những trang ảnh').click()
        assert page.locator('.album-photo-button').count()==total
        page.locator('.album-photo-button').last.click();page.wait_for_timeout(350)
        expect(page.locator('.photo-caption')).to_contain_text(f'{total} / {total}')
        page.keyboard.press('Escape');page.wait_for_timeout(350)
        page.get_by_role('button',name='Gấp album lại',exact=True).click()
        seek(page,'.wave-film',.1);wave=page.locator('.wave-row').first.evaluate('(el)=>getComputedStyle(el).transform')
        seek(page,'.wave-film',.9);assert wave!=page.locator('.wave-row').first.evaluate('(el)=>getComputedStyle(el).transform');shot(page,'desktop-wave')
        seek(page,'#event',.34);assert 'matrix3d' in page.locator('.date-panel').first.evaluate('(el)=>getComputedStyle(el).transform');shot(page,'desktop-paper-fold')
        for i,event in enumerate(site['events']):
            seek(page,'#event',(i+.5)/len(site['events']))
            expect(page.locator('.dates-stage')).to_have_attribute('data-active',str(i))
            assert page.locator('.date-panel.is-active').evaluate('(el)=>getComputedStyle(el).isolation')=='isolate'
            shot(page,f'desktop-date-{i+1}')
            page.locator('.date-panel.is-active').get_by_role('button',name='Mở thiệp mời',exact=True).click()
            dialog=page.get_by_role('dialog',name=f'Thiệp mời {event["name"]}')
            expect(dialog).to_contain_text(event['lunarDate']);expect(dialog).to_contain_text(event['address'])
            if event.get('receptionTime'):expect(dialog).to_contain_text(event['receptionTime'])
            assert dialog.locator('a').count()==(1 if event.get('mapQuery') else 0)
            page.keyboard.press('Escape');page.wait_for_timeout(350)
        page.locator('.date-panel.is-active').get_by_role('button',name='Mình có hẹn nhé').click()
        page.get_by_label('TÊN CỦA BẠN',exact=True).fill('Khách mới')
        page.get_by_label('SỐ NGƯỜI THAM DỰ',exact=True).select_option('3')
        page.get_by_role('button',name='Gửi lời hẹn',exact=True).click()
        expect(page.locator('.rsvp-success')).to_be_visible();page.keyboard.press('Escape');page.wait_for_timeout(350)
        rows=page.evaluate('JSON.parse(localStorage.getItem("wedding-rsvp"))')
        assert rows[0]['name']=='Khách cũ' and rows[-1]['guests']==3
        page.locator('#wishes').evaluate('(el)=>el.scrollIntoView({block:"start",behavior:"instant"})');page.wait_for_timeout(900)
        page.get_by_label('TỪ NGƯỜI THƯƠNG',exact=True).fill('Người thương mới')
        page.get_by_label('GỬI ANH TÚ và MINH NGUYỆT',exact=True).fill('Chúc hai bạn vui mãi. Lời thương vẫn ở đây.')
        page.get_by_role('button',name='Gửi lời thương',exact=True).click();page.wait_for_timeout(700)
        assert page.locator('.pinned-note').count()==2
        page.get_by_role('button',name='Đọc lời chúc của Người thương mới',exact=True).click()
        expect(page.locator('.full-wish')).to_contain_text('Lời thương vẫn ở đây.')
        page.keyboard.press('Escape');page.wait_for_timeout(350)
        page.get_by_role('button',name='Phát nhạc nền',exact=True).click();page.wait_for_function('!document.querySelector("audio").paused')
        assert page.locator('audio').get_attribute('src')==site['musicUrl']
        page.get_by_role('button',name='Tạm dừng nhạc nền',exact=True).click()
        page.reload(wait_until='networkidle');assert page.locator('.pinned-note').count()==2
        assert page.evaluate('JSON.parse(localStorage.getItem("wedding-messages"))[1].name')=='Lời chúc cũ'
        seek(page,'#closing',1);assert page.locator('.closing-rings path').count()==2;shot(page,'desktop-closing')
        print('PASS desktop: traveling photo, stack/grid/fullscreen montage, joining families, wave typography, folding invitations, lightbox/slideshow, RSVP, music, storage',flush=True)

        mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        open_site(mobile, args.url,wait_until='networkidle');shot(mobile,'mobile-hero')
        mobile.get_by_role('button',name='Mở mục lục').click()
        mobile.get_by_role('button',name='Lịch hẹn',exact=False).click()
        mobile.wait_for_function('Math.abs(document.getElementById("event").getBoundingClientRect().top)<5',timeout=7000)
        for selector,fraction,label in [('#home',.9,'reveal'),('#opening',.4,'reading'),('#couple',.3,'families'),('#couple',.93,'families-end'),('.reel-film',.53,'reel'),('.wave-film',.8,'wave'),('#event',.5,'date-2')]:
            seek(mobile,selector,fraction);healthy(mobile);shot(mobile,f'mobile-{label}')
        seek(mobile,'.reel-film',0);mobile.locator('.reel-frame.is-current .reel-photo-button').click();mobile.wait_for_timeout(400)
        client=mobile.context.new_cdp_session(mobile)
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':300,'y':350}]})
        for x in [260,220,180,140,90]:client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':350}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});mobile.wait_for_timeout(400)
        expect(mobile.locator('.photo-caption')).to_contain_text(f'{(lead_index+1)%total+1} / {total}')
        mobile.keyboard.press('Escape');mobile.wait_for_timeout(350)
        for width in [320,390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':844 if width<900 else 900});seek(page,'#home',0);healthy(page)
            bounds=page.locator('h1>span').evaluate_all('(els)=>els.map(el=>({l:el.getBoundingClientRect().left,r:el.getBoundingClientRect().right}))')
            assert min(v['l'] for v in bounds)>=-1 and max(v['r'] for v in bounds)<=width+1,(width,bounds)
        print('PASS mobile: fullscreen motion, menu, swipe, names/overflow at 320/390/768/1024/1440px',flush=True)

    for count in [0,1,2,3,13,30]:
        fixture=copy.deepcopy(site)
        fixture['heroPhoto']=fixture['couplePhoto']=fixture['groomPortrait']=fixture['bridePortrait']=None
        fixture['photos']=[{**site['photos'][i%total],'id':f'test-{i}','caption':f'Khoảnh khắc {i+1}'} for i in range(count)]
        fixture['musicUrl']=''
        test=browser.new_page(viewport={'width':390 if count in [0,1,3,30] else 1440,'height':844})
        test.on('pageerror',lambda e:errors.append(str(e)))
        test.route('**/src/data/site.js*',fixture_route(fixture))
        open_site(test, args.url,wait_until='networkidle')
        assert test.locator('.family-subject-frame').count()==0
        if not count:
            assert test.locator('#story').count()==0
            assert test.locator('.hero-window .paper-monogram').count()==1
        else:
            seek(test,'.reel-film',0)
            cap=4 if test.viewport_size['width']<=700 else 6
            assert test.locator('.reel-frame').count()==min(cap,count)
            test.locator('.reel-frame.is-current .reel-photo-button').click();test.wait_for_timeout(400)
            expect(test.locator('.photo-caption')).to_contain_text(f'1 / {count}')
            assert test.get_by_role('button',name='Ảnh tiếp',exact=True).count()==(1 if count>1 else 0)
            assert test.get_by_role('button',name='Phát slideshow',exact=True).count()==(1 if count>1 else 0)
            test.keyboard.press('Escape');test.wait_for_timeout(300)
            test.get_by_role('button',name='Xem toàn bộ album',exact=True).click()
            while test.get_by_role('button',name='Xem thêm những trang ảnh').count():test.get_by_role('button',name='Xem thêm những trang ảnh').click()
            assert test.locator('.album-photo-button').count()==count
        healthy(test);test.close();print(f'PASS flexible photos: {count}, missing cover/portraits',flush=True)

    broken=copy.deepcopy(site)
    broken['photos']=[{'id':'broken','src':'/missing-photo.webp','alt':'Broken'},site['photos'][0]]
    broken['heroPhoto']={'src':'/missing-cover.webp','alt':'Broken cover'}
    broken['couplePhoto']=broken['groomPortrait']=broken['bridePortrait']=None
    test=browser.new_page(viewport={'width':390,'height':844})
    test.route('**/src/data/site.js*',fixture_route(broken));test.on('pageerror',lambda e:errors.append(str(e)))
    open_site(test, args.url,wait_until='networkidle');seek(test,'.reel-film',0);test.wait_for_timeout(400)
    assert test.locator('.reel-frame').count()==1;healthy(test);test.close()
    reduced=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    reduced.on('pageerror',lambda e:errors.append(str(e)))
    open_site(reduced, args.url,wait_until='networkidle')
    assert reduced.locator('.hero-stage').evaluate('(el)=>getComputedStyle(el).position')=='relative'
    assert reduced.locator('.family-person[aria-hidden="true"]').count()==0
    assert reduced.locator('.date-panel[aria-hidden="true"]').count()==0
    assert reduced.evaluate('document.querySelector("audio").paused')
    healthy(reduced);reduced.close()
    assert not errors,errors
    print('PASS image failures, reduced motion, no JavaScript errors.',flush=True)
    browser.close()
