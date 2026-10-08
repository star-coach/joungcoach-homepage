/* Shared, accessible image enlargement: original image URL is never modified. */
(()=>{
  const SELECTORS=['#columnModalImage','.articleThumb','.researchThumb','.areaThumb','.activityGrid .activity img','.nowPhoto','#modalImage','.archivePhoto','.archiveDetail img','#detail .articleImage'];
  const target=SELECTORS.join(',');
  let overlay=null,previous=null;
  function close(){if(!overlay)return;overlay.close();overlay.remove();overlay=null;document.body.style.removeProperty('overflow');if(previous&&previous.isConnected)previous.focus({preventScroll:true});}
  function open(img){
    if(!img?.currentSrc&&!img?.src)return;
    close();previous=img;const src=img.currentSrc||img.src;
    overlay=document.createElement('dialog');overlay.className='jcImageLightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','이미지 확대 보기');
    const panel=document.createElement('div');panel.className='jcImageLightboxPanel';
    const big=document.createElement('img');big.src=src;big.alt=img.alt||'확대 이미지';big.className='jcImageLightboxImage';
    const button=document.createElement('button');button.type='button';button.className='jcImageLightboxClose';button.textContent='닫기 ×';button.setAttribute('aria-label','확대 이미지 닫기');button.addEventListener('click',close);
    panel.append(big,button);overlay.append(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});overlay.addEventListener('cancel',e=>{e.preventDefault();close()});document.body.append(overlay);overlay.showModal();document.body.style.overflow='hidden';button.focus();
  }
  document.addEventListener('click',e=>{const img=e.target.closest?.(target);if(!img)return;if(img.closest('a[href]'))return;e.preventDefault();e.stopImmediatePropagation();open(img);},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay){e.preventDefault();close();}else if((e.key==='Enter'||e.key===' ')&&!overlay&&document.activeElement?.matches?.(target)){e.preventDefault();open(document.activeElement)}},true);
  const mo=new MutationObserver(()=>{document.querySelectorAll(target).forEach(img=>{if(!img.hasAttribute('data-jc-zoom')){img.setAttribute('data-jc-zoom','');img.setAttribute('title','클릭하면 이미지를 확대합니다');img.setAttribute('tabindex','0');img.setAttribute('role','button');img.setAttribute('aria-label',(img.alt||'이미지')+' 확대 보기');}})});
  function init(){mo.observe(document.body,{childList:true,subtree:true});document.querySelectorAll(target).forEach(img=>{img.setAttribute('data-jc-zoom','');img.setAttribute('title','클릭하면 이미지를 확대합니다');img.setAttribute('tabindex','0');img.setAttribute('role','button');img.setAttribute('aria-label',(img.alt||'이미지')+' 확대 보기');});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
