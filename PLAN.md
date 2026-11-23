# DLOSCE Prep: Maintainable Platform Plan

**Version:** 2026-11-22 · **Host:** GitHub Pages · **Architecture:** Static HTML/CSS/JavaScript + local Python build/editor.

## Exam interface architecture

`exam-simulator.js` is the shared standalone simulator engine, used by Practice and Timed Mock, with separate `exam-simulator.css` responsive styles. The original `platform.js` still owns content initialization, the progress dashboard, and the standalone prescription simulator. Both load the same `questions-data.js` bundle generated from `questions.json`.

Patient details are authored in `patient_box`, with `question_prompt` supplying an independent prompt separate from the clinical presentation. `patient_metadata.py` only fills missing source-faithful fields on rebuilds; no unknown history, medications, vital signs or allergies are invented. The patient panel uses the headings in the published candidate guide while avoiding copyrighted official text and imagery.

The independent 150-item practice schedule follows the publicly documented sections and optional breaks. Review maps, flags, font controls and keyboard shortcuts are **practice interface features**; do not claim a pixel-identical licensed Prometric interface. 3D study refers to the official external tutorial; the platform does not host genuine interactive exam models.

## Current content

- 500 independently authored DLOSCE-style **question items** in `questions.json`, grouped into 217 **underlying scenario families**.
- 63 single-response items; 428 multiple-response items; 9 prescription-form items.
- Approximate 2026 blueprint item allocation: restorative 120, prosthodontics 95, oral pathology/pain/TMD 65, periodontics 50, oral surgery 45, endodontics 40, orthodontics 30, medical emergencies 30, prescriptions 25.
- 11 questions include authentic externally sourced and credited clinical images, and the full image bank remains available.
- These are **original clinical educational exercises** following general DLOSCE presentation formats; NOT official ADA/ADEX questions and not expert-validated.

## Source-of-truth file map

```text
questions.json             ─┬─> build_content.py ─> questions-data.js ─> Quiz, Mock, Rx Simulator, Dashboard
authentic-image-bank.json  ─┤       │
<module>.md (nine files)  ───┤       ├─> study module HTML / authentic-image cards
site-settings.json         ─┘       └─> refresh_ui.py ─> shared navigation / branding
platform.js                           browser interactions + local progress
platform.css / site-ui.css            common responsive UI
study-recommendations.js              dynamic planner (same progress history)
site_editor.py                        optional local graphical editor
.github/workflows/validate.yml        build and regression check on GitHub push
```

**Do not maintain separate prescription questions in JavaScript.** The prescriptions simulator and quiz both load `questions.json` through the generated `questions-data.js`. `questions.json` is always the canonical question source. Avoid editing `questions-data.js` manually.

## Common maintenance workflow

1. Update `questions.json` with original clinical cases; set `type` to `single`, `multi`, or `prescription`.
2. For single-answer cases, `correct` is a **zero-based integer**. For multi-select, `correct` is an **array** of zero-based integers. For prescriptions, provide a `fields` array of `{label, choices, correct}` objects.
3. Edit `<module>.md` for study notes and `authentic-image-bank.json` for authentic images with source/author/license.
4. Run `python build_content.py --check`, then `python build_content.py`. Rebuild **twice** during testing to verify navigation remains unique.
5. Test representative single-answer, multiple-select and prescription questions in the browser, including the Rx simulator, timed mock and progress/dashboard view.
6. Commit and push the source and generated website files to `main`, and check GitHub Actions and Pages deployment.

```bash
python -m pip install -r requirements-editing.txt
python build_content.py --check
python build_content.py
python site_editor.py --serve
git add . && git commit -m "Update content" && git push origin main
```

## Rich Patient Boxes and persistent submitted review

All 500 Patient Boxes now use exactly four canonical JSON fields: `demographics`, `complaint`, `history`, and `current_findings`. The browser displays **Patient**, **Chief Complaint**, **Background and/or Patient History**, and **Current Findings** only; the endodontic table is embedded within findings. Relevant medications and allergies are text within `history`, not separate categories. Displayed demographics omit all parenthetical source annotations. These are fictional case profiles and some age/sex values were added for practice rather than originally specified; clinicians should assess their relevance before using the cases for study. Never assume unstated medications, allergies, systemic conditions or numerical vital signs.

`submitted-review.js` and `submitted-review.css` provide a separate read-only layer for reviewing submitted answers. Session snapshots (question IDs, selections, flagged state, date, mode) are saved in local browser storage under `dlosce_submitted_sessions_v1`, with a maximum of 30 sessions. `My Progress` lists saved sessions; earlier per-question attempts can be recovered from `dlosce_history_v3`. The review always uses the current answer key and Patient Box data, so explain this limitation when questions are edited. The review never regrades or rewrites previously recorded practice scores.

Test with `node tests/verify_submitted_review.mjs` and `node tests/verify_exam.mjs`. Ensure progress reset also deletes archive history. Neither the archive nor progress tracks clinical patients; it records students' local practice interactions.

## Progress and cache management

- Displayed bank size is `DB.length`, not an embedded number in grading code. The build script refreshes static counts on the homepage.
- Track both **question items** and **underlying cases**; do not present 500 items as 500 independent vignettes.
- Current bank attempts are stored only in the local browser as `dlosce_history_v3`; previous question-bank history is excluded. `study-recommendations.js` must read the same key.
- Version the script URLs (for example `questions-data.js?v=500-20261122`) when publishing a major question-bank update to prevent a stale cached bundle from showing the previous 570-item count.
- Rx rotation uses a local no-repeat queue; when the queue is exhausted, it reshuffles the nine available cases.

## Quality and exam safety

The code can check JSON structure and question-key indices, but **cannot verify clinical correctness**. Each item should be reviewed by a qualified dentist with current references, especially antibiotic dosing, medical emergencies, anticoagulation and endodontic diagnoses. See `QUESTION_BANK_REVIEW.md`.

Source/reference rules: link official [ADEX DLOSCE practice resources](https://adextesting.org/test-prep/dlosce-examination/) rather than copying the 70 official questions. Use actual licensed clinical photographs/radiographs with attribution; do not substitute AI-generated clinical images.

## Next development priorities

1. Formal faculty review of all 500 items, adding per-item source citations, review status and correction history.
2. Tag difficulty level and clinical domain/subdomain for adaptive study; validate distractors and question ambiguity.
3. Automated end-to-end UI tests for all three question formats and the prescription rotation.
4. Optional search and filtering by topic, question format, and attempted/incorrect status.
5. Only add Python/FastAPI/database hosting if shared student accounts, cross-device progress, or staff authoring become necessary. Static GitHub Pages remains simpler and cheaper until then.
