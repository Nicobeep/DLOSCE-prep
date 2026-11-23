/* Independent DLOSCE-style exam experience.
   Formats and scheduling are informed by public ADEX/JCNDE guides.
   This is not ADEX/ADA software, a secured test or validated scoring. */
(function () {
'use strict';
const RX_TUTORIAL='https://training.prod.prometric.mindgrb.io/PRC/PRC_TestScene/index.html';
const EXAM_HISTORY_KEY='dlosce_history_v3';
const byId=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const shuffle=list=>{const arr=[...list];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
const src=()=>Array.isArray(window.DLOSCE_QUESTIONS)?window.DLOSCE_QUESTIONS:[];
const fmt=q=>q.type==='multi'?'Multiple response':q.type==='prescription'?'Prescription task':'Single response';
const currentLabel=q=>q.module.replace(/-/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
let state=null,watch=null,preview=null;

function uniqueSample(pool, count) {
 const shuffled=shuffle(pool),families=new Map();
 for(const q of shuffled){const key=q.base||q.id;if(!families.has(key))families.set(key,q);}
 const unique=shuffle([...families.values()]).slice(0,count);
 if(unique.length<count)unique.push(...shuffled.filter(q=>!unique.some(a=>a.id===q.id)).slice(0,count-unique.length));
 return unique;
}
function selectFullSections(bank){
 const mc=uniqueSample(bank.filter(q=>q.type!=='prescription'),148);
 const rx=bank.filter(q=>q.type==='prescription');
 const antibiotic=rx.find(q=>q.id==='adex-style-prescriptions-01')||rx.find(q=>/amoxicillin|penicillin|antibiotic/i.test(q.stem));
 const analgesic=rx.find(q=>q.id==='adex-style-prescriptions-02')||rx.find(q=>/analgesi|acetaminophen|ibuprofen/i.test(q.stem)&&q.id!==antibiotic?.id);
 const scripts=[antibiotic,analgesic].filter(Boolean);
 if(mc.length<148||scripts.length!==2)throw Error('The full simulation needs 148 clinical items and two distinct prescription items.');
 return [
  {title:'Section 1 · Clinical questions',items:mc.slice(0,37),seconds:75*60,breakAfter:10},
  {title:'Section 2 · Clinical questions',items:mc.slice(37,74),seconds:75*60,breakAfter:0},
  {title:'Section 3 · Prescription tasks',items:scripts,seconds:10*60,breakAfter:30},
  {title:'Section 4 · Clinical questions',items:mc.slice(74,111),seconds:75*60,breakAfter:10},
  {title:'Section 5 · Clinical questions',items:mc.slice(111,148),seconds:75*60,breakAfter:0}
 ];
}
function beginExam(kind){
 if(state&&!state.done&&!window.confirm('Leave the current session? Responses not yet submitted will not be saved.'))return;
 stopClock();
 const bank=src();if(!bank.length){window.alert('Question data are not loaded. Refresh the page.');return}
 const host=kind==='practice'?'quiz':'mock-quiz';
 const config=byId(kind==='practice'?'practice-config':'mock-config');
 let sections;
 if(kind==='full')sections=selectFullSections(bank);
 else if(kind==='practice'){
  const module=byId('module')?.value||'all',format=byId('question-format')?.value||'all';
  const count=Number(byId('practice-count')?.value)||25;
  const pool=bank.filter(q=>(module==='all'||(module==='images'?Boolean(q.image_id):q.module===module))&&(format==='all'||q.type===format));
  if(!pool.length){window.alert('No questions match this subject and format. Select All modules or another format.');return}
  sections=[{title:'Practice question bank',items:uniqueSample(pool,Math.min(count,pool.length)),seconds:0,breakAfter:0}];
 }else{
  const count=Number(byId('mock-count')?.value)||50;
  const seconds=60*(Number(byId('mock-minutes')?.value)||60);
  sections=[{title:'Timed clinical mock',items:uniqueSample(bank,Math.min(count,bank.length)),seconds,breakAfter:0}];
 }
 state={kind,host,sections,section:0,pos:0,answers:new Map(),flags:new Set(),checked:new Set(),mapOpen:false,mapFilter:'all',done:false,paused:false,interlude:false,breaking:false,saved:false,deadline:0,remaining:0,study:kind==='practice'&&byId('practice-feedback')?.value==='instant',resize:0};
 if(config)config.hidden=true;
 const outlet=byId(host);if(!outlet)return;
 document.body.classList.add('exam-session-active');
 outlet.hidden=false;
 if(!outlet.dataset.examChangeBound){outlet.addEventListener('change',onChange);outlet.dataset.examChangeBound='true';}
 startClock();
 render();
 outlet.scrollIntoView({behavior:'instant',block:'start'});
}
function activeSection(){return state?.sections[state.section]}
function item(){return activeSection()?.items[state.pos]}
function answer(q){return state.answers.get(q.id)||null}
function completeAnswer(q,response){
 if(!response)return false;
 if(q.type==='prescription')return response.length===q.fields.length&&response.every(x=>Number.isInteger(x));
 return response.length>0;
}
function answeredCount(items=activeSection().items){return items.filter(q=>completeAnswer(q,answer(q))).length}
function fmtTime(seconds){return Math.floor(Math.max(seconds,0)/60)+':'+String(Math.max(seconds,0)%60).padStart(2,'0')}
function stopClock(){if(watch){clearInterval(watch);watch=null}}
function startClock(){
 stopClock();if(!state||!activeSection())return;
 state.remaining=activeSection().seconds;
 if(!state.remaining){state.deadline=0;return}
 state.deadline=Date.now()+state.remaining*1000;
 watch=setInterval(()=>{
  if(!state||state.done||state.breaking)return;
  state.remaining=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));
  const node=byId('exam-clock')||byId('exam-review-clock');
  if(node)node.textContent=fmtTime(state.remaining);
  if(!state.remaining){stopClock();sectionEnd(true)}
 },500);
}
function pauseClock(){
 if(!state||state.kind!=='practice'||!activeSection().seconds)return;
 if(state.paused){state.paused=false;state.deadline=Date.now()+state.remaining*1000;startClock();}
 else{state.remaining=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));stopClock();state.paused=true;}
 render();
}
function grade(q,selected){
 if(!completeAnswer(q,selected))return 0;
 if(q.type==='prescription')return selected.filter((x,i)=>x===q.fields[i].correct).length/q.fields.length;
 if(q.type==='single')return Number(selected[0]===q.correct);
 const neutral=q.neutral||[];
 if(selected.some(i=>!q.correct.includes(i)&&!neutral.includes(i)))return 0;
 const alternatives=q.full_credit_alternatives||[];
 if(alternatives.some(i=>selected.includes(i)))return 1;
 const weights=q.credit_weights||{};
 return Math.min(1,selected.filter(i=>q.correct.includes(i)).reduce((sum,i)=>sum+(Number.isFinite(weights[i])?weights[i]:1/q.correct.length),0));
}
function keyLabel(q){
 if(q.type==='prescription')return q.fields.map(f=>f.label+': '+f.choices[f.correct]).join(' | ');
 const ids=q.type==='multi'?q.correct:[q.correct];
 return ids.map(i=>String.fromCharCode(65+i)+'. '+q.choices[i]).join(' · ');
}
function patientBox(q){
 const p=q.patient_box;
 if(!p)return '<aside class="exam-patient" aria-label="Patient Box"><section class="exam-patient-row"><h4>Patient</h4><p>Not provided.</p></section></aside>';
 const row=(title,value,extra='')=>{
  const text=value&&value!=='—'
   ?esc(value).replace(/(^|\n)(Medications:|Allergies:)(?=\n|$)/g,'$1<strong>$2</strong>')
   :'<span class="sr-only">Not provided</span>';
  return '<section class="exam-patient-row"><h4>'+esc(title)+'</h4><p>'+text+'</p>'+extra+'</section>';
 };
 let endo='';
 if(Array.isArray(q.endo_chart)&&q.endo_chart.length){
  endo='<div class="exam-endo-table"><h5>Endodontic tests</h5><div class="exam-table-wrap"><table><thead><tr><th>Tooth</th><th>Perc.</th><th>Palp.</th><th>Cold</th><th>EPT</th></tr></thead><tbody>'+
  q.endo_chart.map(r=>'<tr><td>#'+esc(r.tooth)+'</td><td>'+esc(r.percussion||'—')+'</td><td>'+esc(r.palpation||'—')+'</td><td>'+esc(r.cold||'—')+'</td><td>'+esc(r.ept||'—')+'</td></tr>').join('')+'</tbody></table></div></div>';
 }
 return '<aside class="exam-patient" aria-label="Patient Box">'+
  row('Patient',p.demographics)+
  row('Chief Complaint',p.complaint)+
  row('Background and/or Patient History',p.history)+
  row('Current Findings',p.current_findings,endo)+
  '</aside>';
}
function sourceImage(q){
 if(!q.image_id)return '';
 const item=(typeof IMAGE_MAP!=='undefined'?IMAGE_MAP:{})[q.image_id];
 if(!item)return '';
 return '<figure class="exam-image"><div class="exam-image-wrap"><img src="'+esc(item.image)+'" alt="'+esc(item.title)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><p hidden>Image unavailable. <a href="'+esc(item.source)+'" target="_blank" rel="noopener">View original source</a>.</p></div><figcaption>'+esc(item.title)+' · '+esc(item.author)+' · <a href="'+esc(item.source)+'" target="_blank" rel="noopener">Source and license</a></figcaption><button type="button" class="exam-text-button" data-exam-action="zoom" data-image="'+esc(q.image_id)+'">Enlarge image</button></figure>';
}
function choiceMarkup(q){
 const stored=answer(q)||[];
 const disabled=state.study&&state.checked.has(q.id)?' disabled':'';
 if(q.type==='prescription')return '<div class="exam-rx-grid">'+q.fields.map((f,i)=>'<label class="exam-rx-field"><span>'+esc(f.label)+'</span><select data-exam-rx="'+i+'"'+disabled+'><option value="">Select...</option>'+f.choices.map((a,j)=>'<option value="'+j+'"'+(stored[i]===j?' selected':'')+'>'+esc(a)+'</option>').join('')+'</select></label>').join('')+'</div>';
 const isMulti=q.type==='multi';
 return '<fieldset class="exam-choices"><legend class="sr-only">'+(isMulti?'Select one or more responses':'Select one response')+'</legend>'+
 q.choices.map((text,i)=>{
  const selected=stored.includes(i),id='exchoice-'+state.section+'-'+state.pos+'-'+i;
  return '<label for="'+id+'" class="exam-choice'+(selected?' selected':'')+'"><input id="'+id+'" type="'+(isMulti?'checkbox':'radio')+'" name="exam-answer" value="'+i+'" '+(selected?'checked ':'')+disabled+'><span class="exam-choice-letter">'+String.fromCharCode(65+i)+'.</span><span class="exam-choice-text">'+esc(text)+'</span></label>';
 }).join('')+'</fieldset>';
}
function tooltip(q){
 if(q.type==='multi')return '<strong>Select ONE OR MORE answers.</strong> Any incorrect selection earns zero credit. Some correct selections may earn partial credit.';
 if(q.type==='prescription')return '<strong>Prescription exercise.</strong> Choose the indicated medication and all required prescription fields; check patient-specific factors.';
 return '<strong>Select the ONE correct answer.</strong>';
}
function feedback(q){
 if(!state.checked.has(q.id)||!state.study)return '';
 const earned=grade(q,answer(q));
 return '<div class="exam-feedback '+(earned<1?'exam-feedback-partial':'')+'" role="status"><strong>'+Math.round(earned*100)+'% practice credit</strong><p><b>Answer key:</b> '+esc(keyLabel(q))+'</p><p>'+esc(q.explanation)+'</p></div>';
}
function questionMap(){
 const items=activeSection().items,filter=state.mapFilter;
 const indices=items.map((q,i)=>({q,i})).filter(({q})=>filter==='all'||(filter==='flagged'?state.flags.has(q.id):!completeAnswer(q,answer(q))));
 return '<section class="exam-map-panel" aria-label="Question navigator"><div class="exam-map-top"><strong>Review & navigate</strong><button data-exam-action="toggle-map" class="exam-text-button" type="button">Close</button></div>'+
 '<div class="exam-map-filters"><button data-exam-action="filter" data-filter="all" '+(filter==='all'?'aria-pressed="true"':'')+'>All</button><button data-exam-action="filter" data-filter="unanswered" '+(filter==='unanswered'?'aria-pressed="true"':'')+'>Unanswered</button><button data-exam-action="filter" data-filter="flagged" '+(filter==='flagged'?'aria-pressed="true"':'')+'>Flagged</button></div>'+
 '<div class="exam-map-grid">'+(indices.length?indices.map(({q,i})=>{
 const marked=state.flags.has(q.id),has=completeAnswer(q,answer(q));
 return '<button type="button" data-exam-action="jump" data-index="'+i+'" class="'+(i===state.pos?'active ':'')+(has?'answered ':'')+(marked?'flagged':'')+'" aria-label="Question '+(i+1)+(has?', answered':'')+(marked?', flagged':'')+'">'+(i+1)+(marked?'*':'')+'</button>';
 }).join(''):'<p class="exam-empty">No questions match this filter.</p>')+'</div><p class="exam-map-legend">Filled: answered · *: flagged · Outline: unanswered</p></section>';
}
function render(){
 if(!state)return;
 if(state.done){renderResults();return}
 if(state.breaking){renderBreak();return}
 if(state.interlude){renderInterlude();return}
 const section=activeSection(),q=item(),host=byId(state.host);
 if(!host||!q)return;
 const total=section.items.length,selected=answer(q);
 const marked=state.flags.has(q.id),checked=state.checked.has(q.id);
 const flagCount=section.items.filter(x=>state.flags.has(x.id)).length;
 const choiceHint=tooltip(q);
 const image=sourceImage(q),title=q.question_prompt||q.stem;
 const map=state.mapOpen?questionMap():'';
 const examKind=state.kind==='full'?'Full-schedule simulation':state.kind==='mock'?'Timed mock exam':'Practice session';
 const progress=Math.round(100*answeredCount()/total);
 host.innerHTML='<div class="exam-shell" data-mode="'+esc(state.kind)+'">'+
 '<header class="exam-toolbar"><div class="exam-toolbar-name"><span class="exam-eyebrow">Independent DLOSCE-style practice</span><strong>'+esc(examKind)+'</strong><small>'+esc(section.title)+' · '+(state.section+1)+' / '+state.sections.length+'</small></div>'+
 '<div class="exam-toolbar-meta"><div><small>Question</small><strong>'+(state.pos+1)+' / '+total+'</strong></div><div><small>Answered</small><strong id="exam-answered">'+answeredCount()+' / '+total+'</strong></div>'+
 (section.seconds?'<div class="exam-time"><small>Time remaining</small><strong id="exam-clock" role="timer">'+fmtTime(state.remaining)+'</strong></div>':'<div class="exam-time"><small>Timer</small><strong>Untimed</strong></div>')+
 '<button type="button" class="exam-toolbar-exit" data-exam-action="exit">Exit</button></div></header>'+
 '<div class="exam-progress-track" aria-label="Answered '+answeredCount()+' of '+total+' questions"><span style="width:'+progress+'%"></span></div>'+
 '<div class="exam-subbar"><span>'+esc(currentLabel(q))+' · '+esc(fmt(q))+'</span><div class="exam-subbar-actions"><button type="button" data-exam-action="toggle-map">Question map ('+flagCount+' flagged)</button><a href="'+RX_TUTORIAL+'" target="_blank" rel="noopener noreferrer" title="Open official interactive 3D model tutorial in a new tab">Official 3D tutorial</a><button type="button" data-exam-action="font-smaller" title="Reduce text size">A−</button><button type="button" data-exam-action="font-larger" title="Increase text size">A+</button></div></div>'+
 map+'<div class="exam-layout" style="--exam-font-adjust:'+state.resize+'px">'+patientBox(q)+
 '<article class="exam-question-panel"><div class="exam-question-head"><span>Question '+(state.pos+1)+'</span><button type="button" data-exam-action="flag" class="exam-flag '+(marked?'is-flagged':'')+'" aria-pressed="'+marked+'">'+(marked?'Flagged for review':'Flag for review')+'</button></div>'+
 '<div class="exam-instruction">'+choiceHint+'</div><h2 id="exam-question-title" tabindex="-1">'+esc(title)+'</h2>'+image+choiceMarkup(q)+feedback(q)+
 '<p class="exam-format-note">This is an original educational item, not an official DLOSCE question. Response keys are shown in the final review'+(state.study?' or after Check answer':'')+'.</p></article></div>'+
 '<footer class="exam-actions"><button type="button" data-exam-action="prev" '+(state.pos===0?'disabled':'')+'>Previous</button>'+
 (state.study?'<button type="button" data-exam-action="check" '+(checked||!completeAnswer(q,selected)?'disabled':'')+'>Check answer</button>':'')+
 '<button type="button" data-exam-action="toggle-map">Review map</button><span class="exam-actions-fill"></span>'+
 (state.pos<total-1?'<button type="button" class="exam-primary" data-exam-action="next">Next question</button>':'<button type="button" class="exam-primary" data-exam-action="section-end">Review section</button>')+
 '</footer></div>';
 const titleNode=byId('exam-question-title');if(titleNode)titleNode.focus({preventScroll:true});
}
function readInputs(q){
 if(!state)return;
 const host=byId(state.host);if(!host||state.checked.has(q.id))return;
 let chosen;
 if(q.type==='prescription'){
  chosen=q.fields.map((_,i)=>{const x=host.querySelector('select[data-exam-rx="'+i+'"]');return x&&x.value!==''?Number(x.value):null});
 }else chosen=[...host.querySelectorAll('input[name="exam-answer"]:checked')].map(x=>Number(x.value));
 if(q.type!=='prescription'&&chosen.length===0)state.answers.delete(q.id);
 else state.answers.set(q.id,chosen);
}
function onChange(event){
 if(!state||state.done||state.interlude)return;
 if(!event.target.matches('[name="exam-answer"],[data-exam-rx]'))return;
 const q=item();readInputs(q);
 const host=byId(state.host);
 if(host){
  host.querySelectorAll('.exam-choice').forEach(label=>label.classList.toggle('selected',Boolean(label.querySelector('input:checked'))));
  const count=host.querySelector('#exam-answered');if(count)count.textContent=answeredCount()+' / '+activeSection().items.length;
  const bar=host.querySelector('.exam-progress-track span');if(bar)bar.style.width=Math.round(100*answeredCount()/activeSection().items.length)+'%';
  const check=host.querySelector('[data-exam-action="check"]');if(check)check.disabled=!completeAnswer(q,answer(q));
 }
}
function jump(index){
 if(!state||!Number.isInteger(index)||index<0||index>=activeSection().items.length)return;
 state.pos=index;render();
}
function check(){
 if(!state||!state.study)return;
 const q=item();readInputs(q);
 if(!completeAnswer(q,answer(q)))return;
 state.checked.add(q.id);render();
}
function sectionEnd(timeExpired=false){
 if(!state)return;
 state.interlude=true;state.timedOut=Boolean(timeExpired);if(timeExpired)stopClock();renderInterlude();
}
function renderInterlude(){
 const section=activeSection(),items=section.items,host=byId(state.host);
 if(!host)return;
 const missing=items.filter(q=>!completeAnswer(q,answer(q)));
 const marked=items.filter(q=>state.flags.has(q.id));
 const isLast=state.section===state.sections.length-1;
 const breakTime=section.breakAfter;
 host.innerHTML='<div class="exam-shell"><div class="exam-interlude"><span class="exam-eyebrow">Section review</span><h2>'+esc(section.title)+'</h2>'+
 (state.timedOut?'<p class="exam-alert">The section timer has expired. This section is now locked.</p>':'<p>Check your unanswered or flagged questions before submitting this section.</p>')+
 '<div class="exam-review-stats">'+(section.seconds?'<div><strong id="exam-review-clock">'+fmtTime(state.remaining)+'</strong><span>Time remaining</span></div>':'')+'<div><strong>'+answeredCount(items)+'</strong><span>Answered</span></div><div><strong>'+missing.length+'</strong><span>Unanswered</span></div><div><strong>'+marked.length+'</strong><span>Flagged</span></div></div>'+
 (!state.timedOut&&missing.length?'<p>Unanswered question numbers: '+missing.map(q=>items.indexOf(q)+1).join(', ')+'</p>':'')+
 (!state.timedOut&&marked.length?'<p>Flagged question numbers: '+marked.map(q=>items.indexOf(q)+1).join(', ')+'</p>':'')+
 '<div class="exam-interlude-buttons">'+(!state.timedOut?'<button type="button" data-exam-action="back-section">Return to questions</button>':'')+
 '<button type="button" class="exam-primary" data-exam-action="confirm-section">'+(isLast?'Submit exam and view results':'Submit section'+(breakTime?' · optional '+breakTime+'-minute break':'') )+'</button></div>'+
 '<p class="exam-small">After submitting a section in full-schedule mode, you cannot return to that section. The actual examination interface and break controls may differ.</p></div></div>';
}
function renderBreak(){
 const host=byId(state.host);if(!host)return;
 host.innerHTML='<div class="exam-shell"><div class="exam-interlude"><span class="exam-eyebrow">Optional scheduled break · independent practice</span><h2>Break before '+esc(activeSection().title)+'</h2><p>The published guide includes scheduled breaks. You can continue at any time.</p><div class="exam-review-stats"><div><strong id="exam-break-clock">'+fmtTime(state.breakRemaining)+'</strong><span>Break time remaining</span></div><div><strong>'+(state.section+1)+' / '+state.sections.length+'</strong><span>Next section</span></div></div><button class="exam-primary" type="button" data-exam-action="continue-break">Continue to next section</button><p class="exam-small">No clinical content is available during this simulated break. Exact test-center policies and timing should be checked in the official guide.</p></div></div>';
}
function startBreak(minutes){
 state.breaking=true;state.breakRemaining=minutes*60;state.breakDeadline=Date.now()+minutes*60000;stopClock();renderBreak();
 watch=setInterval(()=>{if(!state||!state.breaking)return;state.breakRemaining=Math.max(0,Math.ceil((state.breakDeadline-Date.now())/1000));const label=byId('exam-break-clock');if(label)label.textContent=fmtTime(state.breakRemaining);if(state.breakRemaining===0)continueBreak();},500);
}
function continueBreak(){
 if(!state||!state.breaking)return;
 stopClock();state.breaking=false;state.pos=0;state.mapOpen=false;startClock();render();
}
function confirmSection(){
 if(!state)return;
 const isLast=state.section===state.sections.length-1;
 if(!state.timedOut&&answeredCount()<activeSection().items.length&&!window.confirm('Some questions are unanswered. Submit this section anyway?'))return;
 if(isLast){finishExam();return}
 const minutes=activeSection().breakAfter;
 stopClock();
 state.section++;state.pos=0;state.interlude=false;state.mapOpen=false;state.mapFilter='all';
 if(minutes)startBreak(minutes);
 else{startClock();render();}
}
function finishExam(){
 if(!state||state.done)return;
 state.done=true;state.interlude=false;stopClock();
 if(!state.saved){
  let history=[];try{const x=JSON.parse(localStorage.getItem(EXAM_HISTORY_KEY)||'[]');if(Array.isArray(x))history=x}catch{}
  const stamp=new Date().toISOString();
  for(const section of state.sections)for(const q of section.items){
   const selected=answer(q);
   if(!completeAnswer(q,selected))continue;
   const credit=grade(q,selected);
   history.push({id:q.id,base:q.base||q.id,module:q.module,correct:credit>=0.999,score:credit,selected,kind:'exam-simulator-'+state.kind,date:stamp});
  }
  try{localStorage.setItem(EXAM_HISTORY_KEY,JSON.stringify(history.slice(-5000)))}catch{}
  // Keep a read-only submitted snapshot for later review from My Progress,
  // including unanswered and flagged questions. Stored locally in this browser.
  if(window.DLOSCEArchive){
    const items=state.sections.flatMap(section=>section.items.map(q=>({
      id:q.id,selected:Array.isArray(answer(q))?answer(q):[],flagged:state.flags.has(q.id)
    })));
    state.savedReviewId=window.DLOSCEArchive.save({kind:state.kind,date:stamp,items});
  }
  state.saved=true;
  if(typeof renderDashboard==='function')renderDashboard();
 }
 renderResults();
}
function renderResults(){
 const host=byId(state.host);if(!host)return;
 const items=state.sections.flatMap(s=>s.items);
 const answered=items.filter(q=>completeAnswer(q,answer(q)));
 const earned=items.reduce((n,q)=>n+grade(q,answer(q)),0);
 const byModule=new Map();
 for(const q of items){
  const old=byModule.get(q.module)||{credit:0,count:0};
  old.count++;old.credit+=grade(q,answer(q));byModule.set(q.module,old);
 }
 host.innerHTML='<div class="exam-shell"><div class="exam-results"><span class="exam-eyebrow">Practice complete</span><h2>Session results</h2><p class="exam-result-number">'+earned.toFixed(1)+' <span>/ '+items.length+' possible points</span></p><p>'+answered.length+' answered · '+(items.length-answered.length)+' unanswered · '+Math.round(100*earned/items.length)+'% practice credit</p>'+
 '<p class="exam-alert">This simulator is independent. Its case difficulty, scoring and results are not official ADEX/JCNDE scores or predictors of licensure outcomes.</p>'+
 '<h3>Performance by subject</h3><div class="exam-results-modules">'+[...byModule.entries()].map(([m,r])=>'<div><span>'+esc(currentLabel({module:m}))+'</span><strong>'+Math.round(100*r.credit/r.count)+'%</strong><small>'+r.count+' items</small></div>').join('')+'</div>'+
 '<h3>Answer review and explanations</h3><div class="exam-result-list">'+items.map((q,i)=>{
 const ans=answer(q);
 const selected=ans? (q.type==='prescription'?q.fields.map((f,j)=>f.label+': '+(Number.isInteger(ans[j])?f.choices[ans[j]]:'Blank')).join(' | '):ans.map(j=>String.fromCharCode(65+j)+'. '+q.choices[j]).join(' · ')):'No answer submitted';
 return '<details class="exam-result-item"><summary><span>Q'+(i+1)+' · '+esc(currentLabel(q))+'</span><strong>'+Math.round(100*grade(q,ans))+'% credit</strong></summary><p>'+esc(q.question_prompt||q.stem)+'</p><p><b>Your response:</b> '+esc(selected)+'</p><p><b>Answer key:</b> '+esc(keyLabel(q))+'</p><p>'+esc(q.explanation)+'</p></details>';
 }).join('')+'</div>'+
 '<div class="exam-end-buttons"><button data-exam-action="exit" type="button">Return to practice settings</button>'+
 (state.savedReviewId?'<button data-exam-action="review-saved" type="button" class="exam-primary">Revisit every submitted question</button>':'')+
 '<button data-exam-action="progress" type="button" class="exam-primary">View my progress</button></div></div></div>';
}
function exitExam(){
 if(!state)return;
 if(!state.done&&!window.confirm('Leave this session? Unsubmitted answers will not be saved.'))return;
 stopClock();closeZoom();
 const host=byId(state.host),config=byId(state.host==='quiz'?'practice-config':'mock-config');
 if(host){host.hidden=true;host.innerHTML=''}
 document.body.classList.remove('exam-session-active');
 if(config)config.hidden=false;
 state=null;
}
function openZoom(id){
 const im=(typeof IMAGE_MAP!=='undefined'?IMAGE_MAP:{})[id];if(!im)return;
 closeZoom();
 preview=document.createElement('div');preview.className='exam-lightbox';preview.setAttribute('role','dialog');preview.setAttribute('aria-modal','true');preview.setAttribute('aria-label','Clinical image viewer');
 preview.innerHTML='<div class="exam-lightbox-card"><div class="exam-lightbox-header"><strong>'+esc(im.title)+'</strong><button type="button" data-exam-zoom-close aria-label="Close enlarged image">Close ×</button></div>'+
 '<div class="exam-lightbox-stage"><img src="'+esc(im.image)+'" alt="'+esc(im.title)+'" referrerpolicy="no-referrer"></div>'+
 '<div class="exam-lightbox-controls"><label>Magnification <input type="range" id="exam-image-zoom" min="1" max="3" step=".1" value="1"></label><button type="button" data-exam-zoom-reset>Reset</button><a href="'+esc(im.source)+'" target="_blank" rel="noopener noreferrer">Open licensed source</a></div></div>';
 document.body.appendChild(preview);document.body.classList.add('exam-modal-open');
 preview.addEventListener('click',e=>{if(e.target===preview||e.target.closest('[data-exam-zoom-close]'))closeZoom();if(e.target.closest('[data-exam-zoom-reset]')){const z=preview.querySelector('#exam-image-zoom');z.value='1';preview.querySelector('img').style.transform='scale(1)';}});
 preview.querySelector('#exam-image-zoom').addEventListener('input',e=>preview.querySelector('img').style.transform='scale('+e.target.value+')');
 preview.querySelector('[data-exam-zoom-close]').focus();
}
function closeZoom(){if(preview){preview.remove();preview=null;document.body.classList.remove('exam-modal-open')}}
function action(event){
 const button=event.target.closest('[data-exam-action]');if(!button||!state)return;
 event.preventDefault();
 const what=button.dataset.examAction;
 if(what==='review-saved'){if(state.savedReviewId&&window.DLOSCEArchive)window.DLOSCEArchive.open(state.savedReviewId)}
 else if(what==='exit')exitExam();
 else if(what==='prev')jump(state.pos-1);
 else if(what==='next')jump(state.pos+1);
 else if(what==='jump'){state.mapOpen=false;jump(Number(button.dataset.index))}
 else if(what==='flag'){const id=item().id;state.flags.has(id)?state.flags.delete(id):state.flags.add(id);render()}
 else if(what==='check')check();
 else if(what==='section-end')sectionEnd();
 else if(what==='confirm-section')confirmSection();
 else if(what==='back-section'){state.interlude=false;render()}
 else if(what==='continue-break')continueBreak()
 else if(what==='toggle-map'){state.mapOpen=!state.mapOpen;render()}
 else if(what==='filter'){state.mapFilter=button.dataset.filter||'all';render()}
 else if(what==='zoom')openZoom(button.dataset.image);
 else if(what==='font-larger'){state.resize=Math.min(7,state.resize+1);render()}
 else if(what==='font-smaller'){state.resize=Math.max(-3,state.resize-1);render()}
 else if(what==='progress'){exitExam();if(typeof switchTab==='function')switchTab('dashboard')}
}
document.addEventListener('click',event=>{if(event.target.closest('[data-exam-action]'))action(event)});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&preview){closeZoom();return}
 if(!state||state.done||state.interlude||state.breaking||preview)return;
 const target=event.target,tag=target?.tagName;
 if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
 if(event.altKey&&event.key==='ArrowRight'){event.preventDefault();jump(state.pos+1)}
 if(event.altKey&&event.key==='ArrowLeft'){event.preventDefault();jump(state.pos-1)}
 if(event.altKey&&event.key.toLowerCase()==='f'){event.preventDefault();const id=item().id;state.flags.has(id)?state.flags.delete(id):state.flags.add(id);render()}
});
window.addEventListener('hashchange',()=>{
 if(state&&!state.done&&!['#practice','#mock'].includes(location.hash))stopClock();
});
window.startExam=beginExam;
window.renderExamPatientBox=patientBox;
window.__DLOSCEExamForTests={uniqueSample,selectFullSections,grade,patientBox,rxFormats:()=>src().filter(q=>q.type==='prescription').length};
})();
