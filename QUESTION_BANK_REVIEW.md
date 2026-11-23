# Clinical Content Review Checklist

The 500 items are **independently authored DLOSCE-style educational drafts**, NOT original ADA/ADEX items and NOT a validated exam predictor. There are 217 scenario families; 500 is the number of distinct question items.

Each Patient Box displays only four fields: Patient; Chief Complaint; Background and/or Patient History; and Current Findings. Ages and sexes sometimes originate from fictional case design rather than from the question stem, so clinical reviewers must check that these assumptions do not change the defensible answer. Parenthetical source annotations are intentionally not shown inside the patient demographic field. Never introduce unstated medications, allergies or numerical vital signs; when such facts are explicitly given, include them within the history or findings instead of adding a fifth panel.

A read-only review archive displays the **current** question-bank answer key on later review. If answer options or keys are edited after submission, it may differ from the student's historical score; review history is preserved as a record of selections, not a permanent snapshot of every question version.

The Patient Box is populated from existing case text. Instructors must review each `patient_box` for completeness and confirm no omissions change the question's defensible answer. An automatically inferred field is a display convenience, not newly discovered patient history.

Pediatric appliance reference images remain part of the ordinary clinical image bank; the separate interactive error-spotter cases have been removed.

Before treating any item as exam-ready:
1. Assign a dental faculty/clinician reviewer familiar with the subject.
2. Verify the clinical vignette contains enough data to justify the question's intended answer.
3. Verify **every** option and every correct index against current authoritative sources; identify alternative defensible answers and ambiguity.
4. For multiple-select, verify the entire correct set and each inappropriate choice. The platform uses a *simulation* of partial credit; the ADEX scoring key is not provided.
5. For prescription forms, verify drug selection, medical indication, allergies, renal/hepatic status, interactions, strength, route, frequency, duration and quantity. Check current ADA/AHA guidelines. Avoid treating examples as patient-specific orders.
6. Confirm sources/credit/license for each authentic clinical image and ensure no identifying patient information is present.
7. Record the reviewer, date, reference URL, clinical corrections, and whether approved/rejected/needs revision.
8. Retest `python build_content.py --check`, the browser question engine, and progress page after corrections.

**Priority review subjects:** medical emergencies, antibiotic prescribing, endocarditis prophylaxis, anticoagulation, pulp diagnoses, oral pathology red flags.

**Official examination reference:** https://adextesting.org/test-prep/dlosce-examination/

**Example clinical references:**
- ADA dental antibiotics for pain/swelling: https://www.ada.org/resources/research/science/evidence-based-dental-research/antibiotics-for-dental-pain-and-swelling
- ADA acute dental pain management: https://www.ada.org/resources/research/science/evidence-based-dental-research/pain-management-guideline
- ADA antibiotic prophylaxis: https://www.ada.org/resources/ada-library/oral-health-topics/antibiotic-prophylaxis
- AHA infective endocarditis wallet card: https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/-/media/files/health-topics/infective-endocarditis/infective-endocarditis-wallet-card.pdf

Do not copy restricted ADEX question text or official copyrighted graphics into the repository without written authorization.

## November 2026 official-format and difficulty audit

The official June 2026 practice PDF uses questions 1–9 as single-response, questions 10–64 as multiple-response, questions 65–69 as multiple-response with individually sufficient full-credit options, and question 70 as a prescription-task illustration. Official guidance states the live DLOSCE includes two prescription tasks (antibiotics and analgesics). The practice-example format proportions do not establish the true distribution on a live exam.

All 500 question IDs and 217 scenario families remain stable. The 399 three-variant `D26` items were restructured with distractors and answer choices already keyed in other variants of the same clinical family. 100 additional single-response items now use multiple-response format with only one keyed correct option, which is permitted by the official format description. The bank currently holds **63 single-response, 428 multiple-response and 9 prescription items**. Choice counts now vary instead of uniformly presenting four or five. This is a **structural benchmark**, not proof of matched clinical complexity or a 95%-similarity score. Some unsafe distractors may still be transparent and some recombined options may require reclassification. Faculty review of every answer choice, clinical history, and the original question's intended reasoning remains necessary.

Two featured prescription items now have five medication rows, each with treatment-classification and regimen selections. They are educational simulations requiring separate review of indication, allergies, alternatives, contraindications, quantity, and dose. The platform supports optional `credit_weights`, `neutral`, and `full_credit_alternatives` metadata in multiple-response questions; assigning these requires documented subject-matter review. Incorrect responses give zero and the platform uses independent practice scoring, not a proprietary DLOSCE key.

**Do not copy or distribute copyrighted official practice questions or images in this public repository.** The PDF's user-visible patient data and format examples were used only for benchmarking.
