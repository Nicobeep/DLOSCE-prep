#!/usr/bin/env python3
"""Rebuild the shared accessible site navigation from one Python source of truth.

Runs automatically from build_content.py. It can also be invoked by itself:
    python refresh_ui.py

No backend server required. Preserves existing page content and data files.
"""
from pathlib import Path
import json
from bs4 import BeautifulSoup

SITE = Path(__file__).resolve().parent
UI_VERSION = '20261123-study-dashboard'
MODULES = [
    ("restorative", "Restorative", 24),
    ("prosthodontics", "Prosthodontics", 19),
    ("oral-pathology", "Oral pathology & TMD", 13),
    ("periodontics", "Periodontics", 10),
    ("oral-surgery", "Oral surgery", 9),
    ("endodontics", "Endodontics", 8),
    ("orthodontics", "Orthodontics", 6),
    ("medical-emergencies", "Medical emergencies", 6),
    ("prescriptions", "Prescriptions", 5),
]


def nav_markup(page: str, settings: dict) -> str:
    home = page == 'index.html'
    def url(fragment: str) -> str:
        return ('#' if home else 'index.html#')+fragment
    def tab(name: str) -> str:
        return f' data-tab="{name}"' if home else ''
    def link(href, text, active=False, extra=''):
        active_class = ' is-current' if active else ''
        current = ' aria-current="page"' if active else ''
        return f'<a href="{href}" class="menu-item{active_class}"{extra}{current}>{text}</a>'
    guide_links=''.join(link(f'{slug}.html',f'{name}<span class="menu-meta">{weight}%</span>',page==f'{slug}.html') for slug,name,weight in MODULES)
    title = escape(settings.get('site_title','DLOSCE Prep'))
    subtitle=escape(settings.get('site_subtitle','Independent dental exam study resource'))
    return f'''<header class="site-header">
    <div class="site-topbar">
      <a class="site-brand" href="index.html#home" aria-label="{title} home"><span class="brand-wordmark">{title}</span><span class="brand-subtitle">{subtitle}</span></a>
      <button class="nav-toggle" type="button" aria-controls="primary-navigation" aria-expanded="false">Menu</button>
    <nav class="primary-nav" id="primary-navigation" aria-label="Main navigation">
      <a class="nav-link {'is-current' if home else ''}" href="{url('home')}"{tab('home')}>Home</a>
      <a class="nav-link" href="{url('practice')}"{tab('practice')}>Practice</a>
      <a class="nav-link" href="{url('mock')}"{tab('mock')}>Timed Mock</a>
      <details class="nav-group" data-group="study"><summary>Study Guides</summary><div class="nav-dropdown">
        {link('study-recommendations.html','Study plan and blueprint',page=='study-recommendations.html')}
        <div class="module-menu-grid">{guide_links}</div></div></details>
      <a class="nav-link" href="{url('dashboard')}"{tab('dashboard')}>Progress</a>
      <details class="nav-group" data-group="resources"><summary>Resources</summary><div class="nav-dropdown">
        {link(url('prescriptions'),'Prescription simulator',extra=tab('prescriptions'))}
        {link(url('radiographs'),'Clinical image bank',extra=tab('radiographs'))}
        <a class="menu-item" href="https://adextesting.org/wp-content/uploads/2026/06/DLOSCE-Practice-Questions-June-2026-N70.pdf" target="_blank" rel="noopener noreferrer">Official ADEX 70-question PDF</a>
        {link(url('anatomy'),'Official 3D tutorial',extra=tab('anatomy'))}
        {link('sources.html','Sources and image credits',page=='sources.html')}</div></details>
    </nav>
    </div>
    </header>'''


def escape(s):
    import html
    return html.escape(str(s), quote=True)


def ensure_styles(soup):
    for filename in ('site-ui.css', 'platform.css', 'exam-simulator.css',
                     'submitted-review.css', 'notes.css', 'study-recommendations.css'):
        styles = [tag for tag in soup.head.find_all('link', href=True)
                  if tag['href'].split('?', 1)[0] == filename]
        if not styles and filename == 'site-ui.css':
            style = soup.new_tag('link', rel='stylesheet')
            soup.head.append(style)
            styles = [style]
        for style in styles:
            style['href'] = f'{filename}?v={UI_VERSION}'
    scripts = [tag for tag in soup.find_all('script', src=True)
               if tag['src'].split('?', 1)[0] == 'site-ui.js']
    if not scripts:
        scripts = [soup.new_tag('script', defer='')]
        soup.body.append(scripts[0])
    scripts[0]['src'] = f'site-ui.js?v={UI_VERSION}'
    for duplicate in scripts[1:]:
        duplicate.decompose()


def create_intro(soup, page):
    main=soup.main
    if not main or page=='index.html':return
        
    # Remove existing pagination before inserting a fresh bar on each build.
    for old_pager in main.select('.module-pager'):
        old_pager.decompose()

    existing=main.select_one(':scope > .page-intro')
    if existing:existing.decompose()
    title=''
    kicker=''
    description=''
    if page=='study-recommendations.html':
        title='Study recommendations'; kicker='YOUR STUDY ROADMAP'
        description='Understand the content blueprint, create a realistic schedule, and focus your practice on clinical decisions.'
    elif page=='sources.html':
        title='Sources & image credits'; kicker='EVIDENCE & ATTRIBUTIONS'
        description='Find exam references, clinical guidelines, and image authors and reuse licenses.'
    else:
        item=next(((slug,name,weight) for slug,name,weight in MODULES if f'{slug}.html'==page),None)
        if not item:return
        slug,name,weight=item
        title=name; kicker=f'MODULE {MODULES.index(item)+1:02d} • {weight}% BLUEPRINT WEIGHT'
        description='High-yield notes, clinical reasoning, examination pitfalls, and source-credited practice images.'
    intro=BeautifulSoup(f'<div class="page-intro"><span class="page-kicker">{kicker}</span><h1>{escape(title)}</h1><p>{escape(description)}</p></div>','html.parser').div
    main.insert(0,intro)
    if page not in ('study-recommendations.html','sources.html') and item:
        slug,name,weight=item
        i=MODULES.index(item)
        prev=MODULES[i-1] if i>0 else None
        nxt=MODULES[i+1] if i<len(MODULES)-1 else None
        links=[]
        if prev:links.append(f'<a href="{prev[0]}.html">← {prev[1]}</a>')
        links.append('<a href="index.html#home">All modules</a>')
        if nxt:links.append(f'<a href="{nxt[0]}.html">{nxt[1]} →</a>')
        move=BeautifulSoup('<div class="module-pager" aria-label="Module navigation">'+' '.join(links)+'</div>','html.parser').div
        main.insert(1,move)


def update_home(soup,settings):
    home=soup.select_one('#home')
    if not home:return
    hero=home.select_one(':scope > .panel')
    if hero:
        hero['class']=['panel','home-hero']
        h2=hero.find('h2')
        if h2:h2.string=settings.get('home_heading','Practice clinical decisions')
        description=hero.select_one(':scope > p:not(.note):not(.home-actions)')
        if description:
            description['class'] = ['home-description']
            description.string=settings.get('home_description','Work through clinical questions across nine dental subjects.')
        badge = hero.select_one(':scope > .tag')
        if badge:badge.decompose()
        actions = hero.select_one('.home-actions')
        if not actions:
            actions = hero.select_one(':scope > p:has(button)')
        start = BeautifulSoup('<div class="home-actions"><a class="btn" data-tab="practice" href="#practice">Start practice</a></div>', 'html.parser').div
        if actions:
            actions.replace_with(start)
        else:
            hero.append(start)
        disclosure = hero.select_one('.home-bank-info')
        if not disclosure:
            note = hero.select_one(':scope > .note')
            if note:
                disclosure = BeautifulSoup('<details class="home-bank-info"><summary>About the question bank</summary></details>', 'html.parser').details
                disclosure.append(note.extract())
                hero.append(disclosure)
    links=home.select_one('#quick-links')
    if links:links.decompose()
    quick=BeautifulSoup('''<section class="quick-links" id="quick-links" aria-label="Get started">
      <a class="quick-link" href="#mock" data-tab="mock"><span><strong>Timed Mock</strong><small>Practice with an exam timer.</small></span><b aria-hidden="true">→</b></a>
      <a class="quick-link" href="study-recommendations.html"><span><strong>Study Guides</strong><small>Browse the study plan and blueprint.</small></span><b aria-hidden="true">→</b></a>
      <a class="quick-link" href="#dashboard" data-tab="dashboard"><span><strong>My Progress</strong><small>See coverage and review submissions.</small></span><b aria-hidden="true">→</b></a>
      </section>''','html.parser').section
    if hero:hero.insert_after(quick)
    modules=home.select_one('#modules')
    if modules:
        modules['class']=['grid','module-grid']
        # Move the study modules high on the homepage; they should not be buried
        # beneath several long introductory sections.
        heading=None
        for h in home.find_all('h2',recursive=False):
            if 'Nine independent subject modules' in h.get_text(' ',strip=True):
                heading=h;break
        count=modules.find_previous_sibling('p')
        if heading and count and count.get('class')==['muted']:
            heading.extract();count.extract();modules.extract()
            quick.insert_after(heading)
            heading.insert_after(count)
            count.insert_after(modules)
        # Duplicate homepage explanations remain available without occupying
        # multiple screens before people can reach their actual study material.
        existing=home.select_one('#about-platform-details')
        if existing:
            inner=existing.select_one('.about-platform-inner')
            if inner:
                for child in list(inner.contents):existing.insert_before(child.extract())
            existing.decompose()
        # Repair an orphaned content wrapper from older builds, if present.
        for orphan in list(home.select(':scope > .about-platform-inner')):
            for child in list(orphan.contents):orphan.insert_before(child.extract())
            orphan.decompose()
        leftovers=[]
        for pnl in home.find_all('div',class_='panel',recursive=False):
            if pnl is hero:continue
            leftovers.append(pnl)
        if leftovers:
            wrapper=BeautifulSoup('<details class="about-platform" id="about-platform-details"><summary>More about this platform, question formats & exam resources</summary><div class="about-platform-inner"></div></details>','html.parser').details
            modules.insert_after(wrapper)
            inside=wrapper.select_one('.about-platform-inner')
            for node in leftovers:inside.append(node.extract())


def apply_ui(site=SITE):
    settings_file=site/'site-settings.json'
    settings=json.loads(settings_file.read_text(encoding='utf-8')) if settings_file.exists() else {}
    targets=['index.html','study-recommendations.html','sources.html']+[f'{x[0]}.html' for x in MODULES]
    for page in targets:
        path=site/page
        if not path.is_file():raise FileNotFoundError(path)
        soup=BeautifulSoup(path.read_text(encoding='utf-8'),'html.parser')
        old=soup.header
        if old is None:raise ValueError(f'Missing header in {page}')
        new=BeautifulSoup(nav_markup(page,settings),'html.parser').header
        old.replace_with(new)
        ensure_styles(soup)
        create_intro(soup,page)
        if page=='index.html':update_home(soup,settings)
        path.write_text(str(soup),encoding='utf-8')
    print(f'Updated shared navigation and accessible layout on {len(targets)} pages.')

if __name__=='__main__':apply_ui()
