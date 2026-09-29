import {esc,icon} from './ui.js';

export function starField(value=0,{filter=false}={}){
  return `<fieldset class="field star-field" ${filter?'id="filter-rating"':''}><legend>별점 ${filter?'':'<em>필수</em>'}</legend><div class="star-picker" data-star-picker><input type="hidden" name="rating" value="${Number(value)||0}"><div class="star-options" role="radiogroup" aria-label="${filter?'최소 별점':'거래 별점'}">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="${Number(value)===n}" aria-label="${n}점${filter?' 이상':''}" data-star="${n}" class="${n<=Number(value)?'filled':''}">${icon('star',28)}</button>`).join('')}</div><output>${value?value+'점'+(filter?' 이상':''):filter?'전체':'별점을 선택해 주세요'}</output>${filter?'<button type="button" class="star-clear" data-star="0">전체</button>':''}</div><span class="field-error" aria-live="polite"></span></fieldset>`;
}
export function bindStars(root=document){
  root.querySelectorAll('[data-star-picker]').forEach(p=>{
    const input=p.querySelector('input'),radios=[...p.querySelectorAll('[role=radio]')],filter=!!p.closest('#filter-rating');
    const paint=v=>radios.forEach(b=>b.classList.toggle('filled',Number(b.dataset.star)<=v));
    const select=v=>{input.value=v;paint(v);radios.forEach(b=>b.setAttribute('aria-checked',String(Number(b.dataset.star)===v)));p.querySelector('output').textContent=v?v+'점'+(filter?' 이상':''):filter?'전체':'별점을 선택해 주세요';p.closest('.field').querySelector('.field-error').textContent='';input.dispatchEvent(new Event('input',{bubbles:true}));};
    p.querySelectorAll('[data-star]').forEach(b=>{b.onclick=()=>select(Number(b.dataset.star));b.onmouseenter=()=>paint(Number(b.dataset.star));});
    p.onmouseleave=()=>paint(Number(input.value));
    radios.forEach((b,i)=>b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?4:Math.max(0,Math.min(4,i+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)));select(next+1);radios[next].focus();});
  });
}

export function createShell(ctx){
  const {state,navigate,save}=ctx;
  let opened='',anchor;
  const list=()=>state.notifications.filter(n=>!n.role||n.role===state.mode);
  function close(restore=false){document.querySelector('#header-popover')?.remove();document.querySelectorAll('[data-shell]').forEach(b=>b.setAttribute('aria-expanded','false'));opened='';if(restore)anchor?.focus();}
  function refresh(){
    const bell=document.querySelector('[data-shell=notifications]');if(!bell)return;
    const count=list().filter(n=>n.unread).length;bell.setAttribute('aria-label','알림'+(count?' '+count+'개 안 읽음':''));bell.querySelector('i')?.remove();if(count)bell.insertAdjacentHTML('beforeend','<i></i>');
    if(opened==='notifications')show('notifications');
  }
  function show(kind){
    close();opened=kind;anchor=document.querySelector(`[data-shell=${kind}]`);anchor?.setAttribute('aria-expanded','true');
    const items=list(),unread=items.filter(n=>n.unread).length;
    const html=kind==='profile'?`<div class="profile-menu-identity"><strong>${esc(state.profile.name||'회원')}님</strong><span>${state.mode==='agent'?'도우미':'이용자'}</span></div><button data-menu-route="my">${icon('user',18)}마이페이지</button><button data-menu-route="${state.mode==='agent'?'helperProfile':'userProfile'}">프로필 수정</button>${state.mode==='agent'?'<button data-menu-route="credits">매칭권 충전</button>':''}<button data-menu-logout>로그아웃</button>`:`<div class="popover-heading"><h2>알림 ${unread?`<span>${unread}</span>`:''}</h2><button data-read-all ${unread?'':'disabled'}>모두 읽음</button></div><div class="popover-notifications">${items.length?items.slice(0,20).map(n=>`<button class="popover-notification ${n.unread?'unread':''}" data-notice="${esc(n.key)}"><span class="popover-notice-icon">${icon(n.type==='activity'?'check':'bell',18)}</span><span><strong>${esc(n.title)}</strong>${n.body?`<span>${esc(n.body)}</span>`:''}<small>${esc(n.time||'방금 전')}</small></span>${n.unread?'<i></i>':''}</button>`).join(''):'<p class="popover-empty">아직 도착한 알림이 없어요.<br>진행 소식을 이곳에서 알려드릴게요.</p>'}</div><button class="popover-all" data-menu-route="notifications">알림 전체 보기</button>`;
    document.querySelector('.header-right').insertAdjacentHTML('beforeend',`<div id="header-popover" class="header-popover ${kind}-popover" role="dialog" aria-label="${kind==='profile'?'프로필 메뉴':'알림 목록'}">${html}</div>`);
    const root=document.querySelector('#header-popover');root.querySelector('[data-menu-logout]')?.addEventListener('click',()=>{close();ctx.logout();});root.querySelectorAll('[data-menu-route]').forEach(b=>b.onclick=()=>{close();navigate(b.dataset.menuRoute);});
    root.querySelector('[data-read-all]')?.addEventListener('click',()=>{items.forEach(n=>n.unread=false);save();if(state.route==='notifications'){ctx.render();show('notifications');}else refresh();document.querySelector('[data-read-all]')?.focus();});
    root.querySelectorAll('[data-notice]').forEach(b=>b.onclick=()=>{const n=items.find(n=>String(n.key)===b.dataset.notice);n.unread=false;save();close();navigate(n.route||(n.id?'detail':'notifications'),n.id);});
  }
  function bind(){opened='';document.querySelectorAll('[data-shell]').forEach(b=>b.onclick=()=>{if(!state.loggedIn){navigate('login');return;}const kind=b.dataset.shell;if(opened===kind)close();else{show(kind);document.querySelector('#header-popover button')?.focus();}});}
  document.addEventListener('click',e=>{if(opened&&!e.target.closest('#header-popover,[data-shell]'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();close(true);}});
  document.addEventListener('focusin',e=>{if(opened&&!e.target.closest('#header-popover,[data-shell]'))close();});
  return {bind,refresh,close};
}
