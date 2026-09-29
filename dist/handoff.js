// These fixtures run once, before the first render. Navigation continues with one shared state.
// The application disables persistence whenever a ?screen= preview is requested.
const screen=(id,name,route,mode='user',selected=201,setup='',overlay=null)=>({id,name,route,mode,selected,setup,overlay});
export const screens=[
 screen('B1-home','이용자 · 도우미 찾기','home','user',1),
 screen('B1-guest','로그인 전 · 도우미 탐색','home','user',1,'guest'),
 screen('B1-filter','이용자 · 상세 필터','home','user',1,'','filters'),
 screen('B1-search','이용자 · 검색·필터 적용','home','user',1,'search'),
 screen('B1-empty','이용자 · 검색 결과 없음','home','user',1,'searchEmpty'),
 screen('B2-profile','이용자 · 도우미 프로필','profile','user',1),
 screen('B2-reviews','이용자 · 이용 인증 후기','profile','user',1,'reviews'),
 screen('B3-quote','이용자 · 요청서 작성','quote','user',1,'quote'),
 screen('B3-quote-error','이용자 · 요청서 입력 오류','quote','user',1,'quoteError'),
 screen('B3-quote-other','이용자 · 기타 예매처 입력','quote','user',1,'quoteOther'),
 screen('B4-complete','이용자 · 요청 전송 완료','requestSent','user',201,'sent'),
 screen('B5-requests','이용자 · 내 활동','requests'),
 screen('B5-progress','이용자 · 내 활동 진행 중','requests','user',201,'activityProgress'),
 screen('B5-history','이용자 · 내 활동 지난 내역','requests','user',201,'activityClosed'),
 screen('B5-empty','이용자 · 내 활동 없음','requests','user',201,'emptyRequests'),
 screen('B6-pending','이용자 · 도우미 응답 대기','detail'),
 screen('B6-edit','이용자 · 요청 내용 수정','quote','user',201,'editQuote'),
 screen('B6-accepted','이용자 · 최종 조건 준비 중','detail','user',201,'accepted'),
 screen('B6-agreement','이용자 · 최종 조건 확인','detail','user',201,'terms_sent'),
 screen('B6-revision','이용자 · 조건 수정 요청','detail','user',201,'terms_sent','tx-revision'),
 screen('B6-revision-wait','이용자 · 새 조건 대기','detail','user',201,'revision_requested'),
 screen('B6-agreed','이용자 · 조건 확정·결제 대기','detail','user',201,'agreed'),
 screen('B6-paid','이용자 · 안전거래 결제 완료','detail','user',201,'paid'),
 screen('B6-result','이용자 · 예매 결과 확인','detail','user',201,'result_submitted'),
 screen('B6-completed','이용자 · 거래 완료','detail','user',201,'completed'),
 screen('B8-review','이용자 · 거래 인증 후기 작성','review','user',201,'completed'),
 screen('B6-cancel-confirm','이용자 · 요청 취소 확인','detail','user',201,'','tx-cancel'),
 screen('B6-cancelled','이용자 · 취소된 요청','detail','user',201,'cancelled'),
 screen('C2-leads','도우미 · 직접 받은 요청','leads','agent'),
 screen('C2-closed','도우미 · 거절·만료 요청','leads','agent',201,'inboxClosed'),
 screen('C2-empty','도우미 · 받은 요청 없음','leads','agent',201,'emptyRequests'),
 screen('C3-lead','도우미 · 직접 받은 요청 상세','detail','agent'),
 screen('C3-accept','도우미 · 수락과 매칭권 확인','detail','agent',201,'','tx-accept'),
 screen('C3-no-credits','도우미 · 매칭권 부족','detail','agent',201,'noCredits','tx-accept'),
 screen('C3-decline','도우미 · 요청 거절 확인','detail','agent',201,'','tx-decline'),
 screen('C1-matches','도우미 · 매칭 관리','matches','agent',201,'accepted'),
 screen('C1-history','도우미 · 완료·취소 거래','matches','agent',201,'matchClosed'),
 screen('D1-final-terms','도우미 · 최종 조건 작성','finalTerms','agent',201,'accepted'),
 screen('D1-final-revision','도우미 · 수정 요청 반영','finalTerms','agent',201,'revision_requested'),
 screen('D1-load-request','도우미 · 요청 내용 불러오기','finalTerms','agent',201,'accepted','tx-load-request'),
 screen('D1-terms-wait','도우미 · 이용자 최종 확인 대기','detail','agent',201,'terms_sent'),
 screen('D2-payment','이용자 · 안전거래 결제','payment','user',201,'agreed'),
 screen('D2-payment-failed','이용자 · 결제 실패와 재시도','payment','user',201,'paymentFailed'),
 screen('D2-payment-cancelled','이용자 · 결제 취소','payment','user',201,'paymentCancelled'),
 screen('D3-result','도우미 · 예매 결과 등록','result','agent',201,'in_progress'),
 screen('D3-result-failure','도우미 · 실패 결과 등록','result','agent',201,'resultFailure'),
 screen('D4-credits','도우미 · 매칭권 충전','credits','agent',201,'noCredits'),
 screen('D4-history','도우미 · 매칭권 충전 내역','paymentHistory','agent',201,'creditHistory'),
 screen('D4-payment-history','이용자 · 안전거래 결제 내역','paymentHistory','user',201,'escrowHistory'),
 screen('A0-login','공통 · 기존 계정 로그인','login','user',1,'loggedOut'),
 screen('A1-purpose','회원가입 · 이용 목적','signup','user',1,'signupPurpose'),
 screen('A1-profile','회원가입 · 정보 입력 및 인증','signup','user',1,'signupProfile'),
 screen('A1-complete','회원가입 · 프로필 준비 완료','signupComplete','user',1),
 screen('A2-intro','도우미 · 활동 소개와 신청','application','agent',1,'applicationNone'),
 screen('A2-profile','도우미 신청 · 공개 프로필','application','agent',1,'applicationProfile'),
 screen('A2-verification','도우미 신청 · 인증과 경력','application','agent',1,'applicationVerification'),
 screen('A2-preview','도우미 신청 · 미리보기와 제출','application','agent',1,'applicationPreview'),
 screen('A2-reviewing','도우미 신청 · 심사 중','application','agent',1,'applicationReview'),
 screen('A2-changes','도우미 신청 · 보완 요청','application','agent',1,'applicationChanges'),
 screen('A2-rejected','도우미 신청 · 반려','application','agent',1,'applicationRejected'),
 screen('A2-approved','도우미 신청 · 승인','application','agent',1),
 screen('E-notifications','공통 · 읽음·안 읽음 알림','notifications','user',201,'notifications'),
 screen('E-notifications-empty','공통 · 알림 없음','notifications','user',201,'notificationsEmpty'),
 screen('E-my-user','이용자 · 마이페이지','my'),
 screen('E-my-agent','도우미 · 마이페이지','my','agent'),
 screen('E-user-profile','이용자 · 프로필 수정','userProfile'),
 screen('E-helper-profile','도우미 · 공개 프로필 수정','helperProfile','agent',1),
 screen('E-profile-preview','도우미 · 공개 프로필 미리보기','profilePreview','agent',1),
 screen('E-account','공통 · 계정과 인증','account'),
 screen('E-account-error','공통 · 인증 실패와 재시도','account','user',201,'verificationError'),
 screen('E-contact-settings','공통 · 연락처 관리','contacts'),
 screen('E-guide','공통 · 이용 방법','guide'),
 screen('E-support','공통 · 도움말','help'),
 screen('E-terms','공통 · 이용약관','terms'),
 screen('E-privacy','공통 · 개인정보 안내','privacy')
];

const user={name:'정원',email:'member@example.com',phone:'',kakao:'',contactMethod:'email',image:''};
const helper={name:'티켓온',intro:'간절한 마음을 알기에, 한 자리도 소중하게.',detail:'공연을 기다리는 마음을 이해하며 꼼꼼하게 준비해요.\n원하는 좌석과 성공 조건을 먼저 확인하고, 예매 이후에도 결과를 빠르게 알려드릴게요.',sites:['NOL','YES24','멜론티켓'],category:'콘서트',hours:'매일 10:00 ~ 22:00',fee:10000,successMin:10000,successMax:50000,image:''};
const clone=x=>structuredClone(x);
function transaction(state,status){
 const r=state.requests.find(r=>r.id===201);if(!r)return;
 r.status=status;r.agentId=1;r.person=user.name;r.contact={email:user.email,phone:'',kakao:'',contactMethod:'email'};
 if(!['pending','cancelled','declined','expired'].includes(status)){r.creditCharged=true;r.acceptedAt='2026. 9. 15. 오후 2:20';}
 if(['terms_sent','revision_requested','agreed','paid','in_progress','result_submitted','completed'].includes(status)){
   r.finalTerms={...r.original,seat:'1층 3~8구역, 연석 2매',successFee:35000};r.proposedAt='2026. 9. 15. 오후 2:40';
   r.termVersions=[{terms:clone(r.finalTerms),at:r.proposedAt}];
 }
 if(status==='revision_requested'){r.revisionNote='시야 제한석 제외 조건을 최종 조건에도 적어 주세요.';r.termVersions[0].revision=r.revisionNote;}
 if(['agreed','paid','in_progress','result_submitted','completed'].includes(status)){r.agreementAccepted=true;r.agreedAt='2026. 9. 15. 오후 3:00';}
 if(['paid','in_progress','result_submitted','completed'].includes(status)){
   const starting=Number(r.finalTerms.starting),successFee=Number(r.finalTerms.successFee),fee=Math.max(1000,Math.round(successFee*.03));
   r.paid=true;r.payment={kind:'escrow',status:'success',starting,successFee,fee,total:starting+successFee+fee,method:'카드',title:r.show,requestId:r.id,at:'2026. 9. 15. 오후 3:10'};
 }
 if(['result_submitted','completed'].includes(status)){r.result='success';r.resultNote='협의한 1층 중앙 구역 연석 2매 예매를 마쳤어요.';r.resultSeat='1층 5구역 8열, 연석 2매';r.resultAttachments=[];r.resultAt='2026. 9. 15. 오후 8:12';}
}

export function applyPreview(screenId,ctx){
 const spec=screens.find(s=>s.id===screenId);if(!spec)return null;
 const {state}=ctx;
 Object.assign(state,{mode:spec.mode,route:spec.route,selected:spec.selected,loggedIn:true,registered:true,profile:clone(user),helperProfile:clone(helper),applicationStatus:'approved',verification:{identity:'complete',contact:'complete',bank:'complete',contactValue:'email:'+user.email},accountDraft:{},profileTab:'about',query:'',sort:'recommend',filters:{min:0,max:0,date:'',rating:0,trades:0,success:0,sites:[]},drafts:{},paymentState:{},txTabs:{},txHistory:[],notifications:[],quoteEditId:null,credits:12});
 state.requests.forEach(r=>{r.contact={email:user.email,phone:'',kakao:'',contactMethod:'email'};r.person=user.name;});
 const setup=spec.setup;
 if(['accepted','terms_sent','revision_requested','agreed','paid','in_progress','result_submitted','completed','cancelled'].includes(setup))transaction(state,setup);
 if(setup==='guest'){state.loggedIn=false;state.registered=false;state.applicationStatus='none';}
 if(setup==='loggedOut')state.loggedIn=false;
 if(setup==='search'){state.query='티켓';state.filters.rating=4.8;}
 if(setup==='searchEmpty')state.query='검색결과없는공연';
 if(setup==='reviews')state.profileTab='reviews';
 if(setup==='quote'||setup==='quoteOther')state.drafts['quote-1']={...clone(state.requests[0].original),site:setup==='quoteOther'?'기타':'NOL',otherSite:setup==='quoteOther'?'공연장 공식 홈페이지':'',consent:false};
 if(setup==='editQuote'){state.quoteEditId=201;state.drafts['quote-edit-201']=clone(state.requests.find(r=>r.id===201).original);}
 if(setup==='sent')state.lastRequestId=201;
 if(setup==='activityProgress'){transaction(state,'paid');state.txTabs.requests='progress';}
 if(setup==='activityClosed')state.txTabs.requests='closed';
 if(setup==='matchClosed'){transaction(state,'completed');state.txTabs.matches='closed';}
 if(setup==='inboxClosed'){state.txTabs.leads='closed';const r=state.requests.find(r=>r.id===201);r.status='declined';state.requests.push({...clone(r),id:205,show:'가을 페스티벌',status:'expired'});}
 if(setup==='emptyRequests')state.requests=[];
 if(setup==='noCredits')state.credits=0;
 if(setup==='paymentFailed'||setup==='paymentCancelled'){transaction(state,'agreed');state.paymentState['escrow-201']={status:setup==='paymentFailed'?'failure':'cancelled'};}
 if(setup==='resultFailure'){transaction(state,'in_progress');state.drafts['result-text-201']={result:'failure',note:'희망 조건에 해당하는 좌석이 남아 있지 않았어요.'};}
 if(setup==='creditHistory'){state.txHistory=[{kind:'credits',status:'success',title:'매칭권 10장 충전',total:5000,method:'카드',at:'2026. 9. 15. 오후 1:30'},{kind:'credits',status:'cancelled',title:'매칭권 5장 충전',total:2500,method:'간편결제',at:'2026. 9. 15. 오후 1:20'}];}
 if(setup==='escrowHistory'){transaction(state,'paid');state.txHistory=[clone(state.requests.find(r=>r.id===201).payment)];}
 if(setup.startsWith('signup')){state.registered=false;state.loggedIn=false;state.applicationStatus='none';state.accountDraft={signupStep:({signupPurpose:0,signupProfile:1,signupCheck:2})[setup],purpose:'user',user:clone(user)};if(setup!=='signupCheck')state.verification={};}
 if(setup.startsWith('application')){
  state.applicationStatus=({applicationNone:'none',applicationProfile:'draft',applicationVerification:'draft',applicationPreview:'draft',applicationReview:'review',applicationChanges:'needsChanges',applicationRejected:'rejected'})[setup];
  state.accountDraft={helper:clone(helper),applicationStep:({applicationProfile:0,applicationVerification:1,applicationPreview:2})[setup]||0};
  if(setup==='applicationChanges')state.applicationFeedback='경력 사례 2번의 대화 내역과 이체 기록을 함께 확인할 수 있도록 보완해 주세요.';
  if(setup==='applicationRejected')state.applicationFeedback='제출 자료에서 활동 경력을 확인하기 어려워요. 활동 기준을 확인하고 자료를 보완해 다시 신청할 수 있어요.';
  if(['applicationReview','applicationChanges','applicationRejected'].includes(setup))state.applicationSubmittedAt='2026. 9. 15. 오후 1:00';
 }
 if(setup==='verificationError')state.verification={identity:'error',bank:'none',contact:'complete',contactValue:'email:'+user.email};
 if(setup==='notifications'){
   transaction(state,'terms_sent');state.notifications=[{key:'preview-terms',type:'terms',title:'최종 조건이 도착했어요',body:'태연 콘서트 · 요청과 달라진 내용을 확인해 주세요.',id:201,role:'user',unread:true,time:'방금 전'},{key:'preview-accepted',type:'accepted',title:'도우미가 요청을 수락했어요',body:'태연 콘서트 · 진행 상태를 확인해 주세요.',id:201,role:'user',unread:false,time:'20분 전'}];
 }
 return {screen:spec,afterRender(){
   if(spec.overlay)ctx.action?.(spec.overlay);
   if(setup==='quoteError'){const form=document.querySelector('#tx-quote-form');if(form)ctx.validate?.(form);}
   document.title=spec.name+' · PC 미리보기';document.documentElement.dataset.handoffScreen=spec.id;
   if(new URLSearchParams(location.search).get('capture')==='full')document.documentElement.classList.add('capture-full');
   const ready=()=>parent.postMessage({type:'handoff-ready',id:spec.id,height:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight),overlay:!!spec.overlay},location.origin);
   document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(ready)));
 }};
}
