import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
const type=new URLSearchParams(location.search).get('type')||'research';
const names={research:'연구 아카이브',education:'교육·교재',cases:'코칭사례',ax:'AX·공공혁신 사례',notes:'연구노트와 성찰',now:'요즘의 관심'};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vals=o=>Array.isArray(o)?o:Object.entries(o||{}).map(([id,x])=>({id,...x}));
const goodUrl=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
let all=[],shown=[];
$('#pageTitle').textContent=names[type]||'연구 아카이브';document.title=$('#pageTitle').textContent+' | JOUNG COACH';
document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('active',a.search===`?type=${type}`));
const kind=x=>{const c=String(x.category||'').trim();if(['교육·교재','강의자료','교육','교재'].includes(c))return'education';if(['코칭사례','사례'].includes(c))return'cases';if(['AX·공공혁신','AX혁신','공공혁신'].includes(c))return'ax';return'notes'};
function load(d){if(type==='research')all=vals(d.research);else if(type==='now'){all=vals(d.nowEntries);if(d.now?.title||d.now?.body)all.push({...d.now,id:'legacy-now'})}else all=vals(d.articles).filter(x=>kind(x)===type);all.sort((a,b)=>String(b.date||b.year||'').localeCompare(String(a.date||a.year||'')));filter();$('#status').textContent='Firebase 실시간 자료 연결됨'}
function filter(){const q=$('#filter').value.trim().toLowerCase();shown=all.filter(x=>[x.title,x.summary,x.body,x.meta,x.desc,x.category,x.year,x.date].join(' ').toLowerCase().includes(q));$('#count').textContent=`${shown.length}개 기록`;$('#items').innerHTML=shown.map((x,i)=>`<button data-i="${i}"><small>${esc([x.year,x.date,x.category].filter(Boolean).join(' · '))}</small><strong>${esc(x.title||'제목 없는 기록')}</strong></button>`).join('')||'<p style="padding:20px">등록된 기록이 없습니다.</p>';open(0)}
function open(i){const x=shown[i];if(!x){$('#detail').innerHTML='<p>표시할 기록이 없습니다.</p>';return}document.querySelectorAll('#items button').forEach((b,j)=>b.classList.toggle('active',i===j));const image=goodUrl(x.image),link=goodUrl(x.link);$('#detail').innerHTML=`<div class="meta">${esc([x.year,x.date,x.category].filter(Boolean).join(' · '))}</div><h2>${esc(x.title||'제목 없는 기록')}</h2>${x.meta?`<p class="meta">${esc(x.meta)}</p>`:''}${image?`<img src="${esc(image)}" alt="콘텐츠 이미지">`:''}${x.summary?`<p><strong>${esc(x.summary)}</strong></p>`:''}<p>${esc(x.body||x.desc||'')}</p>${link?`<p><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">관련 자료 보기 ↗</a></p>`:''}`;if(innerWidth<751) $('#detail').scrollIntoView({behavior:'smooth',block:'start'})}
$('#filter').addEventListener('input',filter);$('#items').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)open(Number(b.dataset.i))});
const db=getDatabase(initializeApp(firebaseConfig));onValue(ref(db,'homepage'),s=>{if(s.exists())load(s.val());else $('#status').textContent='등록된 데이터가 없습니다.'},e=>{$('#status').textContent='Firebase 자료 읽기 실패: '+e.message;console.error(e)});
