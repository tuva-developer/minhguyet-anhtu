def open_site(page, url, **options):
    """Wait for the actual opening before testing the invitation underneath."""
    response = page.goto(url, **options)
    page.locator('.opening-intro').wait_for(state='detached', timeout=8000)
    page.wait_for_function('''() => [...document.querySelectorAll('.name-enter')].every(el => {
        const style = getComputedStyle(el);
        return Math.abs(new DOMMatrix(style.transform).m41) < .5 && +style.opacity > .99;
    })''', timeout=5000)
    return response
