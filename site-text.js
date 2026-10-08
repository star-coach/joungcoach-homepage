import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
import {SITE_TEXT_FIELDS} from './site-text-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const defaults=Object.fromEntries(SITE_TEXT_FIELDS.map(x=>[x.key,x.default]));
const apply=data=>document.querySelectorAll('[data-site-text]').forEach(el=>{const key=el.dataset.siteText,entry=data?.[key];let v=(entry && typeof entry==='object' && 'value' in entry)?entry.value:defaults[key];if(typeof v==='string'){if(el.dataset.appliedText!==v){el.textContent=v;el.dataset.appliedText=v;}}el.classList.toggle('siteTextHidden',!!entry?.hidden);});
onValue(ref(getDatabase(app),'homepage/siteText'),s=>apply(s.val()||{}),e=>console.warn('홈페이지 문구 설정 로드 실패',e));
