const C = window.SITE_CONTENT;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

$('#heroRoles').textContent=C.profile.roles; $('#heroNameKo').textContent=C.profile.nameKo; $('#heroNameEn').textContent=C.profile.nameEn; $('#heroHeadline').textContent=C.profile.headline; $('#heroIntro').textContent=C.profile.intro; $('#heroPhoto').src=C.profile.photo;
$('#philEyebrow').textContent=C.philosophy.eyebrow; $('#philTitle').textContent=C.philosophy.title; $('#philBody').textContent=C.philosophy.body;
$('#areaCards').innerHTML=C.areas.map(x=>`<article class="card"><h3>${esc(x.title)}</h3><strong>${esc(x.subtitle)}</strong><p>${esc(x.body)}</p></article>`).join('');
$('#researchList').innerHTML=C.research.map(x=>`<article class="timelineItem"><div class="year">${esc(x.year)}</div><div><h3>${esc(x.title)}</h3><div class="meta">${esc(x.meta)}</div><p>${esc(x.desc)}</p></div></article>`).join('');
$('#activityGrid').innerHTML=C.activities.map(x=>`<article class="activity"><img src="${esc(x.image)}" alt=""><div class="activityBody"><div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div></article>`).join('');
$('#articleGrid').innerHTML=C.articles.map((x,i)=>`<article class="article" data-index="${i}"><div class="meta">${esc(x.date)} · ${esc(x.category)}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`).join('');
$('#contactMessage').textContent=C.contact.message;
const links=[]; if(C.contact.email) links.push(`<a href="mailto:${esc(C.contact.email)}">Email</a>`); if(C.contact.linkedin) links.push(`<a target="_blank" rel="noopener" href="${esc(C.contact.linkedin)}">LinkedIn</a>`); $('#contactLinks').innerHTML=links.join('');
$('#year').textContent=new Date().getFullYear();

$('#articleGrid').addEventListener('click', e=>{const el=e.target.closest('.article'); if(!el)return; const a=C.articles[Number(el.dataset.index)]; $('#modalMeta').textContent=`${a.date} · ${a.category}`; $('#modalTitle').textContent=a.title; $('#modalBody').textContent=a.body; $('#articleDialog').showModal();});
$('#closeDialog').onclick=()=>$('#articleDialog').close();
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');
$('#nav').addEventListener('click',()=>$('#nav').classList.remove('open'));
