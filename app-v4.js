import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, get, runTransaction } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
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
let coachingFilter = "all", coachingActivities = []; let currentActivities = []; let currentArticles = []; let articleQuery = ""; let columnQuery="", columnCategory="";
const httpUrl = s => {try {const u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const imageStyle=(x,kind='')=>{const book=kind==='education';const def={aspect:book?'3/4':'4/3',fit:book?'contain':'cover',position:'center'};const v={...def,...(x?.imageDisplay||{})};return `style="aspect-ratio:${['1/1','4/3','16/9','3/4'].includes(v.aspect)?v.aspect:def.aspect};object-fit:${v.fit==='contain'?'contain':'cover'};object-position:${['top','center','bottom'].includes(v.position)?v.position:'center'}"`};
const safeImage=s=>httpUrl(s)||(String(s||'').startsWith('assets/images/')?String(s):'');
const imageWithSettings=(x,cls,kind='')=>safeImage(x.image)?`<img loading="lazy" class="${cls}" ${imageStyle(x,kind)} src="${esc(safeImage(x.image))}" alt="">`:'';
const img = (url,cls="") => httpUrl(url)?`<img loading="lazy" class="${cls}" src="${esc(httpUrl(url))}" alt="">`:"";
const ext = (url,label) => httpUrl(url)?`<a href="${esc(httpUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:"";

const activityGroup=x=>{const c=String(x?.category||'').toLowerCase().replace(/\s/g,'');if(c.includes('슈퍼비전')||c.includes('멘토코칭')||c.includes('supervision')||c.includes('mentorcoaching'))return'supervision';if(['개인·그룹코칭','코칭활동','coaching','그룹코칭','개인코칭','1:1코칭'].some(v=>c===v.toLowerCase().replace(/\s/g,'')))return'coaching';return'other'};
const publicItems=items=>(items||[]).filter(x=>x.published!==false);
const visibleItems=(items,setting)=>{const mode=setting?.mode||'latest', count=Math.max(0,Math.min(100,Number(setting?.count??3)));return publicItems(items).sort((a,b)=>(Number(!!(b.pinned||b.featured))-Number(!!(a.pinned||a.featured)))||String(b.date||b.year||'').localeCompare(String(a.date||a.year||''))).slice(0,count)};
const plainBreak=s=>esc(s).replace(/\r?\n/g,'<br>');
// 사용자 본문은 먼저 HTML 이스케이프 처리하고 허용된 굵게/색상 태그만 표현합니다.
const richBody=s=>plainBreak(String(s??'').replace(/<\/?(?:b|strong)>/gi,t=>/^<\//.test(t)?'[/b]':'[b]').replace(/\*\*([^*\n]+)\*\*/g,'[b]$1[/b]')).replace(/\[b\]([\s\S]*?)\[\/b\]/gi,'<strong>$1</strong>').replace(/\[color=(#[0-9a-fA-F]{6})\]([\s\S]*?)\[\/color\]/gi,(_,color,value)=>`<span style="color:${color}">${value}</span>`).replace(/\[small\]([\s\S]*?)\[\/small\]/gi,'<span class="inlineSmall">$1</span>').replace(/\[muted\]([\s\S]*?)\[\/muted\]/gi,'<span class="inlineMuted">$1</span>').replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi,(_,size,value)=>`<span style="font-size:${Math.max(10,Math.min(48,Number(size)))}px">${value}</span>`);
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
    profile: {...DEFAULT_CONTENT.profile,...(data.profile||{})}, credentialItems: Array.isArray(data.credentialItems)?data.credentialItems:null,
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
  $('#heroDegree').textContent=C.profile.degree||'Coaching Ph.D.';
  renderCredentials(C.credentialItems,C.profile.credentials);
  $('#heroHeadline').textContent=C.profile.headline||DEFAULT_CONTENT.profile.headline;
  $('#heroIntro').textContent=C.profile.intro||DEFAULT_CONTENT.profile.intro;
  $('#heroPhoto').src=C.profile.photo||'assets/images/profile.jpg';
  $('#philEyebrow').textContent=C.philosophy.eyebrow||'';
  $('#philTitle').innerHTML=richBody(C.philosophy.title||'');
  $('#philBody').innerHTML=richBody(C.philosophy.body||'');
  $('#aboutTitle').textContent=C.sectionCopy.aboutTitle||'';
  $('#researchTitle').textContent=C.sectionCopy.researchTitle||'';
  $('#coachingTitle').textContent=C.sectionCopy.coachingTitle||'';
  $('#publicAiTitle').textContent=C.sectionCopy.publicAiTitle||'';
  $('#insightsTitle').textContent=C.sectionCopy.insightsTitle||'';
  $('#contactTitle').textContent=C.sectionCopy.contactTitle||'';
  $('#areaCards').innerHTML=visibleItems(C.areas,{count:C.displaySettings?.areas?.count??3,mode:C.displaySettings?.areas?.mode}).map((x,i)=>`<article class="card">${imageWithSettings(x,"areaThumb")}<div class="cardNo">0${i+1}</div><h3>${richBody(x.title)}</h3><strong>${richBody(x.summary??x.subtitle)}</strong><p>${richBody(x.body)}</p></article>`).join('');
  archivedResearch=publicItems(C.research); archivedNow=publicItems(C.nowEntries||[]); if(C.now?.published!==false&&(C.now?.title||C.now?.body)) archivedNow.push({...C.now,date:C.now.date||'',id:'legacy-now'}); $('#researchList').innerHTML=visibleItems(archivedResearch,C.displaySettings?.research).map(x=>`<article class="timelineItem"><div class="year">${esc(x.year)}</div><div>${imageWithSettings(x,"researchThumb")}<h3>${richBody(x.title)}</h3><div class="meta">${richBody(x.summary??x.meta)}</div>${x.date?`<div class="recordDate">${esc(x.date)}</div>`:""}<p>${richBody(x.body??x.desc)}</p>${ext(x.link,"자료 보기")}${x.id?`<a class="researchDetailLink" href="archive.html?type=research&item=${encodeURIComponent(x.id)}">사진과 전체 기록 보기 →</a>`:""}</div></article>`).join('');
  coachingActivities=[]; // 고객 코칭 기록은 공개 렌더링에서 제외
  renderCoachingActivities();
  currentActivities=visibleItems(C.activities.filter(x=>activityGroup(x)==='other'),{count:C.displaySettings?.activities?.count??6,mode:C.displaySettings?.activities?.mode});
  $('#activityGrid').innerHTML=currentActivities.map((x,i)=>`<article class="activity activityClickable" role="button" tabindex="0" data-i="${i}" aria-label="${esc(x.title||'활동')} 상세 보기">${imageWithSettings(x,'activityThumb')}<div class="activityBody"><div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${richBody(x.title)}</h3><p>${richBody(x.summary||x.desc)}</p><span class="activityReadMore">사진과 전체 기록 보기 →</span></div></article>`).join('');

  renderColumns(visibleItems(C.columns,{count:C.displaySettings?.columns?.count??6,mode:C.displaySettings?.columns?.mode}));
  currentArticles=publicItems(C.articles);
  const kind=x=>{const c=String(x.category||'').trim();if(['교육·교재','강의자료','교육','교재'].includes(c))return 'education';if(['코칭사례','사례'].includes(c))return 'cases';if(['AX·공공혁신','AX혁신','공공혁신','AX·공공혁신 사례'].includes(c))return 'ax';return 'notes';};
  const articleCard=x=>`<article class="article" tabindex="0" role="button" aria-label="${esc(x.title)} 상세보기" data-index="${x.originalIndex}">${imageWithSettings(x,'articleThumb',kind(x)==='education'?'education':'')}<div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3 class="articleCardTitle" style="color:#172033">${richBody(x.title)}</h3><p>${richBody(x.summary)}</p></article>`;
  const mapped=publicItems(C.articles).map((x,i)=>({...x,originalIndex:i}));
  // Keep the featured solution-focused note from appearing a second time in the homepage list.
  const featuredNoteTitle='단기해결코칭, 작은 변화를 실행으로 연결하다';
  const notes=mapped.filter(x=>kind(x)==='notes'&&String(x.title||'').trim()!==featuredNoteTitle&&[x.title,x.summary,x.body,x.category].join(' ').toLowerCase().includes(articleQuery));
  $('#articleGrid').innerHTML=notes.length?visibleItems(notes,C.displaySettings?.notes).map(articleCard).join(''):'<p class="emptyPortfolio">등록된 연구노트가 없습니다.</p>';
  const education=mapped.filter(x=>kind(x)==='education'),cases=mapped.filter(x=>kind(x)==='cases'),ax=mapped.filter(x=>kind(x)==='ax');
  $('#educationGrid').innerHTML=education.length?visibleItems(education,C.displaySettings?.education).map(articleCard).join(''):'<p class="emptyPortfolio">교육 프로그램과 교재 소개가 준비 중입니다.</p>';
  archivedContent={education,cases,ax,notes:mapped.filter(x=>kind(x)==='notes')};$('#axGrid').innerHTML=ax.length?visibleItems(ax,C.displaySettings?.ax).map(articleCard).join(''):'<p style="color:#d6dfed">등록된 AX·공공혁신 사례가 없습니다. 관리자에서 사례를 등록해 주세요.</p>';
  $('#caseGrid').innerHTML=cases.length?visibleItems(cases,C.displaySettings?.cases).map(articleCard).join(''):'<p class="emptyPortfolio">공개 가능한 코칭사례를 정리 중입니다.</p>';
  const now=C.now||{};
  const featuredNow=visibleItems(archivedNow,C.displaySettings?.now); $('#nowContent').innerHTML=featuredNow.length?featuredNow.map(x=>`<article class="nowRecord">${nowLeadPhotoMarkup(x)}<div><small>${esc(x.date||'')}</small><h3>${richBody(x.title)}</h3>${authorByline(x,true)}<p>${richBody(x.body)}</p></div>${nowExtraPhotosMarkup(x)}</article>`).join(''):`${now.published===false?"":img(now.image,'nowPhoto')}<div><h3>${richBody(now.title||'현재의 관심을 기록하는 공간')}</h3><p>${richBody(now.body||'코칭과 연구, 현장에서 발견한 질문을 기록합니다.')}</p></div>`;
  const sns=C.social||{};const channelNames={blog:'블로그',youtube:'YouTube',instagram:'Instagram',facebook:'Facebook',linkedin:'LinkedIn',threads:'Threads'};
  $('#socialLinks').innerHTML=Object.entries(channelNames).map(([key,name])=>ext(sns[key],name)).join('')+ext(sns.otherUrl,sns.otherName||'다른 채널');
  $('#contactMessage').textContent=C.contact.message||'';
  const links=[];
  if(C.contact.email) links.push(`<a href="mailto:${esc(C.contact.email)}">Email ↗</a>`);
  if(C.contact.linkedin) links.push(`<a target="_blank" rel="noopener" href="${esc(C.contact.linkedin)}">LinkedIn ↗</a>`);
  $('#contactLinks').innerHTML=links.join('');
}
function renderCoachingActivities(){
 const target=$('#coachingActivityGrid');if(!target)return;
 const matching=coachingActivities.filter(x=>coachingFilter==='all'||activityGroup(x)===coachingFilter);
 target.innerHTML=matching.length?matching.map(x=>`<a class="coachingActivityCard" href="archive.html?type=activities&item=${encodeURIComponent(x.id)}">${imageWithSettings(x,'coachingActivityThumb')}<div class="coachingActivityCardText"><span class="coachingActivityType">${activityGroup(x)==='supervision'?'슈퍼비전·멘토코칭':'개인·그룹코칭'} · ${esc(x.date||'')}</span><h4>${richBody(x.title)}</h4><p>${richBody(x.summary||x.desc||'')}</p><span class="coachingActivityDetail">내용·사진 보기 →</span></div></a>`).join(''):'<p class="coachingActivityEmpty">이 분류에 공개된 기록이 아직 없습니다. 관리자에서 등록하면 자동으로 표시됩니다.</p>';
 const more=$('#coachingActivitiesMore');if(more)more.href=`archive.html?type=activities&category=${coachingFilter==='all'?'coaching':coachingFilter}`;
 document.querySelectorAll('[data-coaching-filter]').forEach(b=>{const active=b.dataset.coachingFilter===coachingFilter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
}
$('#coachingActivityFilters')?.addEventListener('click',e=>{const b=e.target.closest('[data-coaching-filter]');if(b){coachingFilter=b.dataset.coachingFilter;renderCoachingActivities()}});
function embeddedPdf(x){
 const url=httpUrl(x?.pdfUrl);if(!url)return '';
 const collection=x._pdfCollection||'columns';
 const viewer='pdf-viewer.html?collection='+encodeURIComponent(collection)+'&id='+encodeURIComponent(x.id||'');
 const escPdf=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<section class="pdfPublicBlock"><div class="pdfPublicHeader"><strong>원문 PDF 읽기</strong><span>${escPdf(x.pdfName||'첨부 PDF')}</span></div><iframe class="pdfPublicFrame" title="원문 PDF 미리보기" loading="lazy" src="${escPdf(viewer)}"></iframe><a class="pdfFullLink" href="${escPdf(viewer)}" target="_blank" rel="noopener">전체 화면으로 읽기 ↗</a></section>`;
}
function displayPdfInModal(selector,item){const el=document.querySelector(selector);if(!el)return;el.innerHTML=embeddedPdf(item);}
function authorByline(item,isNow=false){const owned=isNow||item?.authorName==='정을균'||/wr_id=(63|67|71)(?:&|$)/.test(item?.url||'');if(!owned)return '';const name=item?.authorName||'정을균';return `<p class="authorByline">작성자: <strong>${esc(name)}</strong></p>`}
function nowLeadPhotoMarkup(item){const lead=httpUrl(item.image);return lead?img(lead,'nowPhoto'):''}
function nowExtraPhotosMarkup(item){
  const photos=normalizedGallery(item.gallery);if(!photos.length)return '';
  return '<div class="nowPhotoGallery">'+photos.map((p,i)=>`<figure><img loading="lazy" src="${esc(httpUrl(p.url))}" alt="${esc(p.caption||((item.title||'일상 기록')+' 사진 '+(i+2)))}">${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>`).join('')+'</div>';
}
function renderColumns(items){
  const categories=[...new Set(items.map(x=>x.category).filter(Boolean))];const categorySelect=$('#columnCategory');
  categorySelect.innerHTML='<option value="">전체 주제</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');categorySelect.value=categories.includes(columnCategory)?columnCategory:'';
  const matching=publicItems(items).filter(x=>[x.title,x.publisher,x.category,x.summary].join(' ').toLowerCase().includes(columnQuery)&&(!columnCategory||x.category===columnCategory));
  $('#columnGrid').innerHTML=matching.length?matching.map(x=>`<article class="columnCard" role="button" tabindex="0" data-column-id="${esc(x.id||'')}" aria-label="${esc(x.title||'칼럼')} 상세보기">${imageWithSettings(x,'columnThumb')}<div class="columnContent"><div class="meta">${esc(x.publisher||'외부 기고')} ${x.date?' · '+esc(x.date):''} · ${esc(x.category||'칼럼')}</div><h3>${richBody(x.title||'제목 미등록')}</h3><p>${richBody(x.summary||'')}</p><div class="columnBottom">${x.featured?'<span class="featuredTag">대표 글</span>':''}${ext(x.url,'원문 읽기')}</div></div></article>`).join(''):'<p class="columnsEmpty">등록된 칼럼이 없거나 검색 결과가 없습니다.</p>';
}
// 칼럼 카드도 교육 카드와 동일하게 내용 전체를 보여주는 상세 창을 엽니다.
function openColumnCard(card){
  const item=(activeData.columns||[]).find(x=>String(x.id)===String(card.dataset.columnId));
  if(!item)return;
  const d=document.querySelector('#columnDialog');
  document.querySelector('#columnModalMeta').textContent=[item.publisher,item.date,item.category].filter(Boolean).join(' · ');
  document.querySelector('#columnModalTitle').innerHTML=richBody(item.title||'');document.querySelector('#columnModalAuthor').innerHTML=authorByline(item);
  document.querySelector('#columnModalBody').innerHTML=richBody(item.body||item.summary||'');
  const picture=document.querySelector('#columnModalImage');
  const src=httpUrl(item.image);
  if(src){picture.src=src;picture.style.display='block';picture.alt=(item.title||'칼럼')+' 이미지';}
  else{picture.removeAttribute('src');picture.style.display='none';}
  document.querySelector('#columnModalLink').innerHTML=ext(item.url,'원문 읽기');displayPdfInModal('#columnModalPdf',item);renderDetailGallery('#columnModalGallery',item.gallery);
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
// The initial render must run after credentialDefaults is initialized.
$('#columnSearch').addEventListener('input',e=>{columnQuery=e.target.value.trim().toLowerCase();renderColumns(activeData.columns||[])});
$('#columnCategory').addEventListener('change',e=>{columnCategory=e.target.value;renderColumns(activeData.columns||[])});
$("#articleSearch").addEventListener("input",e=>{articleQuery=e.target.value.trim().toLowerCase();render(activeData)});
$('#year').textContent=new Date().getFullYear();
let articleDetailRequest=0;
async function showArticle(el){
 if(!el)return;
 const a=currentArticles[Number(el.dataset.index)];if(!a)return;
 const request=++articleDetailRequest;
 $('#modalMeta').textContent=`${a.date||''} · ${a.category||''}`;
 $('#modalTitle').innerHTML=richBody(a.title||'');
 $('#modalBody').innerHTML=richBody(a.body||a.summary||'');
 $('#modalLink').innerHTML=ext(a.link,'관련 자료 보기');displayPdfInModal('#modalPdf',a);
 const im=$('#modalImage');if(httpUrl(a.image)){im.src=httpUrl(a.image);im.style.display='block'}else{im.removeAttribute('src');im.style.display='none'}
 renderDetailGallery('#modalGallery',a.gallery);
 $('#articleDialog').showModal();
 // Read the selected record from Firebase again instead of depending on a stale list snapshot.
 if(!a.id)return;
 try{
   const snap=await get(ref(db,'homepage/articles/'+a.id));
   if(request!==articleDetailRequest||!$('#articleDialog').open||!snap.exists())return;
   const fresh=snap.val();
   renderDetailGallery('#modalGallery',fresh.gallery);displayPdfInModal('#modalPdf',fresh);
 }catch(error){console.warn('추가 사진 서버 조회 실패:',error);}
} 
['#articleGrid','#educationGrid','#caseGrid','#axGrid'].forEach(sel=>{$(sel).addEventListener('click',e=>showArticle(e.target.closest('.article')));$(sel).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('.article');if(el){e.preventDefault();showArticle(el)}}});});
$('#closeDialog').onclick=()=>$('#articleDialog').close();
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');
$('#nav').addEventListener('click',()=>$('#nav').classList.remove('open'));

// Firebase may deserialize sparse arrays as number-keyed objects. Accept both storage shapes.
function normalizedGallery(gallery){
 const entries=Array.isArray(gallery)?gallery:(gallery&&typeof gallery==='object'?(typeof gallery.url==='string'?[gallery]:Object.keys(gallery).sort((a,b)=>Number(a)-Number(b)).map(k=>gallery[k])):[]);
 return entries.map(x=>typeof x==='string'?{url:x,caption:''}:x).filter(x=>x&&httpUrl(x.url));
}
function renderDetailGallery(selector,gallery){
 const target=$(selector);if(!target)return;
 const photos=normalizedGallery(gallery);
 target.innerHTML=photos.length?'<h3>현장 사진 더 보기 · '+photos.length+'장</h3><div class="detailGalleryGrid">'+photos.map((p,i)=>`<figure><img loading="lazy" src="${esc(httpUrl(p.url))}" alt="${esc(p.caption||'추가 사진 '+(i+1))}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`).join('')+'</div>':'';
}
const credentialDefaults=[{name:'ICF PCC',issuer:'International Coaching Federation',category:'coach',featured:true,visible:true},{name:'KSC',issuer:'한국코치협회',category:'coach',featured:true,visible:true},{name:'KPCC',issuer:'',category:'coach',visible:true},{name:'중등학교 정교사 2급',issuer:'',category:'education',visible:true}];
function credentialCategory(x){
  if(x.category==='coach'||x.category==='education')return x.category;
  return /교사|강사|교육|부모코치|보육|지도사|교원/.test(x.name||'')?'education':'coach';
}
// Only known, built-in SVG shapes are rendered; colors are restricted to hex values.
const credentialIconPaths={
  medal:'<circle cx="16" cy="12" r="8"/><path d="M12.5 12.2 15 14.7l4.8-5M11 19 9 28l7-3 7 3-2-9"/>',
  award:'<circle cx="16" cy="10" r="7"/><path d="m11 16-3 12 8-4 8 4-3-12"/><path d="m13 10 2 2 4-4"/>',
  star:'<path d="m16 3 4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10L2 13l10-1z"/>',
  book:'<path d="M16 8c-4-3-9-3-13-2v19c5-1 10 0 13 3 3-3 8-4 13-3V6c-4-1-9-1-13 2ZM16 8v20"/>',
  graduation:'<path d="m2 12 14-8 14 8-14 8zM8 16v8c5 4 11 4 16 0v-8M29 13v10"/>',
  compass:'<circle cx="16" cy="16" r="13"/><path d="m20.5 11.5-3 7-6 2.5 2.5-6z"/>',
  check:'<circle cx="16" cy="16" r="12"/><path d="m10 16 4 4 8-9"/>',
  spark:'<path d="M16 2 19.5 12.5 30 16l-10.5 3.5L16 30l-3.5-10.5L2 16l10.5-3.5z"/>'
};
function credentialHex(value,fallback){return /^#[0-9a-fA-F]{6}$/.test(value||'')?value:fallback}
function credentialMark(x){
 const bg=credentialHex(x.circleColor,x.name==='ICF PCC'?'#203e68':'#f6f8fb');
 const line=credentialHex(x.iconColor,x.name==='ICF PCC'?'#ffffff':'#446083');
 const icon=Object.prototype.hasOwnProperty.call(credentialIconPaths,x.iconType)?x.iconType:'medal';
 const image=x.iconType==='custom'?httpUrl(x.iconImageUrl):'';
 return `<span class="premiumCredentialBadge uniform" style="background:${bg};border-color:${bg};color:${line}" aria-hidden="true">${image?`<img src="${esc(image)}" loading="lazy" alt="">`:`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${credentialIconPaths[icon]||credentialIconPaths.medal}</svg>`}</span>`;
}
function renderCredentials(data,legacy){
  const entries=(Array.isArray(data)?data:credentialDefaults).filter(x=>x&&x.visible!==false&&x.name);
  const featured=entries.filter(x=>x.featured).slice(0,2);
  $('#heroCredentials').textContent=featured.map(x=>x.name).join(' · ')||String(legacy||'');
  $('#showAllCredentials').hidden=entries.length===0;
  const groups=[['coach','코치 자격','COACHING CREDENTIALS'],['education','교육/기타 자격','EDUCATION & OTHER']];
  $('#credentialsFullList').innerHTML=groups.map(([key,title,en])=>{
    const items=entries.filter(x=>credentialCategory(x)===key);
    if(!items.length)return '';
    return `<section class="premiumCredentialGroup"><div class="premiumCredentialGroupHead"><div><span>${en}</span><h3>${title}</h3></div><em>${items.length}개</em></div><div class="premiumCredentialList">${items.map(x=>`<article class="premiumCredentialItem${x.name==='ICF PCC'?' isPcc':''}">${credentialMark(x)}<div class="premiumCredentialInfo"><strong>${esc(x.name)}</strong>${x.issuer?`<small>${esc(x.issuer)}</small>`:''}${httpUrl(x.url)?`<div class="credentialVerify">${ext(x.url,'자격 확인')}</div>`:''}${httpUrl(x.badgeUrl)?`<div class="credentialVerify">${ext(x.badgeUrl,'인증 배지 보기')}</div>`:''}</div></article>`).join('')}</div></section>`;
  }).join('');
}
$('#showAllCredentials').onclick=()=>$('#credentialsDialog').showModal();$('#closeCredentials').onclick=()=>$('#credentialsDialog').close();
function showActivity(el){const x=currentActivities[Number(el?.dataset.i)];if(!x)return;$('#activityModalMeta').textContent=[x.date,x.category].filter(Boolean).join(' · ');$('#activityModalTitle').innerHTML=richBody(x.title);$('#activityModalBody').innerHTML=richBody(x.body||x.desc||x.summary||'');const im=$('#activityModalImage'),url=safeImage(x.image);if(url){im.src=url;im.style.display='block'}else {im.removeAttribute('src');im.style.display='none'}renderDetailGallery('#activityModalGallery',x.gallery);$('#activityModalLink').innerHTML=ext(x.link,'관련 자료 보기');displayPdfInModal('#activityModalPdf',x);$('#activityDialog').showModal()}
$('#activityGrid').addEventListener('click',e=>showActivity(e.target.closest('.activityClickable')));
$('#activityGrid').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){const item=e.target.closest('.activityClickable');if(item){e.preventDefault();showActivity(item)}}});
$('#closeActivity').onclick=()=>$('#activityDialog').close();

// All components and their defaults are ready before initial paint.
render(DEFAULT_CONTENT);
const badge=$('#loadBadge');
onValue(ref(db,'homepage'), snap=>{ if(snap.exists()){render(normalized(snap.val())); badge.textContent='Firebase 실시간 연결'; badge.className='loadBadge ok'; setTimeout(()=>badge.classList.add('hide'),1800);} else {badge.textContent='초기 데이터가 없어 기본 내용을 표시 중'; badge.className='loadBadge warn';} }, err=>{console.error(err); badge.textContent='Firebase 읽기 실패 · 기본 내용을 표시 중'; badge.className='loadBadge warn';});


// Browser-based approximate unique visitor counts, starting at deployment.
// No IP, fingerprint, name or email is stored. Uses Korea-local calendar dates.
const visitorDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const counterFmt=n=>Number(n||0).toLocaleString('ko-KR');
const dateKey=visitorDay();
onValue(ref(db,'visitorStats/total'),s=>{document.querySelector('#visitorTotal').textContent=counterFmt(s.val())},()=>{document.querySelector('#visitorTotal').textContent='—'});
onValue(ref(db,'visitorStats/days/'+dateKey),s=>{document.querySelector('#visitorToday').textContent=counterFmt(s.val())},()=>{document.querySelector('#visitorToday').textContent='—'});
(async()=>{
 try {
  const key='joungcoach_visitor_2026';
  const dayKey=key+'_day';
  if(localStorage.getItem(key)!=='1'){
   const r=await runTransaction(ref(db,'visitorStats/total'),v=>(Number(v)||0)+1,{applyLocally:false});
   if(r.committed)localStorage.setItem(key,'1');
  }
  if(localStorage.getItem(dayKey)!==dateKey){
   const r=await runTransaction(ref(db,'visitorStats/days/'+dateKey),v=>(Number(v)||0)+1,{applyLocally:false});
   if(r.committed)localStorage.setItem(dayKey,dateKey);
  }
 }catch(e){console.warn('방문 통계 집계 불가:',e.message)}
})();
