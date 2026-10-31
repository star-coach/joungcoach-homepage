import { SITE_TEXT_FIELDS } from './site-text-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";
import { DEFAULT_CONTENT } from "./default-content.js";
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getDatabase(app), storage=getStorage(app); const $=s=>document.querySelector(s); let cache={};
const vals=o=>o?Object.entries(o).map(([id,v])=>({id,...v})):[]; const safeName=n=>n.replace(/[^a-zA-Z0-9._-]/g,'_');
function message(el,t,ok=true){el.textContent=t;el.style.color=ok?'#067647':'#b42318'}
async function upload(file,folder){ if(!file) return ''; if(!file.type.startsWith('image/'))throw Error('이미지 파일만 등록 가능합니다.');if(file.size>10*1024*1024)throw Error('사진은 10MB 이하로 선택하세요.'); const r=sRef(storage,`homepage/${folder}/${Date.now()}_${safeName(file.name)}`); await uploadBytes(r,file); return await getDownloadURL(r); }
// 화면 캡처 이미지 붙여넣기: 파일 선택과 Ctrl+V는 동일한 Firebase Storage 업로드 경로를 사용합니다.
const pendingImages = new Map();
const pasteUrls = new Map();
const imageInputIds = ['profileImage','columnImage','articleImage','activityImage','researchImage','areaImage','nowEntryImage'];
function clearPendingImages(){
  pendingImages.clear();
  for(const url of pasteUrls.values()) URL.revokeObjectURL(url);
  pasteUrls.clear();
  for(const id of imageInputIds){
    const input=document.getElementById(id), zone=document.getElementById(id+'PasteZone');
    if(input)input.value='';
    if(zone){zone.querySelector('.pastePreview').replaceChildren();zone.querySelector('.pasteStatus').textContent='클릭한 뒤 Ctrl+V로 캡처 이미지를 붙여넣으세요.';}
  }
}
async function uploadFromInput(id,folder){
  const input=document.getElementById(id);
  return upload(pendingImages.get(id)||input?.files?.[0],folder);
}
function setPendingImage(id,file){
  if(!file || !file.type.startsWith('image/')){ alert('이미지 파일만 붙여넣을 수 있습니다.');return; }
  if(file.size>10*1024*1024){alert('이미지는 10MB 이하로 선택해 주세요.');return;}
  const input=document.getElementById(id),zone=document.getElementById(id+'PasteZone');
  if(!input||!zone)return;
  if(pasteUrls.has(id))URL.revokeObjectURL(pasteUrls.get(id));
  const url=URL.createObjectURL(file);pasteUrls.set(id,url);
  pendingImages.set(id,file);
  input.value='';
  const preview=zone.querySelector('.pastePreview');preview.replaceChildren();
  const img=document.createElement('img');img.src=url;img.alt='저장 전 이미지 미리보기';preview.append(img);
  zone.querySelector('.pasteStatus').textContent=`선택됨: ${file.name} · ${(file.size/1024).toFixed(0)}KB (저장 버튼을 눌러야 등록됩니다)`;
}
function makePasteZones(){
  for(const id of imageInputIds){
    const input=document.getElementById(id);if(!input)continue;
    const zone=document.createElement('div');zone.id=id+'PasteZone';zone.className='pasteZone';zone.tabIndex=0;zone.setAttribute('role','group');zone.setAttribute('aria-label','이미지 붙여넣기 영역');
    zone.innerHTML='<div class="pasteHeading">📋 화면 캡처 붙여넣기 <kbd>Ctrl</kbd> + <kbd>V</kbd></div><div class="pasteStatus">클릭한 뒤 Ctrl+V로 캡처 이미지를 붙여넣으세요.</div><div class="pastePreview"></div><button type="button" class="pasteClear">선택 취소</button>';
    input.insertAdjacentElement('afterend',zone);
    input.addEventListener('change',()=>{if(input.files?.[0])setPendingImage(id,input.files[0]);});
    zone.querySelector('.pasteClear').addEventListener('click',e=>{e.preventDefault();pendingImages.delete(id);input.value='';const url=pasteUrls.get(id);if(url)URL.revokeObjectURL(url);pasteUrls.delete(id);zone.querySelector('.pastePreview').replaceChildren();zone.querySelector('.pasteStatus').textContent='선택이 취소되었습니다. 기존 저장 이미지는 삭제되지 않습니다.';});
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging')});
    zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));
    zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');const f=[...(e.dataTransfer?.files||[])].find(x=>x.type.startsWith('image/'));if(f)setPendingImage(id,f)});
  }
}

// 여러 사진: 기존 글의 갤러리 메타데이터를 보존하며, 저장 시에만 새 파일을 업로드합니다.
const galleryForms={articleForm:'articles',activityForm:'activities',researchForm:'research',columnForm:'columns',nowEntryForm:'nowEntries',areaForm:'areas'};
const galleryDrafts=new Map();
const galleryEditorState=new Map(); // 현재 열려 있는 글과 미저장 변경사항
const cleanGallery=v=>{const a=Array.isArray(v)?v:(v&&typeof v==='object'?Object.keys(v).sort((x,y)=>Number(x)-Number(y)).map(k=>v[k]):[]);return a.map(x=>typeof x==='string'?{url:x,caption:''}:x).filter(x=>x&&typeof x.url==='string').map(x=>({url:x.url,caption:String(x.caption||'')}))};
function addGalleryEditors(){
 for(const [id] of Object.entries(galleryForms)){
  const form=document.getElementById(id);if(!form)continue;
  const wrap=document.createElement('section');wrap.className='galleryEditor';wrap.innerHTML=`<h3>추가 사진 갤러리</h3><p>대표 사진과 본문 아래에 사진을 여러 장 보여줍니다. 사진 설명·순서를 바꾸거나 삭제할 수 있습니다.</p><input class="galleryFiles" type="file" accept="image/*" multiple><div class="galleryEntries"></div><div class="galleryLinkRow"><input type="url" class="galleryUrl" placeholder="이미지 https:// 주소 붙여넣기 (선택)"><button type="button" class="galleryAddUrl">링크 사진 추가</button></div><small>이곳의 사진은 편집 중인 미리보기입니다. 본문 아래 공개 여부는 글 저장 후 서버 확인 메시지로 판단하세요. 사진은 최대 10MB/장.</small><p class="galleryServerStatus" role="status"></p>`;
  const before=form.querySelector('.publishControl')||form.querySelector('.row'); if(before)before.before(wrap);else form.append(wrap);
  galleryDrafts.set(id,[]);
  wrap.querySelector('.galleryFiles').addEventListener('change',e=>{const a=galleryDrafts.get(id)||[];for(const file of e.target.files){if(!file.type.startsWith('image/')||file.size>10*1024*1024){alert('사진은 이미지 파일만, 장당 10MB 이하여야 합니다.');continue}a.push({file,url:URL.createObjectURL(file),caption:'',newFile:true});}galleryDrafts.set(id,a);markGalleryChanged(id);e.target.value='';drawGallery(id)});
  wrap.querySelector('.galleryAddUrl').onclick=()=>{const inp=wrap.querySelector('.galleryUrl');const value=inp.value.trim();try{if(!['https:','http:'].includes(new URL(value).protocol))throw Error()}catch{alert('http(s) 이미지 주소를 입력하세요.');return}galleryDrafts.get(id).push({url:value,caption:''});inp.value='';markGalleryChanged(id);drawGallery(id)};
  wrap.querySelector('.galleryEntries').addEventListener('input',e=>{if(e.target.matches('.galleryCaption')){galleryDrafts.get(id)[Number(e.target.dataset.i)].caption=e.target.value;markGalleryChanged(id)}});
  wrap.querySelector('.galleryEntries').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;const a=galleryDrafts.get(id),i=Number(b.dataset.i);if(b.dataset.act==='delete'){const x=a.splice(i,1)[0];if(x.newFile)URL.revokeObjectURL(x.url)}else {const j=i+(b.dataset.act==='up'?-1:1);if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]}markGalleryChanged(id);drawGallery(id)});
 }
}
function markGalleryChanged(formId){const state=galleryEditorState.get(formId)||{};state.dirty=true;galleryEditorState.set(formId,state);const form=document.getElementById(formId),el=form?.querySelector('.galleryServerStatus');if(el)el.textContent=`미저장 변경사항: 추가 사진 ${(galleryDrafts.get(formId)||[]).length}장 · 아래 저장을 눌러야 반영됩니다.`;}
function drawGallery(id){const el=document.getElementById(String(id))?.querySelector('.galleryEntries');if(!el)return;el.replaceChildren();(galleryDrafts.get(id)||[]).forEach((x,i)=>{const div=document.createElement('div');div.className='galleryEntry';const im=document.createElement('img');im.src=x.url;im.alt='추가사진 미리보기';const right=document.createElement('div');const input=document.createElement('input');input.placeholder='사진 설명 (선택)';input.className='galleryCaption';input.dataset.i=i;input.value=x.caption||'';const bar=document.createElement('div');bar.className='galleryActions';[['up','↑ 위로'],['down','↓ 아래로'],['delete','삭제']].forEach(([act,label])=>{const b=document.createElement('button');b.type='button';b.dataset.act=act;b.dataset.i=i;b.textContent=label;bar.append(b)});right.append(input,bar);div.append(im,right);el.append(div)});}
function setGalleryDraft(form,data){
 if(!galleryForms[form.getAttribute('id')])return;
 const entryId=String(data.id||'');
 const prev=galleryEditorState.get(form.getAttribute('id'));
 // 같은 글을 다시 여는 경우, 아직 서버에 저장하지 않은 갤러리 편집 내용을 지우지 않습니다.
 if(prev?.dirty && prev.entryId===entryId){drawGallery(form.getAttribute('id'));return;}
 for(const x of galleryDrafts.get(form.getAttribute('id'))||[])if(x.newFile)URL.revokeObjectURL(x.url);
 galleryDrafts.set(form.getAttribute('id'),cleanGallery(data.gallery));
 galleryEditorState.set(form.getAttribute('id'),{entryId,dirty:false});drawGallery(form.getAttribute('id'));
 const status=form.querySelector('.galleryServerStatus');
 if(status) status.textContent='서버 저장 상태 확인 중…';
 const id=String(data.id||'');const kind=galleryForms[form.getAttribute('id')];
 if(!id){if(status)status.textContent='새 글: 아직 서버에 저장되지 않았습니다.';return;}
 get(ref(db,`homepage/${kind}/${id}/gallery`)).then(snap=>{
   if(form.elements.id?.value!==id || !status)return;
   status.textContent=`Firebase에 저장된 추가 사진: ${cleanGallery(snap.val()).length}장 (현재 편집 미리보기와 다를 수 있습니다.)`;
 }).catch(error=>{if(status)status.textContent='서버 저장 확인 실패: '+error.message;});
}
async function saveGallery(form){
 const folder=galleryForms[form.getAttribute('id')],out=[];
 if(!folder)return out;
 const draft=galleryDrafts.get(form.getAttribute('id'))||[];
 const id=form.elements.id?.value||'';
 const previous=id?cleanGallery(cache[folder]?.[id]?.gallery):[];
 // 조용히 사진을 0장으로 덮어쓰는 사고를 차단합니다.
 if(!draft.length && previous.length){
   const ok=confirm(`기존 추가 사진 ${previous.length}장이 저장되어 있습니다. 이번 저장으로 전부 삭제하시겠습니까?\n삭제하려는 경우에만 [확인]을 누르세요.`);
   if(!ok)throw Error('기존 추가 사진 보호를 위해 저장을 중단했습니다. 글을 다시 열고 사진 목록을 확인해 주세요.');
 }
 const visibleCount=form.querySelectorAll('.galleryEntries .galleryEntry').length;
 if(visibleCount!==draft.length)throw Error(`사진 편집 표시 ${visibleCount}장과 실제 저장 목록 ${draft.length}장이 다릅니다. 다시 열어 확인해 주세요.`);
 for(const x of draft){
   const url=x.newFile?await upload(x.file,folder+'/gallery'):x.url;
   if(!url || !/^https?:\/\//.test(url))throw Error('사진 업로드 URL이 정상적으로 생성되지 않았습니다.');
   out.push({url,caption:String(x.caption||'')});
 }
 return out;
}
async function verifiedGalleryMessage(kind,id,expected){
 try{
  const snap=await get(ref(db,`homepage/${kind}/${id}/gallery`));
  const stored=cleanGallery(snap.val()).length;
  const valid=stored===expected;
  return valid?`추가 사진 ${stored}장 서버 저장 확인 · 공개 상세보기에서 확인해 주세요.`:`추가 사진 저장 확인 필요: 선택 ${expected}장 / 서버 ${stored}장. 관리자에서 다시 확인해 주세요.`;
 }catch(err){return `추가 사진 서버 재확인 실패 (${err.message}). 저장 성공 표시만으로 게시를 확정하지 마세요.`;}
}
addGalleryEditors();

makePasteZones();
document.addEventListener('paste',e=>{
  const file=[...(e.clipboardData?.items||[])].filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile())[0];
  if(!file)return;
  const target=e.target;
  // 텍스트 작성 중 붙여넣기는 가로채지 않습니다.
  if(target.closest('textarea,[contenteditable="true"],input:not([type="file"])'))return;
  const zone=target.closest('.pasteZone');
  let id=zone?.id?.replace(/PasteZone$/,'');
  if(!id){const active=document.querySelector('.panel.active');const visible=imageInputIds.filter(k=>active?.contains(document.getElementById(k)));if(visible.length===1)id=visible[0];}
  if(!id)return;
  e.preventDefault();setPendingImage(id,new File([file],`capture_${Date.now()}.png`,{type:file.type||'image/png'}));
});
// 다른 기록을 열거나 새 기록으로 이동할 때 미저장 이미지가 따라가지 않도록 초기화합니다.
document.addEventListener('click',e=>{if(e.target.closest('.listItem[data-id],.side .nav,#newArticle,#newActivity,#newResearch,#newArea,#newNow,#newColumn'))clearPendingImages()},true);
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value)}catch(err){message($('#loginMsg'),'로그인 실패: '+err.message,false)}}); $('#logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{const yes=!!user;$('#loginPanel').hidden=yes;$('#cms').hidden=!yes;$('#logoutBtn').hidden=!yes;if(yes) startCMS();});
function startCMS(){ if(startCMS.done)return;startCMS.done=true; onValue(ref(db,'homepage'),s=>{cache=s.val()||{}; renderAll();}); }
let currentArticleCategory='교육·교재';
const activityGroup=x=>{const c=String(x?.category||'').toLowerCase().replace(/\s/g,'');if(c.includes('슈퍼비전')||c.includes('멘토코칭')||c.includes('supervision')||c.includes('mentorcoaching'))return'supervision';if(['개인·그룹코칭','코칭활동','coaching','그룹코칭','개인코칭','1:1코칭'].some(v=>c===v.toLowerCase().replace(/\s/g,'')))return'coaching';return'other'};
const activityAdminFilter=document.getElementById('activityAdminFilter');
activityAdminFilter?.addEventListener('change',()=>renderAll());
function selectAdminNav(b){
 if(!b)return;
 document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));
 document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
 const panel=document.querySelector('#tab-'+b.dataset.tab);if(panel)panel.classList.add('active');
 if(b.dataset.tab==='articles'){
  const nextCategory=b.dataset.category||'교육·교재';
  if(nextCategory!==currentArticleCategory){$('#articleForm').hidden=true;$('#articleForm').reset();$('#articleForm').elements.id.value='';}
  currentArticleCategory=nextCategory;
  const t=document.querySelector('#articleSectionTitle');if(t)t.textContent=({'연구노트':'생각·성찰','코칭사례':'코칭 현장사례'}[currentArticleCategory]||currentArticleCategory)+' 관리';
  const badge=document.querySelector('#articleCategoryBadge');if(badge)badge.textContent=currentArticleCategory+' 전용 작성 · 이 메뉴의 기록만 저장됩니다.';
  renderArticleSection();fillArticlePrefs();
 }
}
$('.side')?.addEventListener('click',e=>selectAdminNav(e.target.closest('.nav')));
document.querySelectorAll('.statJump').forEach(btn=>btn.addEventListener('click',()=>{
 const target=btn.dataset.dest;
 const nav=[...document.querySelectorAll('.nav')].find(n=>n.dataset.category===target||(!n.dataset.category&&n.dataset.tab===target));
 selectAdminNav(nav);
}));
function normalizedArticleCategory(c){const v=String(c||'').trim();if(!v||['기존','글','insights'].includes(v))return '연구노트';if(['강의자료','교육','교재'].includes(v))return '교육·교재';if(['AX혁신','공공혁신','AX·공공혁신 사례','AX·공공혁신'].includes(v))return 'AX·공공혁신';if(v==='사례')return '코칭사례';return v;}
function renderArticleSection(){
 const a=vals(cache.articles).filter(x=>normalizedArticleCategory(x.category)===currentArticleCategory).sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')));
 renderList($('#articleList'),a,'articles',x=>x.date||'',x=>x.title);
}

// 이미지 원본과 표시 규칙은 분리 저장합니다. 기존 이미지에는 종류별 기본값 적용.
const imageSettingsFor = {
 columnForm:{input:'columnImage',kind:'columns'},articleForm:{input:'articleImage',kind:'articles'},activityForm:{input:'activityImage',kind:'activities'},researchForm:{input:'researchImage',kind:'research'},areaForm:{input:'areaImage',kind:'areas'},nowEntryForm:{input:'nowEntryImage',kind:'nowEntries'}
};
function imageDefault(kind,category=''){
 const book=kind==='articles' && ['교육·교재','강의자료','교육','교재'].includes(category);
 return {aspect:book?'3/4':'4/3',fit:book?'contain':'cover',position:'center'};
}
function imageEditor(form){return form?.querySelector('.imageDisplayEditor')}
function readImageSettings(form){const b=imageEditor(form);if(!b)return undefined;return {aspect:b.querySelector('.imageAspect').value,fit:b.querySelector('.imageFit').value,position:b.querySelector('.imagePosition').value}}
function setImageSettings(form, data={}){
 const b=imageEditor(form);if(!b)return;
 const kind=imageSettingsFor[form.getAttribute('id')]?.kind||'articles';const defaults=imageDefault(kind, data.category||currentArticleCategory);
 const v={...defaults,...(data.imageDisplay||{})};
 for(const [cls,key] of [['.imageAspect','aspect'],['.imageFit','fit'],['.imagePosition','position']])b.querySelector(cls).value=v[key];
 updateImagePreview(form);
}
function updateImagePreview(form){const b=imageEditor(form);if(!b)return;const settings=readImageSettings(form),vp=b.querySelector('.imagePreviewViewport'),im=vp.querySelector('img');
 vp.style.aspectRatio=settings.aspect;im.style.objectFit=settings.fit;im.style.objectPosition=settings.position;
 const id=imageSettingsFor[form.getAttribute('id')]?.input;const src=pasteUrls.get(id)||form.dataset.imagePreview||'';
 if(src){im.src=src;im.hidden=false}else{im.removeAttribute('src');im.hidden=true}
}
function imageFormOpen(form,data={}){form.dataset.imagePreview=data.image||data.imageUrl||'';setImageSettings(form,data)}
document.querySelectorAll('.imageDisplayEditor select').forEach(el=>el.addEventListener('change',()=>updateImagePreview(el.closest('form'))));
const imageObserver=new MutationObserver(()=>{for(const [fid,{input}] of Object.entries(imageSettingsFor)){const f=document.getElementById(fid);if(f && pasteUrls.has(input))updateImagePreview(f)}});
for(const {input} of Object.values(imageSettingsFor)){const zone=document.getElementById(input+'PasteZone');if(zone)imageObserver.observe(zone,{childList:true,subtree:true})}

function renderAll(){const a=vals(cache.articles).sort((a,b)=>(b.date||'').localeCompare(a.date||'')), ac=vals(cache.activities).sort((a,b)=>(b.date||'').localeCompare(a.date||'')), r=vals(cache.research).sort((a,b)=>(b.year||'').localeCompare(a.year||'')), ar=vals(cache.areas).sort((a,b)=>(+a.sortOrder||99)-(+b.sortOrder||99)); renderList($('#columnAdminList'),vals(cache.columns).sort((a,b)=>(b.date||'').localeCompare(a.date||'')),'columns',x=>`${x.publisher||''} · ${x.date||''}`,x=>x.title); const focusCount=vals(cache.nowEntries).length+((cache.now&&(cache.now.title||cache.now.body))?1:0); const counts=[r.length,vals(cache.columns).length,a.filter(x=>normalizedArticleCategory(x.category)==='교육·교재').length,a.filter(x=>normalizedArticleCategory(x.category)==='코칭사례').length,a.filter(x=>normalizedArticleCategory(x.category)==='AX·공공혁신').length,a.filter(x=>normalizedArticleCategory(x.category)==='연구노트').length,ac.length,focusCount,ar.length];counts.forEach((v,i)=>{const el=document.querySelector('#stat_'+i);if(el)el.textContent=v;});renderArticleSection(); renderList($('#activityList'),ac.filter(x=>!activityAdminFilter||activityAdminFilter.value==='all'||activityGroup(x)===activityAdminFilter.value),'activities',x=>`${x.date||''} · ${x.category||''}`,x=>x.title); renderList($('#researchAdminList'),r,'research',x=>[x.year,x.date].filter(Boolean).join(' · '),x=>x.title); renderNowAdminList(); renderList($('#areaList'),ar,'areas',x=>`순서 ${x.sortOrder||''}`,x=>x.title); fillProfile(); fillContact(); fillDesign(); fillExtra(); fillDisplayPrefs(); fillArticlePrefs(); renderSiteTextEditor(); }
// 기존 단일 관심 기록(homepage/now)과 새 다중 기록(homepage/nowEntries)을 모두 표시합니다.
function renderNowAdminList(){
  const entries=vals(cache.nowEntries).map(x=>({...x,source:'new'}));
  if(cache.now && (cache.now.title||cache.now.body)) entries.push({...cache.now,id:'legacy-now',source:'legacy'});
  entries.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  renderList($('#nowAdminList'),entries,'nowEntries',x=>x.source==='legacy'?'기존 관심 글 · 수정 가능':(x.date||'날짜 없음'),x=>x.title||'(제목 없음)');
}
const adminEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function renderList(el,items,type,sub,title){el.innerHTML=items.length?items.map(x=>`<div class="listItem" data-type="${adminEsc(type)}" data-id="${adminEsc(x.id)}"><small>${adminEsc(sub(x))}</small><b>${adminEsc(title(x)||'(제목 없음)')}</b>${x.published===false?'<small class="privateState">비공개</small>':''}</div>`).join(''):'<div class="listItem"><small>등록된 항목이 없습니다.</small></div>'}
document.addEventListener('click',e=>{const it=e.target.closest('.listItem[data-id]');if(!it)return;openItem(it.dataset.type,it.dataset.id);document.querySelectorAll('.listItem').forEach(x=>x.classList.toggle('active',x===it))});
function openItem(type,id){const d=cache[type]?.[id]||{};const publicationForm={columns:'columnForm',articles:'articleForm',activities:'activityForm',research:'researchForm',areas:'areaForm',nowEntries:'nowEntryForm'}[type];if(publicationForm){const el=$('#'+publicationForm).elements.published;if(el)el.checked=(d.published!==false);}  if(type==='columns'){fillForm($('#columnForm'),{id,...d},['id','url','title','publisher','date','category','summary','body','imageUrl']);$('#columnForm').elements.featured.checked=!!d.featured;$('#columnImageCurrent').textContent=d.image||'';} if(type==='articles'){if(normalizedArticleCategory(d.category)!==currentArticleCategory)return;$('#articleForm').elements.pinned.checked=!!d.pinned;const sel=$('#articleForm').elements.category;sel.querySelectorAll('option[data-legacy]').forEach(o=>o.remove());if(d.category&&![...sel.options].some(o=>o.value===d.category)){const o=document.createElement('option');o.value=d.category;o.textContent=d.category+' (기존 분류 · 연구노트)';o.dataset.legacy='1';sel.append(o);}fillForm($('#articleForm'),{id,...d,category:currentArticleCategory},['id','date','category','title','summary','body','imageUrl','link']);$('#articleImageCurrent').textContent=d.image||'';} if(type==='activities'){const select=$('#activityForm').elements.category;select.querySelectorAll('[data-legacy]').forEach(x=>x.remove());if(d.category&&![...select.options].some(x=>x.value===d.category)){const opt=document.createElement('option');opt.value=d.category;opt.textContent=d.category+' (기존 분류)';opt.dataset.legacy='1';select.append(opt)}fillForm($('#activityForm'),{id,...d,summary:d.summary||'',body:d.body??d.desc??''},['id','date','category','title','summary','body','imageUrl','link'])||($('#activityImageCurrent').textContent=d.image||'');} if(type==='research') fillForm($('#researchForm'),{id,...d,summary:d.summary??d.meta??'',body:d.body??d.desc??''},['id','year','title','category','summary','body','date','imageUrl','link'])||($('#researchImageCurrent').textContent=d.image||''); if(type==='research') $('#researchForm').elements.pinned.checked=!!d.pinned; if(type==='nowEntries'){const item=id==='legacy-now'?(cache.now||{}):d;$('#nowEntryForm').elements.published.checked=item.published!==false;fillForm($('#nowEntryForm'),{...item,id},['id','date','category','title','summary','body','imageUrl']);$('#nowEntryForm').elements.pinned.checked=!!item.pinned;$('#nowEntryImageCurrent').textContent=item.image||'';message($('#nowEntryMsg'),id==='legacy-now'?'기존 관심 글입니다. 저장하면 기존 홈페이지 기록이 수정됩니다.':'기록을 수정할 수 있습니다.');} if(type==='areas') fillForm($('#areaForm'),{id,...d,summary:d.summary??d.subtitle??''},['id','sortOrder','category','title','summary','body','imageUrl'])||($('#areaImageCurrent').textContent=d.image||''); }
function fillForm(form,data,names){setGalleryDraft(form,data);imageFormOpen(form,data);form.hidden=false;names.forEach(n=>{if(form.elements[n])form.elements[n].value=data[n]??''});return false}
function newForm(form,names){setGalleryDraft(form,{});imageFormOpen(form,{});form.hidden=false;form.reset();names.forEach(n=>{if(form.elements[n])form.elements[n].value=''});}
$('#newArticle').onclick=()=>{newForm($('#articleForm'),['id']);$('#articleForm').elements.pinned.checked=false;$('#articleForm').elements.category.value=currentArticleCategory;setImageSettings($('#articleForm'),{category:currentArticleCategory});};$('#newActivity').onclick=()=>{newForm($('#activityForm'),['id']);$('#activityForm').elements.category.value='개인·그룹코칭';$('#activityForm').elements.published.checked=true;};$('#newResearch').onclick=()=>newForm($('#researchForm'),['id']);$('#newArea').onclick=()=>newForm($('#areaForm'),['id']);
function formObj(form,names){return Object.fromEntries(names.map(n=>[n,form.elements[n].value.trim()]))}
$('#articleForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{let d=formObj(f,['date','category','title','summary','body','imageUrl','link']);d.category=currentArticleCategory;d.pinned=!!f.elements.pinned.checked;const id=f.elements.id.value||push(ref(db,'homepage/articles')).key;const old=cache.articles?.[id]?.image||'';const image=await uploadFromInput('articleImage','articles');d.image=image||d.imageUrl||old;d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.updatedAt=Date.now();d.gallery=await saveGallery(f);await set(ref(db,`homepage/articles/${id}`),d);galleryDrafts.set(f.getAttribute('id'),cleanGallery(d.gallery));galleryEditorState.set(f.getAttribute('id'),{entryId:id,dirty:false});drawGallery(f.getAttribute('id'));f.elements.id.value=id;$('#articleImageCurrent').textContent=d.image||'';message($('#articleMsg'),'글 저장 완료 · '+await verifiedGalleryMessage('articles',id,d.gallery.length))}catch(x){message($('#articleMsg'),'저장 실패: '+x.message,false)}});
$('#activityForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{let d=formObj(f,['date','category','title','summary','body','imageUrl','link']);const id=f.elements.id.value||push(ref(db,'homepage/activities')).key;const old=cache.activities?.[id]?.image||'';const image=await uploadFromInput('activityImage','activities');d.image=image||d.imageUrl||old;d.desc=d.body;d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.updatedAt=Date.now();d.gallery=await saveGallery(f);await set(ref(db,`homepage/activities/${id}`),d);f.elements.id.value=id;$('#activityImageCurrent').textContent=d.image||'';message($('#activityMsg'),'저장 완료')}catch(x){message($('#activityMsg'),'저장 실패: '+x.message,false)}});
$('#researchForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const d=formObj(f,['year','title','category','summary','body','date','imageUrl','link']);d.pinned=f.elements.pinned.checked;const id=f.elements.id.value||push(ref(db,'homepage/research')).key;d.image=(await uploadFromInput('researchImage','research'))||d.imageUrl||cache.research?.[id]?.image||'';d.meta=d.summary;d.desc=d.body;d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.gallery=await saveGallery(f);await set(ref(db,`homepage/research/${id}`),d);f.elements.id.value=id;message($('#researchMsg'),'저장 완료')}catch(x){message($('#researchMsg'),'저장 실패: '+x.message,false)}});
$('#areaForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const d=formObj(f,['sortOrder','category','title','summary','body','imageUrl']);d.subtitle=d.summary;d.sortOrder=Number(d.sortOrder||99);const id=f.elements.id.value||push(ref(db,'homepage/areas')).key;d.image=(await uploadFromInput('areaImage','areas'))||d.imageUrl||cache.areas?.[id]?.image||'';d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.gallery=await saveGallery(f);await set(ref(db,`homepage/areas/${id}`),d);f.elements.id.value=id;message($('#areaMsg'),'저장 완료')}catch(x){message($('#areaMsg'),'저장 실패: '+x.message,false)}});
async function del(type,form,msg){const id=form.elements.id.value;if(!id)return;if(!confirm('이 항목을 삭제할까요?'))return;try{await remove(ref(db,`homepage/${type}/${id}`));form.hidden=true;message(msg,'삭제 완료')}catch(x){message(msg,'삭제 실패: '+x.message,false)}}
$('#deleteArticle').onclick=()=>del('articles',$('#articleForm'),$('#articleMsg'));$('#deleteActivity').onclick=()=>del('activities',$('#activityForm'),$('#activityMsg'));$('#deleteResearch').onclick=()=>del('research',$('#researchForm'),$('#researchMsg'));$('#deleteArea').onclick=()=>del('areas',$('#areaForm'),$('#areaMsg'));
function fillProfile(){const p=cache.profile||DEFAULT_CONTENT.profile, ph=cache.philosophy||DEFAULT_CONTENT.philosophy, f=$('#profileForm'); for(const [n,v] of Object.entries({nameKo:p.nameKo,nameEn:p.nameEn,roles:p.roles,degree:p.degree,credentials:p.credentials,headline:p.headline,intro:p.intro,eyebrow:ph.eyebrow,philTitle:ph.title,philBody:ph.body})) if(f.elements[n]&&document.activeElement!==f.elements[n])f.elements[n].value=v||'';$('#profilePhotoCurrent').textContent=p.photo||''}
$('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const old=cache.profile?.photo||'assets/images/profile.jpg';const photo=await uploadFromInput('profileImage','profile');await update(ref(db,'homepage'),{profile:{nameKo:f.nameKo.value.trim(),nameEn:f.nameEn.value.trim(),roles:f.roles.value.trim(),degree:f.degree.value.trim(),credentials:f.credentials.value.trim(),headline:f.headline.value.trim(),intro:f.intro.value.trim(),photo:photo||old},philosophy:{eyebrow:f.eyebrow.value.trim(),title:f.philTitle.value.trim(),body:f.philBody.value.trim()}});message($('#profileMsg'),'프로필 저장 완료')}catch(x){message($('#profileMsg'),'저장 실패: '+x.message,false)}});
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

// 독립형 베이스캠프 편집 영역: 기존 Firebase 항목을 덮어쓰지 않고 필요한 노드만 저장
function fillExtra(){
  const nf=$('#nowForm'), sf=$('#socialForm');
  if(nf){for(const key of ['title','body','imageUrl'])if(document.activeElement!==nf.elements[key])nf.elements[key].value=cache.now?.[key]||'';$('#nowImageCurrent').textContent=cache.now?.image||'';}
  if(sf)for(const key of ['blog','youtube','instagram','facebook','linkedin','threads','otherName','otherUrl'])if(document.activeElement!==sf.elements[key])sf.elements[key].value=cache.social?.[key]||'';
}
$('#nowForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const image=(await upload($('#nowImage').files[0],'now'))||f.elements.imageUrl.value.trim()||cache.now?.image||'';await set(ref(db,'homepage/now'),{title:f.elements.title.value.trim(),body:f.elements.body.value.trim(),image,imageUrl:f.elements.imageUrl.value.trim()});message($('#nowMsg'),'근황 저장 완료')}catch(x){message($('#nowMsg'),'저장 실패: '+x.message,false)}});
$('#socialForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const d={};for(const key of ['blog','youtube','instagram','facebook','linkedin','threads','otherName','otherUrl'])d[key]=f.elements[key].value.trim();try{await set(ref(db,'homepage/social'),d);message($('#socialMsg'),'SNS 주소 저장 완료')}catch(x){message($('#socialMsg'),'저장 실패: '+x.message,false)}});

// 칼럼/기고: 기존 homepage 데이터는 덮어쓰지 않고 columns 하위 경로만 사용합니다.
$('#newColumn').onclick=()=>{newForm($('#columnForm'),['id']);$('#columnImageCurrent').textContent='';$('#columnForm').elements.featured.checked=false;$('#columnForm').elements.category.value='공익코칭';};
$('#columnForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{
  const d=formObj(f,['url','title','publisher','date','category','summary','body','imageUrl']);
  const u=new URL(d.url);if(!['https:','http:'].includes(u.protocol))throw Error('http 또는 https 주소만 등록할 수 있습니다.');
  const id=f.elements.id.value||push(ref(db,'homepage/columns')).key;
  d.image=(await uploadFromInput('columnImage','columns'))||d.imageUrl||cache.columns?.[id]?.image||'';
  d.featured=f.elements.featured.checked;d.updatedAt=Date.now();
  d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.gallery=await saveGallery(f);await set(ref(db,`homepage/columns/${id}`),d);f.elements.id.value=id;$('#columnImageCurrent').textContent=d.image;
  message($('#columnMsg'),'칼럼이 저장되었습니다. 홈페이지에 반영됩니다.');
}catch(err){message($('#columnMsg'),'저장 실패: '+err.message,false)}});
$('#deleteColumn').onclick=()=>del('columns',$('#columnForm'),$('#columnMsg'));
$('#columnAutofill').onclick=()=>{const f=$('#columnForm'),url=f.elements.url.value.trim();if(!url){message($('#columnAutofillMsg'),'먼저 원문 주소를 넣어주세요.',false);return}try{const u=new URL(url);if(u.hostname.endsWith('kpica.or.kr')){if(!f.elements.publisher.value)f.elements.publisher.value='한국공익코칭협회';if(!f.elements.category.value)f.elements.category.value='공익코칭';}message($('#columnAutofillMsg'),'사이트의 원문 정보 자동 추출은 접근 정책상 제공되지 않습니다. 제목·소개를 직접 입력해 주세요.');}catch{message($('#columnAutofillMsg'),'URL 형식을 확인해 주세요.',false)}};

// 목록이 많아져도 선택 편집이 쉽도록 관리자를 경량 목록+상세 편집으로 구성합니다.
$('#newNow').onclick=()=>{newForm($('#nowEntryForm'),['id']);$('#nowEntryForm').elements.pinned.checked=false;$('#nowEntryForm').elements.date.value=new Date().toLocaleDateString('en-CA');$('#nowEntryImageCurrent').textContent='';};
$('#nowEntryForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;try{const d=formObj(f,['date','category','title','summary','body','imageUrl']);const id=f.elements.id.value||push(ref(db,'homepage/nowEntries')).key;const legacy=id==='legacy-now';d.pinned=f.elements.pinned.checked;d.image=(await uploadFromInput('nowEntryImage','now'))||d.imageUrl||(legacy?cache.now?.image:cache.nowEntries?.[id]?.image)||'';d.published=f.elements.published.checked;d.imageDisplay=readImageSettings(f);d.updatedAt=Date.now();d.gallery=await saveGallery(f);await set(ref(db,legacy?'homepage/now':`homepage/nowEntries/${id}`),d);f.elements.id.value=id;message($('#nowEntryMsg'),'기록 저장 완료');}catch(e){message($('#nowEntryMsg'),'저장 실패: '+e.message,false)}});
$('#deleteNowEntry').onclick=async()=>{const f=$('#nowEntryForm'),id=f.elements.id.value;if(id==='legacy-now'){if(!confirm('기존 관심 글을 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;try{await remove(ref(db,'homepage/now'));f.hidden=true;message($('#nowEntryMsg'),'기존 관심 글 삭제 완료')}catch(e){message($('#nowEntryMsg'),'삭제 실패: '+e.message,false)}return;}await del('nowEntries',f,$('#nowEntryMsg'));};
function fillDisplayPrefs(){const v=cache.displaySettings||{};for(const type of ['research','now','columns','activities','areas']){const mode=$(`#${type}Mode`),count=$(`#${type}Count`);if(document.activeElement!==mode)mode.value=v[type]?.mode||'latest';if(document.activeElement!==count)count.value=v[type]?.count??({columns:6,activities:6,areas:3}[type]??3);}}
for(const type of ['research','now','columns','activities','areas'])$(`#${type}PrefsSave`).onclick=async()=>{try{await set(ref(db,`homepage/displaySettings/${type}`),{mode:$(`#${type}Mode`).value,count:Math.max(0,Math.min(100,Number($(`#${type}Count`).value)||0))});message($(`#${type}PrefsMsg`),'첫 화면 설정 저장 완료')}catch(e){message($(`#${type}PrefsMsg`),'저장 실패: '+e.message,false)}};

// 홈페이지 고정 문구 및 메뉴 명칭 편집기. homepage/siteText만 수정합니다.
const siteFieldBox=$('#siteTextFields');
let siteTextEditing=false;
function renderSiteTextEditor(){
 if(!siteFieldBox || siteTextEditing)return;
 const saved=cache.siteText||{};
 siteFieldBox.innerHTML=SITE_TEXT_FIELDS.map(f=>{
   const entry=saved[f.key]||{};
   return `<div class="siteTextField" data-site-key="${f.key}"><label>${adminEsc(f.label)}</label><textarea>${adminEsc(typeof entry.value==='string'?entry.value:f.default)}</textarea><div class="siteTextRow"><label><input type="checkbox" ${entry.hidden?'checked':''}> 홈페이지에서 이 문구 숨기기</label><button type="button" class="ghost restoreSiteDefault">기본 문구 복구</button></div></div>`;
 }).join('');
 filterSiteTextRows();
}
function filterSiteTextRows(){const q=($('#siteTextSearch')?.value||'').trim().toLowerCase();siteFieldBox?.querySelectorAll('.siteTextField').forEach(row=>row.style.display=row.textContent.toLowerCase().includes(q)?'':'none');}
$('#siteTextSearch')?.addEventListener('input',filterSiteTextRows);
$('#siteTextReload')?.addEventListener('click',()=>{siteTextEditing=false;renderSiteTextEditor();});
siteFieldBox?.addEventListener('input',()=>{siteTextEditing=true;});
siteFieldBox?.addEventListener('click',e=>{const b=e.target.closest('.restoreSiteDefault');if(!b)return;const row=b.closest('.siteTextField'),f=SITE_TEXT_FIELDS.find(f=>f.key===row.dataset.siteKey);row.querySelector('textarea').value=f.default;row.querySelector('input[type=checkbox]').checked=false;siteTextEditing=true;});
$('#siteTextForm')?.addEventListener('submit',async e=>{e.preventDefault();const msg=$('#siteTextMsg');try{const payload={};siteFieldBox.querySelectorAll('.siteTextField').forEach(row=>{payload[row.dataset.siteKey]={value:row.querySelector('textarea').value,hidden:row.querySelector('input[type=checkbox]').checked};});await set(ref(db,'homepage/siteText'),payload);siteTextEditing=false;message(msg,'문구 저장 완료 · 홈페이지 새로고침 후 확인하세요.')}catch(err){message(msg,'저장 실패: '+err.message,false);}});

for(const [fid,{input}] of Object.entries(imageSettingsFor)){document.getElementById(input)?.addEventListener('change',e=>{const f=document.getElementById(fid);const file=e.target.files?.[0];if(file){if(f.dataset.ownPreviewUrl)URL.revokeObjectURL(f.dataset.ownPreviewUrl);f.dataset.ownPreviewUrl=URL.createObjectURL(file);f.dataset.imagePreview=f.dataset.ownPreviewUrl;}updateImagePreview(f)})}

// 각 홈페이지 섹션 노출 갯수 및 대표 게시물 설정
const articlePrefKey=()=>({'교육·교재':'education','코칭사례':'cases','AX·공공혁신':'ax','연구노트':'notes'})[currentArticleCategory]||'notes';
function fillArticlePrefs(){const v=cache.displaySettings?.[articlePrefKey()]||{};const h=$('#articlePrefsHeading');if(h)h.textContent=`${({"연구노트":"생각·성찰","코칭사례":"코칭 현장사례"}[currentArticleCategory]||currentArticleCategory)} · 홈페이지 첫 화면 표시 설정`;const m=$('#articleMode'),c=$('#articleCount');if(m&&document.activeElement!==m)m.value=v.mode||'latest';if(c&&document.activeElement!==c)c.value=v.count??3;}
$('#articlePrefsSave').addEventListener('click',async()=>{try{await set(ref(db,`homepage/displaySettings/${articlePrefKey()}`),{mode:$('#articleMode').value,count:Math.max(0,Math.min(30,Number($('#articleCount').value)||0))});message($('#articlePrefsMsg'),`${currentArticleCategory} 첫 화면 표시 설정이 저장되었습니다.`)}catch(e){message($('#articlePrefsMsg'),'저장 실패: '+e.message,false)}});
// 제목·요약·본문에서 선택한 부분만 작게/옅게 표시 (문자열 보존 방식)
// 선택 영역은 서식 버튼을 클릭하기 직전 상태로 유지합니다.
const formatSelections=new WeakMap();
const articleForm=$('#articleForm');
document.querySelectorAll('form.editor textarea[name="title"],form.editor textarea[name="summary"],form.editor textarea[name="body"]').forEach(area=>{
 const save=()=>formatSelections.set(area,{start:area.selectionStart,end:area.selectionEnd});
 ['select','keyup','mouseup','focus','input'].forEach(ev=>area.addEventListener(ev,save));
});
function applyInlineFormat(area,format,color,msg,size){
 const range=formatSelections.get(area)||{start:area.selectionStart,end:area.selectionEnd};
 const a=range.start,b=range.end;
 if(a===b){message(msg,'서식을 적용할 글자를 먼저 드래그하여 선택하세요.',false);area.focus();return}
 const selected=area.value.slice(a,b);let replacement=selected;
 switch(format){
 case 'smallmuted':replacement=`[small][muted]${selected}[/muted][/small]`;break;
 case 'small':replacement=`[small]${selected}[/small]`;break;
 case 'muted':replacement=`[muted]${selected}[/muted]`;break;
 case 'bold':replacement=`[b]${selected}[/b]`;break;
 case 'color':replacement=`[color=${color}]${selected}[/color]`;break;
 case 'size':replacement=`[size=${Math.max(10,Math.min(48,Number(size)||16))}]${selected}[/size]`;break;
 case 'clear':replacement=selected.replace(/\[\/?(?:b|small|muted)\]/gi,'').replace(/\[color=#[0-9a-f]{6}\]|\[\/color\]/gi,'').replace(/\[size=\d{1,2}\]|\[\/size\]/gi,'');break;
 }
 area.setRangeText(replacement,a,b,'select');formatSelections.set(area,{start:a,end:a+replacement.length});area.focus();
}
// 모든 콘텐츠 편집기에서 선택 영역을 유지한 채 동일한 서식을 적용합니다.
document.querySelectorAll('.titleFormatToolbar,.richToolbar').forEach(toolbar=>{
 const form=toolbar.closest('form');if(!form)return;
 toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button[data-format]'))e.preventDefault()});
 toolbar.addEventListener('click',e=>{
  const button=e.target.closest('button[data-format]');if(!button)return;
  const field=toolbar.dataset.field||'body',area=form.elements[field];if(!area)return;
  const msg=form.querySelector('.msg');
  applyInlineFormat(area,button.dataset.format,toolbar.querySelector('.formatColor')?.value||toolbar.querySelector('input[type="color"]')?.value||'#174ea6',msg,toolbar.querySelector('.formatSize')?.value);
 });
});

// Visitor dashboard: read-only. Counters intentionally live outside /homepage content.
const koreaDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replaceAll('-','');
function renderVisitorStats(v){
 const days=v?.days||{},today=koreaDate(new Date()),start=new Date();
 const ordered=[];for(let i=29;i>=0;i--){const d=new Date(start.getTime()-i*86400000);const k=koreaDate(d);ordered.push([k,Number(days[k]||0)])}
 const sum=n=>ordered.slice(-n).reduce((a,[,x])=>a+x,0);
 for(const [id,n] of [['dashToday',Number(days[today]||0)],['dashTotal',Number(v?.total||0)],['dashWeek',sum(7)],['dashMonth',sum(30)]])document.getElementById(id).textContent=n.toLocaleString('ko-KR');
 const max=Math.max(1,...ordered.map(x=>x[1]));const chart=document.getElementById('visitorChart');chart.replaceChildren();
 for(const [date,n] of ordered){const bar=document.createElement('div');bar.className='visitorBar'+(date===today?' today':'');bar.style.height=Math.max(2,Math.round(n/max*110))+'px';bar.title=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6)+' · '+n+'명';bar.setAttribute('aria-label',bar.title);chart.append(bar)}
}
onValue(ref(db,'visitorStats'),s=>renderVisitorStats(s.val()),err=>{console.warn('방문자 통계 조회 실패:',err.message);document.querySelector('.visitorDashboard .msg').textContent='Firebase 방문자 통계 읽기 권한을 확인해주세요.'});


// 저장된 글의 탭 이동: 서로 다른 Firebase 컬렉션 사이에서도 원본 메타데이터와 사진 URL 보존
const MOVE_DESTINATIONS=[
 ['research','','학술연구'],['columns','','칼럼·기고·인터뷰'],
 ['articles','교육·교재','교육·교재'],['articles','코칭사례','코칭 현장사례'],
 ['articles','AX·공공혁신','AX·공공혁신'],['articles','연구노트','생각·성찰'],
 ['activities','','활동'],['areas','','핵심 영역'],['nowEntries','','요즘의 관심']
];
const MOVE_FORMS={research:'researchForm',columns:'columnForm',articles:'articleForm',activities:'activityForm',areas:'areaForm',nowEntries:'nowEntryForm'};
function moveLocation(type,item){return type==='articles'?`${type}|${normalizedArticleCategory(item.category)}`:`${type}|`;}
function setupEntryMoveControls(){
 for(const [type,formId] of Object.entries(MOVE_FORMS)){
  const form=document.getElementById(formId);if(!form)continue;
  const box=document.createElement('div');box.className='entryMoveControl';
  const title=document.createElement('strong');title.textContent='저장된 글을 다른 탭으로 이동';
  const hint=document.createElement('small');hint.textContent='현재 글을 먼저 저장한 뒤 이동하세요. 사진·서식·공개 여부를 유지합니다.';
  const line=document.createElement('div');line.className='entryMoveRow';
  const select=document.createElement('select');select.setAttribute('aria-label','이동할 탭 선택');
  const initial=document.createElement('option');initial.value='';initial.textContent='이동할 탭 선택';select.append(initial);
  for(const [dest,cat,label] of MOVE_DESTINATIONS){const o=document.createElement('option');o.value=dest+'|'+cat;o.textContent=label;select.append(o)}
  const btn=document.createElement('button');btn.type='button';btn.className='ghost';btn.textContent='이동';
  const status=document.createElement('small');status.className='entryMoveStatus';
  line.append(select,btn);box.append(title,hint,line,status);
  const actions=form.querySelector('.row');if(actions)actions.before(box);else form.append(box);
  btn.addEventListener('click',async()=>{
   const id=form.elements.id?.value;if(!id){status.textContent='먼저 저장된 글을 선택해 주세요.';return}
   const source=type==='nowEntries'&&id==='legacy-now'?'now':type;
   const item=source==='now'?cache.now:cache[source]?.[id];
   if(!item){status.textContent='원본 자료를 찾을 수 없습니다. 목록을 다시 선택해 주세요.';return}
   if(!select.value){status.textContent='이동할 탭을 먼저 선택해 주세요.';return}
   const [dest,category]=select.value.split('|');
   if(moveLocation(source,item)===select.value){status.textContent='이미 이 탭에 있는 글입니다.';return}
   if(!confirm(`「${String(item.title||'제목 없음').replace(/\[[^\]]+\]/g,'').slice(0,60)}」 글을 ${MOVE_DESTINATIONS.find(x=>x[0]===dest&&x[1]===category)?.[2]} 탭으로 이동할까요?\n\n현재 입력 중인 미저장 수정은 반영되지 않습니다. 먼저 저장해 주세요.`))return;
   btn.disabled=true;status.textContent='이동 중…';
   try{
    const newId=push(ref(db,`homepage/${dest}`)).key;
    const {id:ignored,...original}=item;
    const next={...original,updatedAt:Date.now()};
    // 목적지에서 사용하는 필드를 보충하되 기존 본문·이미지·메타정보를 보존합니다.
    next.summary=next.summary??next.meta??next.subtitle??'';
    next.body=next.body??next.desc??'';
    if(dest==='articles')next.category=category;
    else if(source==='articles')next.category=(next.category===category?'':next.category)||category||'';
    if(dest==='research'){next.meta=next.summary;next.desc=next.body;next.year=next.year||String(next.date||'').slice(0,4)}
    if(dest==='activities')next.desc=next.body;
    if(dest==='areas'){next.subtitle=next.summary;next.sortOrder=next.sortOrder||99}
    if(dest==='columns'){next.publisher=next.publisher||'';next.url=next.url||next.link||''}
    // Firebase multi-location update는 한 번에 반영되어 중복/유실을 피합니다.
    const oldPath=source==='now'?'now':`${source}/${id}`;
    await update(ref(db,'homepage'),{[`${dest}/${newId}`]:next,[oldPath]:null});
    if(source==='now')delete cache.now;else if(cache[source])delete cache[source][id];
    if(!cache[dest])cache[dest]={};cache[dest][newId]=next;
    renderAll();
    form.hidden=true;form.elements.id.value='';select.value='';
    const nav=[...document.querySelectorAll('.side .nav')].find(n=>dest==='articles'?(n.dataset.tab==='articles'&&n.dataset.category===category):(n.dataset.tab===dest || (dest==='nowEntries'&&n.dataset.tab==='now')));
    if(nav)selectAdminNav(nav);
    // 이동된 글을 즉시 열어 후속 수정 가능하도록 합니다.
    if(dest==='articles')currentArticleCategory=category;
    openItem(dest,newId);
    status.textContent='이동 완료';
   }catch(err){status.textContent='이동 실패: '+err.message;alert('이동에 실패했습니다. 기존 글은 그대로 유지됩니다. '+err.message)}
   finally{btn.disabled=false}
  });
 }
}
setupEntryMoveControls();

// 자격·인증 항목 독립 관리: 기존 프로필 저장과 충돌하지 않습니다.
const credentialBox=document.createElement('section');credentialBox.className='credentialsEditor';credentialBox.innerHTML=`<h3>자격·인증 관리</h3><p>분류는 ‘코치 자격’과 ‘교육/기타 자격’ 두 가지입니다. 각 자격별 원 배경색, 아이콘 선 색상, 아이콘 형태를 선택하거나 내 이미지를 올릴 수 있습니다. 변경 후 하단 저장 버튼을 누르세요.</p><div id="credentialRows"></div><button type="button" class="ghost" id="addCredential">+ 자격 추가</button> <button type="button" class="primary" id="saveCredentials">자격 목록 저장</button><p id="credentialMsg" class="msg"></p>`;
document.getElementById('profileForm').after(credentialBox);
const defaultCredentialItems=[{name:'ICF PCC',issuer:'International Coaching Federation',category:'coach',featured:true,visible:true},{name:'KSC',issuer:'한국코치협회',category:'coach',featured:true,visible:true},{name:'KPCC',issuer:'',category:'coach',featured:false,visible:true},{name:'중등학교 정교사 2급',issuer:'',category:'education',featured:false,visible:true}];
let credentialDraft=[];
function credentialGuessCategory(x){return x.category==='coach'||x.category==='education'?x.category:(/교사|강사|교육|부모코치|보육|지도사|교원/.test(x.name||'')?'education':'coach')}
function credentialLoad(){if(document.activeElement?.closest('.credentialsEditor'))return;credentialDraft=Array.isArray(cache.credentialItems)?cache.credentialItems.map(x=>({...x})):defaultCredentialItems.map(x=>({...x}));credentialRender()}
const credentialIconPathsAdmin={
 medal:'<circle cx="16" cy="12" r="8"/><path d="M12.5 12.2 15 14.7l4.8-5M11 19 9 28l7-3 7 3-2-9"/>',
 award:'<circle cx="16" cy="10" r="7"/><path d="m11 16-3 12 8-4 8 4-3-12"/><path d="m13 10 2 2 4-4"/>',
 star:'<path d="m16 3 4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10L2 13l10-1z"/>',
 book:'<path d="M16 8c-4-3-9-3-13-2v19c5-1 10 0 13 3 3-3 8-4 13-3V6c-4-1-9-1-13 2ZM16 8v20"/>',
 graduation:'<path d="m2 12 14-8 14 8-14 8zM8 16v8c5 4 11 4 16 0v-8M29 13v10"/>',
 compass:'<circle cx="16" cy="16" r="13"/><path d="m20.5 11.5-3 7-6 2.5 2.5-6z"/>',
 check:'<circle cx="16" cy="16" r="12"/><path d="m10 16 4 4 8-9"/>',
 spark:'<path d="M16 2 19.5 12.5 30 16l-10.5 3.5L16 30l-3.5-10.5L2 16l10.5-3.5z"/>'
};
const credentialValidHex=(v,defaultColor)=>/^#[0-9a-fA-F]{6}$/.test(v||'')?v:defaultColor;
function credentialUpdatePreview(row,x){
 const preview=row.querySelector('.credentialLivePreview');if(!preview)return;
 const bg=credentialValidHex(x.circleColor,x.name==='ICF PCC'?'#203e68':'#f6f8fb');
 const fg=credentialValidHex(x.iconColor,x.name==='ICF PCC'?'#ffffff':'#446083');
 preview.style.backgroundColor=bg;preview.style.color=fg;preview.style.borderColor=bg;
 const path=credentialIconPathsAdmin[x.iconType]||credentialIconPathsAdmin.medal;
 preview.innerHTML=`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
 if(x.iconType==='custom'){
  const url=x.iconImageUrl||x.iconFilePreview;
  if(url && (/^https?:\/\//.test(url)||url.startsWith('blob:'))){preview.replaceChildren();const img=document.createElement('img');img.src=url;img.alt='사용자 이미지 미리보기';preview.append(img)}
  else preview.textContent='이미지';
 }
 row.querySelector('.credentialColorHexBg').textContent=bg.toUpperCase();
 row.querySelector('.credentialColorHexFg').textContent=fg.toUpperCase();
 row.querySelector('.credentialCustomUpload').hidden=x.iconType!=='custom';
}
function credentialRender(){
 const root=document.getElementById('credentialRows');root.replaceChildren();
 credentialDraft.forEach((x,i)=>{
  const row=document.createElement('div');row.className='credentialRow';row.dataset.i=i;
  row.innerHTML=`<div class="credentialEditorMain"><div class="credentialLivePreview" aria-label="인증 아이콘 미리보기"></div><div class="credentialFields"><label>자격명<input data-field="name" placeholder="예: ICF PCC"></label><label>발급·인증기관<input data-field="issuer" placeholder="기관명"></label><label>분류<select data-field="category"><option value="coach">코치 자격</option><option value="education">교육/기타 자격</option></select></label><label>자격 확인 링크 (선택)<input data-field="url" placeholder="https://..."></label></div></div>
  <div class="credentialVisualControls"><label>원 배경색 <span class="credentialColorHexBg"></span><input data-field="circleColor" type="color"></label><label>아이콘 선 색상 <span class="credentialColorHexFg"></span><input data-field="iconColor" type="color"></label><label>원 안쪽 이미지<select data-field="iconType"><option value="medal">인증 메달</option><option value="award">리본</option><option value="star">별</option><option value="book">책</option><option value="graduation">학사모</option><option value="compass">나침반</option><option value="check">체크 원</option><option value="spark">반짝임</option><option value="custom">내 이미지 사용</option></select></label></div>
  <div class="credentialCustomUpload" hidden><label>직접 이미지 업로드 (PNG/JPG/WebP 권장)<input type="file" class="credentialIconFile" accept="image/png,image/jpeg,image/webp,image/gif"></label><label>또는 이미지 URL<input data-field="iconImageUrl" placeholder="https://..."></label><small>내 이미지를 사용하면 원 배경색은 적용되지만, 이미지 내부의 색상은 원본 그대로입니다. 새 파일은 목록 저장 시 업로드됩니다.</small></div>
  <div class="credentialRowActions"><label><input type="checkbox" data-field="featured"> 첫 화면 대표</label><label><input type="checkbox" data-field="visible"> 공개</label><button type="button" data-action="up">↑</button><button type="button" data-action="down">↓</button><button type="button" data-action="delete">삭제</button></div>`;
  for(const input of row.querySelectorAll('[data-field]')){
   const k=input.dataset.field;
   if(input.type==='checkbox')input.checked=k==='featured'?!!x[k]:x[k]!==false;
   else if(k==='category')input.value=credentialGuessCategory(x);
   else if(k==='iconType')input.value=x.iconType||'medal';
   else if(k==='circleColor')input.value=credentialValidHex(x.circleColor,x.name==='ICF PCC'?'#203e68':'#f6f8fb');
   else if(k==='iconColor')input.value=credentialValidHex(x.iconColor,x.name==='ICF PCC'?'#ffffff':'#446083');
   else input.value=x[k]||'';
   const change=()=>{x[k]=input.type==='checkbox'?input.checked:input.value;credentialUpdatePreview(row,x)};
   input.addEventListener('input',change);input.addEventListener('change',change);
  }
  row.querySelector('.credentialIconFile').addEventListener('change',e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>10*1024*1024){alert('PNG, JPG, WebP, GIF 이미지 10MB 이하만 허용됩니다.');e.target.value='';return}
   if(x.iconFilePreview)URL.revokeObjectURL(x.iconFilePreview);
   x.iconFile=file;x.iconFilePreview=URL.createObjectURL(file);x.iconType='custom';x.iconImageUrl='';
   row.querySelector('[data-field="iconType"]').value='custom';row.querySelector('[data-field="iconImageUrl"]').value='';credentialUpdatePreview(row,x);
  });
  root.append(row);credentialUpdatePreview(row,x);
 });
}
document.getElementById('addCredential').onclick=()=>{credentialDraft.push({name:'',issuer:'',category:'coach',visible:true,featured:false});credentialRender()};
document.getElementById('credentialRows').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const i=Number(b.closest('.credentialRow').dataset.i),act=b.dataset.action;if(act==='delete'){if(credentialDraft[i].iconFilePreview)URL.revokeObjectURL(credentialDraft[i].iconFilePreview);credentialDraft.splice(i,1);}else {const j=i+(act==='up'?-1:1);if(j<0||j>=credentialDraft.length)return;[credentialDraft[i],credentialDraft[j]]=[credentialDraft[j],credentialDraft[i]]}credentialRender()});
document.getElementById('saveCredentials').onclick=async()=>{
 const btn=document.getElementById('saveCredentials');btn.disabled=true;
 try{
  const items=[];
  for(const x of credentialDraft.filter(x=>String(x.name||'').trim())){
   const item={name:x.name.trim(),issuer:String(x.issuer||'').trim(),category:credentialGuessCategory(x),visible:x.visible!==false,featured:!!x.featured,url:String(x.url||'').trim(),badgeUrl:String(x.badgeUrl||'').trim(),circleColor:credentialValidHex(x.circleColor,x.name==='ICF PCC'?'#203e68':'#f6f8fb'),iconColor:credentialValidHex(x.iconColor,x.name==='ICF PCC'?'#ffffff':'#446083'),iconType:x.iconType||'medal',iconImageUrl:String(x.iconImageUrl||'').trim()};
   if(x.iconType==='custom'&&x.iconFile)item.iconImageUrl=await upload(x.iconFile,'credentials/icons');
   if(item.iconImageUrl&&!/^https?:\/\//.test(item.iconImageUrl))throw Error('이미지 URL은 http 또는 https 주소여야 합니다.');
   items.push(item);
  }
  await set(ref(db,'homepage/credentialItems'),items);
  credentialDraft=items.map(x=>({...x}));credentialRender();
  message(document.getElementById('credentialMsg'),'저장 완료! 홈페이지의 자격 배지에 반영됩니다.');
 }catch(e){message(document.getElementById('credentialMsg'),'저장 실패: '+e.message,false)}finally{btn.disabled=false}
};
// 실시간 수신 때 편집하던 값을 잃지 않도록, 비활성 상태에서만 갱신
const oldRenderAll=renderAll;
renderAll=function(){oldRenderAll();credentialLoad();updateVisibilityAudit()};
function updateVisibilityAudit(){const el=document.getElementById('visibilityAudit');if(!el)return;const acts=vals(cache.activities),pub=acts.filter(x=>x.published!==false);const count=Number(cache.displaySettings?.activities?.count??6),other=pub.filter(x=>activityGroup(x)==='other'),coaching=pub.filter(x=>activityGroup(x)!=='other');el.textContent=`활동: 총 ${acts.length}건 / 공개 ${pub.length}건 / 코칭 영역 ${coaching.length}건 / 공공혁신 영역 ${Math.min(other.length,count)}건 (설정 ${count}건). 코칭 분류는 ‘코칭활동 기록’에 전건 표시, 일반 활동은 ‘활동·현장 기록’ 첫 화면 개수 설정의 영향을 받습니다. 비공개는 홈페이지에서 숨깁니다.`}
