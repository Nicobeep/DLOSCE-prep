'use strict';
const MODULES=[['restorative','Restorative Dentistry',24],['prosthodontics','Prosthodontics',19],['oral-pathology','Oral Pathology, Pain & TMD',13],['periodontics','Periodontics',10],['oral-surgery','Oral Surgery',9],['endodontics','Endodontics',8],['orthodontics','Orthodontics',6],['medical-emergencies','Medical Emergencies',6],['prescriptions','Prescriptions',5]];
const IMAGE_MAP={"caries_pa":{"image":"https://upload.wikimedia.org/wikipedia/commons/3/34/Tooth_decay_and_abscess_xray.png","source":"https://commons.wikimedia.org/wiki/File:Tooth_decay_and_abscess_xray.png","title":"Caries with periapical findings","author":"Coronation Dental Specialty Group"},"crown":{"image":"https://upload.wikimedia.org/wikipedia/commons/d/d2/Ceramic_crown_preparation.jpg","source":"https://commons.wikimedia.org/wiki/File:Ceramic_crown_preparation.jpg","title":"Ceramic crown preparation","author":"EditingDentist"},"rpd":{"image":"https://upload.wikimedia.org/wikipedia/commons/b/b1/Valplast_removable_partial_denture.jpg","source":"https://commons.wikimedia.org/wiki/File:Valplast_removable_partial_denture.jpg","title":"Removable partial denture","author":"Matthew Ferguson 57"},"leukoplakia":{"image":"https://upload.wikimedia.org/wikipedia/commons/c/c3/Leukoplakia.jpg","source":"https://commons.wikimedia.org/wiki/File:Leukoplakia.jpg","title":"Oral leukoplakia clinical photograph","author":"National Cancer Institute / NIH"},"dentigerous":{"image":"https://upload.wikimedia.org/wikipedia/commons/7/77/JawCyst.jpg","source":"https://commons.wikimedia.org/wiki/File:JawCyst.jpg","title":"Dentigerous jaw cyst radiograph","author":"Coronation Dental Specialty Group"},"bone":{"image":"https://upload.wikimedia.org/wikipedia/commons/d/d3/Bone_loss_in_periapical_xray.jpg","source":"https://commons.wikimedia.org/wiki/File:Bone_loss_in_periapical_xray.jpg","title":"Periapical film showing periodontal bone loss","author":"Shaimaa Abdellatif"},"perio_endo":{"image":"https://upload.wikimedia.org/wikipedia/commons/5/58/Perio-endo_lesion.JPG","source":"https://commons.wikimedia.org/wiki/File:Perio-endo_lesion.JPG","title":"Perio–endo lesion radiograph","author":"Wikimedia Commons user Lesion"},"molar":{"image":"https://upload.wikimedia.org/wikipedia/commons/7/7f/Third_molar_impacted_mesioangular.jpg","source":"https://commons.wikimedia.org/wiki/File:Third_molar_impacted_mesioangular.jpg","title":"Mesioangular impacted mandibular third molar","author":"Nizil Shah"},"panoramic":{"image":"https://upload.wikimedia.org/wikipedia/commons/5/5c/Basic_panoramic_radiograph.jpg","source":"https://commons.wikimedia.org/wiki/File:Basic_panoramic_radiograph.jpg","title":"Panoramic radiograph with impacted third molars","author":"Coronation Dental Specialty Group"},"periapical":{"image":"https://upload.wikimedia.org/wikipedia/commons/2/2d/Abscessed_tooth_periapical_radiograph.jpg","source":"https://commons.wikimedia.org/wiki/File:Abscessed_tooth_periapical_radiograph.jpg","title":"Periapical radiograph with apical radiolucencies","author":"Coronation Dental Specialty Group"},"classii":{"image":"https://upload.wikimedia.org/wikipedia/commons/6/68/Class2division1malocclusion.jpg","source":"https://commons.wikimedia.org/wiki/File:Class2division1malocclusion.jpg","title":"Class II division 1 malocclusion","author":"Challiyan"},"calc":{"image":"https://upload.wikimedia.org/wikipedia/commons/2/22/Caries%2C_Periodontal_disease%2C_calculus.png","source":"https://commons.wikimedia.org/wiki/File:Caries%2C_Periodontal_disease%2C_calculus.png","title":"Periodontal inflammation, calculus and caries","author":"Warren Schneider"},"peds_hyrax":{"image":"https://upload.wikimedia.org/wikipedia/commons/6/6e/Hyrax_rapid_palatal_expander.png","source":"https://commons.wikimedia.org/wiki/File:Hyrax_rapid_palatal_expander.png","title":"Hyrax rapid palatal expander","author":"Ian Furst"},"peds_fan":{"image":"https://upload.wikimedia.org/wikipedia/commons/b/b1/Fan_palatal_expander.png","source":"https://commons.wikimedia.org/wiki/File:Fan_palatal_expander.png","title":"Fan-type palatal expander","author":"Ian Furst"},"peds_pendulum":{"image":"https://upload.wikimedia.org/wikipedia/commons/f/ff/Pendulum_appliance.jpg","source":"https://commons.wikimedia.org/wiki/File:Pendulum_appliance.jpg","title":"Pendulum appliance for molar distalization","author":"Challiyan"},"peds_removable_expander":{"image":"https://upload.wikimedia.org/wikipedia/commons/5/53/Dental_palatal_expander.jpg","source":"https://commons.wikimedia.org/wiki/File:Dental_palatal_expander.jpg","title":"Removable palatal expansion plate","author":"Luis2492"},"peds_space_regainer":{"image":"https://upload.wikimedia.org/wikipedia/commons/c/ca/Space_regainer.jpg","source":"https://commons.wikimedia.org/wiki/File:Space_regainer.jpg","title":"Active removable space regainer","author":"Reiherente"}};
let DB=[], session=[], pos=0, results=[], timerId=null,deadline=null,mode='practice',currentSubject='all',showImages=true;
const $=s=>document.querySelector(s); const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>MODULES.find(m=>m[0]===s)?.[1]||s;
function loadHistory(){try{return JSON.parse(localStorage.getItem('dlosce_history_v3')||'[]')}catch{return []}}
function saveAttempt(q,score,selected,kind){let h=loadHistory();h.push({id:q.id,base:q.base,module:q.module,correct:score>=0.999,score,selected,kind,date:new Date().toISOString()});localStorage.setItem('dlosce_history_v3',JSON.stringify(h.slice(-5000)))}
function init(){
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click', e=>{e.preventDefault();switchTab(el.dataset.tab)}));
  const onLoaded = d => {
    if(!Array.isArray(d)||!d.length) throw new Error('The question database is missing or empty.');
    DB=d;
    renderHome();
    renderDashboard();
    initializeRxSimulator();
    const p=new URLSearchParams(location.search);
    if(p.get('module')) {
      const chooser=$('#module');
      if(chooser && [...chooser.options].some(opt=>opt.value===p.get('module'))) chooser.value=p.get('module');
      switchTab('practice');
    }
  };
  const showError = error => {
    console.error('DLOSCE site initialization error:',error);
    const notice=$('#question-load-status');
    if(notice){notice.hidden=false;notice.textContent='The question bank could not initialize: '+error.message+'. Please re-extract the complete website ZIP so questions-data.js and platform.js are alongside index.html.'}
  };
  // Bundled JS data works on file:// URLs as well as on HTTP(S). No server required.
  try {
    if(Array.isArray(window.DLOSCE_QUESTIONS)) {onLoaded(window.DLOSCE_QUESTIONS);return}
  } catch(error){showError(error);return}
  // Fallback if the site owner deliberately removed the offline data bundle.
  fetch('questions.json').then(r=>{if(!r.ok)throw new Error('questions.json HTTP '+r.status);return r.json()}).then(onLoaded).catch(showError);
}
function switchTab(t){clearInterval(timerId);document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!==t);if(t==='dashboard')renderDashboard();if(t==='practice'){$('#practice-config').hidden=false;$('#quiz').hidden=true}if(t==='mock'){$('#mock-config').hidden=false;$('#mock-quiz').hidden=true}location.hash=t;}
function renderHome(){
  const cards=MODULES.map((m,i)=>{
    const pool=DB.filter(q=>q.module===m[0]);
    const distinct=new Set(pool.map(q=>q.base??q.id)).size;
    return `<article class="module-card">
      <div class="module-card-head"><span class="module-id">MODULE ${String(i+1).padStart(2,'0')}</span><span class="module-weight-label">${m[2]}% of blueprint</span></div>
      <h3>${escapeHTML(m[1])}</h3>
      <p>${distinct} underlying case topics · ${pool.length} question items</p>
      <div class="module-actions"><a href="${m[0]}.html">Read high-yield notes</a><a href="?module=${m[0]}#practice">Practice →</a></div>
    </article>`;
  }).join('');
  const modules=$('#modules');if(modules)modules.innerHTML=cards;
  const totalNode=$('#total');if(totalNode)totalNode.textContent=DB.length;
  document.querySelectorAll('[data-bank-total]').forEach(el=>el.textContent=String(DB.length));
  document.querySelectorAll('[data-case-total]').forEach(el=>el.textContent=String(new Set(DB.map(q=>q.base||q.id)).size));
  const stats=$('#question-bank-stats');if(stats)stats.textContent=['single','multi','prescription'].map(t=>DB.filter(q=>q.type===t).length+' '+(t==='single'?'single-answer':t==='multi'?'multiple-select':'prescription')+' items').join(' · ');
  updateQuestionCountOptions();
  const chooser=$('#module');if(chooser)chooser.innerHTML='<option value="all">All modules</option>'+MODULES.map(m=>`<option value="${m[0]}">${m[1]}</option>`).join('')+'<option value="images">Authentic image-based questions</option>';
}
function updateQuestionCountOptions(){
 const configure=(id,values)=>{
   const el=$(id);if(!el)return;
   const current=Number(el.value)||values[0];
   const available=values.filter(n=>n<=DB.length);
   el.innerHTML=available.map(n=>'<option value="'+n+'">'+n+'</option>').join('');
   el.value=String(available.find(n=>n>=current)||available[available.length-1]);
 };
 configure('#practice-count',[10,25,50,75,100,150,250,500]);
 configure('#mock-count',[25,50,75,100,150,200]);
}
function seededShuffle(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function startQuiz(kind){mode=kind;let count=Math.min(Number($('#'+kind+'-count').value),DB.length),subject=kind==='practice'?$('#module').value:'all';currentSubject=subject;showImages=false;let format=kind==='practice'?($('#question-format')?.value||'all'):'all';let pool=DB.filter(q=>(subject==='all'||(subject==='images'?Boolean(q.image_id):q.module===subject))&&(format==='all'||q.type===format));if(!pool.length){alert('No questions match the selected subject and format. Try All modules or a different format.');return;} // Avoid duplicates of the same underlying clinical case within a session when possible.
let groups=new Map();for(const q of seededShuffle([...pool])){const key=q.module+':'+q.base;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q)}
let unique=seededShuffle([...groups.values()]).map(g=>g[Math.floor(Math.random()*g.length)]);let chosen=unique.slice(0,count);if(chosen.length<count){let seen=new Set(chosen.map(q=>q.id));chosen.push(...seededShuffle(pool.filter(q=>!seen.has(q.id))).slice(0,count-chosen.length))}
session=chosen;pos=0;results=[];$('#'+kind+'-config').hidden=true;$('#'+(kind==='mock'?'mock-quiz':'quiz')).hidden=false;if(kind==='mock'){let mins=Number($('#mock-minutes').value);deadline=Date.now()+mins*60000;timerId=setInterval(()=>{let s=Math.max(0,Math.ceil((deadline-Date.now())/1000));{const clock=$('#clock');if(clock)clock.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}if(s<=0)finishQuiz()},500)}renderQuestion()}

function answerSummary(q){
 if(q.type==='prescription')return q.fields.map(f=>f.label+': '+f.choices[f.correct]).join(' · ');
 if(q.type==='multi')return q.correct.map(i=>q.choices[i]).join(' · ');
 return q.choices[q.correct];
}
function renderQuestion(){
 const q=session[pos],target=mode==='mock'?'mock-quiz':'quiz';
 if(!q){finishQuiz();return}
 let media='';
 if(q.image_id&&IMAGE_MAP[q.image_id]){
   const a=IMAGE_MAP[q.image_id];
   media='<figure class="source-img"><img src="'+a.image+'" alt="'+escapeHTML(a.title)+'" loading="eager" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><p hidden>Source image unavailable. <a href="'+a.source+'" target="_blank" rel="noopener">View original</a></p><figcaption>Authentic licensed clinical image: '+escapeHTML(a.author)+' · <a href="'+a.source+'" target="_blank" rel="noopener">Original image and license</a>. Not an official DLOSCE examination image.</figcaption></figure>';
 }
 let choices='',hint='';
 if(q.type==='multi'){
   hint='Select ONE OR MORE correct answers. Selecting any incorrect option earns NO CREDIT. Correct selections may earn partial credit.';
   choices='<fieldset class="quiz-choices"><legend class="sr-only">Select one or more answers</legend>'+q.choices.map((a,i)=>'<label class="multi-option"><input type="checkbox" name="answer" value="'+i+'"><span><b>'+String.fromCharCode(65+i)+'.</b> '+escapeHTML(a)+'</span></label>').join('')+'</fieldset><button class="quiz-submit" type="button" onclick="submitMulti()">Submit selection</button>';
 }else if(q.type==='prescription'){
   hint='Choose each medication-regimen component. This is an educational prescription task with simplified scoring, not the official ADEX scoring key.';
   choices='<div class="rx-grid">'+q.fields.map((f,i)=>'<label class="rx-field">'+escapeHTML(f.label)+'<select data-rx-field="'+i+'" aria-label="'+escapeHTML(f.label)+'"><option value="">Select a regimen</option>'+f.choices.map((v,j)=>'<option value="'+j+'">'+escapeHTML(v)+'</option>').join('')+'</select></label>').join('')+'</div><button class="quiz-submit" type="button" onclick="submitPrescription()">Submit prescription</button>';
 }else{
   hint='Select the ONE correct answer.';
   choices='<div class="quiz-choices">'+q.choices.map((a,i)=>'<button class="option" data-i="'+i+'" onclick="choose('+i+')">'+String.fromCharCode(65+i)+'. '+escapeHTML(a)+'</button>').join('')+'</div>';
 }
 $('#'+target).innerHTML='<div class="panel"><div class="quiztop"><span class="tag">'+escapeHTML(label(q.module))+'</span><span class="tag format-tag">'+(q.type==='prescription'?'Prescription task':q.type==='multi'?'Multiple-select':'Single-select')+'</span><strong>Question '+(pos+1)+' / '+session.length+'</strong>'+(mode==='mock'?'<strong id="clock">Timed session</strong>':'')+'</div><div class="progress"><div style="width:'+(100*pos/session.length)+'%"></div></div><p class="quiz-instructions">'+hint+'</p><h2>'+escapeHTML(q.stem)+'</h2>'+media+'<div id="choices">'+choices+'</div><div id="explain" role="status" aria-live="polite"></div><button class="secondary" id="next" hidden onclick="advance()">'+(pos===session.length-1?'Finish session':'Next question →')+'</button></div>';
}
function recordAnswer(score,selected){
 if(results[pos])return;
 const q=session[pos];score=Math.max(0,Math.min(1,score));
 results[pos]={q,score,ok:score>=0.999,selected};
 saveAttempt(q,score,selected,mode);
 $('#choices').querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
 if(mode==='practice'){
   $('#explain').innerHTML='<div class="feedback '+(score>=0.999?'':'bad')+'"><strong>'+Math.round(score*100)+'% of available points.</strong><p><strong>Key:</strong> '+escapeHTML(answerSummary(q))+'</p><p>'+escapeHTML(q.explanation)+'</p><small>Independent educational scoring; not a predicted licensure score.</small></div>';
 }else $('#explain').textContent='Answer recorded. Key and explanation will be shown after submission.';
 $('#next').hidden=false;
}
function choose(i){const q=session[pos];if(q.type!=='single'||results[pos])return;recordAnswer(Number(i===q.correct),i)}
function submitMulti(){
 const q=session[pos];if(q.type!=='multi'||results[pos])return;
 const selected=[...document.querySelectorAll('#choices input[name="answer"]:checked')].map(el=>Number(el.value));
 if(!selected.length){$('#explain').textContent='Select at least one option before submitting.';return}
 const neutral=q.neutral||[];
 const incorrect=selected.some(i=>!q.correct.includes(i)&&!neutral.includes(i));
 const alternatives=q.full_credit_alternatives||[];
 const weights=q.credit_weights||{};
 const credit=incorrect?0:alternatives.some(i=>selected.includes(i))?1:Math.min(1,selected.filter(i=>q.correct.includes(i)).reduce((sum,i)=>sum+(Number.isFinite(weights[i])?weights[i]:1/q.correct.length),0));
 recordAnswer(credit,selected);
}
function submitPrescription(){
 const q=session[pos];if(q.type!=='prescription'||results[pos])return;
 const fields=[...document.querySelectorAll('#choices select[data-rx-field]')];
 if(fields.some(el=>el.value==='')){$('#explain').textContent='Complete every prescription field.';return}
 const selected=fields.map(el=>Number(el.value));
 const correct=selected.filter((v,i)=>v===q.fields[i].correct).length;
 recordAnswer(correct/q.fields.length,selected);
}
function advance(){pos++;renderQuestion()}
function finishQuiz(){
 clearInterval(timerId);if(!session.length)return;
 const total=session.length,answered=results.filter(Boolean).length;
 const earned=results.reduce((n,r)=>n+(r?.score||0),0);
 const full=results.filter(r=>r?.ok).length;
 const target=mode==='mock'?'mock-quiz':'quiz';
 const reviews=session.map((q,i)=>{
  const r=results[i];
  const yours=!r?'Not answered':q.type==='prescription'?r.selected.map((v,j)=>q.fields[j].choices[v]).join(' · '):q.type==='multi'?r.selected.map(v=>q.choices[v]).join(' · '):q.choices[r.selected];
  return '<details class="panel"><summary><strong>Q'+(i+1)+'</strong> '+(r?Math.round(r.score*100)+'% credit':'Unanswered')+' — '+escapeHTML(label(q.module))+' ('+escapeHTML(q.type)+')</summary><p>'+escapeHTML(q.stem)+'</p><p><strong>Key:</strong> '+escapeHTML(answerSummary(q))+'</p><p><strong>Your answer:</strong> '+escapeHTML(yours)+'</p><p>'+escapeHTML(q.explanation)+'</p></details>';
 }).join('');
 $('#'+target).innerHTML='<div class="panel"><h2>Session complete</h2><div class="stat">'+earned.toFixed(1)+' / '+total+' points</div><p>'+answered+' answered · '+(total-answered)+' unanswered · '+full+' full-credit responses · '+Math.round(100*earned/total)+'% of available points</p><p class="note">Multiple-select and prescription credit are educational approximations, not the confidential ADEX scoring key. Practice scores cannot predict passing.</p><button onclick="switchTab(\'dashboard\')">View weakness dashboard</button> <button class="secondary" onclick="switchTab(\''+mode+'\')">Start another session</button></div><h2>Answer review</h2>'+reviews;
 renderDashboard();
}
function renderDashboard(){
 const valid=new Set(DB.map(q=>q.id)),h=loadHistory().filter(x=>valid.has(x.id));
 const attempts=h.length,seen=new Set(h.map(x=>x.id));
 const score=h.reduce((a,x)=>a+(Number.isFinite(x.score)?x.score:Number(x.correct)),0);
 const families=new Set(h.map(x=>DB.find(q=>q.id===x.id)?.base||x.id));
 const maxFamilies=new Set(DB.map(q=>q.base||q.id)).size;
 const percent=DB.length?Math.round(100*seen.size/DB.length):0;
 const target=$('#dashboard-summary');
 if(!target)return;
 const accuracy=attempts?Math.round(100*score/attempts)+'%':'—';
 target.innerHTML=`<dl class="dashboard-stats">
  <div class="dashboard-stat">
   <dt>Coverage</dt>
   <dd class="dashboard-number">${seen.size} / ${DB.length}</dd>
   <dd class="dashboard-stat-detail">${percent}% of the bank · ${families.size} of ${maxFamilies} case families</dd>
  </div>
  <div class="dashboard-stat">
   <dt>Accuracy</dt>
   <dd class="dashboard-number">${accuracy}</dd>
   <dd class="dashboard-stat-detail">${attempts?`Average credit across ${attempts} ${attempts===1?'attempt':'attempts'}`:'No graded attempts yet'}</dd>
  </div>
  <div class="dashboard-stat">
   <dt>Completed sessions</dt>
   <dd class="dashboard-number" id="dashboard-session-count">0</dd>
   <dd class="dashboard-stat-detail">Available to review on this browser</dd>
  </div>
 </dl>`;
 const rows=MODULES.map(m=>{
   const items=DB.filter(q=>q.module===m[0]),taken=h.filter(x=>x.module===m[0]);
   const c=taken.reduce((n,x)=>n+(Number.isFinite(x.score)?x.score:Number(x.correct)),0);
   return {id:m[0],name:m[1],total:items.length,seen:new Set(taken.map(x=>x.id)).size,attempts:taken.length,score:taken.length?Math.round(100*c/taken.length):null}
 }).sort((a,b)=>(a.score===null?Infinity:a.score)-(b.score===null?Infinity:b.score));
 const subjects=$('#weakness');
 if(subjects)subjects.innerHTML=rows.map(x=>`<li class="dashboard-subject">
  <a href="index.html?module=${encodeURIComponent(x.id)}#practice">${escapeHTML(x.name)}</a>
  <strong>${x.score===null?'—':x.score+'%'}</strong>
  <small>${x.seen} / ${x.total} practiced</small>
  <small>${x.attempts} ${x.attempts===1?'attempt':'attempts'}</small>
 </li>`).join('');
 const note=$('#weakness-note');
 if(note)note.textContent=attempts?'Credit is averaged across attempts from the current question bank. Scores are for practice.':'Practice a subject to see its average credit here.';
 if(window.DLOSCEArchive)window.DLOSCEArchive.refresh();
}
function resetHistory(){if(confirm('Delete all locally stored practice results AND submitted-session reviews on this browser?')){localStorage.removeItem('dlosce_history_v3');if(window.DLOSCEArchive)window.DLOSCEArchive.clear();renderDashboard()}}
function exportHistory(){let blob=new Blob([JSON.stringify(loadHistory(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dlosce-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
// The prescription simulator shares its cases with questions.json via DB.
// Queue persists across refreshes and cycles through scenarios before repeating.
const RX_QUEUE_KEY='dlosce_rx_rotation_500_v1';
let rxGraded=false;
function rxItems(){return DB.filter(q=>q.type==='prescription'&&Array.isArray(q.fields))}
function rxTitle(q){return q.stem.split('. ')[0].replace(/^Original /,'')}
function pickRxCase(){
 const ids=rxItems().map(q=>q.id);
 if(!ids.length)return '';
 let queue=[],last='';
 try{queue=JSON.parse(localStorage.getItem(RX_QUEUE_KEY)||'[]');last=localStorage.getItem(RX_QUEUE_KEY+'_last')||''}catch{}
 queue=Array.isArray(queue)?queue.filter(id=>ids.includes(id)):[];
 if(!queue.length)queue=seededShuffle([...ids]);
 if(queue.length>1&&queue[queue.length-1]===last){
   const i=queue.findIndex(x=>x!==last);
   if(i>=0)[queue[i],queue[queue.length-1]]=[queue[queue.length-1],queue[i]];
 }
 const id=queue.pop();
 try{localStorage.setItem(RX_QUEUE_KEY,JSON.stringify(queue));localStorage.setItem(RX_QUEUE_KEY+'_last',id)}catch{}
 return id;
}
function initializeRxSimulator(){
 const selector=$('#rx-case'),cases=rxItems();
 if(!selector)return;
 selector.innerHTML=cases.map(q=>'<option value="'+escapeHTML(q.id)+'">'+escapeHTML(rxTitle(q))+'</option>').join('');
 if(!cases.length){$('#rx-content').textContent='No prescription scenarios available.';return}
 selector.value=pickRxCase();renderRx();
}
function nextRxCase(){
 const selector=$('#rx-case');if(!selector)return;
 const current=selector.value;
 let next=pickRxCase();
 if(next===current&&rxItems().length>1)next=pickRxCase();
 selector.value=next||current;renderRx();
}
function renderRx(){
 const selector=$('#rx-case'),output=$('#rx-content');
 if(!selector||!output)return;
 const cases=rxItems(),q=cases.find(x=>x.id===selector.value);
 if(!q){output.textContent='Choose a scenario to begin.';return}
 rxGraded=false;
 const patient=typeof window.renderExamPatientBox==='function'?window.renderExamPatientBox(q):'';
 const fields=q.fields.map((f,i)=>'<label class="rx-field">'+escapeHTML(f.label)+'<select id="rx-'+i+'" aria-label="'+escapeHTML(f.label)+'"><option value="">Select...</option>'+f.choices.map((v,j)=>'<option value="'+j+'">'+escapeHTML(v)+'</option>').join('')+'</select></label>').join('');
 output.innerHTML='<div class="exam-shell"><div class="exam-layout exam-rx-layout">'+patient+'<div class="exam-question-panel"><div class="rx-scenario"><span class="tag">Original simulated prescription · '+(cases.findIndex(x=>x.id===q.id)+1)+' of '+cases.length+'</span><h3>'+escapeHTML(rxTitle(q))+'</h3><p>'+escapeHTML(q.question_prompt||q.stem)+'</p></div><div class="rx-grid">'+fields+'</div><p class="rx-controls"><button onclick="gradeRx()">Grade prescription</button> <button class="secondary" type="button" onclick="nextRxCase()">Different case</button></p><div id="rx-grade" role="status" aria-live="polite"></div></div></div></div>';
}
function gradeRx(){
 if(rxGraded)return;
 const q=rxItems().find(x=>x.id===$('#rx-case')?.value);
 if(!q)return;
 const fields=q.fields.map((_,i)=>$('#rx-'+i));
 if(fields.some(x=>!x||x.value==='')){$('#rx-grade').textContent='Complete all fields before grading.';return}
 const picks=fields.map(x=>Number(x.value));
 const correct=picks.filter((v,i)=>v===q.fields[i].correct).length;
 const score=correct/q.fields.length;rxGraded=true;
 fields.forEach(el=>el.disabled=true);
 saveAttempt(q,score,picks,'prescription-simulator');
 const reviewId=window.DLOSCEArchive?window.DLOSCEArchive.save({kind:'prescription-simulator',date:new Date().toISOString(),items:[{id:q.id,selected:picks,flagged:false}]}):null;
 $('#rx-grade').innerHTML='<div class="feedback '+(score>=1?'':'bad')+'"><strong>'+correct+' of '+q.fields.length+' fields correct</strong><ul>'+q.fields.map((f,i)=>'<li>'+escapeHTML(f.label)+': '+(picks[i]===f.correct?'Correct':'Expected '+escapeHTML(f.choices[f.correct]))+'</li>').join('')+'</ul><p>'+escapeHTML(q.explanation)+'</p><small>Educational simulation only; verify patient-specific indications, contraindications, and current prescribing guidance.</small><p><button type="button" class="secondary" onclick="nextRxCase()">Try another scenario</button></p></div>';
 if(reviewId)$('#rx-grade').innerHTML+='<p><button type="button" data-review-action="open" data-session-id="'+escapeHTML(reviewId)+'">Revisit this submitted prescription</button></p>';
 renderDashboard();
}
window.addEventListener('DOMContentLoaded',()=>{init();let hash=location.hash.slice(1);if(['practice','mock','dashboard','radiographs','anatomy','prescriptions'].includes(hash))switchTab(hash)});
