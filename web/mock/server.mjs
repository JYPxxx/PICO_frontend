// 개발용 가짜 백엔드(목 서버). 백엔드 없이 프론트 흐름을 확인할 때만 쓴다.
// API 명세(openapi.json)의 요청 형식·권한·상태 전환 규칙과 success/data/message 응답을 흉내 낸다.
// 데이터는 메모리에만 있어 껐다 켜면 초기화된다.
// 응답 필드명은 명세에 없어서 프론트(src/discovery/agent.ts, src/transactions/model.ts)가 먼저 찾는 이름으로 맞췄다. 실제 백엔드와 다를 수 있다.
// 명세와 다른 점: 요청의 정책 검토(관리자)는 자동 승인, 가상계좌 입금은 '입금 확인'을 누르면 된 것으로, 매칭권 PG 결제는 아무 키나 승인한다.
// 실행: npm run dev:mock (이 서버 + vite --mode mock)
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 8090);
const DELAY_MS = 250; // 불러오는 중 화면이 보이도록 약간 늦게 응답한다.
const PASSWORD = 'password1234';
const now = () => new Date().toISOString().slice(0, 19); // UTC LocalDateTime

// ── 기본 데이터 ─────────────────────────────────────────────
const policies = [
  { id: 1, type: 'TERMS', version: 'mock-v1', contentUrl: 'https://example.com/terms', effectiveAt: '2026-09-01T00:00:00' },
  { id: 2, type: 'PRIVACY', version: 'mock-v1', contentUrl: 'https://example.com/privacy', effectiveAt: '2026-09-01T00:00:00' },
  { id: 3, type: 'CONTACT_SHARING', version: 'mock-v1', contentUrl: 'https://example.com/contact-sharing', effectiveAt: '2026-09-01T00:00:00' },
];

const categoryCodes = { 콘서트: 'CONCERT', 뮤지컬: 'MUSICAL', 팬미팅: 'OTHER', 페스티벌: 'OTHER' };
const prototypeAgents = JSON.parse(readFileSync(new URL('./agents.json', import.meta.url), 'utf8'));

const platforms = [...new Set(prototypeAgents.flatMap((a) => a.sites))].map((name, i) => ({
  id: i + 1,
  code: name.toUpperCase().replace(/[^A-Z0-9]/g, '') || `P${i + 1}`,
  name,
}));
const platformByName = new Map(platforms.map((p) => [p.name, p]));

// 프로토타입의 가능 날짜(일)를 이번 달·다음 달의 앞으로 올 날짜로 바꾼다.
function upcoming(day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 명세상 agentId는 도우미의 users.id다. 도우미 계정은 101번부터.
const agents = prototypeAgents.map((a, i) => ({
  agentId: 101 + i,
  activityName: a.name,
  headline: a.intro,
  bio: a.detail ?? '',
  primaryCategory: categoryCodes[a.category] ?? 'OTHER',
  categories: [...new Set([categoryCodes[a.category] ?? 'OTHER', 'CONCERT', 'MUSICAL', 'OTHER'])],
  contactHoursNote: '매일 10:00 ~ 22:00',
  careerDescription: a.career,
  upfrontFeeKrw: a.fee,
  successFeeMin: 10000,
  successFeeMax: 50000,
  platforms: a.sites.map((s) => platformByName.get(s)),
  averageRating: a.rating,
  reviewCount: a.reviews,
  completedCount: a.trades,
  successRate: a.success,
  averageResponseMinutes: a.reply,
  identityVerified: true,
  payoutAccountVerified: a.verified > 1,
  availableDates: a.dates.map(upcoming).sort(),
}));

// 프로토타입과 같은 규칙으로 후기를 만든다(평균 별점과 후기 수가 프로필과 맞도록).
const comments = [
  '희망 조건을 꼼꼼히 확인하고 진행 과정을 바로 알려주셔서 편하게 기다렸어요.',
  '공연장 좌석을 잘 알고 계셔서 도움이 됐어요. 다음에도 함께하고 싶어요.',
  '안내가 친절하고 진행 상황도 빠르게 알려주셨어요.',
  '요청한 내용을 잘 확인해 주셔서 안심하고 맡겼어요.',
];
const realReviews = []; // 목 서버에서 작성한 후기
function reviewsOf(a) {
  a.baseReviewCount ??= a.reviewCount ?? 0;
  a.baseRating ??= a.averageRating ?? 0;
  const low = Math.round((5 - a.baseRating) * a.baseReviewCount);
  const real = realReviews.filter((x) => x.agentId === a.agentId && x.status === 'VISIBLE').reverse();
  return [...real, ...Array.from({ length: a.baseReviewCount }, (_, i) => ({
    requestId: a.agentId * 1000 + i,
    requesterId: 900 + (i % 4),
    agentId: a.agentId,
    rating: i >= a.reviewCount - low ? 4 : 5,
    comment: comments[i % comments.length],
    imageUrl: null,
    status: 'VISIBLE',
    reviewedAt: new Date(Date.UTC(2026, 8, 12 - Math.floor(i / 3), 1)).toISOString().slice(0, 19),
  }))];
}
/** 실제 후기를 반영해 도우미의 후기 수·평균 별점을 다시 계산한다. */
function refreshRating(agentId) {
  const a = agents.find((x) => x.agentId === agentId);
  if (!a) return;
  const all = reviewsOf(a);
  a.reviewCount = all.length;
  a.averageRating = all.length ? Math.round((all.reduce((n, x) => n + x.rating, 0) / all.length) * 10) / 10 : 0;
}

// 예시 계정: 이용자 demo@pico.test, 도우미 agent1~6@pico.test (비밀번호 모두 password1234)
const users = [
  { userId: 1, email: 'demo@pico.test', password: PASSWORD, nickname: '피코체험' },
  ...agents.map((a, i) => ({ userId: a.agentId, email: `agent${i + 1}@pico.test`, password: PASSWORD, nickname: a.activityName })),
];
const contacts = new Map(agents.map((a, i) => [a.agentId, [{ contactId: a.agentId, kind: 'PHONE', value: `010-0000-00${String(i + 1).padStart(2, '0')}`, primary: true }]]));
const favorites = new Map(); // userId → Set<agentId>
const tokens = new Map(); // accessToken → userId
const refreshTokens = new Map(); // refreshToken → userId
const passes = new Map(agents.map((a) => [a.agentId, 3])); // 도우미별 매칭권 잔액(체험용 3장)
// 본인·계좌 인증, 공개 설정. 예시 도우미는 인증·공개가 끝난 상태로 시작한다.
const identity = new Map(agents.map((a) => [a.agentId, now()]));
const payout = new Map(agents.map((a, i) => [a.agentId, { masked: `KB국민은행 ****${String(1000 + i)}`, verifiedAt: now() }]));
const visibility = new Map(agents.map((a) => [a.agentId, { listed: true, acceptsRequests: true }]));
// 예시 도우미의 가능 날짜를 명세 형식(UTC 구간)으로도 넣어 둔다. 날짜 하루 = 한국 시각 00:00~24:00.
const dayInterval = (date) => ({ startsAt: new Date(Date.parse(`${date}T00:00:00Z`) - 9 * 3600e3).toISOString().slice(0, 19), endsAt: new Date(Date.parse(`${date}T00:00:00Z`) + 15 * 3600e3).toISOString().slice(0, 19) });
const availability = new Map(agents.map((a) => [a.agentId, a.availableDates.map(dayInterval)]));
const files = new Map(); // 목 업로드 저장소: storageKey → { type, data }
const avatars = new Map(); // userId → storageKey
const emailTokens = new Map(); // token → { userId, email }
const resetTokens = new Map(); // token → { userId, at }
const passUsages = [];
const payouts = [];
const profileFields = ['activityName', 'headline', 'bio', 'primaryCategory', 'categories', 'contactHoursNote', 'careerDescription', 'careerStartedOn', 'upfrontFeeKrw', 'successFeeMin', 'successFeeMax', 'platformIds'];
// 도우미 프로필 버전. 예시 도우미는 승인된 버전 1개씩.
const profiles = agents.map((a) => ({
  profileId: a.agentId * 10,
  userId: a.agentId,
  version: 1,
  status: 'APPROVED',
  ...Object.fromEntries(profileFields.map((k) => [k, a[k] ?? null])),
  platformIds: a.platforms.map((x) => x.id),
  imageKey: null,
  businessNumber: null,
  reviewNote: null,
  submittedAt: now(),
  reviewedAt: now(),
}));
const profileEvidence = agents.map((a) => ({ evidenceId: a.agentId * 100, profileId: a.agentId * 10, purpose: 'CAREER', caseNumber: 1, description: '예시 경력', fileCount: 1, status: 'APPROVED', submittedAt: now() }));
const purchases = [];
const requests = [];
const agreements = [];
const changeRequests = [];
const payments = [];
const evidences = [];
const notifications = [];
let seq = 1000;
const nextId = () => ++seq;

function issueTokens(userId) {
  const n = nextId();
  const accessToken = `mock-access-${userId}-${n}`;
  const refreshToken = `mock-refresh-${userId}-${n}`;
  tokens.set(accessToken, userId);
  refreshTokens.set(refreshToken, userId);
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 3600, userId };
}

// ── 응답 도우미 ─────────────────────────────────────────────
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const ok = (data, status = 200) => ({ status, body: { success: true, data, message: null } });
const fail = (status, message) => {
  throw new HttpError(status, message);
};

function requireUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const userId = tokens.get(token);
  if (!userId) fail(401, '로그인이 필요해요.');
  return users.find((u) => u.userId === userId);
}

function findAgent(id) {
  const agent = agents.find((a) => a.agentId === Number(id));
  if (!agent) fail(404, '도우미를 찾을 수 없어요.');
  return agent;
}

function required(body, ...keys) {
  for (const k of keys) if (body?.[k] === undefined || body?.[k] === null || body?.[k] === '') fail(400, `${k}은(는) 필수예요.`);
}

function notify(userId, kind, requestId, title, body) {
  notifications.push({ notificationId: nextId(), recipientUserId: userId, kind, requestId, title, body, readAt: null, createdAt: now() });
}

// ── 도우미 검색(GET /api/agents 명세의 파라미터) ────────────────
function searchAgents(params) {
  const all = (key) => params.getAll(key).flatMap((v) => v.split(',')).filter(Boolean);
  const number = (key) => (params.has(key) ? Number(params.get(key)) : undefined);
  const q = (params.get('q') || '').trim().toLowerCase();
  const name = (params.get('name') || '').trim().toLowerCase();
  const category = params.get('category');
  const platformIds = [...all('platformIds'), ...all('platformId')].map(Number);
  const dates = all('availableDates');
  const [upMin, upMax, ratingMin, successMin, completedMin] = ['upfrontMin', 'upfrontMax', 'ratingMin', 'successRateMin', 'completedMin'].map(number);

  const words = q.split(/\s+/).filter(Boolean);
  let list = agents.filter((a) => visibility.get(a.agentId)?.listed !== false).filter((a) => {
    const text = [a.activityName, a.headline, a.bio, a.careerDescription, ...a.platforms.map((p) => p.name)].join(' ').toLowerCase();
    return (
      words.every((w) => text.includes(w)) &&
      (!name || a.activityName.toLowerCase().includes(name)) &&
      (!category || a.categories.includes(category)) &&
      (!platformIds.length || a.platforms.some((p) => platformIds.includes(p.id))) &&
      (upMin === undefined || a.upfrontFeeKrw >= upMin) &&
      (upMax === undefined || a.upfrontFeeKrw <= upMax) &&
      (ratingMin === undefined || a.averageRating >= ratingMin) &&
      (successMin === undefined || a.successRate >= successMin) &&
      (completedMin === undefined || a.completedCount >= completedMin) &&
      (!dates.length || dates.some((d) => a.availableDates.includes(d)))
    );
  });

  const sorters = {
    RECOMMENDED: (a, b) => b.averageRating - a.averageRating || b.completedCount - a.completedCount,
    NEWEST: (a, b) => b.agentId - a.agentId,
    RATING: (a, b) => b.averageRating - a.averageRating,
    PRICE_ASC: (a, b) => a.upfrontFeeKrw - b.upfrontFeeKrw,
    SUCCESS_RATE: (a, b) => b.successRate - a.successRate,
    RESPONSE_FASTEST: (a, b) => a.averageResponseMinutes - b.averageResponseMinutes,
    COMPLETED: (a, b) => b.completedCount - a.completedCount,
  };
  const sort = params.get('sort') || 'RECOMMENDED';
  if (!sorters[sort]) fail(400, `지원하지 않는 정렬이에요: ${sort}`);
  list = [...list].sort(sorters[sort]);

  const page = number('page') ?? 0;
  const size = number('size') ?? 20;
  if (size < 1 || size > 100) fail(400, 'size는 1~100이어야 해요.');
  return { items: list.slice(page * size, page * size + size), totalCount: list.length, page, size };
}

// ── 도우미 프로필 ────────────────────────────────────────────
const AUTO_APPROVE_MS = Number(process.env.MOCK_APPROVE_MS || 5000);
const imageUrl = (key) => (key ? `/api/mock-upload/${encodeURIComponent(key)}` : null);

function profileView(x) {
  const { userId, imageKey, businessNumber, ...rest } = x;
  const v = visibility.get(x.userId);
  return {
    ...rest,
    platforms: (x.platformIds ?? []).map((id) => platforms.find((pl) => pl.id === id)).filter(Boolean),
    imageUrl: imageUrl(imageKey),
    hasBusinessNumber: !!businessNumber,
    listed: v?.listed ?? true,
    acceptsRequests: v?.acceptsRequests ?? true,
  };
}

/** 심사 승인: 이전 승인 버전을 내리고, 도우미 찾기 목록(agents)에 새 내용을 게시한다. */
function approveProfile(prof) {
  if (prof.status !== 'SUBMITTED') return;
  profiles.filter((x) => x.userId === prof.userId && x.status === 'APPROVED').forEach((x) => (x.status = 'SUPERSEDED'));
  Object.assign(prof, { status: 'APPROVED', reviewedAt: now() });
  if (!visibility.has(prof.userId)) visibility.set(prof.userId, { listed: true, acceptsRequests: true });
  const prev = agents.find((a) => a.agentId === prof.userId);
  const published = {
    averageRating: 0,
    reviewCount: 0,
    completedCount: 0,
    successRate: 0,
    averageResponseMinutes: null,
    availableDates: [],
    ...prev,
    agentId: prof.userId,
    ...Object.fromEntries(profileFields.map((k) => [k, prof[k]])),
    platforms: prof.platformIds.map((id) => platforms.find((pl) => pl.id === id)).filter(Boolean),
    profileImageUrl: imageUrl(prof.imageKey),
    identityVerified: identity.has(prof.userId),
    payoutAccountVerified: payout.has(prof.userId),
  };
  if (prev) Object.assign(prev, published);
  else agents.push(published);
  passes.set(prof.userId, passes.get(prof.userId) ?? 3); // 체험용 매칭권
  notify(prof.userId, 'APPLICATION', null, '도우미 신청이 승인됐어요', '이제 공개 프로필로 요청을 받을 수 있어요.');
  console.log(`[mock] 프로필 ${prof.profileId} 자동 승인 → 도우미 찾기에 게시`);
}

/** 목: 안전거래 결제가 있는 거래의 착수비·수고비를 바로 지급 완료로 기록한다. */
function recordPayout(r, component) {
  const a = latestAgreementOf(r.requestId);
  const pay = a && payments.find((x) => x.agreementId === a.agreementId && x.status === 'PAID');
  if (!pay || payouts.some((x) => x.requestId === r.requestId && x.component === component)) return;
  const amountKrw = component === 'UPFRONT' ? a.upfrontFeeKrw : a.successFeeKrw;
  payouts.push({ payoutId: nextId(), userId: r.agentUserId, paymentId: pay.paymentId, requestId: r.requestId, evidenceId: null, component, amountKrw, status: 'SUCCEEDED', requestedAt: now(), completedAt: now() });
}

// ── 거래 ───────────────────────────────────────────────────
const requestFields = [
  'targetName', 'serviceCategory', 'applicationOpenDate', 'applicationOpenTime', 'scheduledUseDate', 'scheduledUseTime', 'platformId', 'otherPlatformName',
  'locationNote', 'requestedQuantity', 'requirements', 'successConditions', 'purchaseBudgetMax', 'agencyBudgetMax', 'additionalNote', 'contactDeadlineRule',
  'officialApplicationUrl', 'applicationRound', 'eligibilityNote', 'expiresAt',
];

function validateRequest(body) {
  required(body, 'agentId', 'targetName', 'serviceCategory', 'applicationOpenDate', 'requirements', 'successConditions', 'expiresAt', 'contactSharingDocumentId');
  if (!policies.some((p) => p.id === body.contactSharingDocumentId && p.type === 'CONTACT_SHARING')) fail(400, '유효한 연락처 공유 동의 문서가 아니에요.');
  if (!body.platformId && !body.otherPlatformName) fail(400, '예매처를 선택해 주세요.');
  if (body.platformId && !platforms.some((p) => p.id === body.platformId)) fail(400, '예매처를 찾을 수 없어요.');
  if (new Date(body.expiresAt + 'Z') <= new Date()) fail(400, '응답 기한은 지금보다 뒤여야 해요.');
}

function findRequest(id, user) {
  const r = requests.find((x) => x.requestId === Number(id));
  // 명세: 타인·없는 요청은 404
  if (!r || (r.requesterUserId !== user.userId && r.agentUserId !== user.userId)) fail(404, '요청을 찾을 수 없어요.');
  return r;
}
const asRequester = (r, u) => r.requesterUserId === u.userId || fail(403, '이용자만 할 수 있어요.');
const asAgent = (r, u) => r.agentUserId === u.userId || fail(403, '도우미만 할 수 있어요.');
const inStatus = (r, ...s) => s.includes(r.status) || fail(409, `지금 상태(${r.status})에서는 할 수 없어요.`);

function requestView(r) {
  const agent = agents.find((a) => a.agentId === r.agentUserId);
  const requester = users.find((u) => u.userId === r.requesterUserId);
  const agreement = latestAgreementOf(r.requestId);
  const payment = agreement && payments.find((p) => p.agreementId === agreement.agreementId);
  return {
    ...r,
    agentActivityName: agent?.activityName,
    requesterNickname: requester?.nickname,
    platformName: platforms.find((p) => p.id === r.platformId)?.name ?? null,
    paymentId: payment?.paymentId ?? null,
    paymentStatus: payment?.status ?? null,
  };
}

const agreementsOf = (requestId) => agreements.filter((a) => a.requestId === requestId);
const latestAgreementOf = (requestId) => agreementsOf(requestId).sort((a, b) => b.version - a.version)[0];
const agreementView = (a) => {
  const p = payments.find((x) => x.agreementId === a.agreementId);
  return { ...a, paymentId: p?.paymentId ?? null, paymentStatus: p?.status ?? null };
};

function paymentView(p) {
  const { virtualAccount, ...rest } = p;
  return rest;
}

// 업로드 URL 발급: 실제 저장소 대신 이 서버의 /api/mock-upload/{key}로 PUT 한다.
const uploads = new Set();
function uploadTarget(user, purpose, body) {
  required(body, 'originalName', 'mimeType');
  if (body.sizeBytes > 20 * 1024 * 1024) fail(400, '파일은 20MB까지 올릴 수 있어요.');
  const storageKey = `uploads/${purpose.toLowerCase()}/user-${user.userId}/${nextId()}`;
  return {
    storageKey,
    uploadUrl: `/api/mock-upload/${encodeURIComponent(storageKey)}`,
    method: 'PUT',
    requiredHeaders: { 'Content-Type': body.mimeType },
    expiresAt: new Date(Date.now() + 5 * 60e3).toISOString().slice(0, 19),
  };
}

// ── 라우팅 ─────────────────────────────────────────────────
async function handle(req, url, body) {
  const route = `${req.method} ${url.pathname}`;
  const { method } = req;
  const p = url.pathname;
  let m;

  if (route === 'GET /api/health') return ok({ status: 'UP', mock: true });
  if (route === 'GET /api/policies') return ok(policies);
  if (route === 'GET /api/platforms') return ok(platforms);

  // 인증
  if (route === 'POST /api/auth/register') {
    const { email = '', password = '', nickname = '', termsDocumentId, privacyDocumentId } = body ?? {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) fail(400, '이메일 형식을 확인해 주세요.');
    if (password.length < 10 || password.length > 72) fail(400, '비밀번호는 10자 이상 72자 이하여야 해요.');
    if (!nickname.trim() || nickname.length > 50) fail(400, '닉네임은 1~50자여야 해요.');
    const doc = (id, type) => policies.find((x) => x.id === id && x.type === type);
    if (!doc(termsDocumentId, 'TERMS') || !doc(privacyDocumentId, 'PRIVACY')) fail(400, '유효한 약관 문서가 아니에요.');
    if (users.some((u) => u.email === email)) fail(409, '이미 가입한 이메일이에요.');
    const user = { userId: nextId(), email, password, nickname };
    users.push(user);
    return ok({ userId: user.userId, email, nickname }, 201);
  }
  if (route === 'POST /api/auth/login') {
    const user = users.find((u) => u.email === body?.email && u.password === body?.password);
    if (!user) fail(401, '이메일 또는 비밀번호가 맞지 않아요.');
    return ok(issueTokens(user.userId));
  }
  if (route === 'POST /api/auth/refresh') {
    const userId = refreshTokens.get(body?.refreshToken);
    if (!userId) fail(401, '다시 로그인해 주세요.');
    refreshTokens.delete(body.refreshToken); // 이전 refreshToken은 재사용할 수 없다.
    return ok(issueTokens(userId));
  }
  if (route === 'POST /api/auth/logout') {
    tokens.delete((req.headers.authorization || '').replace(/^Bearer /, ''));
    return ok(null);
  }

  if (route === 'POST /api/auth/password-reset/request') {
    required(body, 'email');
    const user = users.find((x) => x.email === body.email);
    // 명세: 가입 여부를 노출하지 않고 같은 응답을 준다.
    if (user) {
      const token = `mock-reset-${nextId()}-${Math.random().toString(36).slice(2)}${'x'.repeat(20)}`;
      resetTokens.set(token, { userId: user.userId, at: Date.now() });
      console.log(`[mock] ✉ ${user.email} 비밀번호 재설정 링크: http://localhost:5173/reset-password?token=${token}`);
    }
    return ok(null);
  }
  if (route === 'POST /api/auth/password-reset/confirm') {
    required(body, 'token', 'newPassword');
    const t = resetTokens.get(body.token);
    if (!t || Date.now() - t.at > 30 * 60e3) fail(400, '만료되었거나 올바르지 않은 재설정 링크예요.');
    if (body.newPassword.length < 10 || body.newPassword.length > 72) fail(400, '비밀번호는 10자 이상 72자 이하여야 해요.');
    resetTokens.delete(body.token);
    const user = users.find((x) => x.userId === t.userId) ?? fail(404, '회원을 찾을 수 없어요.');
    user.password = body.newPassword;
    for (const [k, id] of tokens) if (id === user.userId) tokens.delete(k); // 모든 세션 폐기
    return ok(null);
  }
  if (route === 'POST /api/auth/email-verification/confirm') {
    required(body, 'token');
    const t = emailTokens.get(body.token);
    if (!t || Date.now() - t.at > 15 * 60e3) fail(400, '만료되었거나 올바르지 않은 인증 링크예요.');
    emailTokens.delete(body.token);
    const user = users.find((x) => x.userId === t.userId) ?? fail(404, '회원을 찾을 수 없어요.');
    const changed = user.email !== t.email;
    Object.assign(user, { email: t.email, emailVerifiedAt: now() });
    if (changed) for (const [k, id] of tokens) if (id === user.userId) tokens.delete(k); // 이메일 변경 시 세션 폐기
    return ok(null);
  }

  // 공개 도우미
  if (route === 'GET /api/agents') return ok(searchAgents(url.searchParams));
  if (method === 'GET' && (m = p.match(/^\/api\/agents\/(\d+)$/))) return ok(findAgent(m[1]));
  if (method === 'GET' && (m = p.match(/^\/api\/agents\/(\d+)\/reviews$/))) {
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 20);
    return ok(reviewsOf(findAgent(m[1])).slice(page * size, page * size + size));
  }

  // 여기부터 로그인 필요
  if (p.startsWith('/api/mock-upload/')) {
    const key = decodeURIComponent(p.slice('/api/mock-upload/'.length));
    if (method === 'PUT') {
      uploads.add(key);
      files.set(key, { type: req.headers['content-type'] || 'application/octet-stream', data: req.rawBody });
      return { status: 200, body: '' };
    }
    const f = files.get(key) ?? fail(404, '파일이 없어요.');
    return { status: 200, file: f };
  }
  const u = requireUser(req);

  if (route === 'GET /api/me') {
    const approved = profiles.some((x) => x.userId === u.userId && x.status === 'APPROVED');
    return ok({ userId: u.userId, email: u.email, nickname: u.nickname, preferredMode: u.preferredMode ?? (approved ? 'AGENT' : 'REQUESTER'), agentApproved: approved, identityVerified: identity.has(u.userId), emailVerified: !!u.emailVerifiedAt });
  }
  if (route === 'DELETE /api/me') {
    required(body, 'password');
    if (body.password !== u.password) fail(400, '비밀번호가 맞지 않아요.');
    if (requests.some((r) => (r.requesterUserId === u.userId || r.agentUserId === u.userId) && ['MATCHED', 'IN_PROGRESS', 'DISPUTED'].includes(r.status))) fail(409, '진행 중인 거래가 있어 탈퇴할 수 없어요.');
    users.splice(users.indexOf(u), 1);
    for (const [t, id] of tokens) if (id === u.userId) tokens.delete(t);
    return ok(null);
  }
  if (route === 'GET /api/me/avatar') return ok(avatars.has(u.userId) ? imageUrl(avatars.get(u.userId)) : null);
  if (route === 'PUT /api/me/avatar') {
    required(body, 'storageKey');
    if (!uploads.has(body.storageKey)) fail(400, '업로드되지 않은 파일이에요.');
    avatars.set(u.userId, body.storageKey);
    return ok(null);
  }
  if (route === 'PUT /api/me/password') {
    required(body, 'currentPassword', 'newPassword');
    if (body.currentPassword !== u.password) fail(400, '현재 비밀번호가 맞지 않아요.');
    if (body.newPassword.length < 10 || body.newPassword.length > 72) fail(400, '비밀번호는 10자 이상 72자 이하여야 해요.');
    u.password = body.newPassword;
    for (const [t, id] of tokens) if (id === u.userId) tokens.delete(t); // 모든 세션 폐기
    return ok(null);
  }
  if (route === 'POST /api/me/email-verification' || route === 'POST /api/me/email-change') {
    let email = u.email;
    if (route.endsWith('email-change')) {
      required(body, 'currentPassword', 'newEmail');
      if (body.currentPassword !== u.password) fail(400, '현재 비밀번호가 맞지 않아요.');
      if (users.some((x) => x.email === body.newEmail)) fail(409, '이미 사용 중인 이메일이에요.');
      email = body.newEmail;
    }
    const token = `mock-mail-${nextId()}`;
    emailTokens.set(token, { userId: u.userId, email, at: Date.now() });
    // 목: 메일 대신 콘솔에 인증 링크를 찍는다.
    console.log(`[mock] ✉ ${email} 인증 링크: http://localhost:5173/verify-email?token=${token}`);
    return ok(null);
  }
  if (route === 'PATCH /api/me') {
    required(body, 'nickname', 'preferredMode');
    if (!['REQUESTER', 'AGENT'].includes(body.preferredMode)) fail(400, '기본 모드를 확인해 주세요.');
    if (body.nickname.length > 50) fail(400, '닉네임은 50자까지예요.');
    Object.assign(u, { nickname: body.nickname, preferredMode: body.preferredMode });
    return ok({ userId: u.userId, email: u.email, nickname: u.nickname, preferredMode: u.preferredMode });
  }

  // 본인인증(목: 인증창 없이 세션 발급 → 검증하면 완료)
  if (route === 'GET /api/me/identity') {
    const at = identity.get(u.userId);
    return ok({ status: at ? 'VERIFIED' : 'UNVERIFIED', verified: !!at, verifiedAt: at ?? null });
  }
  if (route === 'POST /api/me/identity/verification-session') {
    if (identity.has(u.userId)) fail(409, '이미 본인인증을 마쳤어요.');
    return ok({ identityVerificationId: `mock-identity-${u.userId}-${nextId()}`, storeId: 'mock-store', channelKey: 'mock-channel' });
  }
  if (route === 'POST /api/me/identity/verify') {
    required(body, 'identityReference');
    if (!String(body.identityReference).startsWith(`mock-identity-${u.userId}-`)) fail(409, '다른 회원에게 발급된 인증이에요.');
    identity.set(u.userId, now());
    return ok({ status: 'VERIFIED', verified: true, verifiedAt: identity.get(u.userId) });
  }
  // 정산 계좌(목: 본인인증만 되어 있으면 8자리 이상 계좌를 통과)
  if (route === 'GET /api/me/payout-account') {
    const a = payout.get(u.userId);
    return ok({ verified: !!a, maskedAccount: a?.masked ?? null, verifiedAt: a?.verifiedAt ?? null, payoutRegistered: !!a });
  }
  if (route === 'PUT /api/me/payout-account') {
    required(body, 'bankCode', 'accountNumber');
    if (!identity.has(u.userId)) fail(409, '본인인증을 먼저 완료해 주세요.');
    if (!/^[0-9]{8,20}$/.test(body.accountNumber)) fail(400, '계좌번호를 확인해 주세요.');
    payout.set(u.userId, { masked: `${body.bankCode} ****${body.accountNumber.slice(-4)}`, verifiedAt: now() });
    const a = payout.get(u.userId);
    return ok({ verified: true, maskedAccount: a.masked, verifiedAt: a.verifiedAt, payoutRegistered: true });
  }

  // 도우미 프로필(버전)
  if (route === 'GET /api/me/agent/profiles') return ok(profiles.filter((x) => x.userId === u.userId).sort((a, b) => b.version - a.version).map(profileView));
  if (route === 'PUT /api/me/agent/profile') {
    required(body, 'activityName', 'headline', 'bio', 'primaryCategory');
    if (!body.categories?.length || !body.platformIds?.length) fail(400, '공연 분야와 예매처를 하나 이상 선택해 주세요.');
    if (!body.categories.includes(body.primaryCategory)) fail(400, '주 분야는 선택한 공연 분야 중 하나여야 해요.');
    if ((body.successFeeMax ?? 0) < (body.successFeeMin ?? 0)) fail(400, '수고비 최대 금액은 최소 금액 이상이어야 해요.');
    const mine = profiles.filter((x) => x.userId === u.userId).sort((a, b) => b.version - a.version);
    if (mine[0]?.status === 'SUBMITTED') fail(409, '심사 중에는 프로필을 고칠 수 없어요.');
    let draft = mine[0]?.status === 'DRAFT' ? mine[0] : null;
    if (!draft) {
      draft = { profileId: nextId(), userId: u.userId, version: (mine[0]?.version ?? 0) + 1, status: 'DRAFT', imageKey: mine[0]?.imageKey ?? null, businessNumber: null, reviewNote: null, submittedAt: null };
      profiles.push(draft);
      // 목: 이전 버전의 경력 증빙을 새 초안으로 이어 쓴다.
      if (mine[0]) profileEvidence.filter((e) => e.profileId === mine[0].profileId).forEach((e) => profileEvidence.push({ ...e, evidenceId: nextId(), profileId: draft.profileId }));
    }
    profileFields.forEach((k) => (draft[k] = body[k] ?? null));
    return ok(profileView(draft));
  }
  if ((m = p.match(/^\/api\/me\/agent\/profiles\/(\d+)(\/.*)?$/))) {
    const prof = profiles.find((x) => x.profileId === Number(m[1]) && x.userId === u.userId) ?? fail(404, '프로필을 찾을 수 없어요.');
    const sub = `${method} ${m[2] ?? ''}`;
    let em;
    if (sub === 'GET ') return ok(profileView(prof));
    if (sub === 'GET /evidence') return ok(profileEvidence.filter((e) => e.profileId === prof.profileId));
    if (prof.status !== 'DRAFT') fail(409, '작성 중인 초안만 고칠 수 있어요.');
    if (sub === 'PUT /image') {
      required(body, 'storageKey');
      if (!uploads.has(body.storageKey)) fail(400, '업로드되지 않은 파일이에요.');
      prof.imageKey = body.storageKey;
      return ok(null);
    }
    if (sub === 'PUT /business') {
      if (body?.registrationNumber && !/^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$/.test(body.registrationNumber)) fail(400, '사업자 등록번호 형식을 확인해 주세요.');
      prof.businessNumber = body?.registrationNumber || null;
      return ok(null);
    }
    if ((em = sub.match(/^POST \/evidence\/(CAREER|ACTIVITY|BUSINESS)\/(\d+)$/))) {
      const caseNumber = Number(em[2]);
      if (em[1] === 'CAREER' ? caseNumber < 1 || caseNumber > 3 : caseNumber !== 1) fail(400, '사례 번호를 확인해 주세요.');
      required(body, 'storageKeys');
      if (!body.storageKeys.length || body.storageKeys.some((k) => !uploads.has(k))) fail(400, '업로드한 파일을 첨부해 주세요.');
      const rest = profileEvidence.filter((e) => !(e.profileId === prof.profileId && e.purpose === em[1] && e.caseNumber === caseNumber));
      profileEvidence.length = 0;
      profileEvidence.push(...rest, { evidenceId: nextId(), profileId: prof.profileId, purpose: em[1], caseNumber, description: body.description ?? null, fileCount: body.storageKeys.length, status: 'SUBMITTED', submittedAt: now() });
      return ok(profileEvidence.at(-1), 201);
    }
    if (sub === 'POST /submit') {
      if (!identity.has(u.userId) || !payout.has(u.userId)) fail(409, '본인인증과 정산 계좌 확인이 필요해요.');
      if (!profileEvidence.some((e) => e.profileId === prof.profileId && e.purpose === 'CAREER')) fail(409, '경력 증빙을 한 건 이상 제출해 주세요.');
      Object.assign(prof, { status: 'SUBMITTED', submittedAt: now() });
      // 목: 관리자 심사 대신 몇 초 뒤 자동 승인한다.
      setTimeout(() => approveProfile(prof), AUTO_APPROVE_MS);
      return ok(profileView(prof));
    }
    fail(501, `목 서버에 없는 API예요: ${route}`);
  }
  if (route === 'PUT /api/me/agent/visibility') {
    if (!profiles.some((x) => x.userId === u.userId && x.status === 'APPROVED')) fail(409, '승인된 도우미만 설정할 수 있어요.');
    visibility.set(u.userId, { ...(visibility.get(u.userId) ?? { listed: true, acceptsRequests: true }), ...body });
    return ok(null);
  }
  if (route === 'GET /api/me/agent/availability') return ok(availability.get(u.userId) ?? []);
  if (route === 'PUT /api/me/agent/availability') {
    const intervals = body?.intervals ?? [];
    if (intervals.length > 100) fail(400, '구간은 100개까지 저장할 수 있어요.');
    for (const it of intervals) if (!it.startsAt || !it.endsAt || new Date(it.startsAt + 'Z') >= new Date(it.endsAt + 'Z')) fail(400, '시작 시각이 끝 시각보다 앞서야 해요.');
    availability.set(u.userId, intervals);
    const published = agents.find((a) => a.agentId === u.userId);
    if (published) {
      const KST = 9 * 3600e3;
      const dates = new Set();
      for (const it of intervals) {
        const e = Date.parse(it.endsAt + 'Z');
        for (let t = Date.parse(new Date(Date.parse(it.startsAt + 'Z') + KST).toISOString().slice(0, 10) + 'T00:00:00Z') - KST; t < e; t += 24 * 3600e3) dates.add(new Date(t + KST).toISOString().slice(0, 10));
      }
      published.availableDates = [...dates].sort();
    }
    return ok(null);
  }
  if (route === 'GET /api/me/contacts') return ok(contacts.get(u.userId) ?? []);
  if (method === 'DELETE' && (m = p.match(/^\/api\/me\/contacts\/(\d+)$/))) {
    const list = contacts.get(u.userId) ?? [];
    if (!list.some((c) => c.contactId === Number(m[1]))) fail(404, '연락처를 찾을 수 없어요.');
    contacts.set(u.userId, list.filter((c) => c.contactId !== Number(m[1])));
    return ok(null);
  }
  if (route === 'PUT /api/me/contacts') {
    required(body, 'kind', 'value');
    const list = (contacts.get(u.userId) ?? []).filter((c) => c.kind !== body.kind);
    if (body.primary) list.forEach((c) => (c.primary = false));
    list.push({ contactId: nextId(), kind: body.kind, value: body.value, primary: body.primary ?? list.length === 0 });
    contacts.set(u.userId, list);
    return ok(null);
  }

  // 좋아요
  if (route === 'GET /api/me/favorites') return ok([...(favorites.get(u.userId) ?? [])].map(findAgent));
  if ((m = p.match(/^\/api\/me\/favorites\/(\d+)$/)) && (method === 'PUT' || method === 'DELETE')) {
    const agent = findAgent(m[1]);
    const set = favorites.get(u.userId) ?? new Set();
    favorites.set(u.userId, set);
    if (method === 'PUT') set.add(agent.agentId);
    else set.delete(agent.agentId);
    return ok(null);
  }

  // 알림
  if (route === 'GET /api/notifications') {
    return ok(notifications.filter((n) => n.recipientUserId === u.userId).sort((a, b) => b.notificationId - a.notificationId).map(({ recipientUserId, ...n }) => n));
  }
  if (route === 'PATCH /api/notifications/read-all') {
    notifications.filter((n) => n.recipientUserId === u.userId && !n.readAt).forEach((n) => (n.readAt = now()));
    return ok(null);
  }
  if (method === 'GET' && (m = p.match(/^\/api\/notifications\/(\d+)$/))) {
    const n = notifications.find((x) => x.notificationId === Number(m[1]) && x.recipientUserId === u.userId) ?? fail(404, '알림을 찾을 수 없어요.');
    n.readAt ??= now();
    const { recipientUserId, ...view } = n;
    return ok(view);
  }

  // 매칭권
  if (route === 'GET /api/matching-passes/usages') return ok(passUsages.filter((x) => x.userId === u.userId).map(({ userId, ...x }) => x).reverse());
  if (route === 'GET /api/me/payouts') return ok(payouts.filter((x) => x.userId === u.userId).map(({ userId, ...x }) => x).reverse());
  if (route === 'GET /api/matching-passes/balance') return ok({ remainingUnits: passes.get(u.userId) ?? 0 });
  if (route === 'GET /api/matching-passes/purchases') return ok(purchases.filter((x) => x.userId === u.userId).map(({ userId, ...x }) => x).reverse());
  if (route === 'POST /api/matching-passes/purchases') {
    if (body?.purchasedUnits !== 10) fail(400, '판매 중인 수량은 10회예요.');
    const payment = { paymentId: nextId(), orderNumber: `PASS-${nextId()}`, method: null, status: 'PENDING', amountKrw: 5000, createdAt: now() };
    const purchase = { purchaseId: nextId(), userId: u.userId, purchasedUnits: 10, priceKrw: 5000, validDays: null, grantedAt: null, createdAt: now(), payment };
    purchases.push(purchase);
    const { userId, ...view } = purchase;
    return ok(view, 201);
  }
  if (method === 'POST' && (m = p.match(/^\/api\/matching-passes\/purchases\/(\d+)\/payment$/))) {
    const purchase = purchases.find((x) => x.purchaseId === Number(m[1]) && x.userId === u.userId) ?? fail(404, '구매를 찾을 수 없어요.');
    required(body, 'pgPaymentKey');
    if (!purchase.grantedAt) {
      purchase.grantedAt = now();
      Object.assign(purchase.payment, { status: 'PAID', method: 'CARD', paidAt: now() });
      passes.set(u.userId, (passes.get(u.userId) ?? 0) + purchase.purchasedUnits);
    }
    return ok(purchase.payment);
  }

  // 파일 업로드
  if (route === 'POST /api/files/upload-url') return ok(uploadTarget(u, body?.purpose || 'FILE', body));
  if (route === 'POST /api/evidence-files/upload-url') return ok(uploadTarget(u, body?.purpose || 'RESULT', body));

  // 요청 목록·생성
  if (route === 'GET /api/requests' || route === 'GET /api/requests/counts') {
    const role = (url.searchParams.get('role') || 'ALL').toUpperCase();
    const mine = requests.filter((r) => (role !== 'AGENT' && r.requesterUserId === u.userId) || (role !== 'REQUESTER' && r.agentUserId === u.userId));
    if (route.endsWith('counts')) return ok(Object.fromEntries(['PENDING', 'MATCHED', 'IN_PROGRESS', 'DISPUTED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].map((s) => [s, mine.filter((r) => r.status === s).length])));
    return ok(mine.sort((a, b) => b.requestId - a.requestId).map(requestView));
  }
  if (route === 'POST /api/requests') {
    validateRequest(body);
    const agent = findAgent(body.agentId);
    if (visibility.get(agent.agentId)?.acceptsRequests === false) fail(409, '지금은 새 요청을 받지 않는 도우미예요.');
    if (agent.agentId === u.userId) fail(400, '내게는 요청할 수 없어요.');
    if (!(contacts.get(u.userId) ?? []).length) fail(409, '연락처를 먼저 등록해 주세요.');
    const r = {
      requestId: nextId(),
      requesterUserId: u.userId,
      agentUserId: agent.agentId,
      status: 'PENDING',
      policyStatus: 'APPROVED', // 실제로는 관리자 정책 검토 대기(PENDING)로 생성된다.
      createdAt: now(),
      ...Object.fromEntries(requestFields.map((k) => [k, body[k] ?? null])),
    };
    requests.push(r);
    notify(agent.agentId, 'REQUEST', r.requestId, '새 요청이 도착했어요', r.targetName);
    return ok(requestView(r), 201);
  }

  // 요청 단건
  if (!(m = p.match(/^\/api\/requests\/(\d+)(\/.*)?$/))) fail(501, `목 서버에 없는 API예요: ${route}`);
  const r = findRequest(m[1], u);
  const sub = `${method} ${m[2] ?? ''}`;
  const other = r.requesterUserId === u.userId ? r.agentUserId : r.requesterUserId;
  let sm;

  if (sub === 'GET ') return ok(requestView(r));
  if (sub === 'PUT ') {
    asRequester(r, u);
    inStatus(r, 'PENDING');
    validateRequest(body);
    if (body.agentId !== r.agentUserId) fail(400, '대상 도우미는 바꿀 수 없어요.');
    requestFields.forEach((k) => (r[k] = body[k] ?? null));
    notify(r.agentUserId, 'REQUEST', r.requestId, '이용자가 요청을 수정했어요', r.targetName);
    return ok(requestView(r));
  }
  if (sub === 'POST /accept') {
    asAgent(r, u);
    inStatus(r, 'PENDING');
    if (r.policyStatus !== 'APPROVED') fail(409, '정책 검토가 끝나지 않은 요청이에요.');
    required(body, 'contactSharingDocumentId');
    if ((passes.get(u.userId) ?? 0) < 1) fail(409, '매칭권이 부족해요.');
    passes.set(u.userId, passes.get(u.userId) - 1);
    passUsages.push({ usageId: nextId(), userId: u.userId, purchaseId: 0, requestId: r.requestId, usedAt: now(), restoredAt: null, restored: false });
    Object.assign(r, { status: 'MATCHED', acceptedAt: now() });
    notify(other, 'MATCH', r.requestId, '도우미가 요청을 수락했어요', `${r.targetName} · 곧 최종 조건이 도착해요.`);
    return ok(requestView(r));
  }
  if (sub === 'POST /reject') {
    asAgent(r, u);
    inStatus(r, 'PENDING');
    required(body, 'reason');
    Object.assign(r, { status: 'REJECTED', rejectReason: body.reason });
    notify(other, 'REQUEST', r.requestId, '도우미가 요청을 거절했어요', body.reason);
    return ok(requestView(r));
  }
  if (sub === 'POST /cancel') {
    inStatus(r, 'PENDING', 'MATCHED');
    required(body, 'reason');
    if (r.status === 'MATCHED') {
      passes.set(r.agentUserId, (passes.get(r.agentUserId) ?? 0) + 1); // 수락 후 취소면 매칭권 복구
      passUsages.filter((x) => x.requestId === r.requestId && !x.restored).forEach((x) => Object.assign(x, { restored: true, restoredAt: now() }));
    }
    Object.assign(r, { status: 'CANCELLED', cancelReason: body.reason });
    notify(other, 'REQUEST', r.requestId, '요청이 취소되었어요', body.reason);
    return ok(requestView(r));
  }
  if (sub === 'GET /contacts') {
    if (['PENDING', 'REJECTED', 'EXPIRED'].includes(r.status)) fail(409, '수락한 뒤에 공개돼요.');
    const person = users.find((x) => x.userId === other);
    return ok({ counterpart: { userId: other, nickname: person?.nickname }, contacts: (contacts.get(other) ?? []).filter((c) => c.primary) });
  }
  if (sub === 'GET /history') return ok([]);

  // 최종 합의
  if (sub === 'GET /agreements') return ok(agreementsOf(r.requestId).sort((a, b) => b.version - a.version).map(agreementView));
  if (sub === 'POST /agreements') {
    asAgent(r, u);
    inStatus(r, 'MATCHED');
    required(body, 'requirements', 'successConditions', 'attemptRule', 'refundRule', 'contactDeadlineRule');
    const prev = latestAgreementOf(r.requestId);
    if (prev?.status === 'FINALIZED') fail(409, '이미 확정된 합의가 있어요.');
    if (prev) prev.status = 'SUPERSEDED';
    const safePayment = body.safePayment ?? true;
    const successFeeKrw = body.successFeeKrw ?? 0;
    const a = {
      agreementId: nextId(),
      requestId: r.requestId,
      version: (prev?.version ?? 0) + 1,
      status: 'PROPOSED',
      upfrontFeeKrw: body.upfrontFeeKrw ?? 0,
      successFeeKrw,
      safePayment,
      safetyFeeKrw: safePayment ? Math.max(1000, Math.ceil(successFeeKrw * 0.03)) : 0,
      requirements: body.requirements,
      successConditions: body.successConditions,
      attemptRule: body.attemptRule,
      refundRule: body.refundRule,
      contactDeadlineRule: body.contactDeadlineRule,
      createdAt: now(),
      finalizedAt: null,
    };
    agreements.push(a);
    notify(other, 'MATCH', r.requestId, `최종 조건이 도착했어요(${a.version}차)`, `${r.targetName} · 확인하고 확정해 주세요.`);
    return ok(agreementView(a), 201);
  }
  if ((sm = sub.match(/^(GET|POST) \/agreements\/(\d+)\/(accept|change-requests)$/))) {
    const a = agreementsOf(r.requestId).find((x) => x.agreementId === Number(sm[2])) ?? fail(404, '합의를 찾을 수 없어요.');
    if (sm[3] === 'change-requests' && sm[1] === 'GET') return ok(changeRequests.filter((c) => c.agreementId === a.agreementId));
    asRequester(r, u);
    inStatus(r, 'MATCHED');
    if (a.status !== 'PROPOSED') fail(409, '제안 상태의 합의가 아니에요.');
    if (sm[3] === 'change-requests') {
      required(body, 'reason');
      const c = { changeRequestId: nextId(), agreementId: a.agreementId, reason: body.reason, createdAt: now() };
      changeRequests.push(c);
      notify(other, 'MATCH', r.requestId, '이용자가 조건 수정을 요청했어요', body.reason);
      return ok(c, 201);
    }
    if (changeRequests.some((c) => c.agreementId === a.agreementId)) fail(409, '수정 요청한 합의는 확정할 수 없어요. 새 제안을 기다려 주세요.');
    Object.assign(a, { status: 'FINALIZED', finalizedAt: now() });
    notify(other, 'MATCH', r.requestId, '이용자가 최종 조건을 확정했어요', a.safePayment ? '입금이 확인되면 착수할 수 있어요.' : '직접 거래로 착수할 수 있어요.');
    return ok(agreementView(a));
  }

  // 착수·증빙·결과
  if (sub === 'POST /start') {
    asAgent(r, u);
    inStatus(r, 'MATCHED');
    const a = latestAgreementOf(r.requestId);
    if (a?.status !== 'FINALIZED') fail(409, '최종 조건이 확정되지 않았어요.');
    if (a.safePayment && payments.find((x) => x.agreementId === a.agreementId)?.status !== 'PAID') fail(409, '안전거래 결제가 완료되지 않았어요.');
    Object.assign(r, { status: 'IN_PROGRESS', startedAt: now() });
    notify(other, 'MATCH', r.requestId, '도우미가 예매를 시작했어요', r.targetName);
    return ok(requestView(r));
  }
  if (sub === 'GET /attempt-evidences') return ok(evidences.filter((e) => e.requestId === r.requestId).sort((a, b) => b.revision - a.revision));
  if (sub === 'POST /attempt-evidences') {
    asAgent(r, u);
    inStatus(r, 'MATCHED', 'IN_PROGRESS', 'DISPUTED');
    const list = evidences.filter((e) => e.requestId === r.requestId).sort((a, b) => b.revision - a.revision);
    if (list[0] && list[0].status !== 'REJECTED') fail(409, '최신 증빙이 반려된 경우에만 다시 제출할 수 있어요.');
    const e = {
      evidenceId: nextId(),
      requestId: r.requestId,
      reportId: null,
      purpose: 'ATTEMPT',
      revision: (list[0]?.revision ?? 0) + 1,
      status: 'SUBMITTED',
      description: body?.description ?? null,
      submittedAt: now(),
      reviewedAt: null,
      reviewNote: null,
      attachments: (body?.attachments ?? []).map((x) => ({ attachmentId: nextId(), sortOrder: x.sortOrder, scanStatus: 'CLEAN', url: null, expiresAt: null })),
    };
    evidences.push(e);
    notify(other, 'EVIDENCE', r.requestId, '예매 시도 증빙이 올라왔어요', '확인하고 승인해 주세요.');
    return ok(e, 201);
  }
  if (sub === 'POST /result') {
    asAgent(r, u);
    inStatus(r, 'IN_PROGRESS');
    required(body, 'result', 'note');
    if (r.agentResult) fail(409, '이미 결과를 제출했어요.');
    Object.assign(r, { agentResult: body.result, agentResultNote: body.note, agentActualOutcomeDescription: body.actualOutcomeDescription ?? null });
    notify(other, 'RESULT', r.requestId, '예매 결과가 등록됐어요', '결과를 확인해 주세요.');
    return ok(requestView(r));
  }
  if (sub === 'GET /result/evidence') return ok(r.resultEvidence ?? []);
  if (sub === 'POST /result/evidence') {
    asAgent(r, u);
    required(body, 'storageKeys');
    r.resultEvidence = [...(r.resultEvidence ?? []), { description: body.description ?? null, storageKeys: body.storageKeys, submittedAt: now() }];
    return ok(null);
  }
  if (sub === 'POST /result/confirm') {
    asRequester(r, u);
    inStatus(r, 'IN_PROGRESS');
    if (!r.agentResult) fail(409, '도우미가 아직 결과를 제출하지 않았어요.');
    required(body, 'result', 'note');
    const same = body.result === r.agentResult;
    Object.assign(r, { requesterResult: body.result, requesterResultNote: body.note, status: same ? 'COMPLETED' : 'DISPUTED' });
    if (same && body.result === 'SUCCESS') recordPayout(r, 'SUCCESS');
    notify(other, 'RESULT', r.requestId, same ? '이용자가 결과를 확인했어요' : '결과가 달라 운영팀이 확인해요', r.targetName);
    return ok(requestView(r));
  }
  // 후기: 실제 백엔드는 아직 501이다. 목 서버는 명세의 계약대로 동작한다.
  if (sub === 'GET /review') {
    const rv = realReviews.find((x) => x.requestId === r.requestId && x.status === 'VISIBLE') ?? fail(404, '후기가 없어요.');
    return ok(rv);
  }
  if (sub === 'POST /review') {
    asRequester(r, u);
    inStatus(r, 'COMPLETED');
    if (realReviews.some((x) => x.requestId === r.requestId && x.status !== 'DELETED')) fail(409, '이미 후기를 남긴 거래예요.');
    if (!(body?.rating >= 1 && body.rating <= 5)) fail(400, '별점은 1~5점이에요.');
    if ((body.comment ?? '').length > 400) fail(400, '후기는 400자까지 쓸 수 있어요.');
    if (body.imageKey && !uploads.has(body.imageKey)) fail(400, '업로드되지 않은 사진이에요.');
    const rv = { requestId: r.requestId, requesterId: u.userId, agentId: r.agentUserId, rating: body.rating, comment: body.comment || null, imageUrl: imageUrl(body.imageKey), status: 'VISIBLE', reviewedAt: now() };
    realReviews.push(rv);
    refreshRating(r.agentUserId);
    notify(r.agentUserId, 'REVIEW', r.requestId, '새 후기가 등록됐어요', `${'★'.repeat(rv.rating)} ${rv.comment ?? ''}`);
    return ok(rv, 201);
  }
  if (sub === 'DELETE /review') {
    asRequester(r, u);
    const rv = realReviews.find((x) => x.requestId === r.requestId && x.status === 'VISIBLE') ?? fail(404, '후기가 없어요.');
    rv.status = 'DELETED';
    refreshRating(r.agentUserId);
    return ok(null);
  }

  fail(501, `목 서버에 없는 API예요: ${route}`);
}

// 결제·증빙 승인처럼 요청 id가 경로 앞에 없는 API
async function handleOther(req, url, body) {
  const { method } = req;
  const p = url.pathname;
  let m;
  if (method === 'POST' && (m = p.match(/^\/api\/agreements\/(\d+)\/safe-payment$/))) {
    const u = requireUser(req);
    const a = agreements.find((x) => x.agreementId === Number(m[1])) ?? fail(404, '합의를 찾을 수 없어요.');
    const r = requests.find((x) => x.requestId === a.requestId);
    if (r.requesterUserId !== u.userId) fail(404, '합의를 찾을 수 없어요.');
    if (a.status !== 'FINALIZED' || r.status !== 'MATCHED') fail(409, '확정된 합의만 결제할 수 있어요.');
    if (!a.safePayment) fail(409, '직접 거래 합의는 안전거래 결제가 없어요.');
    const existing = payments.find((x) => x.agreementId === a.agreementId);
    if (existing?.status === 'PAID') fail(409, '이미 결제한 합의예요.');
    if (existing) return ok(paymentView(existing)); // 명세: 활성 주문이 있으면 기존 주문을 200으로
    const amountKrw = a.upfrontFeeKrw + a.successFeeKrw + a.safetyFeeKrw;
    const pay = {
      paymentId: nextId(),
      agreementId: a.agreementId,
      passPurchaseId: null,
      orderNumber: `ESC-${nextId()}`,
      method: 'VIRTUAL_ACCOUNT',
      status: 'PENDING',
      amountKrw,
      upfrontFeeKrw: a.upfrontFeeKrw,
      successFeeKrw: a.successFeeKrw,
      safetyFeeKrw: a.safetyFeeKrw,
      escrowPrincipalKrw: a.upfrontFeeKrw + a.successFeeKrw,
      depositDueAt: new Date(Date.now() + 24 * 3600e3).toISOString().slice(0, 19),
      paidAt: null,
      createdAt: now(),
      virtualAccount: { bankName: '피코은행(목)', accountNumber: `9${String(nextId()).padStart(11, '0')}`, accountHolder: 'PICO 안전거래' },
    };
    payments.push(pay);
    return ok(paymentView(pay), 201);
  }
  if ((m = p.match(/^\/api\/payments\/(\d+)(\/virtual-account|\/confirm)?$/))) {
    const u = requireUser(req);
    const pay = payments.find((x) => x.paymentId === Number(m[1]));
    const r = pay && requests.find((x) => x.requestId === agreements.find((a) => a.agreementId === pay.agreementId)?.requestId);
    if (!pay || r?.requesterUserId !== u.userId) fail(404, '결제를 찾을 수 없어요.');
    if (method === 'GET' && !m[2]) return ok(paymentView(pay));
    if (method === 'GET' && m[2] === '/virtual-account') {
      if (pay.status !== 'PENDING') fail(409, '입금 대기 중인 주문이 아니에요.');
      return ok({ paymentId: pay.paymentId, ...pay.virtualAccount, amountKrw: pay.amountKrw, depositDueAt: pay.depositDueAt });
    }
    if (method === 'POST' && m[2] === '/confirm') {
      // 목 서버: 입금 확인을 누르면 입금된 것으로 본다.
      if (pay.status === 'PENDING') {
        Object.assign(pay, { status: 'PAID', paidAt: now() });
        notify(r.agentUserId, 'PAYMENT', r.requestId, '이용자가 안전거래 결제를 마쳤어요', '예매를 시작할 수 있어요.');
      }
      return ok(paymentView(pay));
    }
  }
  if (method === 'POST' && (m = p.match(/^\/api\/attempt-evidences\/(\d+)\/(approve|reject)$/))) {
    const u = requireUser(req);
    const e = evidences.find((x) => x.evidenceId === Number(m[1])) ?? fail(404, '증빙을 찾을 수 없어요.');
    const r = requests.find((x) => x.requestId === e.requestId);
    if (r.requesterUserId !== u.userId) fail(403, '거래 요청자만 검토할 수 있어요.');
    if (e.status !== 'SUBMITTED') fail(409, '이미 검토한 증빙이에요.');
    if (m[2] === 'reject') required(body, 'reviewNote');
    Object.assign(e, { status: m[2] === 'approve' ? 'APPROVED' : 'REJECTED', reviewedAt: now(), reviewNote: body?.reviewNote ?? null });
    if (m[2] === 'approve') recordPayout(r, 'UPFRONT');
    notify(r.agentUserId, 'EVIDENCE', r.requestId, m[2] === 'approve' ? '시도 증빙이 승인됐어요' : '시도 증빙이 반려됐어요', body?.reviewNote ?? '');
    return ok(e);
  }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let result;
  try {
    const isUpload = url.pathname.startsWith('/api/mock-upload/');
    req.rawBody = Buffer.concat(chunks);
    const raw = req.rawBody.toString('utf8');
    const body = !isUpload && raw ? JSON.parse(raw) : undefined;
    result = (await handleOther(req, url, body)) ?? (await handle(req, url, body));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : e instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error(e);
    result = { status, body: { success: false, data: null, message: e.message } };
  }
  await new Promise((r) => setTimeout(r, DELAY_MS));
  console.log(`[mock] ${req.method} ${url.pathname}${url.search} → ${result.status}`);
  if (result.file) {
    res.writeHead(200, { 'Content-Type': result.file.type });
    return res.end(result.file.data);
  }
  res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
}).listen(PORT, () => {
  console.log(`[mock] 목 서버 http://localhost:${PORT}`);
  console.log(`[mock] 이용자 demo@pico.test · 도우미 agent1@pico.test ~ agent6@pico.test (비밀번호 ${PASSWORD})`);
});
