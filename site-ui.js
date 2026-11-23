/* Shared accessible navigation; quiz logic remains in platform.js. */
(function(){
'use strict';
const nav=document.getElementById('primary-navigation');
const toggle=document.querySelector('.nav-toggle');
if(!nav)return;
const groups=[...nav.querySelectorAll('details.nav-group')];
if(toggle){
 toggle.addEventListener('click',()=>{const open=nav.dataset.open!=='true';nav.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));});
}
groups.forEach(group=>group.addEventListener('toggle',()=>{if(group.open)groups.forEach(other=>{if(other!==group)other.open=false;});}));
function syncActive(){
 const page=location.pathname.split('/').pop()||'index.html';
 const hash=location.hash.slice(1)||'home';
 nav.querySelectorAll('.nav-link,.menu-item').forEach(el=>{el.classList.remove('is-current');el.removeAttribute('aria-current');});
 groups.forEach(el=>el.classList.remove('is-current'));
 if(page==='index.html'){
   let el=nav.querySelector('[data-tab="'+hash+'"]');
   if(!el)el=nav.querySelector('[data-tab="home"]');
   if(el){el.classList.add('is-current');el.setAttribute('aria-current','page');const parent=el.closest('.nav-group');if(parent)parent.classList.add('is-current');}
 }else{
   const el=nav.querySelector('.menu-item[href="'+page+'"],.nav-link[href="'+page+'"]');
   if(el){el.classList.add('is-current');el.setAttribute('aria-current','page');const parent=el.closest('.nav-group');if(parent)parent.classList.add('is-current');}
 }
}
nav.addEventListener('click',e=>{if(e.target.closest('a')){
 if(toggle){nav.dataset.open='false';toggle.setAttribute('aria-expanded','false');}
 groups.forEach(g=>g.open=false);
}});
document.addEventListener('click',e=>{if(!nav.contains(e.target) && (!toggle||!toggle.contains(e.target)))groups.forEach(g=>g.open=false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){groups.forEach(g=>g.open=false);if(toggle){nav.dataset.open='false';toggle.setAttribute('aria-expanded','false');toggle.focus();}}});
window.addEventListener('hashchange',()=>{
 syncActive();
 // Honor browser back/forward navigation on the main application.
 const page=location.pathname.split('/').pop()||'index.html';
 const hash=location.hash.slice(1);
 if(page==='index.html' && ['home','practice','radiographs','anatomy','prescriptions','mock','dashboard'].includes(hash)){
   const view=document.getElementById(hash);
   if(view && view.hidden && typeof window.switchTab==='function')window.switchTab(hash);
 }
});
syncActive();
})();

/* FIX: Remove duplicated module navigation bars */
document.addEventListener("DOMContentLoaded", function () {
    const navigationBars = document.querySelectorAll(".module-pager");

    navigationBars.forEach((bar, index) => {
        if (index > 0) {
            bar.remove();
        }
    });
});
