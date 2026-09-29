import {createRecovery} from './recovery.js';
/* PC account flow reference, checked 2026-09-15:
 * https://soomgo.com/login — focused email entry, separate account recovery.
 * https://soomgo.com/pro — separate provider introduction and application entry.
 * https://help.soomgo.com/hc/ko/articles/17762517103129 — returning users reuse their account.
 * Adaptation: separate login/signup, shared account info, grouped profile and verification.
 * This prototype uses browser-local profiles and simulated verification. No auth/upload service.
 */
export function createAccount(ctx) {
  const {state,agents,esc,money,icon,pageTitle,navigate,render,save,toast,openModal,closeModal,notify}=ctx;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const b=(text,action,cls='primary',extra='')=>ctx.btn(text,action,cls,extra);
  const link=(text,route,cls='secondary',extra='')=>`<button type="button" class="btn ${cls}" ${route==='paymentHistory'?`data-action="account-history" data-kind="${text.includes('충전')?'credits':'escrow'}"`:`data-nav="${route}"`} ${extra}>${text}</button>`;
  const note=(body,kind='')=>`<div class="notice account-note ${kind}">${icon(kind==='success'?'check':'info',18)}<span>${body}</span></div>`;
  const card=(title,body)=>`<section class="content-card account-card"><h2>${title}</h2>${body}</section>`;
  const copy=o=>JSON.parse(JSON.stringify(o));
  const labels={identity:'본인인증',bank:'정산 계좌 확인',contact:'연락처 확인'};
  const verifyLabels={none:'미완료',pending:'확인 중',complete:'확인 완료 · 체험',error:'확인 실패'};
  const statusLabels={none:'미신청',draft:'작성 중',review:'심사 중',approved:'승인',needsChanges:'보완 요청',rejected:'반려'};
  const contactLabels={email:'이메일',phone:'휴대전화',kakao:'카카오톡 오픈채팅',other:'기타'};
  const recovery=createRecovery(ctx);
  let signupPassword='';
  const sites=['NOL','YES24','멜론티켓','티켓링크'];

  function init(){
    state.profile??={name:'',contactMethod:'email',email:'',phone:'',kakao:'',image:''};
    state.helperProfile??={name:'',intro:'',detail:'',sites:[],category:'',hours:'',fee:10000,successMin:10000,successMax:50000,image:''};
    state.verification??={}; state.accountDraft??={};
    state.applicationStatus??='none';
    state.accountDraft.signupStep??=0;
    state.accountDraft.applicationStep??=0;
    state.accountDraft.purpose??=state.mode==='agent'?'agent':'user';
    state.accountDraft.user??=copy(state.profile);
    state.accountDraft.helper??={...copy(state.helperProfile),name:state.helperProfile.name||state.profile.name||'',image:state.helperProfile.image||state.profile.image||''};
    state.accountDraft.career??=[[],[],[]];
    state.accountDraft.agreements??={};
    state.accountDraft.applicationAgreements??={};
  }
  init();
  const u=()=>{init();return state.accountDraft.user;};
  const h=()=>{init();return state.accountDraft.helper;};
  const getContact=p=>p[p.contactMethod||'email']||'';
  const avatar=(p,size='large')=>`<span class="avatar blue ${size} account-avatar">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name||'프로필')} 이미지">`:esc((p.name||'나').slice(0,1))}</span>`;
  const input=(name,label,{value='',type='text',required=false,placeholder='',helper='',min,max,maxlength}={})=>`<label class="field"><span>${label} <small class="account-required">${required?'필수':'선택'}</small></span><input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${maxlength?`maxlength="${maxlength}"`:''} placeholder="${esc(placeholder)}" ${type==='email'?'autocomplete="email"':type==='tel'?'autocomplete="tel"':''}>${helper?`<small class="field-helper">${helper}</small>`:''}<small class="field-error" data-error="${name}" aria-live="polite"></small></label>`;
  const area=(name,label,value='',required=false,helper='')=>`<label class="field"><span>${label} <small class="account-required">${required?'필수':'선택'}</small></span><textarea name="${name}" rows="5" maxlength="1500" ${required?'required':''}>${esc(value)}</textarea>${helper?`<small class="field-helper">${helper}</small>`:''}<small class="field-error" data-error="${name}" aria-live="polite"></small></label>`;
  const select=(name,label,values,value,required=true)=>`<label class="field"><span>${label} <small class="account-required">${required?'필수':'선택'}</small></span><select name="${name}" ${required?'required':''}>${values.map(x=>{const [v,t]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${value===v?'selected':''}>${esc(t)}</option>`;}).join('')}</select><small class="field-error" data-error="${name}" aria-live="polite"></small></label>`;
  const progress=(labels,current)=>`<ol class="account-progress" aria-label="진행 단계">${labels.map((t,i)=>`<li class="${i===current?'active':i<current?'complete':''}" ${i===current?'aria-current="step"':''}><span>${i<current?icon('check',14):i+1}</span><strong>${t}</strong></li>`).join('')}</ol>`;
  const formEnd=(text,prev='',secondary='')=>`<div class="account-form-footer">${prev?b('이전',prev,'secondary'):''}${secondary}<button class="btn primary" type="submit">${text}</button></div>`;
  const imagePicker=(p,target)=>`<div class="account-image-picker">${avatar(p)}<div><strong>프로필 이미지 <small class="account-required">선택</small></strong><p>나를 표현하는 사진을 등록해 주세요.</p><div class="account-inline"><label class="btn secondary account-file-label">${p.image?'이미지 변경':'이미지 선택'}<input type="file" accept="image/jpeg,image/png,image/webp" data-account-image="${target}"></label>${p.image?b('삭제','account-image-remove','ghost',`data-target="${target}"`):b('나중에 하기','account-image-skip','ghost')}</div><small>JPG · PNG · WEBP / 최대 3MB</small><small class="field-error" data-image-error="${target}" aria-live="polite"></small></div></div>`;
  const authAside=()=>`<aside class="account-auth-aside"><div class="account-ticket">${icon('ticket',42)}<span>설레는 순간을 준비하는<br>가장 든든한 연결</span><i></i><p>나에게 맞는 도우미를 만나고,<br>내 활동에서 진행 상황을 확인하세요.</p></div><div class="login-ticket-art" aria-hidden="true"><span class="login-ticket-back"></span><span class="login-ticket-front">${icon('ticket',30)}<strong>설렘을 위한 한 자리</strong><i></i><small>YOUR NEXT STAGE</small></span><b>✦</b></div><div class="account-auth-points"><p>${icon('user',18)}프로필을 보고 직접 요청</p><p>${icon('check',18)}최종 조건을 확인한 뒤 결제</p><p>${icon('shield',18)}착수부터 결과까지 한곳에서</p></div></aside>`;

  function login(){
    init();
    return `<div class="account-auth-layout login-with-intro">${authAside()}<div class="account-auth-main">${pageTitle('로그인','','')}<section class="content-card"><form data-account-form="login" novalidate>${input('email','아이디',{required:true,value:state.accountDraft.loginEmail||'',placeholder:'이메일 또는 아이디'})}${input('password','비밀번호',{type:'password',required:true,placeholder:'비밀번호 입력'})}<div class="account-form-error" aria-live="polite"></div><div class="login-actions"><button class="btn primary full" type="submit">로그인</button><button type="button" class="btn secondary full social-google" data-action="account-google"><span class="google-symbol" aria-hidden="true">G</span>구글로 계속하기</button><button type="button" class="btn secondary full social-kakao" data-action="account-kakao"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.8 5 4.5 6.4L5.4 21l4.6-2.9c.7.1 1.3.1 2 .1 5.5 0 10-3.4 10-7.6S17.5 3 12 3"/></svg>카카오로 계속하기</button></div></form><div class="login-links"><button type="button" class="text-link" data-nav="recovery">아이디 · 비밀번호 찾기</button><span aria-hidden="true">|</span><button type="button" class="text-link" data-nav="signup">회원가입</button></div></section><section class="login-demo" data-demo-login-section><p class="account-caption">체험용 로그인 · 실제 계정 인증은 진행되지 않습니다.</p>${b('예시 계정으로 로그인','account-demo-login','secondary full')}</section></div></div>`;

  }

  function commonFields(p,onlyContacts=false){
    return `${!onlyContacts?`${imagePicker(p,'user')}${input('name','닉네임',{value:p.name,required:true,placeholder:'함께 부를 이름을 알려주세요',maxlength:20,helper:'요청과 후기에서 사용하는 이름이에요. 최대 20자'})}`:''}${input('email','로그인 이메일',{value:p.email,type:'email',required:true,placeholder:'name@example.com',helper:'로그인할 때 사용할 이메일이에요.'})}${select('contactMethod','매칭 후 연락 방법',Object.entries(contactLabels),p.contactMethod||'email')}${p.contactMethod==='phone'?input('phone','연락받을 휴대전화',{value:p.phone,type:'tel',required:true,placeholder:'010-0000-0000'}):p.contactMethod==='kakao'?input('kakao','오픈채팅 링크',{value:p.kakao,type:'url',required:true,placeholder:'https://open.kakao.com/…'}):''}${p.contactMethod==='other'?input('other','기타 연락방법',{value:p.other,required:true,placeholder:'연락방법과 연락처를 입력해 주세요.'}):''}${note('선택한 연락처는 요청이 수락된 후 해당 거래 상대방에게만 공개돼요. 도우미의 공개 프로필에는 표시하지 않습니다.')}`;
  }

  function verificationCard(kind){
    const s=state.verification[kind]||'none';
    return `<div class="account-verification ${s}"><span class="account-verification-icon">${icon(kind==='bank'?'ticket':kind==='contact'?'bell':'shield',21)}</span><div><strong>${labels[kind]}</strong><p>${kind==='identity'?'서로 안심하고 요청과 매칭을 시작해요.':kind==='bank'?'도우미 활동에 사용할 정산 정보를 확인해요.':'매칭 후 연락받을 방법을 확인해요.'}</p><span class="badge ${s==='complete'?'verified':s==='error'?'account-badge-error':'neutral'}">${s==='complete'?icon('check',12):s==='error'?'!':''}${verifyLabels[s]||'미완료'}</span>${s==='error'?'<small class="field-error">입력한 인증번호가 맞지 않아요. 다시 진행해 주세요.</small>':''}</div>${b(s==='complete'?'다시 확인':s==='error'?'재시도':'확인하기',`account-verify-${kind}`,s==='complete'?'ghost':'secondary',s==='pending'?'disabled':'')}</div>`;
  }

  function agreements(kind='signup'){
    const data=kind==='signup'?state.accountDraft.agreements:state.accountDraft.applicationAgreements;
    const items=kind==='signup'?[['terms','서비스 이용약관','terms'],['privacy','개인정보 수집·이용','privacy'],['contact','요청 수락 후 연락처 제공','privacy']]:[['terms','도우미 활동 기준 및 금지사항','terms'],['contact','요청 수락 후 연락처 제공','privacy']];
    return `<div class="account-agreements">${items.map(([key,t,route])=>`<div><label class="check-row"><input type="checkbox" name="agreement_${key}" ${data[key]?'checked':''} required><span>${t} <small>(필수)</small></span></label><button type="button" class="text-link" data-nav="${route}">보기</button></div>`).join('')}<small class="field-error" data-error="agreements" aria-live="polite"></small></div>`;
  }

  function signup(){
    init();
    if(state.registered)return `<div class="account-contained">${pageTitle('이미 프로필이 준비되어 있어요','','home')}${card('기존 계정으로 이어서 이용하세요',`<p class="prose">${esc(state.profile.name||'회원')}님의 프로필이 이 브라우저에 저장되어 있어요. 로그인 후 바로 이용할 수 있습니다.</p>${state.loggedIn?link('마이페이지로','my','primary'):link('로그인하기','login','primary')}`)}</div>`;
    const step=state.accountDraft.signupStep===0?0:1,p=u();state.accountDraft.signupStep=step;
    return `<div class="account-contained signup-compact">${pageTitle('회원가입','','login')}<section class="content-card"><form data-account-form="signup" novalidate>${step===0?`<h2>이용 목적을 선택해 주세요</h2><div class="account-role-options">${[['user','이용자','도우미에게 티켓팅을 요청해요.'],['agent','도우미','이용자의 티켓팅을 도와요.']].map(([v,t,d])=>`<label class="account-role-option ${state.accountDraft.purpose===v?'selected':''}"><input type="radio" name="purpose" value="${v}" ${state.accountDraft.purpose===v?'checked':''}><strong>${t}</strong><span>${d}</span></label>`).join('')}</div>`:signupFields(p)}<div class="account-form-error" aria-live="polite"></div><div class="account-form-footer">${step?b('이전','account-signup-prev','secondary'):''}<button class="btn primary" type="submit">${step?'가입 완료':'다음'}</button></div></form></section></div>`;
  }
  function signupFields(p){return `<div class="signup-field-action">${input('username','아이디',{value:p.username||'',required:true,placeholder:'아이디 또는 이메일'})}<div class="signup-inline-action">${b('중복확인','account-check-username','secondary')}<span id="signup-id-status" role="status">${state.accountDraft.checkedUsername===p.username&&p.username?'사용 가능한 아이디예요.':''}</span></div></div>${input('password','비밀번호',{type:'password',required:true,value:signupPassword,placeholder:'비밀번호 설정'})}${imagePicker(p,'user')}${input('name','닉네임',{value:p.name,required:true,maxlength:20})}${input('email','이메일',{value:p.email,type:'email',required:true,placeholder:'name@example.com'})}<div class="signup-field-action">${input('phone','전화번호',{value:p.phone,type:'tel',required:true,placeholder:'010-0000-0000'})}<div class="signup-inline-action">${b('전화번호 본인인증','account-signup-phone','secondary')}<span id="signup-phone-status" role="status">${state.accountDraft.verifiedPhone===p.phone&&p.phone?'본인인증 완료 · 체험':''}</span></div></div><div id="signup-phone-code" hidden>${input('verificationCode','체험 인증번호',{placeholder:'123456',helper:'문자는 발송되지 않아요. 체험 인증번호 123456을 입력하세요.'})}${b('인증 확인','account-signup-phone-confirm','secondary')}</div>${select('contactMethod','매칭 후 연락방법',Object.entries(contactLabels),p.contactMethod||'email')}<div id="signup-contact-value">${signupContact(p)}</div>${agreements()}`}
  function signupContact(p){const method=p.contactMethod||'email';return ['email','phone'].includes(method)?`<label class="field"><span>${contactLabels[method]}</span><input data-contact-preview readonly value="${esc(p[method]||'')}"><small>위에 입력한 정보를 그대로 사용해요.</small></label>`:input(method,method==='other'?'기타 연락방법':'카카오톡 오픈채팅 링크',{value:p[method]||'',required:true,placeholder:method==='other'?'연락방법과 연락처를 입력해 주세요.':'https://open.kakao.com/…'});}

  function signupComplete(){
    return `<div class="account-contained account-complete"><section class="content-card"><div class="success-circle">${icon('check',32)}</div><h1>${esc(state.profile.name||'회원')}님 반가워요.<br>티켓 도우미를 찾으러 가볼까요?</h1>${b(state.accountDraft.purpose==='agent'?'도우미 신청 이어서 하기':state.authReturn?'작성하던 요청으로 돌아가기':'도우미 찾기','account-onboarding-done','primary full')}${link('내 프로필 확인','userProfile','ghost full')}</section></div>`;
  }

  function helperFields(){
    const p=h();p.availability??=(agents.find(a=>a.id===state.ownAgentId)?.availability||agents.find(a=>a.id===state.ownAgentId)?.dates?.map(d=>'2026-09-'+String(d).padStart(2,'0'))||[]);
    return `${imagePicker(p,'helper')}${note('이 화면의 소개와 활동 정보는 공개 프로필에 표시돼요. 연락처와 인증 제출 자료는 공개하지 않습니다.')}${input('name','활동 닉네임',{value:p.name,required:true,maxlength:20,placeholder:state.profile.name||'활동할 이름을 입력해 주세요'})}${input('intro','한 줄 소개',{value:p.intro,required:true,maxlength:70,placeholder:'어떤 도움을 드릴 수 있는지 소개해 주세요',helper:'도우미 목록과 공개 프로필에 표시돼요. 최대 70자'})}${area('detail','상세 소개',p.detail,true,'경험과 진행 방식을 직접 소개해 주세요. 직접 작성한 경력은 검증된 실적으로 표시되지 않아요.')}<fieldset class="account-fieldset"><legend>가능한 예매처 <small class="account-required">필수 · 복수 선택</small></legend><div class="account-choice-chips">${sites.concat('기타').map(s=>`<label><input type="checkbox" name="sites" value="${s}" ${(s==='기타'?p.sites?.some(v=>!sites.includes(v)):p.sites?.includes(s))?'checked':''}><span>${s}</span></label>`).join('')}</div><div id="helper-other-site" ${p.sites?.some(v=>!sites.includes(v))?'':'hidden'}>${input('otherSite','기타 예매처',{value:p.otherSite||p.sites?.find(v=>!sites.includes(v)&&v!=='기타')||'',placeholder:'예매처 이름을 입력하세요'})}</div><small class="field-error" data-error="sites" aria-live="polite"></small></fieldset><div class="form-grid">${select('category','주로 맡는 공연 분야',[['','선택해 주세요'],'콘서트','뮤지컬','팬미팅','페스티벌','기타'],p.category)}${input('hours','활동 가능 시간·일정',{value:p.hours,required:true,placeholder:'평일 18:00~23:00, 주말 오후'})}</div>${input('fee','최소 착수비 (원)',{value:p.fee,type:'number',required:true,min:0,helper:'예매에 착수하는 비용이에요. 공개 프로필에 최소 착수비로 표시합니다.'})}<div class="form-grid">${input('successMin','수고비 최소 (원)',{value:p.successMin,type:'number',required:true,min:0})}${input('successMax','수고비 최대 (원)',{value:p.successMax,type:'number',required:true,min:0})}</div><p class="account-caption left">수고비는 협의한 성공 조건을 충족했을 때의 비용이에요.<br>공개 금액은 안내용이며, 거래별 최종 조건에서 금액을 확정합니다.</p><div class="account-reused-info"><div>${icon('shield',21)}<div><strong>연락처는 계정에서 함께 사용해요</strong><p>${esc(contactLabels[state.profile.contactMethod]||'이메일')} · ${esc(getContact(state.profile)||'연락처 미입력')}</p></div></div>${link('연락처 수정','contacts','ghost')}</div>`;
  }

  let availabilityMonth;
  function availabilityField(p){
    init();
    const own=agents.find(a=>a.id===state.ownAgentId);
    p.availability??=[...(h().availability??own?.availability??own?.dates?.map(d=>'2026-09-'+String(d).padStart(2,'0'))??[])];
    const selected=[...new Set(p.availability)].sort();
    const now=new Date();
    availabilityMonth??=selected[0]?.slice(0,7)||now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    const [year,month]=availabilityMonth.split('-').map(Number),first=new Date(year,month-1,1).getDay(),count=new Date(year,month,0).getDate();
    const cells=Array.from({length:first},()=>'<span class="availability-blank" aria-hidden="true"></span>').join('')+Array.from({length:count},(_,i)=>{
      const day=i+1,date=availabilityMonth+'-'+String(day).padStart(2,'0'),active=selected.includes(date),today=year===now.getFullYear()&&month===now.getMonth()+1&&day===now.getDate();
      return `<button type="button" class="availability-day ${today?'is-today':''}" data-toggle-availability="${date}" aria-label="${year}년 ${month}월 ${day}일" aria-pressed="${active}" ${today?'aria-current="date"':''}>${day}</button>`;
    }).join('');
    return `<div class="helper-availability"><div class="availability-calendar-heading"><h2>예매 가능한 날짜</h2><span>여러 날짜 선택 가능</span></div><p class="prose">날짜를 누르면 선택되고, 다시 누르면 해제돼요. 변경 내용은 자동 저장돼요.</p><div class="availability-calendar"><div class="availability-month-nav"><button type="button" class="icon-btn" data-availability-month="-1" aria-label="이전 달">${icon('chevron',18)}</button><strong aria-live="polite">${year}년 ${month}월</strong><button type="button" class="icon-btn" data-availability-month="1" aria-label="다음 달">${icon('chevron',18)}</button></div><div class="availability-weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(d=>'<span>'+d+'</span>').join('')}</div><div class="availability-calendar-days" role="group" aria-label="예매 가능 날짜 선택">${cells}</div></div><div class="availability-selection"><h3>선택한 날짜 <span>${selected.length}일</span></h3><div class="availability-dates">${selected.length?selected.map(d=>`<button type="button" class="chip" data-toggle-availability="${esc(d)}" aria-label="${esc(d)} 선택 해제">${esc(d)} ×</button>`).join(''):'<p class="record-note">선택한 날짜가 없어요. 달력에서 날짜를 선택해 주세요.</p>'}</div></div><p class="record-note">도우미 검색의 예매 날짜 필터에만 사용하며, 공개 프로필에는 표시하지 않아요.</p></div>`;
  }
  function careerUpload(index){
    const files=state.accountDraft.career[index]||[];
    return `<div class="account-career-upload"><div class="account-title-row"><strong>경력 자료</strong><label class="btn secondary account-file-label">${icon('plus',14)}자료 첨부<input type="file" data-account-career="${index}" accept="image/jpeg,image/png,image/webp,application/pdf" multiple></label></div><p>경력을 보여줄 수 있는 파일을 첨부하고 아래에 설명을 적어 주세요.</p>${files.length?`<ul class="account-file-list">${files.map((f,i)=>`<li>${f.url?`<img src="${esc(f.url)}" alt="${esc(f.name)} 미리보기">`:icon('ticket',22)}<span>${esc(f.name)}<small>${Math.ceil(f.size/1024)}KB · 이 브라우저에 첨부</small></span><button type="button" class="icon-btn" data-action="account-career-remove" data-case="${index}" data-file="${i}" aria-label="${esc(f.name)} 삭제">${icon('close',16)}</button></li>`).join('')}</ul>`:'<div class="account-upload-empty">아직 첨부한 파일이 없어요</div>'}<small class="field-error" data-career-error="${index}" data-error="career${index}" aria-live="polite"></small></div>`;
  }

  function applicationStatusPage(){
    const s=state.applicationStatus;
    const data={review:['신청 내용을 확인하고 있어요','공개 프로필과 인증·경력 자료를 확인한 뒤 알림으로 안내할게요. 승인 전에는 받은 요청과 매칭 관리를 이용할 수 없어요.','clock'],approved:['도우미 활동을 시작할 수 있어요','공개 프로필로 직접 도착한 요청을 확인하고, 수락한 거래는 매칭 관리에서 이어가세요.','check'],needsChanges:['신청 내용을 보완해 주세요',state.applicationFeedback||'경력 자료의 대화 내역과 이체 기록을 함께 확인할 수 있도록 다시 첨부해 주세요.','info'],rejected:['신청이 승인되지 않았어요',state.applicationFeedback||'활동 기준을 확인한 뒤 프로필과 경력 자료를 보완하여 다시 신청할 수 있어요.','info']}[s];
    if(!data)return '';
    return `<div class="account-contained">${pageTitle('도우미 신청 현황','신청부터 활동 시작까지 한곳에서 확인해요.','my')}<section class="content-card account-status-card"><span class="account-status-icon ${s}">${icon(data[2],30)}</span><span class="badge ${s==='approved'?'verified':s==='needsChanges'||s==='rejected'?'account-badge-error':'neutral'}">${statusLabels[s]}</span><h2>${data[0]}</h2><p>${esc(data[1])}</p>${note(s==='review'?'현재 신청은 체험 상태로 저장되어 있어요. 실제 운영자에게 자료가 전송되거나 심사가 진행되지는 않습니다.':'체험 계정의 신청 상태입니다. 실제 인증·심사 결과를 뜻하지 않습니다.')}<div class="account-status-actions">${s==='approved'?`${link('받은 요청 확인','leads','primary full')}${link('공개 프로필 수정','helperProfile','secondary full')}`:s==='review'?`${link('제출한 공개 프로필 보기','profilePreview','primary full')}${link('마이페이지로','my','secondary full')}`:`${b(s==='rejected'?'보완하고 다시 신청':'신청 내용 보완하기','account-application-resume','primary full')}${link('활동 기준 확인','guide','secondary full')}`}</div>${state.applicationSubmittedAt?`<small class="account-caption">신청일 ${esc(state.applicationSubmittedAt)}</small>`:''}</section></div>`;
  }

  function application(){
    init();
    if(!state.loggedIn)return `<div class="account-contained">${pageTitle('도우미로 함께해요','','home')}${card('당신의 경험을 나누어 주세요',`<p class="prose">프로필을 보고 나에게 직접 보낸 요청을 받아요. 로그인하고 도우미 활동을 신청해 주세요.</p>${b('가입하고 도우미 신청','account-start-helper-signup','primary full')}${link('기존 계정으로 로그인','login','ghost full')}`)}</div>`;
    if(['review','approved','needsChanges','rejected'].includes(state.applicationStatus))return applicationStatusPage();
    if(state.applicationStatus==='none')return `<div class="account-application-intro">${pageTitle('도우미로 함께해요','좋아하는 공연에 한 걸음 더 가까워지도록.','my')}<div class="account-intro-hero"><div><span class="tiny-label">나의 경험이, 누군가의 설렘으로</span><h2>티켓팅을 준비하는 마음에<br>든든한 도움이 되어 주세요.</h2><p>내 공개 프로필을 보고 이용자가 직접 요청해요.<br>내용을 확인하고 가능한 요청만 수락하세요.</p>${b('도우미 활동 신청하기','account-application-start')}</div><span class="account-intro-ticket">${icon('ticket',110)}<i>✦</i></span></div><ol class="helper-milestones" aria-label="도우미 활동 신청 단계">${[['공개 프로필 작성','소개·가능한 예매처·활동 시간·비용을 알려주세요.'],['인증과 경력 자료','계정의 정보를 재사용하고 정산 계좌와 첨부한 경력 자료를 확인해요.'],['검토 후 활동 시작','승인 후 직접 받은 요청을 확인하고 수락한 매칭을 관리해요.']].map(([t,d],i)=>`<li class="${i===0?'current':''}"><span class="milestone-dot" aria-hidden="true"></span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>${note('요청 수락 시 매칭권 1장을 사용해요. 이용자의 안전거래 결제와는 별개입니다. 예매처의 이용 기준을 준수하고, 계정정보 수집·매크로·재판매·티켓 양도를 요구하거나 제공할 수 없어요.')}</div>`;
    const step=state.accountDraft.applicationStep;
    const content = `<div class="account-form-layout"><aside class="account-form-aside"><span class="tiny-label">도우미 신청</span><h2>프로필부터<br>차근차근 준비해요.</h2><p>입력 내용은 자동 저장돼요.<br>잠시 나갔다 와도 이어서<br>작성할 수 있어요.</p>${progress(['공개 프로필','인증과 경력','미리보기·제출'],step)}<span class="badge neutral">작성 중</span></aside><div>${pageTitle(step===0?'어떤 도우미인가요?':step===1?'활동에 필요한 확인':'마지막으로 확인해 주세요',step===0?'이용자가 보게 될 공개 프로필을 만들어요.':step===1?'공통 정보는 다시 입력하지 않아도 돼요.':'입력한 내용이 공개 프로필에 이렇게 표시돼요.','my')}<form data-account-form="application" novalidate>${step===0?card('공개 프로필',helperFields()):step===1?`${card('계정 인증',`${note('본인·연락처 확인은 가입 때의 정보를 재사용해요. 정산 계좌는 도우미 신청 단계에서 확인합니다. 모든 인증은 시뮬레이션입니다.')}${verificationCard('identity')}${select('applicationContactMethod','매칭 후 연락방법',Object.entries(contactLabels),u().contactMethod||'email')}<div id="application-contact-value">${signupContact(u())}</div>${verificationCard('bank')}`)}${card('경력 자료',`<p class="prose">경력을 보여줄 자료를 자유롭게 첨부해 주세요. 개인정보는 가려 주세요.</p><p class="account-caption left">이미지·PDF / 파일당 최대 5MB / 최대 4개<br>파일은 이 브라우저에서만 처리되며 서버에 업로드되지 않아요.</p>${careerUpload(0)}${area('careerDescription','설명을 적어 주세요',h().careerDescription||'',true)}${input('business','사업자 등록번호',{value:h().business||'',placeholder:'선택 사항'})}${agreements('application')}`)}`:`${publicPreview(h())}${note('소개와 경력은 직접 작성한 정보예요. 제출한 자료에 대한 검토 전에는 인증된 경력이나 플랫폼 거래 실적으로 표시되지 않습니다.')}`}</form></div></div>`;
    const endOfCard=content.lastIndexOf('</section>');
    const actions=`<div class="account-form-error" aria-live="polite"></div>${formEnd(step===2?'도우미 신청 제출':'다음',step?'account-application-prev':'')}`;
    return content.slice(0,endOfCard)+actions+content.slice(endOfCard);
  }

  function publicPreview(p){
    return `<div class="account-public-preview"><section class="content-card"><span class="tiny-label">공개 프로필 미리보기</span><div class="account-preview-heading">${avatar(p)}<div><h1>${esc(p.name||'활동 닉네임')}</h1><span class="badge neutral">직접 작성한 소개</span><p>${esc(p.intro||'한 줄 소개를 입력해 주세요.')}</p></div></div><div class="account-preview-stats"><div><span>플랫폼 거래</span><strong>기록 없음</strong></div><div><span>이용 후기</span><strong>등록된 후기 없음</strong></div><div><span>성공률</span><strong>기록 없음</strong></div></div><p class="account-caption left">플랫폼에서 확인된 거래 기록이 쌓이면 표시돼요. 직접 입력한 경력은 거래 통계에 포함하지 않습니다.</p></section>${card('도우미 소개',`<p class="account-prewrap prose">${esc(p.detail||'상세 소개를 입력해 주세요.')}</p>`)}${card('활동 정보',`<dl class="document-rows"><div><dt>예매처</dt><dd><div class="site-tags">${(p.sites||[]).map(s=>`<span>${esc(s)}</span>`).join('')||'미입력'}</div></dd></div><div><dt>공연 분야</dt><dd>${esc(p.category||'미입력')}</dd></div><div><dt>활동 시간</dt><dd>${esc(p.hours||'미입력')}</dd></div></dl>`)}${card('비용 안내',`<div class="account-price-preview"><div><span>착수비</span><strong>${money(p.fee)}<small>원부터</small></strong></div><div><span>수고비</span><strong>${money(p.successMin)} ~ ${money(p.successMax)}<small>원</small></strong></div></div><p class="prose">거래별 최종 조건에서 비용을 확정해요. 연락처는 요청 수락 후 거래 상대방에게만 공개됩니다.</p>`)}</div>`;
  }

  function profilePreview(){
    init();const editing=state.accountPreviewDraft===true;
    return `${pageTitle('공개 프로필 미리보기','공개되는 정보와 표현을 확인해 주세요.',editing?'helperProfile':state.applicationStatus==='approved'?'my':'application')}<div class="account-preview-layout"><div>${publicPreview(editing?h():state.helperProfile)}</div><aside>${card('공개 범위',`<ul class="account-bullet-list"><li>닉네임과 프로필 이미지</li><li>소개·예매처·공연 분야</li><li>활동 시간과 안내 비용</li></ul>${note('연락처·정산 계좌·경력 제출 자료는 이 프로필에 공개되지 않아요.')}${editing?b('입력한 프로필 저장','account-helper-preview-save','primary full'):link('프로필 수정','helperProfile','primary full')}`)}</aside></div>`;
  }

  function my(){
    init();
    if(!state.loggedIn)return `<div class="account-contained">${pageTitle('마이페이지','프로필과 나의 활동을 한곳에서 관리해요.','home')}${card('로그인하고 이어서 이용하세요',`<p class="prose">보낸 요청, 진행 중인 거래와 나의 프로필을 확인할 수 있어요.</p>${link('로그인','login','primary full')}${link('회원가입','signup','secondary full')}`)}</div>`;
    const agent=state.mode==='agent',p=agent&&state.applicationStatus==='approved'?state.helperProfile:state.profile;
    const items=[[agent?'도우미 프로필':'이용자 프로필','개인 정보 · 계정 인증 · 연락처 관리','userProfile'],...(agent?[['공개 프로필','도우미 소개와 활동 정보',state.applicationStatus==='approved'?'helperProfile':'application']]:[]),['거래 내역',agent?'안전거래 결제 · 매칭권 충전':'안전거래 결제','paymentHistory'],['좋아요한 도우미','저장한 도우미 보기','favorites'],['이용 방법','서비스 이용 안내','guide'],['문의 작성','궁금한 내용 문의하기','inquiries'],['문의 현황','작성한 문의와 답변 확인','inquiryHistory'],['이용약관','서비스 이용 기준','terms'],['개인정보 안내','정보 처리 안내','privacy']];
    return `${pageTitle('마이페이지','','')}<div class="account-my-layout"><section class="content-card account-my-profile"><div class="account-preview-heading">${avatar(state.profile)}<div><h2>${esc(state.profile.name)}</h2><div class="my-identity-line"><span>${esc(state.profile.email)}</span><div class="account-role-switch">${b('이용자','account-mode-user',!agent?'primary':'ghost')}${b('도우미','account-mode-agent',agent?'primary':'ghost')}</div></div></div>${b('로그아웃','account-logout','ghost')}</div><div class="account-menu-list">${items.map(([title,desc,route])=>`<button type="button" data-nav="${route}"><span><strong>${title}</strong><small>${desc}</small></span></button>`).join('')}</div></section><aside>${agent?(state.applicationStatus==='approved'?card('나의 매칭권',`<div class="display-price">${state.credits}<small>장</small></div><p class="prose">요청을 수락할 때 1장씩 사용해요.</p>${link('매칭권 충전','credits','primary full')}${link('충전 내역 보기','paymentHistory','ghost full')}`):card('도우미 신청 현황',`<span class="badge neutral">${statusLabels[state.applicationStatus]}</span><p class="prose">신청 진행 상태를 확인하고 이어서 준비하세요.</p>${link('신청 상태 확인','application','primary full')}`)):card('나의 티켓팅',`<div class="account-my-count"><strong>${state.requests?.length||0}</strong><span>개의 요청과 거래</span></div><p class="prose">보낸 요청부터 완료된 예매까지<br>내 활동에서 확인하세요.</p>${link('내 활동 보기','requests','primary full')}`)}${card('연락처 공개 안내','<p class="prose">선택한 연락처는 요청 수락 후 해당 상대방에게만 공개돼요. 공개 프로필에는 포함되지 않아요.</p>')}</aside></div>`;
  }
  function userProfile(){init();return `<div class="account-contained">${pageTitle(state.mode==='agent'?'도우미 프로필':'이용자 프로필','','my')}<section class="content-card"><form data-account-form="contacts" novalidate>${commonFields(u())}<h2>계정 인증</h2>${verificationCard('identity')}${verificationCard('contact')}<div class="account-form-error" aria-live="polite"></div>${formEnd('변경 내용 저장')}</form></section></div>`;}
  function contacts(){init();return `<div class="account-contained">${pageTitle('연락처 관리','요청 수락 후 공개할 연락 방법을 관리해요.','my')}<section class="content-card"><form data-account-form="contacts" novalidate>${commonFields(u(),true)}${verificationCard('contact')}<div class="account-form-error" aria-live="polite"></div>${formEnd('연락처 저장')}</form></section></div>`;}
  function helperProfile(){
    init();
    if(state.applicationStatus!=='approved')return application();
    return `<div class="account-form-layout"><aside class="account-form-aside"><span class="tiny-label">공개 프로필 관리</span><h2>나의 도움을<br>알기 쉽게 소개해요.</h2><p>수정하는 동안 내용은<br>임시저장됩니다. 미리보기로<br>공개 범위를 확인해 보세요.</p>${link('저장된 공개 프로필 보기','profilePreview','secondary')}</aside><div>${pageTitle('공개 프로필 수정','소개와 활동 정보를 최신 내용으로 알려주세요.','my')}<section class="content-card"><form data-account-form="helperProfile" novalidate>${helperFields()}${formEnd('변경 내용 저장','',b('공개 프로필 미리보기','account-helper-preview','secondary'))}</form></section></div></div>`;
  }
  function account(){
    init();
    return `<div class="account-contained">${pageTitle('계정·인증','하나의 계정으로 이용자와 도우미를 오갈 수 있어요.','my')}${card('계정 정보',`<dl class="document-rows"><div><dt>닉네임</dt><dd>${esc(state.profile.name||'미입력')}</dd></div><div><dt>이메일</dt><dd>${esc(state.profile.email||'미입력')}</dd></div><div><dt>도우미 신청</dt><dd><span class="badge neutral">${statusLabels[state.applicationStatus]}</span></dd></div></dl>${link('이메일·연락처 변경','contacts','secondary')}`)}${card('인증 상태',`${note('인증 기관과 정산 서비스는 연결되어 있지 않습니다. 아래 확인은 실제 인증 완료를 뜻하지 않는 체험 절차예요.')}${verificationCard('identity')}${verificationCard('contact')}${state.applicationStatus!=='none'?verificationCard('bank'):''}`)}${card('이 브라우저의 저장 정보',`<p class="prose">프로필·작성 중인 내용·거래 진행 상태를 이 브라우저에 저장해요. 다른 기기와 자동으로 공유되지 않습니다.</p><p class="prose">실제 로그인, 본인·계좌 인증, 자료 업로드 및 정산은 서비스 연결이 필요해요.</p>`)}<button class="account-logout" type="button" data-action="account-logout">${icon('logout',18)}로그아웃</button></div>`;
  }

  function guide(){
    const steps=[['마음이 맞는 도우미 찾기','가능한 예매처와 활동 시간, 비용, 이용 인증 후기를 확인하고 프로필에서 직접 요청하세요.'],['공연과 원하는 조건 전달','공연 관람 일시와 티켓 오픈 일시, 좌석, 희망 수고비를 구분해 작성해요. 작성 중인 요청은 이어서 쓸 수 있어요.'],['도우미가 수락하고 최종 조건 전달','도우미는 수락 시 매칭권 1장을 사용해요. 연락처를 확인하고 요청 내용을 바탕으로 최종 조건을 보내요.'],['이용자가 확인하고 확정','처음 요청한 조건과 변경된 항목을 비교하세요. 수정을 원하면 도우미에게 수정 요청을 보내고 새 조건을 받아요.'],['이용자가 안전거래 결제','확정된 착수비·수고비와 안전거래 수수료를 확인해 결제해요. 도우미는 결제 확인 후 예매를 준비해요.'],['착수와 예매 결과 확인','도우미가 착수 증빙과 예매 결과를 등록하면 이용자가 내 활동에서 확인해요. 착수비는 증빙 승인 후, 수고비는 결과 확인 후 정산하는 기존 흐름을 따릅니다.']];
    return `${pageTitle('이용 방법','직접 요청하고, 조건을 확인하고, 함께 준비해요.','home')}<div class="account-guide-layout"><section class="content-card"><ol class="account-guide-steps">${steps.map(([t,d],i)=>`<li><span>${i+1}</span><div><h2>${t}</h2><p>${d}</p></div></li>`).join('')}</ol>${link('도우미 찾기','home','primary')}</section><aside>${card('어디에서 확인하나요?',`<div class="account-guide-nav"><strong>이용자 · 내 활동</strong><p>보낸 요청부터 거래 완료까지 이어서 확인해요.</p><strong>도우미 · 받은 요청</strong><p>나에게 직접 도착한 새 요청을 확인해요.</p><strong>도우미 · 매칭 관리</strong><p>수락한 요청의 최종 조건과 예매 진행을 관리해요.</p></div>`)}${card('비용을 구분해 주세요',`<dl class="account-fee-definitions"><dt>착수비</dt><dd>예매 시도에 착수하는 비용</dd><dt>수고비</dt><dd>확정한 성공 조건을 충족했을 때의 비용</dd><dt>매칭권</dt><dd>도우미가 요청 수락 시 사용하는 이용권</dd></dl>`)}${note('현재 결제·인증은 시뮬레이션입니다. 실제 청구나 정산은 이루어지지 않아요.')}</aside></div>`;
  }
  function inquiries(){return `${pageTitle('문의 작성','','help')}<div class="account-contained"><section class="content-card"><div class="account-title-row"><h2>문의 작성</h2>${link('문의 현황','inquiryHistory','ghost')}</div><form id="inquiry-form">${input('subject','제목',{required:true})}${area('message','문의 내용','',true)}<p class="record-note">체험용 문의로 이 브라우저에만 저장되며 상담원에게 전송되지 않아요.</p><button class="btn primary" type="submit">문의 저장</button></form></section></div>`;}
  function inquiryHistory(){state.inquiries||=[];return `${pageTitle('문의 현황','','help')}<div class="account-contained">${link('문의 작성','inquiries','secondary')}<div class="inquiry-history-list"><section class="content-card"><h2>문의 현황</h2>${state.inquiries.length?state.inquiries.map(q=>`<details class="inquiry-item"><summary>${esc(q.subject)} <small>${q.reply?'답변 완료':'접수 대기 · 체험'}</small></summary><small>${esc(q.date)}</small><p>${esc(q.message)}</p>${q.reply?`<p>${esc(q.reply)}</p>`:''}</details>`).join(''):'<p class="prose">아직 작성한 문의가 없어요.</p>'}</section></div></div>`;}
  function help(){
    const faqs=[['어떻게 요청하나요?','도우미 찾기에서 프로필을 확인하고 요청서를 작성하세요. 보낸 요청과 이어지는 거래는 모두 내 활동에서 확인해요.'],['로그인이 되지 않아요.','이 브라우저에서 가입할 때 입력한 이메일을 사용해 주세요. 다른 기기의 계정이나 실제 서비스 계정을 인증하는 기능은 아직 연결되어 있지 않아요. 흐름을 살펴보려면 로그인 화면의 예시 계정을 이용할 수 있어요.'],['인증이 실패했어요.','계정·인증에서 재시도를 선택하세요. 현재는 체험 인증번호를 입력해 진행하며, 실제 인증 기관에 연결하거나 메시지를 발송하지 않습니다.'],['연락처는 누구에게 공개되나요?','요청이 수락되면 해당 거래의 상대방에게만 공개해요. 공개 프로필에는 연락처와 인증 자료가 표시되지 않아요.'],['최종 조건을 바꾸고 싶어요.','이용자가 확정하기 전에는 수정 요청을 보낼 수 있어요. 도우미가 새 최종 조건을 보내면 변경 항목을 다시 확인하고 확정해 주세요.'],['도우미 신청을 보완해야 해요.','마이페이지의 신청 상태에서 보완 사유를 확인하고 신청 내용 보완하기를 선택하세요. 기존 프로필은 유지한 채 필요한 정보만 수정할 수 있어요.'],['착수비와 수고비는 언제 정산되나요?','기존 거래 흐름은 착수 증빙 승인 후 착수비, 예매 결과 확인 후 수고비를 정산하도록 안내합니다. 현재 화면에서는 실제 정산이 이루어지지 않아요.'],['첨부한 파일은 어디에 저장되나요?','현재 첨부는 이 브라우저의 미리보기와 제출 상태를 확인하는 기능이에요. 파일이 운영자나 상대방의 서버에 업로드되는 것은 아니에요.'],['취소와 환불은 어떻게 확인하나요?','거래 상세에서 현재 단계와 취소 가능 여부를 확인해 주세요. 결제 이후 취소·환불의 실제 처리 기준과 지급 시점은 운영 정책 및 결제 서비스 연결이 필요합니다.']];
    return `${pageTitle('도움말','궁금한 내용을 빠르게 확인해 보세요.','my')}<div class="account-guide-layout"><section class="content-card account-faq">${faqs.map(([q,a],i)=>`<details ${i===0?'open':''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</section><aside>${card('처음이라면',`<p class="prose">직접 요청부터 예매 결과 확인까지 전체 흐름을 살펴보세요.</p>${link('이용 방법 보기','guide','primary full')}`)}${card('계정에 도움이 필요하면',`<p class="prose">프로필과 연락처, 인증 상태를 계정에서 확인할 수 있어요.</p>${link('계정·인증 보기','account','secondary full')}`)}${link('문의 작성','inquiries','secondary full')}${link('문의 현황','inquiryHistory','ghost full')}</aside></div>`;
  }
  function terms(){return `<div class="account-contained legal-document">${pageTitle('서비스 이용 안내','체험 화면에 적용되는 범위와 기존 이용 기준입니다.','my')}${card('서비스 범위',`<p class="prose">이용자가 도우미의 공개 프로필을 확인하고 직접 요청하는 매칭 서비스입니다. 플랫폼은 예매 성공이나 티켓을 보증하지 않습니다.</p>`)}${card('진행과 비용',`<p class="prose">이용자 요청 → 도우미 수락 및 최종 조건 전달 → 이용자 확인·확정 순서로 진행해요. 이용자는 확정된 금액을 확인하고 안전거래 결제를 진행합니다.</p><p class="prose">도우미의 매칭권은 요청 수락 시 1장이 사용돼요. 이용자의 안전거래 결제와 별개입니다.</p>`)}${card('허용되지 않는 이용',`<p class="prose">예매 계정정보 수집, 매크로 사용, 재판매 목적 예매, 티켓 양도·아옮은 허용하지 않습니다. 상대방의 계정 비밀번호를 요청하거나 입력하지 마세요.</p>`)}${note('본 화면은 정식 약관 문서가 아닙니다. 현재는 실제 결제·인증·정산 없이 흐름을 확인하는 프로토타입이며, 실제 서비스의 약관과 세부 취소·환불 기준은 출시 전에 별도 고지가 필요합니다.')}</div>`;}
  function privacy(){return `<div class="account-contained legal-document">${pageTitle('개인정보 안내','지금 입력하는 정보가 어디에 쓰이는지 확인해요.','my')}${card('공개되는 프로필',`<p class="prose">이용자 닉네임과 이미지는 요청·후기 등에서 사용합니다. 도우미가 입력한 활동 닉네임·소개·예매처·공연 분야·활동 시간·안내 비용은 공개 프로필에 표시돼요.</p>`)}${card('거래 상대방에게만 공개',`<p class="prose">선택한 연락 방법과 연락처는 요청 수락 후 해당 거래의 상대방에게 공개합니다. 정산 계좌와 인증·경력 제출 자료는 공개 프로필에 표시하지 않아요.</p>`)}${card('현재 체험 화면의 저장 방식',`<p class="prose">프로필과 임시저장 내용, 요청·거래 상태는 이 브라우저에 저장합니다. 인증 제공자, 결제 서비스 또는 운영자에게 정보를 전송하지 않아요. 프로필 이미지는 작은 미리보기로 저장하며, 첨부 자료는 로컬 상태로만 처리합니다.</p><p class="prose">실제 개인정보 대신 예시 정보를 사용해 주세요. 브라우저 사이트 데이터를 지우면 이 프로토타입의 저장된 정보를 삭제할 수 있어요.</p>`)}${note('정식 개인정보처리방침은 별도로 필요합니다. 실제 수집 항목, 보관 기간, 처리 위탁 및 이용자 권리 행사 방법은 서비스 연결 전에 확정·고지해야 합니다.')}</div>`;}

  function setError(form,name,message){
    const el=$(`[data-error="${name}"]`,form);if(el)el.textContent=message;
    const field=$(`[name="${name}"]`,form);if(field)field.setAttribute('aria-invalid','true');
  }
  function formError(form,message){const el=$('.account-form-error',form);if(el)el.innerHTML=message?note(esc(message),'error'):'';else toast(message);}
  function valid(form){
    $$('[data-error]',form).forEach(e=>e.textContent='');$$('[aria-invalid]',form).forEach(e=>e.removeAttribute('aria-invalid'));
    let okay=true;
    $$('input,select,textarea',form).filter(e=>e.type!=='file').forEach(e=>{
      if(e.required&&((e.type==='checkbox'&&!e.checked)||!String(e.value||'').trim())){setError(form,e.name.startsWith('agreement_')?'agreements':e.name,e.type==='checkbox'?'필수 항목에 동의해 주세요.':'이 항목을 입력해 주세요.');okay=false;}
      else if(!e.checkValidity()){setError(form,e.name,e.type==='email'?'이메일 형식을 확인해 주세요.':e.type==='url'?'https://로 시작하는 링크를 입력해 주세요.':e.type==='number'?'0 이상의 금액을 입력해 주세요.':'입력한 값을 확인해 주세요.');okay=false;}
    });
    if(!okay)$('[aria-invalid="true"]',form)?.focus();return okay;
  }
  function helperValid(form){
    let okay=valid(form);const p=h();
    if(p.sites.includes('기타')){setError(form,'otherSite','예매처 이름을 입력해 주세요.');okay=false;}if(!p.sites.length){setError(form,'sites','가능한 예매처를 하나 이상 선택해 주세요.');okay=false;}
    if(Number(p.successMax)<Number(p.successMin)){setError(form,'successMax','최대 수고비는 최소 수고비 이상이어야 해요.');okay=false;}
    return okay;
  }
  function contactValid(form){
    const p=u();
    if(p.contactMethod==='kakao'&&!/^https:\/\/open\.kakao\.com\//.test(p.kakao||'')){setError(form,'kakao','카카오톡 오픈채팅 링크를 입력해 주세요.');return false;}
    if(p.contactMethod==='phone'&&(!/^[+\d\s()-]+$/.test(p.phone||'')||p.phone.replace(/\D/g,'').length<8||p.phone.replace(/\D/g,'').length>15)){setError(form,'phone','연락받을 전화번호를 숫자로 입력해 주세요.');return false;}
    return true;
  }
  function readForm(form){
    const kind=form.dataset.accountForm;
    const values=new FormData(form);
    if(kind==='login'){state.accountDraft.loginEmail=String(values.get('email')||'');return;}
    if(kind==='signup'&&state.accountDraft.signupStep===0){state.accountDraft.purpose=values.get('purpose')||'user';return;}
    const helper=kind==='helperProfile'||kind==='application';
    const target=helper?h():u();
    const previousContact=helper?null:`${target.contactMethod}:${getContact(target)}`;
    for(const el of $$('input[name],select[name],textarea[name]',form)){
      if(el.type==='password'){if(kind==='signup')signupPassword=el.value;continue;}if(el.type==='file'||el.name==='verificationCode'||el.name==='sites')continue;
      if(el.name.startsWith('agreement_')){(kind==='application'?state.accountDraft.applicationAgreements:state.accountDraft.agreements)[el.name.replace('agreement_','')]=el.checked;continue;}
      if(el.name==='purpose')continue;if(kind==='application'&&['applicationContactMethod','kakao','other'].includes(el.name)){if(el.name==='applicationContactMethod'){u().contactMethod=el.value;state.profile.contactMethod=el.value;}else{u()[el.name]=el.value;state.profile[el.name]=el.value;}continue;}
      target[el.name]=el.type==='number'?(el.value===''?'':Number(el.value)):el.value;
    }
    if(helper&&$('[name="sites"]',form))target.sites=values.getAll('sites').map(site=>site==='기타'?(target.otherSite?.trim()||'기타'):site);
    if(!helper&&previousContact!==`${target.contactMethod}:${getContact(target)}`&&state.verification.contactValue!==`${target.contactMethod}:${getContact(target)}`)state.verification.contact='none';
  }
  function syncCommon(){
    const previous=getContact(state.profile),previousMethod=state.profile.contactMethod;
    const p=copy(u());
    if(previous!==getContact(p)||previousMethod!==p.contactMethod){
      const verifiedFor=state.verification.contactValue;
      if(verifiedFor!==`${p.contactMethod}:${getContact(p)}`)state.verification.contact='none';
    }
    state.profile=p;
  }
  function saveHelper(){
    state.helperProfile=copy(h());state.accountPreviewDraft=false;save();navigate('my');toast('공개 프로필을 저장했어요.');
  }
  function afterLogin(){
    state.loggedIn=true;save();const destination=state.authReturn;state.authReturn=null;save();
    navigate(destination?.route||'home',destination?.id);toast('로그인했어요. 작성하던 내용을 이어서 확인하세요.');
  }

  async function passwordHash(value){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('');}
  async function submit(form){
    readForm(form);save();const kind=form.dataset.accountForm;
    if(kind==='login'){
      if(!valid(form))return;
      if(!state.registered||![state.profile.email,state.profile.username].filter(Boolean).some(v=>v.trim().toLowerCase()===state.accountDraft.loginEmail.trim().toLowerCase()))return formError(form,'이 브라우저에 저장된 가입 정보를 찾을 수 없어요. 가입한 이메일을 확인하거나 회원가입을 진행해 주세요.');
      if(!state.authPasswordHash||await passwordHash(form.elements.password.value)!==state.authPasswordHash)return formError(form,'아이디와 비밀번호를 확인해 주세요. 예시 계정은 아래 체험 버튼을 이용해 주세요.');
      return afterLogin();
    }
    if(kind==='signup'){
      const step=state.accountDraft.signupStep;if(!valid(form))return;
      if(step===1&&!contactValid(form))return;
      if(step===1)state.authPasswordHash=await passwordHash(form.elements.password.value);
      if(step===0){state.accountDraft.signupStep=1;save();render();return;}
      if(state.accountDraft.checkedUsername!==u().username)return formError(form,'아이디 중복확인을 진행해 주세요.');
      if(state.accountDraft.verifiedPhone!==u().phone)return formError(form,'입력한 전화번호로 본인인증을 진행해 주세요.');
      state.verification.identity='complete';state.verification.contact=u().contactMethod==='phone'?'complete':'none';state.verification.contactValue='phone:'+u().phone;signupPassword='';
      syncCommon();state.registered=true;state.loggedIn=true;state.mode='user';state.accountDraft.helper={...h(),name:h().name||state.profile.name,image:h().image||state.profile.image};save();navigate('signupComplete');return;
    }
    if(kind==='application'){
      const step=state.accountDraft.applicationStep;
      if(step===0&&!helperValid(form))return;
      if(step===1){
        let okay=valid(form);
        if(!state.accountDraft.career[0]?.length){setError(form,'career0','경력 자료를 첨부해 주세요.');okay=false;}if(!h().careerDescription?.trim()){setError(form,'careerDescription','첨부 자료의 설명을 적어 주세요.');okay=false;}
        if(['identity','bank'].some(k=>state.verification[k]!=='complete')){formError(form,'본인·연락처·정산 계좌 확인을 완료해 주세요.');okay=false;}
        if(!okay)return;
      }
      if(step<2){state.accountDraft.applicationStep++;save();render();return;}
      if(!h().name?.trim()||!h().intro?.trim()||!h().detail?.trim()||!h().sites?.length||!h().hours?.trim()||!h().category||['fee','successMin','successMax'].some(k=>h()[k]===''||!Number.isFinite(Number(h()[k]))||Number(h()[k])<0)||Number(h().successMin)>Number(h().successMax)){state.accountDraft.applicationStep=0;save();render();toast('공개 프로필 필수 정보를 먼저 입력해 주세요.');return;}
      if(['identity','bank','contact'].some(k=>state.verification[k]!=='complete')||!state.accountDraft.career[0]?.length||!h().careerDescription?.trim()||!state.accountDraft.applicationAgreements.terms||!state.accountDraft.applicationAgreements.contact){state.accountDraft.applicationStep=1;save();render();toast('인증, 경력 자료와 필수 동의를 확인해 주세요.');return;}
      state.helperProfile=copy(h());state.applicationStatus='review';state.applicationSubmittedAt=new Date().toLocaleString('ko-KR');state.accountPreviewDraft=false;save();navigate('application');toast('신청 내용을 이 브라우저에 저장했어요.');return;
    }
    if(kind==='helperProfile') {if(helperValid(form))saveHelper();return;}
    if(!valid(form))return;
    if(kind==='contacts'){
      if(!contactValid(form))return;
      syncCommon();save();navigate('my');toast(state.verification.contact==='complete'?'연락처를 저장했어요.':'연락처를 저장했어요. 변경한 연락처를 다시 확인해 주세요.');return;
    }
    if(kind==='userProfile'){state.profile.name=u().name;state.profile.image=u().image;save();navigate('my');toast('프로필을 저장했어요.');}
  }

  function verify(kind){
    init();
    if(kind==='contact'){
      const p=u();if(!getContact(p)||!p.email){toast('연락받을 이메일과 연락처를 먼저 입력해 주세요.');if(!['signup','contacts'].includes(state.route))navigate('contacts');return;}
    }
    const title=labels[kind];
    openModal(`${title} · 체험`,`${note('실제 인증 요청이나 문자를 발송하지 않습니다. 화면에 안내된 체험 인증번호로 확인해 주세요.')}<form id="account-verification-form" novalidate>${kind==='bank'?select('bank','은행',['국민은행','신한은행','우리은행','하나은행','카카오뱅크','토스뱅크'],state.accountDraft.bankName||'국민은행'):''}${kind==='contact'?`<p class="account-verifying-contact">${esc(contactLabels[u().contactMethod]||'이메일')} · ${esc(getContact(u()))}</p>`:''}${input('code','체험 인증번호',{required:true,placeholder:'123456',helper:'체험 인증번호는 123456이에요. 실제 인증번호는 입력하지 마세요.',maxlength:6})}<div class="account-form-error" aria-live="polite"></div><div class="account-form-footer"><button type="submit" class="btn primary full">확인 완료하기</button></div></form>`,{onReady:()=>{
      const form=$('#account-verification-form');if(!form)return;
      form.onsubmit=e=>{
        e.preventDefault();if(!valid(form))return;
        if($('[name="code"]',form).value!=='123456'){state.verification[kind]='error';save();setError(form,'code','인증번호가 맞지 않아요. 123456을 입력하고 다시 시도해 주세요.');return;}
        state.verification[kind]='pending';save();const submitButton=$('[type="submit"]',form);submitButton.disabled=true;submitButton.textContent='확인 중…';
        setTimeout(()=>{
          state.verification[kind]='complete';
          if(kind==='contact')state.verification.contactValue=`${u().contactMethod}:${getContact(u())}`;
          if(kind==='bank')state.accountDraft.bankName=$('[name="bank"]',form)?.value||'국민은행';
          save();closeModal();render();toast(`${title} 체험을 완료했어요.`);
        },450);
      };
    }});
  }

  async function previewImage(file){
    const source=await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(new Error('파일을 읽지 못했어요.'));reader.readAsDataURL(file);});
    const img=await new Promise((res,rej)=>{const image=new Image();image.onload=()=>res(image);image.onerror=()=>rej(new Error('이미지를 읽지 못했어요.'));image.src=source;});
    const canvas=document.createElement('canvas'),scale=Math.min(1,560/img.width,560/img.height);canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.76);
  }
  async function imageInput(el){
    const target=el.dataset.accountImage,p=target==='user'?u():h(),file=el.files?.[0];if(!file)return;
    const error=$(`[data-image-error="${target}"]`);if(error)error.textContent='';
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024){if(error)error.textContent='JPG, PNG, WEBP 파일을 3MB 이하로 선택해 주세요.';el.value='';return;}
    try{if(error)error.textContent='이미지를 준비하고 있어요…';p.image=await previewImage(file);save();render();}catch(e){if(error)error.textContent=e.message+' 다른 파일로 다시 시도해 주세요.';}
  }
  async function careerInput(el){
    const index=Number(el.dataset.accountCareer),files=[...(el.files||[])],current=state.accountDraft.career[index],error=$(`[data-career-error="${index}"]`);if(error)error.textContent='';
    if(files.length+current.length>4){if(error)error.textContent='사례당 최대 4개까지 첨부할 수 있어요.';el.value='';return;}
    for(const file of files){if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size>5*1024*1024){if(error)error.textContent='이미지 또는 PDF 파일을 5MB 이하로 선택해 주세요.';el.value='';return;}}
    try{if(error)error.textContent='첨부 자료를 준비하고 있어요…';const ready=await Promise.all(files.map(async f=>({name:f.name,size:f.size,type:f.type,url:f.type.startsWith('image/')?await previewImage(f):''})));current.push(...ready);save();render();}catch(e){if(error)error.textContent='첨부 자료를 읽지 못했어요. 파일을 다시 선택해 주세요.';}
  }
  function bind(root=document){
    recovery.bind(root);
    const inquiry=$('#inquiry-form',root);if(inquiry)inquiry.onsubmit=e=>{e.preventDefault();if(!valid(inquiry))return;const d=new FormData(inquiry);state.inquiries||=[];state.inquiries.unshift({id:Date.now(),subject:d.get('subject'),message:d.get('message'),date:new Date().toLocaleString('ko-KR')});save();navigate('inquiryHistory');toast('체험 문의를 저장했어요.');};
    init();
    const dates=$('.helper-availability',root);
    if(dates){
      $$('[data-availability-month]',dates).forEach(button=>button.onclick=()=>{const [year,month]=availabilityMonth.split('-').map(Number);const next=new Date(year,month-1+Number(button.dataset.availabilityMonth),1);availabilityMonth=next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0');render();});
      $$('[data-toggle-availability]',dates).forEach(button=>button.onclick=()=>{const date=button.dataset.toggleAvailability,selected=new Set(state.helperProfile.availability||[]);if(selected.has(date))selected.delete(date);else selected.add(date);state.helperProfile.availability=[...selected].sort();h().availability=[...state.helperProfile.availability];save();render();$('[data-toggle-availability="'+date+'"]',document)?.focus({preventScroll:true});});
    }
    $$('form[data-account-form]',root).forEach(form=>{
      form.onsubmit=e=>{e.preventDefault();submit(form);};
      form.oninput=e=>{readForm(form);if(form.dataset.accountForm==='signup'){if(e.target.name==='username'){state.accountDraft.checkedUsername=null;$('#signup-id-status').textContent='';}if(e.target.name==='phone'){state.accountDraft.verifiedPhone=null;$('#signup-phone-status').textContent='';}const preview=$('[data-contact-preview]',form);if(preview)preview.value=u()[u().contactMethod||'email']||'';}save();const name=e.target.name;if(name){const error=$(`[data-error="${name}"]`,form);if(error)error.textContent='';e.target.removeAttribute('aria-invalid');}};
      form.onchange=e=>{readForm(form);save();if(e.target.name==='applicationContactMethod'){$('#application-contact-value',form).innerHTML=signupContact(u());return;}if(e.target.name==='sites'){const other=$('#helper-other-site',form);if(other){other.hidden=!$$('[name=sites]:checked',form).some(x=>x.value==='기타');$('input',other).required=!other.hidden;}return;}if(e.target.name==='contactMethod'){state.verification.contact='none';save();if(form.dataset.accountForm==='signup')$('#signup-contact-value',form).innerHTML=signupContact(u());else render();}else if(e.target.name==='purpose')$$('.account-role-option',form).forEach(x=>x.classList.toggle('selected',$('input',x).checked));};
    });
    $$('[data-account-image]',root).forEach(el=>el.onchange=()=>imageInput(el));
    $$('[data-account-career]',root).forEach(el=>el.onchange=()=>careerInput(el));
  }
  function handle(action,el){
    if(!action.startsWith('account-'))return false;
    init();
    if(action.startsWith('account-verify-')){verify(action.replace('account-verify-',''));return true;}
    switch(action){
      case 'account-google':case 'account-kakao':toast('외부 계정 연동은 준비 중이에요. 아이디로 가입하거나 예시 계정을 이용해 주세요.');break;
      case 'account-demo-login':{
        if(!state.registered){
          const a=agents[0];state.profile={name:'공연산책',contactMethod:'email',email:'member@example.com',phone:'',kakao:'',image:''};state.helperProfile={name:a.name,intro:a.intro,detail:a.detail,sites:[...a.sites],category:a.category,hours:'평일 18:00~23:00 · 주말 오후',fee:a.fee,successMin:10000,successMax:50000,image:''};
          state.ownAgentId=a.id;state.accountDraft.user=copy(state.profile);state.accountDraft.helper=copy(state.helperProfile);state.applicationStatus='approved';state.verification={identity:'complete',bank:'complete',contact:'complete',contactValue:'email:member@example.com'};state.registered=true;
        }
        afterLogin();break;
      }
      case 'account-check-username':{const id=u().username?.trim();u().username=id;const status=$('#signup-id-status');if(!id){status.textContent='아이디를 입력해 주세요.';break;}if(state.registered&&[state.profile.username,state.profile.email].some(v=>v?.toLowerCase()===id.toLowerCase())){status.textContent='이미 사용 중인 아이디예요.';state.accountDraft.checkedUsername=null;}else{state.accountDraft.checkedUsername=id;status.textContent='사용 가능한 아이디예요. (이 브라우저 기준)';}save();break;}
      case 'account-signup-phone':{const phone=u().phone||'';if(!/^01[0-9][0-9-]{7,10}$/.test(phone)){ $('#signup-phone-status').textContent='전화번호를 확인해 주세요.';break;}state.accountDraft.verifyingPhone=phone;$('#signup-phone-code').hidden=false;break;}
      case 'account-signup-phone-confirm':{const code=$('[name=verificationCode]');if(code.value!=='123456'||state.accountDraft.verifyingPhone!==u().phone){$('#signup-phone-status').textContent='전화번호와 인증번호를 확인해 주세요.';break;}state.accountDraft.verifiedPhone=u().phone;$('#signup-phone-status').textContent='본인인증 완료 · 체험';$('#signup-phone-code').hidden=true;save();break;}
      case 'account-signup-prev':state.accountDraft.signupStep=Math.max(0,state.accountDraft.signupStep-1);save();render();break;
      case 'account-signup-edit':state.accountDraft.signupStep=1;save();render();break;
      case 'account-onboarding-done':if(state.accountDraft.purpose==='agent'){state.mode='agent';save();navigate('application');}else{const to=state.authReturn;state.authReturn=null;save();navigate(to?.route||'home',to?.id);}break;
      case 'account-start-helper-signup':state.accountDraft.purpose='agent';state.authReturn={route:'application'};save();navigate('signup');break;
      case 'account-application-start':
      case 'account-application-resume':state.applicationStatus='draft';state.accountDraft.applicationStep=0;state.accountDraft.helper={...state.helperProfile,...h(),name:h().name||state.profile.name,image:h().image||state.profile.image};save();navigate('application');break;
      case 'account-application-prev':state.accountDraft.applicationStep=Math.max(0,state.accountDraft.applicationStep-1);save();render();break;
      case 'account-application-save':save();navigate('my');toast('작성 중인 신청을 저장했어요. 언제든 이어서 작성하세요.');break;
      case 'account-helper-preview':{const form=$('[data-account-form="helperProfile"]');if(form){readForm(form);if(!helperValid(form))break;}state.accountPreviewDraft=true;save();navigate('profilePreview');break;}
      case 'account-helper-preview-save':saveHelper();break;
      case 'account-image-remove':(el.dataset.target==='helper'?h():u()).image='';save();render();break;
      case 'account-image-skip':toast('이미지는 나중에 프로필에서 추가할 수 있어요.');break;
      case 'account-career-remove':state.accountDraft.career[Number(el.dataset.case)].splice(Number(el.dataset.file),1);save();render();break;
      case 'account-history':state.txHistoryTab=el.dataset.kind==='credits'?'credits':'escrow';save();navigate('paymentHistory');break;
      case 'account-mode-user':state.mode='user';save();navigate('my');break;
      case 'account-mode-agent':state.mode='agent';save();navigate(state.applicationStatus==='approved'?'my':'application');break;
      case 'account-logout':openModal('로그아웃할까요?',`<p class="prose">작성 중인 내용은 이 브라우저에 저장되어 있어요. 다시 로그인하면 이어서 확인할 수 있습니다.</p><div class="account-form-footer">${b('계속 이용하기','account-close','secondary')}${b('로그아웃','account-logout-confirm')}</div>`);break;
      case 'account-logout-confirm':state.loggedIn=false;state.mode='user';state.authReturn=null;save();closeModal();navigate('home');toast('로그아웃했어요.');break;
      case 'account-close':closeModal();break;
      default:return false;
    }
    return true;
  }
  return {pages:{availability:()=>`${pageTitle('예매 가능 날짜','','matches')}<section class="content-card account-contained">${availabilityField(state.helperProfile)}${link('매칭 관리로','matches')}</section>`,inquiries,inquiryHistory,recovery:recovery.page,login,signup,signupComplete,application,my,userProfile,helperProfile,profilePreview,account,contacts,help,guide,privacy,terms},bind,handle};
}
