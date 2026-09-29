import {esc,icon} from './ui.js';

export const emptyFilters=()=>({min:0,max:0,dates:[],rating:0,success:0,sites:[]});
export const selectedDates=f=>Array.isArray(f.dates)?f.dates:(f.date?[f.date]:[]);
const sites=['NOL','YES24','멜론티켓','티켓링크'];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function createFilters(ctx,count){
 const {state,save,render,openModal,closeModal}=ctx;
 let anchor=null;
 function draft(){const f=structuredClone(state.filters);return {...emptyFilters(),...f,date:undefined,trades:undefined,dates:[...selectedDates(f)]};}
 function close(restore=false){document.querySelector('#quick-filter')?.remove();anchor?.setAttribute('aria-expanded','false');if(restore&&anchor?.isConnected)anchor.focus();anchor=null;}
 function commit(f,key){state.filters=f;save();close();render();document.querySelector(`[data-filter="${key}"]`)?.focus();}
 const price=f=>`<div class="filter-price-inputs"><label><span class="sr-only">최소 착수비</span><input name="min" type="number" min="0" step="1" placeholder="최소 금액" value="${f.min||''}" aria-label="최소 착수비"></label><span>–</span><label><span class="sr-only">최대 착수비</span><input name="max" type="number" min="0" step="1" placeholder="최대 금액" value="${f.max||''}" aria-label="최대 착수비"></label></div><p class="filter-error" aria-live="polite"></p>`;
 function readPrice(root,f){f.min=Number(root.querySelector('[name=min]').value);f.max=Number(root.querySelector('[name=max]').value);const invalid=!Number.isFinite(f.min)||!Number.isFinite(f.max)||f.min<0||f.max<0||!Number.isInteger(f.min)||!Number.isInteger(f.max)||(f.max>0&&f.max<f.min);root.querySelector('.filter-error').textContent=invalid?'최소·최대 금액을 0원 이상의 정수로 입력해 주세요. 최대 금액은 최소 금액 이상이어야 해요.':'';return !invalid;}
 function calendar(root,f,onChange){
  const first=f.dates[0]?new Date(f.dates[0]+'T12:00:00'):new Date();let month=new Date(first.getFullYear(),first.getMonth(),1);
  const today=iso(new Date());
  function paint(focus){const y=month.getFullYear(),m=month.getMonth(),offset=month.getDay(),last=new Date(y,m+1,0).getDate();
   root.innerHTML=`<div class="filter-calendar-nav"><button type="button" data-month="-1" aria-label="이전 달">${icon('chevron',14)}</button><span aria-live="polite">${y}년 ${m+1}월</span><button type="button" data-month="1" aria-label="다음 달">${icon('chevron',14)}</button></div><div class="filter-calendar-grid">${['일','월','화','수','목','금','토'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:last},(_,i)=>{const day=i+1,date=iso(new Date(y,m,day)),selected=f.dates.includes(date);return `<button type="button" data-date="${date}" aria-label="${y}년 ${m+1}월 ${day}일" aria-pressed="${selected}" ${date<today&&!selected?'disabled':''} class="${selected?'selected':''} ${date===today?'today':''}">${day}</button>`;}).join('')}</div><div class="calendar-selection"><span>${f.dates.length?f.dates.length+'일 선택':'날짜 전체'}</span><button type="button" data-clear-dates>선택 해제</button></div>`;
   root.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{const direction=b.dataset.month;month=new Date(y,m+Number(direction),1);paint();root.querySelector(`[data-month="${direction}"]`).focus();});
   root.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{const date=b.dataset.date;f.dates=f.dates.includes(date)?f.dates.filter(d=>d!==date):[...f.dates,date].sort();paint(date);onChange();});
   root.querySelector('[data-clear-dates]').onclick=()=>{f.dates=[];paint();root.querySelector('[data-clear-dates]').focus();onChange();};
   if(focus)root.querySelector(`[data-date="${focus}"]`)?.focus();
  }paint();return ()=>{month=new Date(new Date().getFullYear(),new Date().getMonth(),1);paint();};
 }
 function quick(key,button){
  if(anchor===button){close();return;}close();anchor=button;button.setAttribute('aria-expanded','true');const f=draft();
  const title={price:'착수비',date:'예매 날짜',rating:'별점',success:'성공률'}[key];
  let body=key==='price'?price(f):key==='date'?'<p class="filter-help">여러 날짜를 선택할 수 있어요.</p><div data-calendar></div>':`<div class="filter-option-list">${[0,...(key==='rating'?[1,2,3,4,5]:[50,60,70,80,90])].map(n=>`<button type="button" data-value="${n}" aria-pressed="${Number(f[key])===n}">${n?key==='rating'?`${n}점 이상`:`${n}% 이상`:'전체'}${Number(f[key])===n?icon('check',16):''}</button>`).join('')}</div>`;
  button.parentElement.insertAdjacentHTML('beforeend',`<div id="quick-filter" class="quick-filter quick-${key}" role="dialog" aria-label="${title} 필터"><h3>${title}</h3><form novalidate>${body}${['date','price'].includes(key)?'<div class="quick-filter-actions"><button type="button" data-reset>초기화</button><button type="submit" class="btn primary">적용</button></div>':''}</form></div>`);
  const root=document.querySelector('#quick-filter'),form=root.querySelector('form');
  let resetCalendar;if(key==='date')resetCalendar=calendar(root.querySelector('[data-calendar]'),f,()=>{});
  root.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>{f[key]=Number(b.dataset.value);commit(f,key);});
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{if(key==='date'){f.dates=[];resetCalendar();}else{f.min=f.max=0;form.elements.min.value=form.elements.max.value='';root.querySelector('.filter-error').textContent='';}});
  form.onsubmit=e=>{e.preventDefault();if(key==='price'&&!readPrice(root,f))return;commit(f,key);};
  root.querySelector('input,button')?.focus();
 }
 function detailed(){
  close();const f=draft(),other=f.sites.filter(s=>!sites.includes(s));
  const ratingOptions=[...new Set([0,4,4.5,4.8,...(f.rating?[Number(f.rating)]:[])])].sort((a,b)=>a-b);
  openModal('원하는 도우미 찾기',`<form id="filter-form" novalidate><section class="filter-section"><h3>별점</h3><div class="filter-rating-options">${ratingOptions.map(n=>`<button type="button" class="chip ${Number(f.rating)===n?'selected':''}" data-rating="${n}" aria-pressed="${Number(f.rating)===n}">${n?n.toFixed(1)+' 이상':'전체'}</button>`).join('')}</div></section><section class="filter-section"><div class="filter-section-title"><label for="filter-success-input">성공률</label><span data-success-label>${f.success}% 이상</span></div><div class="filter-percent-input"><input id="filter-success-input" name="success" type="number" min="0" max="100" step="any" value="${f.success||''}" placeholder="0" aria-label="최소 성공률"><span>% 이상</span></div><p class="filter-success-error filter-error" aria-live="polite"></p></section><section class="filter-section"><h3>착수비</h3>${price(f)}</section><section class="filter-section"><h3>가능 예매처</h3><div class="filter-sites">${sites.map(s=>`<label class="chip"><input name="sites" type="checkbox" value="${s}" ${f.sites.includes(s)?'checked':''}>${s}</label>`).join('')}<label class="chip"><input name="otherEnabled" type="checkbox" ${other.length?'checked':''}>기타</label></div><label class="filter-other" ${other.length?'':'hidden'}>예매처 직접 입력<input name="otherSite" value="${esc(other.join(', '))}" placeholder="예매처 이름 입력"><span class="filter-other-error filter-error" aria-live="polite"></span></label></section><section class="filter-section"><h3>예매 날짜</h3><p class="filter-help">여러 날짜를 선택할 수 있어요. 선택한 날짜 중 가능한 도우미를 찾아요.</p><div data-calendar></div></section><div class="filter-detail-actions"><button type="button" id="filter-reset">초기화</button><button type="submit" class="btn primary" id="filter-apply">${count(f).length}명 보기</button></div></form>`,{onReady:root=>{
   root.classList.add('discovery-filter-modal');const form=root.querySelector('form');
   const update=()=>{f.success=Number(form.elements.success.value);f.min=Number(form.elements.min.value);f.max=Number(form.elements.max.value);const enabled=form.elements.otherEnabled.checked;root.querySelector('.filter-other').hidden=!enabled;form.elements.otherSite.required=enabled;f.sites=[...form.querySelectorAll('[name=sites]:checked')].map(e=>e.value);if(enabled&&form.elements.otherSite.value.trim())f.sites.push(form.elements.otherSite.value.trim());root.querySelector('[data-success-label]').textContent=(Number.isFinite(f.success)?f.success:0)+'% 이상';root.querySelector('#filter-apply').textContent=count(f).length+'명 보기';};
   const resetCalendar=calendar(root.querySelector('[data-calendar]'),f,update);
   root.querySelectorAll('[data-rating]').forEach(b=>b.onclick=()=>{f.rating=Number(b.dataset.rating);root.querySelectorAll('[data-rating]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});update();});
   form.oninput=update;form.onchange=update;
   root.querySelector('#filter-reset').onclick=()=>{Object.assign(f,emptyFilters());form.elements.min.value=form.elements.max.value=form.elements.success.value=form.elements.otherSite.value='';form.querySelectorAll('[type=checkbox]').forEach(e=>e.checked=false);root.querySelectorAll('.filter-error').forEach(e=>e.textContent='');root.querySelector('[data-rating="0"]').click();resetCalendar();update();};
   form.onsubmit=e=>{e.preventDefault();update();const validPrice=readPrice(root.querySelector('[name=min]').closest('.filter-section'),f),validSuccess=form.elements.success.validity.valid&&Number.isFinite(f.success)&&f.success>=0&&f.success<=100,validOther=!form.elements.otherEnabled.checked||!!form.elements.otherSite.value.trim();root.querySelector('.filter-success-error').textContent=validSuccess?'':'성공률을 0~100 사이로 입력해 주세요.';root.querySelector('.filter-other-error').textContent=validOther?'':'예매처 이름을 입력해 주세요.';if(!validSuccess){form.elements.success.focus();return;}if(!validPrice){form.elements.max.focus();return;}if(!validOther){form.elements.otherSite.focus();return;}state.filters=f;save();closeModal();render();document.querySelector('.filter-button')?.focus();};
  }});
 }
 document.addEventListener('click',e=>{if(anchor&&!e.composedPath().some(node=>node.classList?.contains('quick-filter-anchor')))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&anchor){e.preventDefault();close(true);}});
 document.addEventListener('focusin',e=>{if(anchor&&!e.target.closest('.quick-filter-anchor'))close();});
 return {quick,detailed,close};
}
