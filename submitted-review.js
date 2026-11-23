/* Submitted-answer review: independent, client-only history.
   Stores question IDs and submitted selections, NOT patient-identifying data.
   Review is READ-ONLY; reopening a submission cannot change its recorded grade. */
(() => {
'use strict';
const STORAGE='dlosce_submitted_sessions_v1';
const BANK=()=>Array.isArray(window.DLOSCE_QUESTIONS)?window.DLOSCE_QUESTIONS:[];
const one=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
let current=null,volatile=[];
function readStored(){
 try{
  const records=JSON.parse(localStorage.getItem(STORAGE)||'[]');
  if(Array.isArray(records))return records.filter(s=>s&&s.id&&Array.isArray(s.items));
 }catch{}
 return [];
}
function all(){
 const stored=readStored();
 const missing=volatile.filter(s=>!stored.some(r=>r.id===s.id));
 return [...missing,...stored].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function getQuestion(id){return BANK().find(q=>q.id===id)}
function answered(q,response){
 if(!Array.isArray(response))return false;
 if(q.type==='prescription')return response.length===q.fields.length&&response.every(Number.isInteger);
 return response.length>0;
}
function points(q,response){
 if(!answered(q,response))return 0;
 if(q.type==='prescription')return response.filter((x,i)=>x===q.fields[i].correct).length/q.fields.length;
 if(q.type==='single')return Number(response[0]===q.correct);
 const neutral=q.neutral||[];
 if(response.some(i=>!q.correct.includes(i)&&!neutral.includes(i)))return 0;
 const alternatives=q.full_credit_alternatives||[];
 if(alternatives.some(i=>response.includes(i)))return 1;
 const weights=q.credit_weights||{};
 return Math.min(1,response.filter(i=>q.correct.includes(i)).reduce((sum,i)=>sum+(Number.isFinite(weights[i])?weights[i]:1/q.correct.length),0));
}
function normalize(snapshot){
 if(!snapshot||!Array.isArray(snapshot.items))return null;
 const items=snapshot.items.filter(x=>x&&typeof x.id==='string').map(x=>({
  id:x.id,
  selected:Array.isArray(x.selected)?x.selected.map(v=>v===null?null:Number(v)):[],
  flagged:Boolean(x.flagged)
 }));
 if(!items.length)return null;
 const stamp=typeof snapshot.date==='string'?snapshot.date:new Date().toISOString();
 const id=stamp+'-'+Math.floor(Math.random()*1e9).toString(36);
 const credit=items.reduce((n,x)=>{const q=getQuestion(x.id);return n+(q?points(q,x.selected):0)},0);
 return {id,kind:snapshot.kind||'practice',date:stamp,items,credit:Math.round(100*credit)/100,total:items.length,bankCount:BANK().length};
}
function save(snapshot){
 const data=normalize(snapshot);
 if(!data)return null;
 const saved=all().filter(x=>x.id!==data.id);
 saved.unshift(data);
 volatile=saved.slice(0,30);
 try{localStorage.setItem(STORAGE,JSON.stringify(volatile));}
 catch(e){console.warn('Submitted-session review could not persist to local storage:',e);}
 refresh();
 return data.id;
}
function get(id){
 if(id==='previous-attempts')return previousAttempts();
 return all().find(s=>s.id===id)||null;
}
function previousAttempts(){
 let rows=[];try{const a=JSON.parse(localStorage.getItem('dlosce_history_v3')||'[]');if(Array.isArray(a))rows=a;}catch{}
 const known=new Set(BANK().map(q=>q.id));
 const last=new Map();
 for(const x of rows){if(!known.has(x.id))continue;const selected=Array.isArray(x.selected)?x.selected:Number.isInteger(x.selected)?[x.selected]:[];last.set(x.id,{id:x.id,selected,flagged:false})}
 const items=[...last.values()];
 if(!items.length)return null;
 return {id:'previous-attempts',kind:'previous answers',date:'',items,total:items.length};
}
function fmtDate(date){
 if(!date)return 'Earlier saved attempts';
 const t=new Date(date);return Number.isNaN(t.getTime())?'Submission':t.toLocaleString();
}
function refresh(){
 const list=one('submitted-session-list');if(!list)return;
 const saved=all();
 const sessionCount=one('dashboard-session-count');
 if(sessionCount)sessionCount.textContent=String(saved.length);
 const past=previousAttempts();
 let cards=saved.map(s=>{
  const count=s.items.filter(x=>getQuestion(x.id)).length;
  return '<article class="exam-archive-card"><div><h4>'+escape(s.kind==='full'?'Full-schedule simulation':s.kind==='mock'?'Timed mock':s.kind==='prescription-simulator'?'Prescription task':'Practice session')+'</h4><p>'+escape(fmtDate(s.date))+' · '+count+' available question'+(count===1?'':'s')+' · '+s.items.filter(x=>x.flagged).length+' flagged</p></div><div class="exam-archive-actions"><strong>'+Math.round(100*s.credit/Math.max(1,s.total))+'% credit</strong><button type="button" data-review-action="open" data-session-id="'+escape(s.id)+'">Revisit questions</button></div></article>';
 }).join('');
 if(past)cards+='<article class="exam-archive-card"><div><h4>All prior answered questions</h4><p>'+past.items.length+' unique attempted questions · latest answer for each · includes earlier sessions</p></div><div class="exam-archive-actions"><button type="button" data-review-action="open" data-session-id="previous-attempts">Review previous answers</button></div></article>';
 list.innerHTML=cards||'<p class="exam-archive-empty">No submitted answers on this browser yet. Complete a practice session, mock exam, or prescription task to create a reviewable submission.</p>';
}
function filterIndices(){
 if(!current)return [];
 const indices=current.session.items.map((x,i)=>i).filter(i=>Boolean(getQuestion(current.session.items[i].id)));
 return indices.filter(i=>{
  if(current.filter==='all')return true;
  const r=current.session.items[i],q=getQuestion(r.id);
  if(current.filter==='flagged')return r.flagged;
  if(current.filter==='incorrect')return !answered(q,r.selected)||points(q,r.selected)<0.999;
  return true;
 });
}
function reviewChoices(q,response){
 if(q.type==='prescription'){
  return '<div class="exam-review-rx"><table><thead><tr><th>Prescription field</th><th>Your submitted response</th><th>Answer key</th></tr></thead><tbody>'+
  q.fields.map((f,i)=>{
   const selected=Number.isInteger(response[i])?f.choices[response[i]]:'Not answered';
   const correct=selected===f.choices[f.correct];
   return '<tr class="'+(correct?'exam-review-correct':'exam-review-wrong')+'"><th>'+escape(f.label)+'</th><td>'+escape(selected)+'</td><td>'+escape(f.choices[f.correct])+'</td></tr>';
  }).join('')+'</tbody></table></div>';
 }
 return '<div class="exam-review-options">'+q.choices.map((choice,i)=>{
  const selected=response.includes(i),key=q.type==='single'?i===q.correct:q.correct.includes(i);
  const status=(key?'<span class="exam-key-status">Correct answer</span>':'')+(selected?'<span class="exam-selected-status">Your selection</span>':'');
  return '<div class="exam-review-option '+(key?'is-correct ':'')+(selected?'is-selected ':'')+(selected&&!key?'is-wrong':'')+'"><span class="exam-choice-letter">'+String.fromCharCode(65+i)+'.</span><span>'+escape(choice)+'</span><span class="exam-review-status">'+status+'</span></div>';
 }).join('')+'</div>';
}
function clinicalImage(q){
 if(!q.image_id||typeof IMAGE_MAP==='undefined'||!IMAGE_MAP[q.image_id])return '';
 const a=IMAGE_MAP[q.image_id];
 return '<figure class="exam-review-image"><img src="'+escape(a.image)+'" alt="'+escape(a.title)+'" referrerpolicy="no-referrer" loading="lazy"><figcaption>'+escape(a.title)+' · '+escape(a.author)+' · <a target="_blank" rel="noopener" href="'+escape(a.source)+'">View full source image and license</a></figcaption></figure>';
}
function render(){
 const root=one('submitted-review');if(!root||!current)return;
 const choices=filterIndices();
 if(choices.length&&!choices.includes(current.index))current.index=choices[0];
 const row=current.session.items[current.index],q=row?getQuestion(row.id):null;
 if(!q){
  root.innerHTML='<div class="exam-review-frame"><button type="button" data-review-action="close">Back to completed sessions</button><p>No question in this review matches your filter.</p><button type="button" data-review-action="filter" data-filter="all">Show all questions</button></div>';return;
 }
 const ix=choices.indexOf(current.index),selected=row.selected;
 const summary='<div class="exam-review-head"><div><span class="exam-eyebrow">Submitted — read-only</span><h3>Revisit clinical questions</h3><p>'+escape(fmtDate(current.session.date))+' · Question '+(current.index+1)+' of '+current.session.items.length+' · '+escape(q.module.replace(/-/g,' '))+'</p></div><button type="button" data-review-action="close">Back to completed sessions</button></div>';
 const filt='<div class="exam-review-controls"><div class="exam-map-filters">'+
  [['all','All'],['incorrect','Incorrect / partial'],['flagged','Flagged']].map(([k,label])=>'<button type="button" data-review-action="filter" data-filter="'+k+'" aria-pressed="'+(current.filter===k)+'">'+label+'</button>').join('')+'</div>'+
  '<span>'+choices.length+' matching questions</span></div>';
 const map='<div class="exam-review-map">'+choices.map(i=>{
  const x=current.session.items[i],qq=getQuestion(x.id);
  const wrong=!answered(qq,x.selected)||points(qq,x.selected)<.999;
  return '<button type="button" class="'+(i===current.index?'is-active ':'')+(wrong?'is-wrong ':'')+(x.flagged?'is-flagged':'')+'" data-review-action="jump" data-index="'+i+'" aria-label="Open submitted question '+(i+1)+'">'+(i+1)+'</button>';
 }).join('')+'</div>';
 const p=typeof window.renderExamPatientBox==='function'?window.renderExamPatientBox(q):'<div class="exam-patient">'+escape(q.patient_box?.current_findings||q.stem)+'</div>';
 const txt=q.question_prompt||q.stem;
 root.innerHTML='<div class="exam-shell exam-review-frame">'+summary+filt+map+
  '<div class="exam-layout">'+p+'<article class="exam-question-panel"><div class="exam-question-head"><span>Question '+(current.index+1)+' · '+escape(q.type.replace('multi','multiple response'))+'</span><span>'+(row.flagged?'Flagged for review':'Submitted')+'</span></div>'+
  '<h2>'+escape(txt)+'</h2>'+clinicalImage(q)+reviewChoices(q,selected)+
  '<div class="exam-review-explanation"><strong>'+Math.round(100*points(q,selected))+'% practice credit</strong><h4>Clinical rationale</h4><p>'+escape(q.explanation)+'</p></div>'+
  '<p class="exam-format-note">This review cannot alter your submitted answer or recorded score. Explanations and keys reflect the current version of the practice bank.</p></article></div>'+
  '<div class="exam-actions"><button type="button" data-review-action="prev" '+(ix<=0?'disabled':'')+'>Previous</button><button type="button" data-review-action="next" '+(ix===choices.length-1?'disabled':'')+'>Next</button><span class="exam-actions-fill"></span><button type="button" data-review-action="close">Back to my progress</button></div></div>';
}
function open(id){
 const submission=get(id);
 if(!submission||!submission.items.length)return;
 if(typeof switchTab==='function')switchTab('dashboard');
 const panel=one('submitted-review'),list=one('submitted-session-list');
 if(!panel)return;
 current={session:submission,index:0,filter:'all'};
 if(list)list.hidden=true;
 panel.hidden=false;render();
 panel.scrollIntoView?.({behavior:'instant',block:'start'});
}
function close(){
 const panel=one('submitted-review'),list=one('submitted-session-list');
 if(panel){panel.hidden=true;panel.innerHTML='';}
 if(list)list.hidden=false;current=null;refresh();
}
function clear(){
 volatile=[];
 try{localStorage.removeItem(STORAGE);}catch{}
 close();
}
function exportAll(){
 const out={exported_at:new Date().toISOString(),submitted_sessions:all(),notes:'Local educational review history. Not a licensure score.'};
 const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='dlosce-submitted-sessions.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function click(event){
 const btn=event.target.closest?.('[data-review-action]');
 if(!btn)return;
 event.preventDefault?.();
 const action=btn.dataset.reviewAction;
 if(action==='open')open(btn.dataset.sessionId);
 if(action==='close')close();
 if(action==='filter'&&current){current.filter=btn.dataset.filter||'all';render();}
 if(action==='jump'&&current){current.index=Number(btn.dataset.index);render();}
 if((action==='prev'||action==='next')&&current){
  const a=filterIndices(),p=a.indexOf(current.index),next=p+(action==='prev'?-1:1);
  if(next>=0&&next<a.length){current.index=a[next];render();}
 }
 if(action==='export')exportAll();
}
document.addEventListener('click',click);
window.DLOSCEArchive={save,all,open,close,clear,refresh,exportAll};
window.addEventListener('DOMContentLoaded',refresh);
window.__DLOSCEReviewForTests={normalize,points,previousAttempts,readStored,filterIndices};
})();
