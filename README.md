# DLOSCE Prep — Independent Clinical Practice Platform

A static, mobile-friendly DLOSCE-style study platform with **500 question items drawn from 217 underlying clinical scenario families**, nine subject guides, sourced clinical images, timed practice, a rotating prescription simulator, study planning, and a progress dashboard.

**Important:** Questions and explanations are independently authored educational drafts. They are **not official ADEX/ADA examination questions**, have not undergone formal clinical expert review, and are not validated indicators of exam readiness. The [official ADEX 70-question guide](https://adextesting.org/wp-content/uploads/2026/06/DLOSCE-Practice-Questions-June-2026-N70.pdf) is linked, not reproduced.



### Patient Boxes and submitted-question review

All **500 Patient Boxes** follow the four-section format in the official June 2026 practice guide. **Patient** gives concise demographics, **Chief Complaint** gives the symptoms or reason for the visit, **Background and/or Patient History** includes medications and allergies when provided, and **Current Findings** summarizes the examination and test results. Sections with no applicable detail are blank. The profiles are fictional and retain some demographics assigned in earlier versions of the bank. The [Patient Box revision notes](project-notes/PATIENT_BOX_EXPANSION_METHOD.md) identify the additional background details adapted from the practice guide.

After submitting a Practice, Timed Mock, Full Schedule, or standalone prescription session, students may select **Revisit every submitted question** or open **My Progress → Submitted sessions and answer review**. They can review their original choices, correct choices, partial credit, clinical explanation, Patient Box, and cited clinical image in a read-only interface, using previous/next, a numbered navigation map, or filters for incorrect/partial and flagged questions.

Review snapshots live only in the user's current browser at \`dlosce_submitted_sessions_v1\` (latest 30 sessions). Earlier individual answers can be opened using the existing \`dlosce_history_v3\` history. **Page refreshes preserve review sessions**, subject to browser storage settings. No new login, tracking server, patient records, or sync is introduced. Clearing local progress removes stored review sessions too. The Progress page also exports submitted reviews as JSON.

Source of truth remains \`questions.json\`, bundled into \`questions-data.js\`. \`submitted-review.js\` and \`submitted-review.css\` implement read-only review without duplicating the grading workflow; \`patient_metadata.py\` populates only missing source-faithful fields on rebuild.


The interactive pediatric appliance error spotter was removed. The ordinary clinical image bank and orthodontic appliance study notes remain available.

## Exam-style simulator (2026)

The **Practice** and **Timed Mock** buttons use the independent \`exam-simulator.js\` / \`exam-simulator.css\` layer:

- **Patient Box:** compact blue section headings and white content rows. Medication and allergy details appear in Background and/or Patient History. Clinical examination and any endodontic test table appear in Current Findings.
- **Clinical resources:** source-credited clinical images with enlargement/zoom and source links; endodontic test tables when available. For actual manipulable 3D models, use the **official ADEX model tutorial link**, not a fake or copyrighted model.
- **Responses:** one-choice, one-or-more-choice (correct/incorrect/neutral support), and multipart prescription-form tasks, including loading-dose fields and multiple regimen components. The simulator's scoring is an educational approximation, not the undisclosed official key.
- **Test interface:** previous/next, flag-for-review, question navigator, answered/unanswered map, section timer, font sizing, keyboard shortcuts (Alt+Left, Alt+Right, Alt+F), optional study-mode explanation after checking, end-of-section review, and detailed final answer review.
- **Full-schedule simulation:** 150 items over 5 sections — 37 questions / 75 min, 37 / 75 min, 2 prescription tasks / 10 min, 37 / 75 min, 37 / 75 min. Includes optional break screens (10, 30, 10 min). These controls are independent UI features and should not be assumed identical to Prometric software.
- **Standalone prescription simulator:** shares the same nine prescription questions and Patient Box fields with the question bank. Its refresh rotation avoids immediate repeats.

**Editing patient data:** \`patient_box\` includes \`demographics\`, \`complaint\`, \`history\`, and \`current_findings\`. If adding a new case without a Patient Box, \`patient_metadata.py\` populates only source-faithful fields during the build. The graphical editor supports editing this JSON and a separate \`question_prompt\`.

**Copyright:** the independent UI only imitates generic exam workflows based on public specifications. It does not reproduce ADEX exam images or clinical 3D models. The official [DLOSCE preparation page](https://adextesting.org/test-prep/dlosce-examination/) remains the authoritative reference.

## Architecture: one editable source of truth

| File | Purpose |
| --- | --- |
| `questions.json` | **Edit this**: 500 item records, including 9 prescription-form questions |
| `questions-data.js` | Generated offline/browser bundle from `questions.json`; do not edit directly |
| `platform.js` | Single quiz engine, multiple-select grading, timed sessions, progress, and the Rx simulator |
| `platform.css`, `site-ui.css` | Shared visual design and responsive navigation |
| `<module>.md` | Edit one of the nine Markdown study guides |
| `<module>.html` | Generated study modules; retain original image credit blocks |
| `authentic-image-bank.json` | License/source metadata for real clinical photographs and radiographs |
| `site_editor.py` | Local Windows/Python graphical editor (notes, questions, images, website text) |
| `build_content.py`, `refresh_ui.py` | Static-site build, content validation and idempotent shared UI |
| `study-recommendations.js` | Blueprint planner using the same locally saved practice history |

No production Python server or database is needed. The site runs directly on GitHub Pages.

## Edit and publish

1. Install **Python 3.10+** and run `python -m pip install -r requirements-editing.txt` in the project folder.
2. Launch `START_EDITOR_WINDOWS.bat` (Windows) or `python site_editor.py`.
3. In **Questions**, edit a single-answer, multiple-select or prescription-form question; or edit Markdown notes / image metadata.
4. Click **Save current tab**, then **Build website**. Alternatively run:
   ```bash
   python build_content.py --check
   python build_content.py
   ```
5. Test locally with `python site_editor.py --serve` and open `http://127.0.0.1:8000/index.html`.
6. Publish:
   ```bash
   git add .
   git commit -m "Update DLOSCE study content"
   git push origin main
   ```
7. GitHub Actions validates the build, question formats and single navigation bar on all modules.

## 500-item bank and scoring

- **63** single-response items.
- **428** multiple-response items (some have only one correct option); correct selections earn proportional partial credit **only if no incorrect option is selected**.
- **9** prescription-form items, including two five-medication treatment-classification and regimen cases; each field is checked separately.
- **217** underlying case families (some scenarios contribute more than one question).
- **11** cases linked to authentic sourced images, accessed from the original hosting sites.

The prescription simulator **reads the same nine prescription questions** from `questions.json`, without maintaining a second drug-case array. Refreshing or selecting **Different case** rotates through cases without immediate repetition. Clinical guidance should always be checked against current ADA/AHA material.

The progress page reads the current `DB.length` dynamically. It tracks **items attempted / 500**, **case families covered / 217**, mean practice credit and per-module coverage. Practice history for this bank is stored locally under `dlosce_history_v3`; older history is not mixed in. No data is synchronized between devices.

For clinical content review and validation requirements, see `QUESTION_BANK_REVIEW.md`.

## Maintenance and copyright

Use original question text and legitimately licensed real clinical images. Do not redistribute official ADA/ADEX item text, illustrations or answer keys without authorization. The practice guide may be linked instead. Treat any generated clinical items as drafts requiring review by a qualified clinician before relying on them for study.

See `PLAN.md` for the architecture and improvement roadmap.

### Clinical format calibration — November 2026

The official June 2026 70-example document contains 9 single-response examples, 60 multiple-response examples, and 1 prescription task example. It states that the actual exam has **two** prescription tasks, an antibiotic and an analgesic task. These example counts are **not** a validated live-test format distribution.

The bank retains 500 original items/217 scenario families and now includes 63 single-response, 428 multiple-response and 9 prescription simulations. 399 three-variant scenario questions were recombined with existing keyed distractors and clinical statements. This is a format-and-selection-difficulty upgrade, **not** a verified 95% match to actual licensure difficulty. All revised questions and medication decisions remain faculty-review drafts. Optional scoring metadata supports weighted partial credit, neutral responses and independent full-credit alternatives, but the bank does not claim to know official scoring weights. The two featured prescription tasks have five medicines with individual classification and regimen choices; their dose keys require clinical review.

## November 23, 2026 — Local 500-item clinical rewrite draft

The uploaded source archive was edited **locally only**; no GitHub push or commit was made.
All 500 questions have revised editorial content or retain prior calibrated
examples, and the website was regenerated with updated question data. The two
calibration examples remain available. Medical-emergency answer keys were
checked for an identified stroke-key safety error and corrected for the three
related items.

**Do not infer exam equivalence from this change.** Expanded distractors are
working drafts generated with topic-specific clinical decision patterns. They
are not independently faculty-validated and should be audited for alternative
correct responses, specificity, and evidence before using practice scores to
assess licensure readiness. Progress and local session storage remain intact.

- Quality report: `project-notes/QUESTION_UPGRADE_STATUS.md`
- 500-item audit: `project-notes/500_question_quality_audit.csv`
- Saved calibration results: `project-notes/difficulty-calibration/CALIBRATION_PROGRESS.md`
- Review methodology: `project-notes/difficulty-calibration/REWRITE_METHODOLOGY.md`

The **“Spot what’s wrong with this appliance”** bank and its corresponding
code, CSS, data, build references, and tests remain removed. Regular licensed
clinical image practice and pediatric orthodontics study notes are preserved.

## Patient Box update (November 23, 2026)

All 500 question records now use more clearly organized four-section Patient Boxes. The source vignettes are sometimes too short to support invented histories or radiographic measurements; unspecified facts are identified as such. The two calibrated clinical cases were retained. See `project-notes/PATIENT_BOX_ENRICHMENT_NOTES.md` and `project-notes/PATIENT_BOX_AUDIT.csv`.
