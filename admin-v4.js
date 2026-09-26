import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";
import { DEFAULT_CONTENT } from "./default-content.js";
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getDatabase(app), storage=getStorage(app); const $=s=>document.querySelector(s); let cache={};
const vals=o=>o?Object.entries(o).map(([id,v])=>({id,...v})):[]; const safeName=n=>n.replace(/[^a-zA-Z0-9._-]/g,'_');
function message(el,t,ok=true){el.textContent=t;el.style.color=ok?'#067647':'#b42318'}
async function upload(file,folder){ if(!file) return ''; const r=sRef(storage,`homepage/${folder}/${Date.now()}_${safeName(file.name)}`); await uploadBytes(r,file); return await getDownloadURL(r); }
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value)}catch(err){message($('#loginMsg'),'로그인 실패: '+err.message,false)}}); $('#logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{const yes=!!user;$('#loginPanel').hidden=yes;$('#cms').hidden=!yes;$('#logoutBtn').hidden=!yes;if(yes) startCMS();});
function startCMS(){ if(startCMS.done)return;startCMS.done=true; onValue(ref(db,'homepage'),s=>{cache=s.val()||{}; renderAll();}); }
$('.side')?.addEventListener('click',e=>{const b=e.target.closest('.nav');if(!b)return;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));$(`#tab-${b.dataset.tab}`).classList.add('active')});
$('#seedBtn').onclick=async()=>{try{const existing=await get(ref(db,'homepage/profile'));if(existing.exists()&&!confirm('이미 homepage 데이터가 있습니다. 기본 데이터로 덮어쓸까요?'))return; const payload={profile:DEFAULT_CONTENT.profile,philosophy:DEFAULT_CONTENT.philosophy,sectionCopy:DEFAULT_CONTENT.sectionCopy,theme:DEFAULT_CONTENT.theme,typography:DEFAULT_CONTENT.typography,contact:DEFAULT_CONTENT.contact,areas:{},research:{},activities:{},articles:{}}; for(const x of DEFAULT_CONTENT.areas) payload.areas[x.id]=x; for(const x of DEFAULT_CONTENT.research) payload.research[x.id]=x; for(const x of DEFAULT_CONTENT.activities) payload.activities[x.id]=x; for(const x of DEFAULT_CONTENT.articles) payload.articles[x.id]=x; await set(ref(db,'homepage'),payload);message($('#seedMsg'),'초기 콘텐츠 저장 완료')}catch(e){message($('#seedMsg'),'저장 실패: '+e.message,false)}};
function renderAll(){const a=vals(cache.articles).sort((a,b)=>(b.date||'').localeCompare(a.date||'')), ac=vals(cache.activities).sort((a,b)=>(b.date||'').localeCompare(a.date||'')), r=vals(cache.research).sort((a,b)=>(b.year||'').localeCompare(a.year||'')), ar=vals(cache.areas).sort((a,b)=>(+a.sortOrder||99)-(+b.sortOrder||99)); $('#statArticles').textContent=a.length;$('#statActivities').textContent=ac.length;$('#statResearch').textContent=r.length; renderList($('#articleList'),a,'articles',x=>`${x.date||''} · ${x.category||''}`,x=>x.title); renderList($('#activityList'),ac,'activities',x=>`${x.date||''} · ${x.category||''}`,x=>x.title); renderList($('#researchAdminList'),r,'research',x=>x.year||'',x=>x.title); renderList($('#areaList'),ar,'areas',x=>`순서 ${x.sortOrder||''}`,x=>x.title); fillProfile(); fillContact(); fillDesign(); }
function renderList(el,items,type,sub,title){el.innerHTML=items.length?items.map(x=>`<div class="listItem" data-type="${type}" data-id="${x.id}"><small>${sub(x)}</small><b>${title(x)||'(제목 없음)'}</b></div>`).join(''):'<div class="listItem"><small>등록된 항목이 없습니다.</small></div>'}
document.addEventListener('click',e=>{const it=e.target.closest('.listItem[data-id]');if(!it)return;openItem(it.dataset.type,it.dataset.id);document.querySelectorAll('.listItem').forEach(x=>x.classList.toggle('active',x===it))});
function openItem(type,id){const d=cache[type]?.[id]||{}; if(type==='articles') fillForm($('#articleForm'),{id,...d},['id','date','category','title','summary','body'])||($('#articleImageCurrent').textContent=d.image||''); if(type==='activities') fillForm($('#activityForm'),{id,...d},['id','date','category','title','desc'])||($('#activityImageCurrent').textContent=d.image||''); if(type==='research') fillForm($('#researchForm'),{id,...d},['id','year','title','meta','desc']); if(type==='areas') fillForm($('#areaForm'),{id,...d},['id','sortOrder','title','subtitle','body']); }
function fillForm(form,data,names){form.hidden=false;names.forEach(n=>{if(form.elements[n])form.elements[n].value=data[n]??''});return false}
function newForm(form,names){form.hidden=false;form.reset();names.forEach(n=>{if(form.elements[n])form.elements[n].value=''});}
$('#newArticle').onclick=()=>newForm($('#articleForm'),['id']);$('#newActivity').onclick=()=>newForm($('#activityForm'),['id']);$('#newResearch').onclick=()=>newForm($('#researchForm'),['id']);$('#newArea').onclick=()=>newForm($('#areaForm'),['id']);
function formObj(form,names){return Object.fromEntries(names.map(n=>[n,form.elements[n].value.trim()]))}
$('#articleForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{let d=formObj(f,['date','category','title','summary','body']);const id=f.elements.id.value||push(ref(db,'homepage/articles')).key;const old=cache.articles?.[id]?.image||'';const image=await upload($('#articleImage').files[0],'articles');d.image=image||old;d.updatedAt=Date.now();await set(ref(db,`homepage/articles/${id}`),d);f.elements.id.value=id;$('#articleImageCurrent').textContent=d.image||'';message($('#articleMsg'),'저장 완료 · 홈페이지에 즉시 반영됩니다.')}catch(x){message($('#articleMsg'),'저장 실패: '+x.message,false)}});
$('#activityForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{let d=formObj(f,['date','category','title','desc']);const id=f.elements.id.value||push(ref(db,'homepage/activities')).key;const old=cache.activities?.[id]?.image||'';const image=await upload($('#activityImage').files[0],'activities');d.image=image||old;d.updatedAt=Date.now();await set(ref(db,`homepage/activities/${id}`),d);f.elements.id.value=id;$('#activityImageCurrent').textContent=d.image||'';message($('#activityMsg'),'저장 완료')}catch(x){message($('#activityMsg'),'저장 실패: '+x.message,false)}});
$('#researchForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const d=formObj(f,['year','title','meta','desc']);const id=f.elements.id.value||push(ref(db,'homepage/research')).key;await set(ref(db,`homepage/research/${id}`),d);f.elements.id.value=id;message($('#researchMsg'),'저장 완료')}catch(x){message($('#researchMsg'),'저장 실패: '+x.message,false)}});
$('#areaForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const d=formObj(f,['sortOrder','title','subtitle','body']);d.sortOrder=Number(d.sortOrder||99);const id=f.elements.id.value||push(ref(db,'homepage/areas')).key;await set(ref(db,`homepage/areas/${id}`),d);f.elements.id.value=id;message($('#areaMsg'),'저장 완료')}catch(x){message($('#areaMsg'),'저장 실패: '+x.message,false)}});
async function del(type,form,msg){const id=form.elements.id.value;if(!id)return;if(!confirm('이 항목을 삭제할까요?'))return;try{await remove(ref(db,`homepage/${type}/${id}`));form.hidden=true;message(msg,'삭제 완료')}catch(x){message(msg,'삭제 실패: '+x.message,false)}}
$('#deleteArticle').onclick=()=>del('articles',$('#articleForm'),$('#articleMsg'));$('#deleteActivity').onclick=()=>del('activities',$('#activityForm'),$('#activityMsg'));$('#deleteResearch').onclick=()=>del('research',$('#researchForm'),$('#researchMsg'));$('#deleteArea').onclick=()=>del('areas',$('#areaForm'),$('#areaMsg'));
function fillProfile(){const p=cache.profile||DEFAULT_CONTENT.profile, ph=cache.philosophy||DEFAULT_CONTENT.philosophy, f=$('#profileForm'); for(const [n,v] of Object.entries({nameKo:p.nameKo,nameEn:p.nameEn,roles:p.roles,degree:p.degree,credentials:p.credentials,headline:p.headline,intro:p.intro,eyebrow:ph.eyebrow,philTitle:ph.title,philBody:ph.body})) if(f.elements[n]&&document.activeElement!==f.elements[n])f.elements[n].value=v||'';$('#profilePhotoCurrent').textContent=p.photo||''}
$('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const old=cache.profile?.photo||'assets/images/profile.jpg';const photo=await upload($('#profileImage').files[0],'profile');await update(ref(db,'homepage'),{profile:{nameKo:f.nameKo.value.trim(),nameEn:f.nameEn.value.trim(),roles:f.roles.value.trim(),degree:f.degree.value.trim(),credentials:f.credentials.value.trim(),headline:f.headline.value.trim(),intro:f.intro.value.trim(),photo:photo||old},philosophy:{eyebrow:f.eyebrow.value.trim(),title:f.philTitle.value.trim(),body:f.philBody.value.trim()}});message($('#profileMsg'),'프로필 저장 완료')}catch(x){message($('#profileMsg'),'저장 실패: '+x.message,false)}});
function fillContact(){const c=cache.contact||DEFAULT_CONTENT.contact,f=$('#contactForm');for(const n of ['message','email','linkedin'])if(document.activeElement!==f.elements[n])f.elements[n].value=c[n]||''}
$('#contactForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{await set(ref(db,'homepage/contact'),{message:f.message.value.trim(),email:f.email.value.trim(),linkedin:f.linkedin.value.trim()});message($('#contactMsg'),'연락처 저장 완료')}catch(x){message($('#contactMsg'),'저장 실패: '+x.message,false)}});


// v6 디자인·타이포그래피 편집기
let previewIsMobile=false;
const TYPE_TARGETS = ['heroHeadline','philosophyTitle','aboutTitle','researchTitle','coachingTitle','publicAiTitle','insightsTitle','contactTitle'];
const FONT_STACKS = {
  sans:'Inter,"Noto Sans KR",sans-serif',
  korean:'"Noto Sans KR",Inter,sans-serif',
  serif:'Newsreader,"Noto Serif KR",serif',
  koreanSerif:'"Noto Serif KR",Newsreader,serif'
};
function mergedTypography(){
  const out={};
  for(const key of TYPE_TARGETS) out[key]={...DEFAULT_CONTENT.typography[key],...(cache.typography?.[key]||{})};
  return out;
}
function getTargetText(key){
  if(key==='heroHeadline') return cache.profile?.headline ?? DEFAULT_CONTENT.profile.headline;
  if(key==='philosophyTitle') return cache.philosophy?.title ?? DEFAULT_CONTENT.philosophy.title;
  return cache.sectionCopy?.[key] ?? DEFAULT_CONTENT.sectionCopy[key] ?? '';
}
function fillDesign(){
  const tf=$('#themeForm');
  if(tf){
    const t={...DEFAULT_CONTENT.theme,...(cache.theme||{})};
    for(const k of Object.keys(DEFAULT_CONTENT.theme)) if(tf.elements[k]&&document.activeElement!==tf.elements[k]) tf.elements[k].value=t[k];
  }
  if($('#typeTarget')) loadTypeTarget($('#typeTarget').value||'heroHeadline');
}
function loadTypeTarget(key){
  if(!TYPE_TARGETS.includes(key)) key='heroHeadline';
  const f=$('#typographyForm'); if(!f) return;
  const s=mergedTypography()[key];
  f.elements.target.value=key;
  f.elements.text.value=getTargetText(key);
  for(const n of ['fontFamily','weight','desktopSize','mobileSize','letterSpacing','lineHeight','maxWidth','align','color']) if(f.elements[n]) f.elements[n].value=s[n];
  renderTypePreview();
}
function renderTypePreview(){
  const f=$('#typographyForm'), pane=$('#typePreview'); if(!f||!pane)return;
  const key=f.elements.target.value;
  pane.classList.toggle('darkPreview',key==='publicAiTitle');
  pane.classList.toggle('bluePreview',key==='philosophyTitle'||key==='contactTitle');
  pane.innerHTML='';
  const h=document.createElement('h3');
  h.textContent=f.elements.text.value;
  h.style.fontFamily=FONT_STACKS[f.elements.fontFamily.value]||FONT_STACKS.sans;
  h.style.fontSize=`${Number(previewIsMobile?f.elements.mobileSize.value:f.elements.desktopSize.value)||48}px`;
  pane.classList.toggle('mobileMode',previewIsMobile);
  h.style.fontWeight=f.elements.weight.value||800;
  h.style.letterSpacing=`${Number(f.elements.letterSpacing.value)||0}em`;
  h.style.lineHeight=String(Number(f.elements.lineHeight.value)||1.2);
  h.style.maxWidth=`${Number(f.elements.maxWidth.value)||900}px`;
  h.style.color=f.elements.color.value||'#111522';
  h.style.textAlign=f.elements.align.value||'left';
  h.style.whiteSpace='pre-line'; h.style.wordBreak='keep-all'; h.style.overflowWrap='break-word';
  pane.appendChild(h);
}
$('#typeTarget')?.addEventListener('change',e=>loadTypeTarget(e.target.value));
$('#typographyForm')?.addEventListener('input',renderTypePreview);
$('#themeForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); const f=e.currentTarget;
  try{const d={};for(const k of Object.keys(DEFAULT_CONTENT.theme))d[k]=f.elements[k].value;await set(ref(db,'homepage/theme'),d);message($('#themeMsg'),'색상 저장 완료 · 홈페이지에 즉시 반영됩니다.')}catch(x){message($('#themeMsg'),'저장 실패: '+x.message,false)}
});
$('#themeReset')?.addEventListener('click',()=>{const f=$('#themeForm');for(const [k,v] of Object.entries(DEFAULT_CONTENT.theme))f.elements[k].value=v;});
$('#typographyForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); const f=e.currentTarget, key=f.elements.target.value;
  try{
    const style={
      fontFamily:f.elements.fontFamily.value,
      weight:Number(f.elements.weight.value),desktopSize:Number(f.elements.desktopSize.value),mobileSize:Number(f.elements.mobileSize.value),
      letterSpacing:Number(f.elements.letterSpacing.value),lineHeight:Number(f.elements.lineHeight.value),maxWidth:Number(f.elements.maxWidth.value),
      align:f.elements.align.value,color:f.elements.color.value
    };
    const updates={}; updates[`typography/${key}`]=style;
    const text=f.elements.text.value.trim();
    if(key==='heroHeadline') updates['profile/headline']=text;
    else if(key==='philosophyTitle') updates['philosophy/title']=text;
    else updates[`sectionCopy/${key}`]=text;
    await update(ref(db,'homepage'),updates);
    message($('#typeMsg'),'제목과 스타일 저장 완료');
  }catch(x){message($('#typeMsg'),'저장 실패: '+x.message,false)}
});
$('#typeReset')?.addEventListener('click',()=>{
  const key=$('#typeTarget').value, f=$('#typographyForm'), s=DEFAULT_CONTENT.typography[key];
  f.elements.text.value = key==='heroHeadline'?DEFAULT_CONTENT.profile.headline:key==='philosophyTitle'?DEFAULT_CONTENT.philosophy.title:DEFAULT_CONTENT.sectionCopy[key];
  for(const n of ['fontFamily','weight','desktopSize','mobileSize','letterSpacing','lineHeight','maxWidth','align','color']) f.elements[n].value=s[n];
  renderTypePreview();
});

$('#previewDesktop')?.addEventListener('click',()=>{previewIsMobile=false;$('#previewDesktop').classList.add('active');$('#previewMobile').classList.remove('active');renderTypePreview();});
$('#previewMobile')?.addEventListener('click',()=>{previewIsMobile=true;$('#previewMobile').classList.add('active');$('#previewDesktop').classList.remove('active');renderTypePreview();});
