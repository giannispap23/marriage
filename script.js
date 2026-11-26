'use strict';
if('scrollRestoration'in history)history.scrollRestoration='manual';
const $=selector=>document.querySelector(selector),audio=$('#audio'),music=$('#music');
function musicState(){music.setAttribute('aria-pressed',String(!audio.paused));music.setAttribute('aria-label',audio.paused?'Αναπαραγωγή μουσικής':'Παύση μουσικής');music.innerHTML=audio.paused?'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5a1 1 0 0 1 1.5-.86l10 6a1 1 0 0 1 0 1.72l-10 6A1 1 0 0 1 8 17.5z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" rx=".8" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx=".8" fill="currentColor"/></svg>'}
$('#envelope').addEventListener('click',()=>{$('#envelope').classList.add('is-open');audio.play().then(musicState).catch(musicState);setTimeout(()=>{$('#content').inert=false;$('#content').removeAttribute('aria-hidden');document.body.classList.remove('locked');$('#intro').classList.add('open');music.hidden=false;window.scrollTo(0,0);setTimeout(()=>{$('#intro').hidden=true},900)},1200)},{once:true});
music.addEventListener('click',()=>{if(audio.paused)audio.play().then(musicState).catch(musicState);else{audio.pause();musicState()}});
$('#content').setAttribute('tabindex','-1');
$('#envelope').addEventListener('click',()=>setTimeout(()=>$('#content').focus({preventScroll:true}),1250),{once:true});
const wedding=new Date('2026-12-27T16:30:00+02:00');function tick(){const d=Math.max(0,wedding-Date.now()),v=[Math.floor(d/864e5),Math.floor(d/36e5)%24,Math.floor(d/6e4)%60,Math.floor(d/1e3)%60];['days','hours','minutes','seconds'].forEach((id,i)=>$('#'+id).textContent=String(v[i]).padStart(2,'0'))}tick();setInterval(tick,1000);
const form=$('#rsvpForm');form.addEventListener('change',()=>{const no=form.elements.attendance.value==='Όχι';form.elements.guests.disabled=no;form.elements.guests.required=!no});
function legacyCopy(value){const input=document.createElement('textarea');input.value=value;input.setAttribute('readonly','');input.style.cssText='position:fixed;opacity:0;pointer-events:none';document.body.appendChild(input);input.select();const copied=document.execCommand('copy');input.remove();return copied}
document.querySelectorAll('.copy-gift').forEach(button=>button.addEventListener('click',async()=>{let copied=false;try{await navigator.clipboard.writeText(button.dataset.copy);copied=true}catch{copied=legacyCopy(button.dataset.copy)}button.closest('.bank-card').querySelector('.copy-status').textContent=copied?'✓ Αντιγράφηκε!':'Για αντιγραφή: '+button.dataset.copy}));
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal-up,.reveal-down').forEach(el=>revealObserver.observe(el));
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)'),photo=$('#couplePhoto'),photoPanel=$('.photo-panel'),flowers=[...document.querySelectorAll('.scroll-flower')];let scrollFrame=0;
function animateScroll(){scrollFrame=0;if(reduceMotion.matches){photoPanel.style.setProperty('--photo-shift','0px');return}flowers.forEach((el,i)=>{const base=Number(el.dataset.base||0);el.style.transform=`rotate(${base+(i%2?-1:1)*scrollY*.055}deg) scale(${1+Math.min(scrollY,1800)/6000})`});const rect=photoPanel.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const progress=(innerHeight/2-(rect.top+rect.height/2))/(innerHeight+rect.height);const shift=Math.max(-rect.height*.035,Math.min(rect.height*.035,progress*rect.height*.1));photoPanel.style.setProperty('--photo-shift',shift.toFixed(2)+'px');photoPanel.style.setProperty('--photo-scale',(1.04+Math.min(.04,Math.abs(progress)*.08)).toFixed(3))}}
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(animateScroll)},{passive:true});window.addEventListener('resize',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(animateScroll)});reduceMotion.addEventListener('change',animateScroll);animateScroll();

// Production configuration is assigned after the Google deployment is approved.
const WEDDING_ENDPOINT='https://script.google.com/macros/s/AKfycbxMYUkIipAofr5_psUrQE4S04gU5XLByS8wIeMRAQFjfIrdCmmB8wsurUokLZ-9sx5NMw/exec';
function weddingId(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Array.from(crypto.getRandomValues(new Uint8Array(20)),x=>x.toString(16).padStart(2,'0')).join('')}
let visitorId;try{visitorId=localStorage.getItem('ia-visitor');if(!visitorId){visitorId=weddingId();localStorage.setItem('ia-visitor',visitorId)}}catch{visitorId=weddingId()}
async function acknowledgement(requestId){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(WEDDING_ENDPOINT+'?requestId='+encodeURIComponent(requestId)+'&t='+Date.now(),{method:'GET',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('connection');
    return await response.json();
  }finally{clearTimeout(timer)}
}
async function sendWedding(fields,onProgress){
  if(!WEDDING_ENDPOINT.startsWith('https://script.google.com/macros/s/'))throw new Error('configuration');
  const requestId=weddingId(),body=new URLSearchParams({...fields,requestId,visitorId});
  await fetch(WEDDING_ENDPOINT,{method:'POST',mode:'no-cors',credentials:'omit',redirect:'follow',body});
  const end=Date.now()+90000;let attempts=0;
  while(Date.now()<end){
    try{const answer=await acknowledgement(requestId);if(answer.ok)return;if(answer.error)throw new Error('save_failed')}
    catch(error){if(error.message==='save_failed')throw error;if(++attempts>4)throw error}
    if(onProgress)onProgress();await new Promise(resolve=>setTimeout(resolve,1800));
  }throw new Error('timeout');
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;form.setAttribute('aria-busy','true');
  const values=Object.fromEntries(new FormData(form));values.guests=values.attendance==='Όχι'?0:Number(values.guests);
  $('#formStatus').textContent='Η απάντησή σας αποστέλλεται…';
  try{await sendWedding({action:'rsvp',...values});$('#formStatus').textContent='Η απάντησή σας καταχωρίστηκε. Σας ευχαριστούμε!'}
  catch{$('#formStatus').textContent='Δεν επιβεβαιώθηκε η καταχώριση. Παρακαλούμε δοκιμάστε ξανά ή επικοινωνήστε μαζί μας στα παρακάτω τηλέφωνα.'}
  finally{button.disabled=false;form.removeAttribute('aria-busy')}
});
document.querySelectorAll('.copy-gift').forEach(button=>button.addEventListener('click',()=>{sendWedding({action:'gift_click',gift:button.dataset.copy.startsWith('GR')?'IBAN':'IRIS'}).catch(()=>{})}));
const uploadButton=$('.soft-button'),uploadStatus=$('#uploadStatus');
let uploadWidget;
uploadButton.addEventListener('click',()=>{
  if(!window.cloudinary){uploadStatus.textContent='Η μεταφόρτωση δεν φορτώθηκε. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.';return}
  if(!uploadWidget)uploadWidget=window.cloudinary.createUploadWidget({
    cloudName:'cxeukl4a',uploadPreset:'wedding_guests_2026',sources:['local','camera'],multiple:true,
    clientAllowedFormats:['jpg','jpeg','png','webp','heic'],maxFileSize:40000000,maxFiles:20,
    maxImageWidth:2048,maxImageHeight:2048,validateMaxWidthHeight:false,
    showAdvancedOptions:false,showCompletedButton:true,singleUploadAutoClose:false,
    text:{el:{menu:{files:'Από τη συσκευή',camera:'Κάμερα'},local:{browse:'Επιλογή φωτογραφιών',dd_title_single:'Σύρετε μία φωτογραφία εδώ',dd_title_multi:'Σύρετε φωτογραφίες εδώ'},queue:{title:'Αρχεία για ανέβασμα',title_uploading:'Οι φωτογραφίες ανεβαίνουν',title_uploading_with_counter:'Ανεβαίνουν {{num}} φωτογραφίες',title_uploading_processing:'Γίνεται επεξεργασία',done:'Ολοκληρώθηκε',mini_title:'Ανέβηκαν',mini_title_uploading:'Ανεβαίνουν'},notifications:{general_error:'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',completed:'Η μεταφόρτωση ολοκληρώθηκε.'}}}
  },(error,result)=>{
    if(error){uploadStatus.textContent='Δεν ολοκληρώθηκε η μεταφόρτωση. Δοκιμάστε ξανά.';return}
    if(result&&result.event==='success')uploadStatus.textContent='Η φωτογραφία ανέβηκε. Ευχαριστούμε!';
    if(result&&result.event==='queues-end')uploadStatus.textContent='Οι φωτογραφίες ανέβηκαν. Ευχαριστούμε!';
  });
  uploadWidget.open();
});
