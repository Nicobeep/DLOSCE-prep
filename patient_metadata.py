"""Maintain concise four-section Patient Boxes for original DLOSCE practice items.

Visible fields:
    demographics -> Patient
    complaint -> Chief Complaint
    history -> Background and/or Patient History (including relevant medications)
    current_findings -> Current Findings

Questions are fictional educational cases. Do not invent unstated medical facts.
"""
from __future__ import annotations

import re
import zlib

ASK = re.compile(r'\.\s+(?=(?:What|Which|Select|How|When|Complete|Describe|In addition)\b)', re.I)
HISTORY = re.compile(
    r'\b(diabet(?:es|ic)|hypertension|kidney disease|renal failure|liver disease|'
    r'anticoagulan(?:t|ts)|apixaban|warfarin|aspirin|immunocompromised|asthma|'
    r'cardiac|prosthetic valve|head.and.neck radiation|rheumatoid|transplant|'
    r'cancer|corticosteroid|pregnan|antiresorptive|penicillin allergy|'
    r'no penicillin allergy|smok(?:es|er|ing)|bisphosphonate|prior endocarditis|'
    r'medications?|no allergies|no medication allergies)\b', re.I
)
FIELDS = ('demographics', 'complaint', 'history', 'current_findings')
MISSING_MED = re.compile(r'^(?:medication list not supplied|medication list not provided|no medication list|not provided|not documented)', re.I)
MISSING_ALLERGY = re.compile(r'^(?:drug allergy status not supplied|allergy status not supplied|no allergy details|not provided|not documented)', re.I)


def _demographics(text: str, context: str, key: str) -> str:
    """Keep a concise demographic line or an explicitly blank field."""
    if text.strip() in ('—', 'Young adult', 'Older adult'):
        return text.strip()
    current = re.match(r'^\s*(male|female),\s*(\d{1,3})\s+years? old\b', text, re.I)
    if current:
        return f'{current.group(1).capitalize()}, {current.group(2)} years old'
    old = re.match(r'^\s*(\d{1,3})-year-old\s+(male|female|boy|girl|man|woman)\s+patient', text, re.I)
    if old:
        sex = 'Female' if old.group(2).lower() in ('female', 'girl', 'woman') else 'Male'
        return f'{sex}, {old.group(1)} years old'
    age = re.search(r'\b(\d{1,3})[- ]year[- ]old\b', context, re.I)
    sex = re.search(r'\b(male|female|man|woman|boy|girl)\b', context, re.I)
    stable = zlib.crc32(key.encode('utf-8'))
    if age:
        years = int(age.group(1))
    elif re.search(r'\b(child|pediatric|mixed dentition)\b', context, re.I):
        years = 9
    elif re.search(r'\b(adolescent|teenager|teen)\b', context, re.I):
        years = 15
    elif re.search(r'\b(elderly|older adult|edentulous)\b', context, re.I):
        years = 71
    else:
        years = 30 + stable % 36
    label = ('Female' if sex.group(1).lower() in ('female', 'woman', 'girl') else 'Male') if sex else ('Female' if stable % 2 else 'Male')
    return f'{label}, {years} years old'


def infer_patient_metadata(question: dict) -> bool:
    """Fill missing data, and convert older Patient Boxes to exactly four fields."""
    stem = question.get('stem', '')
    matches = list(ASK.finditer(stem))
    cut = matches[-1] if matches else None
    context = stem[:cut.start() + 1].strip() if cut else stem.strip()
    prompt = stem[cut.end():].strip() if cut else stem.strip()
    changed = False

    if cut and not question.get('question_prompt'):
        question['question_prompt'] = prompt
        changed = True

    old = question.get('patient_box')
    old = old if isinstance(old, dict) else {}
    demographics = _demographics(old.get('demographics', ''), context, str(question.get('base', question.get('id', ''))))
    quoted = re.search(r'[\u201c"]([^\u201d"]{6,130})[\u201d"]', context)
    complaint = re.search(
        r'\b(?:reports?|complains? of|presents? with|seeks? care for)\s+([^.;]{8,120})',
        context, re.I
    )
    chief = old.get('complaint') or (quoted.group(1) if quoted else complaint.group(1).strip() if complaint else 'Clinical evaluation')
    history = (old.get('history') or '').strip()
    if not history or history.lower().startswith(('additional medical and surgical history is not provided', 'additional medical history is not supplied')):
        history = 'Not provided.'
    if not old:
        history = 'Relevant history described in the clinical findings.' if HISTORY.search(context) else 'Not provided.'

    parts = [history]
    medication = str(old.get('medications') or '').strip()
    if medication and not MISSING_MED.match(medication) and 'Medications:' not in history:
        parts.append('Medications:\n' + re.sub(r'^Mentioned in case:\s*', '', medication, flags=re.I))
    allergies = str(old.get('allergies') or '').strip()
    if allergies and not MISSING_ALLERGY.match(allergies) and 'Allergies:' not in history:
        parts.append('Allergies:\n' + allergies)

    compact = {
        'demographics': demographics,
        'complaint': str(chief),
        'history': '\n\n'.join(parts),
        'current_findings': old.get('current_findings') or context
    }
    if old != compact:
        question['patient_box'] = compact
        changed = True

    if question.get('module') == 'endodontics' and 'endo_chart' not in question:
        tooth = re.search(r'#(\d{1,2})\b', context)
        cold = ''
        if re.search(r'no response to cold', context, re.I):
            cold = 'No response'
        elif re.search(r'lingering cold|prolonged cold', context, re.I):
            cold = 'Lingering response'
        elif re.search(r'brief cold', context, re.I):
            cold = 'Brief response'
        percussion = ''
        if re.search(r'no significant percussion tenderness|percussion (?:is )?negative|negative percussion', context, re.I):
            percussion = '−'
        elif re.search(r'tender(?:ness)? (?:to )?percussion|percussion tenderness', context, re.I):
            percussion = '+'
        if tooth and (cold or percussion):
            question['endo_chart'] = [{
                'tooth': tooth.group(1), 'percussion': percussion,
                'palpation': '', 'cold': cold, 'ept': ''
            }]
            changed = True
    return changed


def enrich_questions(questions: list[dict]) -> int:
    return sum(bool(infer_patient_metadata(q)) for q in questions)
