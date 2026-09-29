import {agents,initialRequests} from './data.js';
import {$,$$,money,esc,icon} from './ui.js';
import {createAccount} from './account.js';
import {createTransactions} from './transactions.js';
import {createDiscovery} from './discovery.js';
import {applyPreview} from './handoff.js';
import {createShell} from './pc-interactions.js';
const routeTrail=[];
let goingBack=false;
const routeViews=new Map();
const viewKey=(route,id)=>route+':'+(id??'');
function captureView(){return {route:state.route,id:state.selected,mode:state.mode,scrollY:window.scrollY,query:state.query,sort:state.sort,filters:structuredClone(state.filters),tab:state.tab,profileTab:state.profileTab};}
function restoreView(view){if(!view)return;for(const key of ['query','sort','filters','tab','profileTab'])if(key in view)state[key]=structuredClone(view[key]);}
function restoreScroll(view){requestAnimationFrame(()=>window.scrollTo({top:view?.scrollY||0,behavior:'instant'}));}
const routeNames={recovery:'아이디 · 비밀번호 찾기',availability:'예매 가능 날짜',inquiries:'문의 작성',inquiryHistory:'문의 현황',home:'목록',profile:'상세 프로필',favorites:'좋아요한 도우미',my:'마이페이지',requests:'내 활동',detail:'요청 상세',quote:'요청서',leads:'받은 요청',lead:'요청 상세',matches:'매칭 관리',finalTerms:'최종 조건',payment:'안전거래 결제',proof:'착수 인증',result:'예매 결과',review:'후기 작성',userProfile:'이용자 프로필',helperProfile:'공개 프로필 수정',profilePreview:'프로필 미리보기',account:'계정·인증',contacts:'연락처 관리',help:'고객 문의',guide:'이용 방법',notifications:'알림',credits:'매칭권',paymentHistory:'결제 내역',application:'도우미 신청',login:'로그인',signup:'회원가입',terms:'이용약관',privacy:'개인정보 안내'};
function breadcrumbs(title,back){
 if(state.route==='login')return '';
 if(['signup','signupComplete'].includes(state.route))return '<nav class="page-breadcrumbs" aria-label="현재 위치"><a href="#login" data-nav="login">로그인</a><span aria-hidden="true">›</span><span aria-current="page">회원가입</span></nav>';
 if(['home','requests','leads','matches','my','notifications'].includes(state.route))return ''; 
 const trail=routeTrail.filter(v=>v.route!==state.route&&v.mode===state.mode&&!['login','signup','signupComplete'].includes(v.route));
 const items=trail.map(v=>({label:routeNames[v.route]||'이전 화면',index:routeTrail.indexOf(v)}));
 if(!items.length&&state.route==='quote'&&back==='profile')items.push({label:'목록',route:'home'});
 if(!trail.length&&back&&back!==state.route)items.push({label:routeNames[back]||'이전 화면',route:back});
 return '<nav class="page-breadcrumbs" aria-label="현재 위치">'+items.map(v=>v.route?`<a href="#${v.route}" data-nav="${v.route}">${esc(v.label)}</a><span aria-hidden="true">›</span>`:`<a href="#${routeTrail[v.index].route}" data-action="breadcrumb" data-index="${v.index}">${esc(v.label)}</a><span aria-hidden="true">›</span>`).join('')+`<span aria-current="page">${esc(routeNames[state.route]||title)}</span></nav>`;
}

const STORAGE_KEY='ticket-helper-pc-v2';
const previewId=new URLSearchParams(location.search).get('screen');
const state={version:2,mode:'user',route:'home',selected:1,query:'',sort:'recommend',filters:{min:0,max:0,date:'',rating:0,trades:0,success:0,sites:[]},loggedIn:false,registered:false,profile:{name:'',email:'',phone:'',kakao:'',contactMethod:'email',image:''},helperProfile:{name:'',intro:'',detail:'',sites:[],category:'',hours:'',fee:10000,successMin:10000,successMax:50000,image:''},applicationStatus:'none',verification:{},accountDraft:{},authReturn:null,requests:structuredClone(initialRequests),credits:12,purchases:[],notifications:[],drafts:{},paymentState:{},tab:'all',reviews:[],reports:[],favorites:[]};
if(!previewId){try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(stored?.version===2)Object.assign(state,stored,{route:'home',modal:null});}catch{}}
let saveErrorShown=false;
function save(){if(previewId)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{if(!saveErrorShown){saveErrorShown=true;toast('브라우저 저장 공간이 부족해요. 이번 입력은 현재 창에서 유지돼요.');}}}
const btn=(text,act,cls='primary',extra='')=>`<button type="button" class="btn ${cls}" data-action="${act}" ${extra}>${text}</button>`;
const field=(name,label,{type='text',required=false,value='',placeholder='',helper='',min='',max='',step=''}={})=>`<label class="field"><span>${label}${required?' <em>필수</em>':' <small class="optional">선택</small>'}</span><div class="input-wrap ${type==='date'?'date-input':''}">${type==='date'?icon('calendar',18):''}<input name="${name}" type="${type}" ${required?'required':''} value="${esc(value)}" placeholder="${esc(placeholder)}" ${min!==''?`min="${esc(min)}"`:''} ${max!==''?`max="${esc(max)}"`:''} ${step!==''?`step="${esc(step)}"`:''} ${type==='number'?'inputmode="decimal"':type==='text'?'maxlength="160"':''}></div>${helper?`<small class="field-helper">${helper}</small>`:''}<small class="field-error" aria-live="polite"></small></label>`;
const textarea=(name,label,value='',required=false)=>`<label class="field"><span>${label}${required?' <em>필수</em>':' <small class="optional">선택</small>'}</span><textarea name="${name}" rows="4" maxlength="1000" ${required?'required':''}>${esc(value)}</textarea><small class="field-error" aria-live="polite"></small></label>`;
const section=(title,content)=>`<section class="content-card"><h2>${title}</h2>${content}</section>`;
const pageTitle=(title,sub='',back='home')=>`${breadcrumbs(title,back)}<div class="pc-page-title"><h1>${title}</h1></div>`;
function toast(message){
  if(state.loggedIn)notify({type:'activity',title:message,body:'',role:state.mode,route:state.route,id:state.selected});
  $('#toasts').innerHTML=`<div class="toast pc-toast"><span>${icon('bell',20)}</span><div><strong>알림</strong><p>${esc(message)}</p></div><button type="button" aria-label="알림 닫기">${icon('close',16)}</button></div>`;
  $('#toasts button').onclick=()=>$('#toasts').innerHTML='';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toasts').innerHTML='',5000);
}
function notify(n){state.notifications.unshift({...n,key:Date.now()+Math.random(),unread:true,time:new Date().toLocaleString('ko-KR')});save();shell.refresh();}
function closeModal(){const d=$('dialog');if(d?.open)d.close();$('#overlay').innerHTML='';document.body.classList.remove('modal-open');state.modal=null;}
function openModal(title,body,{wide=false,onReady}={}){
  const previous=document.activeElement;closeModal();$('#overlay').innerHTML=`<dialog class="modal ${wide?'wide':''}" aria-labelledby="modal-heading"><header class="modal-header"><h2 id="modal-heading">${title}</h2><button class="icon-btn" data-close aria-label="닫기">${icon('close')}</button></header><div class="modal-body">${body}</div></dialog>`;
  const d=$('dialog');d.showModal();document.body.classList.add('modal-open');state.modal=title;
  const dismiss=()=>{closeModal();if(previous?.isConnected)previous.focus();};$('[data-close]',d).onclick=dismiss;d.oncancel=e=>{e.preventDefault();dismiss();};
  d.onclick=e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();}};
  bindCommon(d);onReady?.(d);
}
function validate(form){
  let first=null;$$('input,textarea,select',form).forEach(input=>{if(input.disabled||input.type==='hidden')return;const missing=input.required&&!input.value.trim(),invalid=missing||!input.checkValidity();input.setAttribute('aria-invalid',String(invalid));const error=input.closest('.field')?.querySelector('.field-error');if(error)error.textContent=invalid?(input.validity.valueMissing||missing?'필수 항목을 입력해 주세요.':input.type==='email'?'이메일 주소를 확인해 주세요.':input.validity.rangeUnderflow?`${input.min} 이상으로 입력해 주세요.`:'입력 내용을 확인해 주세요.'):'';if(invalid&&!first)first=input;});first?.focus();return !first;
}
const ctx={state,agents,$,$$,esc,money,icon,btn,field,textarea,section,pageTitle,navigate,render,save,toast,openModal,closeModal,notify,validate};
const shell=createShell({...ctx,logout:()=>account.handle('account-logout')});
const account=createAccount(ctx),transactions=createTransactions(ctx),discovery=createDiscovery(ctx);
const pages={notifications,...discovery.pages,...account.pages,...transactions.pages};
const publicRoutes=new Set(['recovery','home','profile','login','signup','signupComplete','application','guide','help','terms','privacy']);
const helperRoutes=new Set(['leads','lead','matches','credits','finalTerms','proof','result']);
function guard(route,id){
  if(!publicRoutes.has(route)&&!state.loggedIn){state.authReturn={route,id};return 'login';}
  if(state.mode==='agent'&&state.applicationStatus!=='approved'&&['leads','lead','matches','credits','detail','finalTerms','proof','result'].includes(route))return 'application';
  if(helperRoutes.has(route)&&state.mode!=='agent')return 'my';
  if(state.mode==='agent'&&['quote','requestSent','requests','payment'].includes(route))return state.applicationStatus==='approved'?'leads':'application';
  return route;
}
function navigate(route,id){
  if(!pages[route])route='home';const next=guard(route,id);
  const current=captureView();routeViews.set(viewKey(current.route,current.id),current);
  if(!goingBack&&(state.route!==next||(id!=null&&String(id)!==String(state.selected)))){
   const ancestor=routeTrail.findLastIndex(v=>v.route===next&&(id==null||String(v.id)===String(id)));
   if(ancestor>=0)routeTrail.splice(ancestor);else routeTrail.push(current);
  }
  if(['home','requests','leads','matches','my','notifications'].includes(next))routeTrail.length=0;
  const returning=routeViews.get(viewKey(next,id??state.selected))||(['home','favorites'].includes(next)?[...routeViews.values()].find(v=>v.route===next):null);shell.close();closeModal();if(state.route!==next)state.tab='all';state.route=next;
  if(id!==undefined&&id!==null&&id!=='')state.selected=Number.isFinite(+id)?+id:id;
  if(returning)restoreView(returning);save();history.pushState(null,'',`#${next}${id!==undefined&&id!==null&&next===route?'/'+id:''}`);render();restoreScroll(returning);
}
function activeNav(){const r=state.route;if(['my','favorites','userProfile','helperProfile','profilePreview','account','contacts','paymentHistory','credits','application','help','terms','privacy'].includes(r))return 'my';if(state.mode==='user')return ['requests','detail','finalTerms','payment','requestSent'].includes(r)?'requests':'home';if(['leads','lead'].includes(r))return 'leads';if(r==='detail')return state.requests.find(x=>x.id===state.selected)?.status==='pending'?'leads':'matches';return ['matches','availability','finalTerms','proof','result'].includes(r)?'matches':'leads';}
function header(){
  const helper=state.mode==='agent',pending=state.loggedIn&&(!helper||state.applicationStatus==='approved')?state.requests.filter(r=>r.status==='pending').length:0;
  const nav=helper?[['leads','받은 요청',pending],['matches','매칭 관리']]:[['home','도우미 찾기'],['requests','내 활동',state.loggedIn?state.requests.filter(r=>['terms_sent','result_submitted'].includes(r.status)).length:0],];
  const unread=state.loggedIn?state.notifications.filter(n=>n.unread&&(!n.role||n.role===state.mode)).length:0;
  return `<header class="topbar"><div class="nav-wrap"><a class="brand" href="#home" data-nav="${helper?'leads':'home'}"><span class="brand-symbol">${icon('ticket',26)}</span>PICO</a><nav class="desktop-nav" aria-label="주 메뉴">${nav.map(([route,label,count])=>`<button data-nav="${route}" class="${activeNav()===route?'active':''}" ${activeNav()===route?'aria-current="page"':''}>${label}${count?`<span class="nav-count">${count}</span>`:''}</button>`).join('')}</nav><div class="header-right"><button class="support-link" data-nav="help">고객 문의</button><div class="mode-switch" aria-label="이용 역할"><span class="mode-indicator ${state.mode}"></span><button data-mode="user" class="${!helper?'active':''}" aria-pressed="${!helper}">이용자</button><button data-mode="agent" class="${helper?'active':''}" aria-pressed="${helper}">도우미</button></div><button class="icon-btn notification-bell" aria-label="알림${unread?' '+unread+'개 안 읽음':''}" data-shell="notifications" aria-haspopup="dialog" aria-expanded="false">${icon('bell',22)}${unread?'<i></i>':''}</button>${state.loggedIn?`<button class="my-avatar" data-shell="profile" aria-label="내 프로필" aria-haspopup="dialog" aria-expanded="false">${esc(state.profile.name?.[0]||'나')}</button>`:'<button class="header-login" data-nav="login">로그인 / 가입</button>'}</div></div></header>`;
}
function footer(){return `<footer><div class="footer-top"><a class="footer-brand" href="#home" data-nav="home">PICO</a><div><button data-nav="guide">이용 방법</button><button data-nav="help">고객센터</button><button data-nav="terms">이용약관</button><button data-nav="privacy">개인정보처리방침</button><a href="./handoff.html">PC 화면 모아보기</a></div></div><p>PICO는 이용자와 도우미를 연결하며 예매 성공이나 티켓을 보증하지 않습니다.</p><p class="demo-note">프로토타입 · 도우미와 거래 기록은 예시 데이터이며 실제 결제·인증·정산은 이루어지지 않습니다.</p><small>© 2026 PICO</small></footer>`;}
function render(){
  if(state.ownAgentId&&state.applicationStatus==='approved'){
    const own=agents.find(a=>a.id===state.ownAgentId);
    if(own)Object.assign(own,state.helperProfile,{initial:state.helperProfile.name?.[0]||own.initial});
  }
  $('#app').innerHTML=header()+`<main id="main" class="page ${state.route}" tabindex="-1">${(pages[state.route]||discovery.pages.home)()}</main>`+footer();
  bindCommon($('#app'));account.bind?.($('#main'));transactions.bind?.($('#main'));discovery.bind?.($('#main'));shell.bind();
  document.title=`${({home:'도우미 찾기',requests:'내 활동',leads:'받은 요청',matches:'매칭 관리',profile:'도우미 프로필',my:'마이페이지',detail:'요청 상세',login:'로그인',application:'도우미 신청'})[state.route]||'티켓팅 매칭'} · PICO`;
}
function bindCommon(root){
  $$('[data-nav]',root).forEach(b=>b.onclick=e=>{e.preventDefault();navigate(b.dataset.nav,b.dataset.id);});
  $$('[data-action]',root).forEach(b=>b.onclick=e=>{e.preventDefault();action(b.dataset.action,b);});
  $$('[data-mode]',root).forEach(b=>b.onclick=()=>{if(state.mode===b.dataset.mode)return;state.mode=b.dataset.mode;state.tab='all';navigate(state.mode==='user'?'home':state.applicationStatus==='approved'?'leads':'application');});
  $$('form',root).forEach(f=>f.noValidate=true);
  $$('input,textarea,select',root).forEach(input=>input.addEventListener('blur',()=>{const invalid=input.required&&(!input.value.trim()||!input.checkValidity());input.setAttribute('aria-invalid',String(!!invalid));const error=input.closest('.field')?.querySelector('.field-error');if(error)error.textContent=invalid?'입력 내용을 확인해 주세요.':'';}));
}
function action(a,el={dataset:{}}){
  if(a==='go-back'||a==='breadcrumb'){const index=a==='breadcrumb'?Number(el.dataset.index):routeTrail.length-1;const previous=routeTrail[index];if(previous){routeTrail.splice(index);goingBack=true;navigate(previous.route,previous.id);restoreView(previous);render();restoreScroll(previous);goingBack=false;}return;}
  if(a==='mark-all-read'){state.notifications.filter(n=>!n.role||n.role===state.mode).forEach(n=>n.unread=false);save();render();return;}
  if(a==='open-notification'){const n=state.notifications.find(n=>String(n.key)===el.dataset.key);if(!n)return;n.unread=false;save();navigate(n.route||(n.id?'detail':'notifications'),n.id);return;}
  if(discovery.handle?.(a,el))return;if(account.handle?.(a,el))return;if(transactions.handle?.(a,el))return;
}
ctx.action=action;
function notifications(){
  const list=state.notifications.filter(n=>!n.role||n.role===state.mode),unread=list.filter(n=>n.unread).length,symbols={request:'ticket',accepted:'check',terms:'ticket',confirmed:'shield',payment:'shield',proof:'upload',result:'check',revision:'info',cancelled:'close',declined:'close'};
  return `${pageTitle('알림',`진행에 필요한 소식을 모았어요.${unread?' 읽지 않은 알림 '+unread+'개':''}`,state.mode==='agent'?'leads':'requests')}<div class="pc-notification-toolbar"><span>새 알림 ${unread}개</span>${unread?btn('모두 읽음','mark-all-read','ghost'):''}</div><div class="pc-notifications">${list.length?list.map(n=>`<button class="pc-notification ${n.unread?'unread':''}" data-action="open-notification" data-key="${esc(n.key)}"><span class="pc-notification-icon">${icon(symbols[n.type]||'bell',22)}</span><span class="pc-notification-content"><span class="pc-notification-title">${esc(n.title)}${n.unread?'<i aria-label="안 읽음"></i>':''}</span><span>${esc(n.body)}</span><small>${esc(n.time||'방금 전')} · ${n.unread?'안 읽음':'읽음'}</small></span>${icon('chevron',18)}</button>`).join(''):`<div class="empty">${icon('bell',38)}<h3>아직 도착한 알림이 없어요</h3><p>새 요청과 최종 조건, 결제와 예매 결과를 이곳에서 알려드릴게요.</p><button class="btn secondary" data-nav="${state.mode==='agent'?'leads':'home'}">${state.mode==='agent'?'받은 요청 보기':'도우미 찾아보기'}</button></div>`}</div>`;
}
window.__ticketApp={state,navigate,render,action,save,ctx,filteredAgents:discovery.filteredAgents};
function readHash(){const current=captureView();routeViews.set(viewKey(current.route,current.id),current);shell.close();const [route,id]=location.hash.slice(1).split('/');state.route=guard(pages[route]?route:'home',id);if(id)state.selected=+id||id;const view=routeViews.get(viewKey(state.route,state.selected))||[...routeViews.values()].find(v=>v.route===state.route);const index=routeTrail.findLastIndex(v=>v.route===state.route);if(index>=0)routeTrail.splice(index);restoreView(view);closeModal();render();restoreScroll(view);save();}
window.addEventListener('hashchange',readHash);
let preview;if(previewId)preview=applyPreview(previewId,ctx);else{const [route,id]=location.hash.slice(1).split('/');state.route=guard(pages[route]?route:'home',id);if(id)state.selected=+id||id;}
state.notifications.forEach((n,i)=>n.key??=(Date.now()+i));render();preview?.afterRender?.();
