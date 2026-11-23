#!/usr/bin/env python3
"""Build static DLOSCE study pages and browser data from editable Markdown/JSON.

Usage from website root:
    python scripts/build_content.py             # rebuild HTML and JS
    python scripts/build_content.py --check     # validate inputs, no writes

This script is a *build tool*, not a server. It keeps the existing HTML layout,
module navigation and official links, while refreshing the note article area and
source-credited image cards. Requires beautifulsoup4 and markdown-it-py.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup
from markdown_it import MarkdownIt

SITE = Path(__file__).resolve().parent
MODULES = {
    'restorative', 'prosthodontics', 'oral-pathology', 'periodontics',
    'oral-surgery', 'endodontics', 'orthodontics',
    'medical-emergencies', 'prescriptions',
}
MARKDOWN = MarkdownIt('commonmark')


def read_json(path: Path):
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def require(condition: bool, message: str):
    if not condition:
        raise ValueError(message)


def validate(questions: list, images: list):
    require(isinstance(questions, list) and questions, 'questions.json must be a nonempty JSON list')
    require(isinstance(images, list), 'authentic-image-bank.json must be a JSON list')
    ids = set()
    image_ids = set()
    for i, img in enumerate(images):
        for key in ['id','module','title','image','source','author','license','license_url','prompt','answer']:
            require(isinstance(img.get(key), str) and img[key].strip(), f'image {i}: missing {key}')
        require(img['id'] not in image_ids, f'duplicate image ID: {img["id"]}')
        require(img['module'] in MODULES, f'image {img["id"]}: unknown module {img["module"]}')
        require(img['image'].startswith('https://'), f'image {img["id"]}: image URL must use HTTPS')
        require(img['source'].startswith('https://'), f'image {img["id"]}: source URL must use HTTPS')
        require(img['license_url'].startswith('https://'), f'image {img["id"]}: license URL must use HTTPS')
        image_ids.add(img['id'])
    for i, q in enumerate(questions):
        for key in ['id', 'module', 'stem', 'explanation']:
            require(isinstance(q.get(key), str) and q[key].strip(), f'question {i}: missing {key}')
        require(q['module'] in MODULES, f'question {q["id"]}: unknown module {q["module"]}')
        require(q['id'] not in ids, f'duplicate question id: {q["id"]}')
        qtype=q.get('type','single')
        require(qtype in ('single','multi','prescription'), f'question {q["id"]}: unknown type {qtype}')
        if qtype=='prescription':
            fields=q.get('fields')
            require(isinstance(fields,list) and len(fields)>=4, f'prescription {q["id"]}: need 4+ fields')
            for field in fields:
                require(isinstance(field.get('label'),str) and field['label'].strip(), f'prescription {q["id"]}: field missing label')
                opts=field.get('choices')
                require(isinstance(opts,list) and len(opts)>=2 and all(isinstance(c,str) and c.strip() for c in opts), f'prescription {q["id"]}: invalid options')
                require(type(field.get('correct')) is int and 0<=field['correct']<len(opts), f'prescription {q["id"]}: invalid answer index')
        else:
            opts=q.get('choices')
            require(isinstance(opts,list) and len(opts)>=2, f'question {q["id"]}: 2+ choices required')
            require(all(isinstance(c,str) and c.strip() for c in opts), f'question {q["id"]}: empty choice')
            if qtype=='single':
                require(type(q.get('correct')) is int and 0<=q['correct']<len(opts), f'question {q["id"]}: invalid correct index')
            else:
                keys=q.get('correct')
                require(isinstance(keys,list) and len(keys)>=1 and len(set(keys))==len(keys), f'question {q["id"]}: invalid multiple-select answers')
                require(all(type(i) is int and 0<=i<len(opts) for i in keys), f'question {q["id"]}: invalid multiple-select indices')
                neutral=q.get('neutral',[])
                require(isinstance(neutral,list) and all(type(i) is int and 0<=i<len(opts) and i not in keys for i in neutral), f'question {q["id"]}: invalid neutral responses')
                alternatives=q.get('full_credit_alternatives',[])
                require(isinstance(alternatives,list) and len(set(alternatives))==len(alternatives) and all(type(i) is int and i in keys for i in alternatives), f'question {q["id"]}: invalid full-credit alternatives')
                weights=q.get('credit_weights')
                if weights is not None:
                    require(isinstance(weights,dict) and bool(weights), f'question {q["id"]}: credit_weights must be a nonempty mapping')
                    require(all(str(i) in weights for i in keys) and all(str(i) in map(str,keys) for i in weights), f'question {q["id"]}: credit_weights must include exactly the correct choices')
                    require(all(type(v) in (int,float) and 0<=v<=1 for v in weights.values()), f'question {q["id"]}: credit_weights must be nonnegative fractions')
                    require(abs(sum(weights.values())-1.0)<0.0001, f'question {q["id"]}: credit_weights must total 1 point')
        if 'patient_box' in q:
            box=q['patient_box']
            require(isinstance(box,dict), f'question {q["id"]}: patient_box must be a mapping')
            for field in ('demographics','complaint','history','current_findings'):
                require(isinstance(box.get(field),str) and box[field].strip(), f'question {q["id"]}: missing patient_box.{field}')
            require(set(box)=={'demographics','complaint','history','current_findings'},f'question {q["id"]}: Patient Box must have exactly four fields')
        if 'question_prompt' in q:
            require(isinstance(q['question_prompt'],str) and q['question_prompt'].strip(), f'question {q["id"]}: question_prompt must be text')
        if 'endo_chart' in q:
            require(isinstance(q['endo_chart'],list), f'question {q["id"]}: endo_chart must be a list')
        if 'image_id' in q:
            require(q['image_id'] in image_ids, f'question {q["id"]}: unknown image_id {q["image_id"]}')
        ids.add(q['id'])
    for slug in MODULES:
        require((SITE/f'{slug}.md').is_file(), f'missing study notes: {slug}.md')
        require((SITE/f'{slug}.html').is_file(), f'missing HTML module: {slug}.html')
    print(f'Validated: {len(questions)} questions, {len(images)} authentic-image entries, {len(MODULES)} module note files')
    print('Note: This checks structure, not clinical correctness, licensing validity, or whether remote images remain available.')


def a(soup, href, text, **attrs):
    tag = soup.new_tag('a', href=href, **attrs)
    tag.string = text
    return tag


def make_image_card(img: dict) -> BeautifulSoup:
    e = html.escape
    img_id=e(img['id'],quote=True)
    title=e(img['title'])
    auth=e(img['author'])
    source=e(img['source'],quote=True)
    url=e(img['image'],quote=True)
    lic=e(img['license'],quote=True)
    lic_url=e(img['license_url'],quote=True)
    prompt=e(img['prompt'])
    answer=e(img['answer'])
    content=f'''<article class="case" id="image-{img_id}">
      <span class="tag">Authentic source image</span><h3>{title}</h3>
      <img alt="Authentic clinical image from {auth}: {title}" loading="lazy"
           referrerpolicy="no-referrer" src="{url}"
           onerror="this.style.display='none';this.nextElementSibling.hidden=false">
      <p hidden>Image unavailable from source. <a href="{source}" target="_blank" rel="noopener">Open the original file</a>.</p>
      <p>{prompt}</p>
      <details><summary>Show interpretation and reasoning</summary><p>{answer}</p></details>
      <p class="attribution">Image: {auth} · <a href="{lic_url}" target="_blank" rel="noopener">{lic}</a> ·
      <a href="{source}" target="_blank" rel="noopener">Original file and license</a>. No alterations to original image.</p>
    </article>'''
    return BeautifulSoup(content,'html.parser').article


def replace_children(parent, new_nodes):
    parent.clear()
    for node in new_nodes:
        parent.append(node)


def render_module(slug: str, images: list[dict]) -> None:
    html_file=SITE/f'{slug}.html'
    soup=BeautifulSoup(html_file.read_text(encoding='utf-8'),'html.parser')
    article=soup.select_one('article.article')
    assert article is not None, f'{html_file}: missing main article'
    official=article.select_one('h2#official')
    assert official is not None, f'{html_file}: missing official references marker'
    # Keep all media/reference blocks below source-images or official refs; replace only study notes.
    first_media=article.select_one('h2#source-images') or official
    markdown=(SITE/f'{slug}.md').read_text(encoding='utf-8')
    parsed=BeautifulSoup(MARKDOWN.render(markdown),'html.parser')
    toc=soup.select_one('aside.sidebar .toc')
    if toc:
        toc.clear()
        strong=soup.new_tag('strong');strong.string='In this module';toc.append(strong)
    section=0
    for h2 in parsed.find_all('h2'):
        section+=1;h2['id']=f'section-{section}'
        if toc:
            toc.append(a(soup, f'#section-{section}',h2.get_text(' ',strip=True)))
    # Parse fragment children before removing old note sections.
    new_elements=list(parsed.contents)
    for node in list(article.contents):
        if node is first_media:
            break
        node.extract()
    for node in new_elements:
        first_media.insert_before(node)
    selected=[x for x in images if x['module']==slug]
    heading=article.select_one('h2#source-images')
    if selected and not heading:
        heading=soup.new_tag('h2',id='source-images');heading.string='Authentic clinical image practice'
        official.insert_before(heading)
        p=soup.new_tag('p')
        p.string='These are real source-credited clinical images, not official DLOSCE examination questions. Interpret in clinical context.'
        official.insert_before(p)
        cards=soup.new_tag('div',attrs={'class':'cases'})
        official.insert_before(cards)
    if heading:
        cards=article.select_one('.cases')
        if cards is None:
            cards=soup.new_tag('div',attrs={'class':'cases'});official.insert_before(cards)
        replace_children(cards,[make_image_card(img) for img in selected])
        if toc and selected:
            toc.append(a(soup,'#source-images','Clinical image practice'))
        if not selected:
            cards.decompose()
            # Remove explanatory paragraph attached to obsolete heading.
            sibling=heading.find_next_sibling()
            if sibling and sibling.name=='p':sibling.decompose()
            heading.decompose()
    if toc:
        toc.append(a(soup,'#official','References'))
    html_file.write_text(str(soup),encoding='utf-8')


def render_index_images(images: list[dict], questions: list[dict]) -> None:
    index=SITE/'index.html'
    soup=BeautifulSoup(index.read_text(encoding='utf-8'),'html.parser')
    cards=soup.select_one('#radiographs .cases')
    require(cards is not None, 'index.html: image-bank cards container not found')
    replace_children(cards, [make_image_card(img) for img in images])
    # Each scenario may have multiple distinct question items; keep both counts explicit.
    text_items=[q for q in questions if not q.get('image_id')]
    image_items=[q for q in questions if q.get('image_id')]
    distinct=len(set(str(q.get('base',q['id'])) for q in questions))
    single=sum(q.get('type')=='single' for q in questions)
    multi=sum(q.get('type')=='multi' for q in questions)
    rx=sum(q.get('type')=='prescription' for q in questions)
    for p in soup.find_all('p'):
        t=p.get_text(' ',strip=True)
        if t.startswith('Question-bank transparency:'):
            p.clear()
            marker=soup.new_tag('strong');marker.string='Question-bank transparency:';p.append(marker)
            p.append(f' {len(questions)} independently authored question items from {distinct} underlying scenario families ({single} single-answer, {multi} multiple-select, {rx} prescription items). {len(image_items)} use authentic licensed clinical images. Multiple questions may share a scenario. These are not ADA/ADEX examination items or predictors of passing.')
        elif t.startswith('The main 540 questions reuse') or t.startswith('The text question bank covers'):
            p.string=f'The bank contains {len(questions)} original question items grouped into {distinct} scenario families. Questions may share a clinical vignette while testing a different decision. The official 70 ADEX examples are linked, not reproduced.'
    foot=soup.find('footer')
    if foot:
        foot.string=f'Independent DLOSCE study platform · {len(questions)} original practice items across {distinct} underlying scenario families, including {len(image_items)} licensed-image items · Not affiliated with ADEX, JCNDE, ADA or Prometric.'
    description=soup.select_one('head meta[name="description"]')
    if description:
        description['content']=f'Independent DLOSCE high-yield notes, {len(questions)} original practice items, authentic clinical images, prescriptions, timed mocks and study progress tracking.'
    practice=soup.select_one('#practice-config > p')
    if practice:
        practice.clear()
        practice.append(f'{len(questions)} independently authored DLOSCE-style question items from {distinct} scenario families, including {len(image_items)} questions using authentic clinical images. ')
        stat=soup.new_tag('span',id='question-bank-stats')
        stat.string=f'{single} single-answer · {multi} multiple-select · {rx} prescription items.'
        practice.append(stat)
    total=soup.select_one('#total')
    if total:total.string=str(len(questions))
    for tag in soup.select('[data-bank-total]'):
        tag.string=str(len(questions))
    for tag in soup.select('[data-case-total]'):
        tag.string=str(distinct)
    index.write_text(str(soup),encoding='utf-8')


def render_question_js(questions: list) -> None:
    path=SITE/'questions-data.js'
    js=json.dumps(questions,ensure_ascii=False,separators=(',',':'))
    path.write_text('/* Independent DLOSCE-style cases, generated from questions.json. Not official ADEX exam items. */\nwindow.DLOSCE_QUESTIONS='+js+';\n',encoding='utf-8')


def render_image_map(images: list) -> None:
    # `platform.js` currently holds this map inline. Keep it synchronized with the metadata file.
    path=SITE/'platform.js';js=path.read_text(encoding='utf-8')
    mapped={i['id']:{k:i[k] for k in ('image','source','title','author')} for i in images}
    replacement='const IMAGE_MAP='+json.dumps(mapped,ensure_ascii=False,separators=(',',':'))+';\nlet DB='
    updated,n=re.subn(r'const IMAGE_MAP=\{.*?\};\s*let DB=',lambda match:replacement,js,count=1,flags=re.S)
    require(n==1, 'platform.js: IMAGE_MAP block not found. Stop to inspect before overwriting anything.')
    path.write_text(updated,encoding='utf-8')


def main():
    parser=argparse.ArgumentParser(description='Rebuild DLOSCE static notes and offline quiz data')
    parser.add_argument('--check',action='store_true',help='Check Markdown/JSON content only; do not modify files')
    args=parser.parse_args()
    questions=read_json(SITE/'questions.json')
    images=read_json(SITE/'authentic-image-bank.json')
    # Enrich missing fields in memory before validation. Existing instructor-written
    # case details are never replaced; simulated ages are explicitly labeled.
    from patient_metadata import enrich_questions
    enriched=enrich_questions(questions)
    validate(questions,images)
    if args.check:print('No files written (--check).');return
    if enriched:
        (SITE/'questions.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Enriched Patient Boxes for newly authored or incomplete questions.')

    for slug in sorted(MODULES):
        render_module(slug,images)
    render_index_images(images,questions)
    render_question_js(questions)
    render_image_map(images)
    from refresh_ui import apply_ui
    apply_ui(SITE)
    print('Built 9 HTML study modules, authentic image bank, question-data JS and image map.')
    print('Open index.html locally or publish the updated folder to GitHub Pages.')


if __name__=='__main__':
    try:main()
    except (ValueError,AssertionError) as error:
        print('ERROR:',error,file=sys.stderr)
        sys.exit(1)
