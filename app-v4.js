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
const byYearDesc = (a,b) => String(b.year || '').localeCompare(String(a.year || '')) || String(b.date || '').localeCompare(String(a.date || ''));
const byOrder = (a,b)=>(Number(a.sortOrder)||999)-(Number(b.sortOrder)||999);
let currentArticles = []; let articleQuery = ""; let columnQuery="", columnCategory="";
const httpUrl = s => {try {const u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const imageStyle=(x,kind='')=>{const book=kind==='education';const def={aspect:book?'3/4':'4/3',fit:book?'contain':'cover',position:'center'};const v={...def,...(x?.imageDisplay||{})};return `style="aspect-ratio:${['1/1','4/3','16/9','3/4'].includes(v.aspect)?v.aspect:def.aspect};object-fit:${v.fit==='contain'?'contain':'cover'};object-position:${['top','center','bottom'].includes(v.position)?v.position:'center'}"`};
const imageWithSettings=(x,cls,kind='')=>httpUrl(x.image)?`<img loading="lazy" class="${cls}" ${imageStyle(x,kind)} src="${esc(httpUrl(x.image))}" alt="">`:'';
const img = (url,cls="") => httpUrl(url)?`<img loading="lazy" class="${cls}" src="${esc(httpUrl(url))}" alt="">`:"";
const ext = (url,label) => httpUrl(url)?`<a href="${esc(httpUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:"";

const visibleItems=(items,setting)=>{const mode=setting?.mode||'latest', count=Math.max(0,Math.min(30,Number(setting?.count??3)));return [...items].sort((a,b)=>(mode==='pinned'?Number(!!b.pinned)-Number(!!a.pinned):0)||String(b.date||b.year||'').localeCompare(String(a.date||a.year||''))).slice(0,count)};
const plainBreak=s=>esc(s).replace(/\n/g,'<br>');
let archivedResearch=[],archivedNow=[],archivedContent={education:[],cases:[],notes:[]},archiveType='research';
const fontStacks = {
  sans: 'Inter,"Noto Sans KR",sans-serif',
  korean: '"Noto Sans KR",Inter,sans-serif',
  serif: 'Newsreader,"Noto Serif KR",serif',
  koreanSerif: '"Noto Serif KR",Newsreader,serif'
};

function normalized(data){
  if(!data) return DEFAULT_CONTENT;
  const rawTypo = data.typography || {};
  const typography = {};
  for(const [k,v] of Object.entries(DEFAULT_CONTENT.typography)) typography[k] = {...v,...(rawTypo[k]||{})};
  return {
    profile: {...DEFAULT_CONTENT.profile,...(data.profile||{})},
    philosophy: {...DEFAULT_CONTENT.philosophy,...(data.philosophy||{})},
    sectionCopy: {...DEFAULT_CONTENT.sectionCopy,...(data.sectionCopy||{})},
    theme: {...DEFAULT_CONTENT.theme,...(data.theme||{})},
    typography,
    areas: (Array.isArray(data.areas)?data.areas:values(data.areas)).sort(byOrder),
    research: (Array.isArray(data.research)?data.research:values(data.research)).sort(byYearDesc),
    activities: (Array.isArray(data.activities)?data.activities:values(data.activities)).sort(byDateDesc),
    articles: (Array.isArray(data.articles)?data.articles:values(data.articles)).sort(byDateDesc),
    columns: (Array.isArray(data.columns)?data.columns:values(data.columns)).sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||byDateDesc(a,b)),
    now: data.now || {}, nowEntries: (Array.isArray(data.nowEntries)?data.nowEntries:values(data.nowEntries)).sort(byDateDesc), displaySettings:data.displaySettings||{}, social: data.social || {},
    contact: {...DEFAULT_CONTENT.contact,...(data.contact||{})}
  };
}

function applyTheme(theme){
  const root=document.documentElement;
  const keys=['ink','muted','paper','blue','blue2','orange','navy'];
  keys.forEach(k=>{ if(theme?.[k]) root.style.setProperty(`--${k}`,theme[k]); });
}
function applyTypography(typography){
  document.querySelectorAll('[data-typo]').forEach(el=>{
    const s=typography?.[el.dataset.typo]; if(!s) return;
    el.style.setProperty('--t-desktop',`${Number(s.desktopSize)||48}px`);
    el.style.setProperty('--t-mobile',`${Number(s.mobileSize)||32}px`);
    el.style.setProperty('--t-weight',String(Number(s.weight)||800));
    el.style.setProperty('--t-letter',`${Number(s.letterSpacing)||0}em`);
    el.style.setProperty('--t-line',String(Number(s.lineHeight)||1.2));
    el.style.setProperty('--t-width',`${Number(s.maxWidth)||900}px`);
    el.style.setProperty('--t-color',s.color||'currentColor');
    el.style.setProperty('--t-align',s.align||'left');
    el.style.setProperty('--t-font',fontStacks[s.fontFamily]||fontStacks.sans);
  });
}

function render(C){
  applyTheme(C.theme); applyTypography(C.typography);
  $('#heroRoles').textContent='JOUNG COACH · COACHING LEADERSHIP · PUBLIC SERVICE COACHING';
  $('#heroNameKo').textContent=C.profile.nameKo||'';
  $('#heroNameEn').textContent=C.profile.nameEn||'';
  $('#heroDegree').textContent='Coaching Ph.D.';
  $('#heroCredentials').textContent=String(C.profile.credentials||'').trim() || DEFAULT_CONTENT.profile.credentials;
  $('#heroHeadline').textContent='코칭으로 사람을 성장시키고, 리더십으로 조직을 변화시킵니다';
  $('#heroIntro').textContent='정코치 JOUNG COACH | 코칭리더십 · 공직코칭 · 공공기관 코칭 · 코칭교육 전문가. 연구와 현장의 경험을 사람과 조직의 변화로 연결합니다.';
  $('#heroPhoto').src=C.profile.photo||'assets/images/profile.jpg';
  $('#philEyebrow').textContent=C.philosophy.eyebrow||'';
  $('#philTitle').textContent=C.philosophy.title||'';
  $('#philBody').textContent=C.philosophy.body||'';
  $('#aboutTitle').textContent=C.sectionCopy.aboutTitle||'';
  $('#researchTitle').textContent=C.sectionCopy.researchTitle||'';
  $('#coachingTitle').textContent=C.sectionCopy.coachingTitle||'';
  $('#publicAiTitle').textContent=C.sectionCopy.publicAiTitle||'';
  $('#insightsTitle').textContent=C.sectionCopy.insightsTitle||'';
  $('#contactTitle').textContent=C.sectionCopy.contactTitle||'';
  $('#areaCards').innerHTML=C.areas.map((x,i)=>`<article class="card">${imageWithSettings(x,"areaThumb")}<div class="cardNo">0${i+1}</div><h3>${esc(x.title)}</h3><strong>${esc(x.subtitle)}</strong><p>${esc(x.body)}</p></article>`).join('');
  archivedResearch=C.research; archivedNow=[...(C.nowEntries||[])]; if(C.now?.title||C.now?.body) archivedNow.push({...C.now,date:C.now.date||'',id:'legacy-now'}); $('#researchList').innerHTML=visibleItems(C.research,C.displaySettings?.research).map(x=>`<article class="timelineItem"><div class="year">${esc(x.year)}</div><div>${imageWithSettings(x,"researchThumb")}<h3>${plainBreak(x.title)}</h3><div class="meta">${plainBreak(x.meta)}</div>${x.date?`<div class="recordDate">${esc(x.date)}</div>`:""}<p>${plainBreak(x.desc)}</p>${ext(x.link,"자료 보기")}</div></article>`).join('');
  $('#activityGrid').innerHTML=C.activities.map(x=>`<article class="activity">${x.image?`<img src="${esc(x.image)}" ${imageStyle(x)} alt="">`:''}<div class="activityBody"><div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p>${ext(x.link,"관련 기록")}</div></article>`).join('');
  renderColumns(C.columns||[]);
  currentArticles=C.articles;
  const kind=x=>{const c=String(x.category||'').trim();if(['교육·교재','강의자료','교육','교재'].includes(c))return 'education';if(['코칭사례','사례'].includes(c))return 'cases';if(['AX·공공혁신','AX혁신','공공혁신'].includes(c))return 'ax';return 'notes';};
  const articleCard=x=>`<article class="article" tabindex="0" role="button" aria-label="${esc(x.title)} 상세보기" data-index="${x.originalIndex}">${imageWithSettings(x,'articleThumb',kind(x)==='education'?'education':'')}<div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`;
  const mapped=C.articles.map((x,i)=>({...x,originalIndex:i}));
  const notes=mapped.filter(x=>kind(x)==='notes'&&[x.title,x.summary,x.body,x.category].join(' ').toLowerCase().includes(articleQuery));
  $('#articleGrid').innerHTML=notes.length?notes.slice(0,3).map(articleCard).join(''):'<p class="emptyPortfolio">등록된 연구노트가 없습니다.</p>';
  const education=mapped.filter(x=>kind(x)==='education'),cases=mapped.filter(x=>kind(x)==='cases'),ax=mapped.filter(x=>kind(x)==='ax');
  $('#educationGrid').innerHTML=education.length?education.slice(0,3).map(articleCard).join(''):'<p class="emptyPortfolio">교육 프로그램과 교재 소개가 준비 중입니다.</p>';
  archivedContent={education,cases,ax,notes:mapped.filter(x=>kind(x)==='notes')};$('#axGrid').innerHTML=ax.length?ax.slice(0,3).map(articleCard).join(''):'<p style="color:#d6dfed">등록된 AX·공공혁신 사례가 없습니다. 관리자에서 사례를 등록해 주세요.</p>';
  $('#caseGrid').innerHTML=cases.length?cases.slice(0,3).map(articleCard).join(''):'<p class="emptyPortfolio">공개 가능한 코칭사례를 정리 중입니다.</p>';
  const now=C.now||{};
  const featuredNow=visibleItems(archivedNow,C.displaySettings?.now); $('#nowContent').innerHTML=featuredNow.length?featuredNow.map(x=>`<article class="nowRecord">${img(x.image,'nowPhoto')}<div><small>${esc(x.date||'')}</small><h3>${plainBreak(x.title)}</h3><p>${plainBreak(x.body)}</p></div></article>`).join(''):`${img(now.image,'nowPhoto')}<div><h3>${plainBreak(now.title||'현재의 관심을 기록하는 공간')}</h3><p>${plainBreak(now.body||'코칭과 연구, 현장에서 발견한 질문을 기록합니다.')}</p></div>`;
  const sns=C.social||{};const channelNames={blog:'블로그',youtube:'YouTube',instagram:'Instagram',facebook:'Facebook',linkedin:'LinkedIn',threads:'Threads'};
  $('#socialLinks').innerHTML=Object.entries(channelNames).map(([key,name])=>ext(sns[key],name)).join('')+ext(sns.otherUrl,sns.otherName||'다른 채널');
  $('#contactMessage').textContent=C.contact.message||'';
  const links=[];
  if(C.contact.email) links.push(`<a href="mailto:${esc(C.contact.email)}">Email ↗</a>`);
  if(C.contact.linkedin) links.push(`<a target="_blank" rel="noopener" href="${esc(C.contact.linkedin)}">LinkedIn ↗</a>`);
  $('#contactLinks').innerHTML=links.join('');
}
function renderColumns(items){
  const categories=[...new Set(items.map(x=>x.category).filter(Boolean))];const categorySelect=$('#columnCategory');
  categorySelect.innerHTML='<option value="">전체 주제</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');categorySelect.value=categories.includes(columnCategory)?columnCategory:'';
  const matching=items.filter(x=>[x.title,x.publisher,x.category,x.summary].join(' ').toLowerCase().includes(columnQuery)&&(!columnCategory||x.category===columnCategory));
  $('#columnGrid').innerHTML=matching.length?matching.map(x=>`<article class="columnCard" role="button" tabindex="0" data-column-id="${esc(x.id||'')}" aria-label="${esc(x.title||'칼럼')} 상세보기">${imageWithSettings(x,'columnThumb')}<div class="columnContent"><div class="meta">${esc(x.publisher||'외부 기고')} ${x.date?' · '+esc(x.date):''} · ${esc(x.category||'칼럼')}</div><h3>${esc(x.title||'제목 미등록')}</h3><p>${esc(x.summary||'')}</p><div class="columnBottom">${x.featured?'<span class="featuredTag">대표 글</span>':''}${ext(x.url,'원문 읽기')}</div></div></article>`).join(''):'<p class="columnsEmpty">등록된 칼럼이 없거나 검색 결과가 없습니다.</p>';
}
// 칼럼 카드도 교육 카드와 동일하게 내용 전체를 보여주는 상세 창을 엽니다.
function openColumnCard(card){
  const item=(activeData.columns||[]).find(x=>String(x.id)===String(card.dataset.columnId));
  if(!item)return;
  const d=document.querySelector('#columnDialog');
  document.querySelector('#columnModalMeta').textContent=[item.publisher,item.date,item.category].filter(Boolean).join(' · ');
  document.querySelector('#columnModalTitle').textContent=item.title||'';
  document.querySelector('#columnModalBody').textContent=item.summary||'';
  const picture=document.querySelector('#columnModalImage');
  const src=httpUrl(item.image);
  if(src){picture.src=src;picture.style.display='block';picture.alt=(item.title||'칼럼')+' 이미지';}
  else{picture.removeAttribute('src');picture.style.display='none';}
  document.querySelector('#columnModalLink').innerHTML=ext(item.url,'원문 읽기 ↗');
  d.showModal();
}
const columnGrid=document.querySelector('#columnGrid');
columnGrid.addEventListener('click',e=>{
  if(e.target.closest('a[href]'))return;
  const card=e.target.closest('.columnCard[data-column-id]');
  if(card)openColumnCard(card);
});
columnGrid.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.columnCard[data-column-id]')){
    e.preventDefault();openColumnCard(e.target);
  }
});
document.querySelector('#closeColumnDialog').addEventListener('click',()=>document.querySelector('#columnDialog').close());
let activeData=DEFAULT_CONTENT;
const renderOriginal=render;
render= function(data){activeData=data;renderOriginal(data)};
render(DEFAULT_CONTENT);
$('#columnSearch').addEventListener('input',e=>{columnQuery=e.target.value.trim().toLowerCase();renderColumns(activeData.columns||[])});
$('#columnCategory').addEventListener('change',e=>{columnCategory=e.target.value;renderColumns(activeData.columns||[])});
$("#articleSearch").addEventListener("input",e=>{articleQuery=e.target.value.trim().toLowerCase();render(activeData)});
$('#year').textContent=new Date().getFullYear();
function showArticle(el){if(!el)return;const a=currentArticles[Number(el.dataset.index)];if(!a)return;$('#modalMeta').textContent=`${a.date||''} · ${a.category||''}`;$('#modalTitle').textContent=a.title||'';$('#modalBody').textContent=a.body||a.summary||'';$('#modalLink').innerHTML=ext(a.link,'관련 자료 보기');const im=$('#modalImage');if(httpUrl(a.image)){im.src=httpUrl(a.image);im.style.display='block'}else{im.removeAttribute('src');im.style.display='none'}$('#articleDialog').showModal();}
['#articleGrid','#educationGrid','#caseGrid','#axGrid'].forEach(sel=>{$(sel).addEventListener('click',e=>showArticle(e.target.closest('.article')));$(sel).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('.article');if(el){e.preventDefault();showArticle(el)}}});});
$('#closeDialog').onclick=()=>$('#articleDialog').close();
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');
$('#nav').addEventListener('click',()=>$('#nav').classList.remove('open'));
const badge=$('#loadBadge');
onValue(ref(db,'homepage'), snap=>{ if(snap.exists()){render(normalized(snap.val())); badge.textContent='Firebase 실시간 연결'; badge.className='loadBadge ok'; setTimeout(()=>badge.classList.add('hide'),1800);} else {badge.textContent='초기 데이터가 없어 기본 내용을 표시 중'; badge.className='loadBadge warn';} }, err=>{console.error(err); badge.textContent='Firebase 읽기 실패 · 기본 내용을 표시 중'; badge.className='loadBadge warn';});

