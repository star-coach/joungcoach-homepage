import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { DEFAULT_CONTENT } from "./default-content.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const values = obj => obj ? Object.entries(obj).map(([id,v])=>({id,...v})) : [];
const byDateDesc = (a,b)=>String(b.date||'').localeCompare(String(a.date||''));
const byYearDesc = (a,b)=>String(b.year||'').localeCompare(String(a.year||''));
const byOrder = (a,b)=>(Number(a.sortOrder)||999)-(Number(b.sortOrder)||999);
let currentArticles = [];

function normalized(data){
  if(!data) return DEFAULT_CONTENT;
  return {
    profile: {...DEFAULT_CONTENT.profile,...(data.profile||{})},
    philosophy: {...DEFAULT_CONTENT.philosophy,...(data.philosophy||{})},
    areas: (Array.isArray(data.areas)?data.areas:values(data.areas)).sort(byOrder),
    research: (Array.isArray(data.research)?data.research:values(data.research)).sort(byYearDesc),
    activities: (Array.isArray(data.activities)?data.activities:values(data.activities)).sort(byDateDesc),
    articles: (Array.isArray(data.articles)?data.articles:values(data.articles)).sort(byDateDesc),
    contact: {...DEFAULT_CONTENT.contact,...(data.contact||{})}
  };
}
function render(C){
  $('#heroRoles').textContent=C.profile.roles||'';
  $('#heroNameKo').textContent=C.profile.nameKo||'';
  $('#heroNameEn').textContent=C.profile.nameEn||'';
  $('#heroDegree').textContent=C.profile.degree||'';
  $('#heroCredentials').textContent=C.profile.credentials||'';
  $('#heroHeadline').textContent=C.profile.headline||'';
  $('#heroIntro').textContent=C.profile.intro||'';
  $('#heroPhoto').src=C.profile.photo||'assets/images/profile.jpg';
  $('#philEyebrow').textContent=C.philosophy.eyebrow||''; $('#philTitle').textContent=C.philosophy.title||''; $('#philBody').textContent=C.philosophy.body||'';
  $('#areaCards').innerHTML=C.areas.map((x,i)=>`<article class="card"><div class="cardNo">0${i+1}</div><h3>${esc(x.title)}</h3><strong>${esc(x.subtitle)}</strong><p>${esc(x.body)}</p></article>`).join('');
  $('#researchList').innerHTML=C.research.map(x=>`<article class="timelineItem"><div class="year">${esc(x.year)}</div><div><h3>${esc(x.title)}</h3><div class="meta">${esc(x.meta)}</div><p>${esc(x.desc)}</p></div></article>`).join('');
  $('#activityGrid').innerHTML=C.activities.map(x=>`<article class="activity">${x.image?`<img src="${esc(x.image)}" alt="">`:''}<div class="activityBody"><div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div></article>`).join('');
  currentArticles=C.articles;
  $('#articleGrid').innerHTML=C.articles.map((x,i)=>`<article class="article" data-index="${i}">${x.image?`<img class="articleThumb" src="${esc(x.image)}" alt="">`:''}<div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`).join('');
  $('#contactMessage').textContent=C.contact.message||''; const links=[]; if(C.contact.email) links.push(`<a href="mailto:${esc(C.contact.email)}">Email ↗</a>`); if(C.contact.linkedin) links.push(`<a target="_blank" rel="noopener" href="${esc(C.contact.linkedin)}">LinkedIn ↗</a>`); $('#contactLinks').innerHTML=links.join('');
}
render(DEFAULT_CONTENT);
$('#year').textContent=new Date().getFullYear();
$('#articleGrid').addEventListener('click', e=>{const el=e.target.closest('.article'); if(!el)return; const a=currentArticles[Number(el.dataset.index)]; $('#modalMeta').textContent=`${a.date||''} · ${a.category||''}`; $('#modalTitle').textContent=a.title||''; $('#modalBody').textContent=a.body||''; const im=$('#modalImage'); if(a.image){im.src=a.image;im.style.display='block'}else{im.style.display='none'} $('#articleDialog').showModal();});
$('#closeDialog').onclick=()=>$('#articleDialog').close(); $('#menuBtn').onclick=()=>$('#nav').classList.toggle('open'); $('#nav').addEventListener('click',()=>$('#nav').classList.remove('open'));
const badge=$('#loadBadge');
onValue(ref(db,'homepage'), snap=>{ if(snap.exists()){render(normalized(snap.val())); badge.textContent='Firebase 실시간 연결'; badge.className='loadBadge ok'; setTimeout(()=>badge.classList.add('hide'),1800);} else {badge.textContent='초기 데이터가 없어 기본 내용을 표시 중'; badge.className='loadBadge warn';} }, err=>{console.error(err); badge.textContent='Firebase 읽기 실패 · 기본 내용을 표시 중'; badge.className='loadBadge warn';});
