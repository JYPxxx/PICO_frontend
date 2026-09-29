import { useCallback, useEffect, useState } from 'react';
import { api, unwrap } from '../api/client';
import { bool, list, num, pick, str, type Raw } from '../api/pick';
import { getTokens } from '../api/tokens';
import type { components } from '../api/schema';

// 거래(요청) 데이터와 단계 판단. 요청 상세·합의 응답 필드는 명세에 없어(data: object) pick()으로 후보 이름을 찾는다.
// 단계는 백엔드 서비스 흐름 가이드(2d8b602) 6-5의 stage 값을 그대로 쓰고, 없을 때만 상태 조합으로 계산한다.
// TODO(백엔드 확인): GET /api/requests*, /agreements, /change-requests 응답 필드 확정 후 후보를 하나로 줄인다(API_NOTES.md 1번).

export type RequestStatus = components['schemas']['RequestStatus'];
export type RequestResult = components['schemas']['RequestResult'];
export type RequestBody = components['schemas']['Create'];
export type AgreementBody = components['schemas']['Agreement'];
export type Evidence = components['schemas']['EvidenceSubmissionResponse'];
export type Review = components['schemas']['ReviewResponse'];

export interface TxRequest {
  id: number;
  status: RequestStatus;
  requesterId?: number;
  agentId?: number;
  requesterName: string;
  agentName: string;
  targetName: string;
  serviceCategory: string;
  applicationOpenDate: string;
  applicationOpenTime: string;
  scheduledUseDate: string;
  scheduledUseTime: string;
  platformId?: number;
  platformName: string;
  otherPlatformName: string;
  locationNote: string;
  requestedQuantity?: number;
  requirements: string;
  successConditions: string;
  purchaseBudgetMax?: number;
  agencyBudgetMax?: number;
  additionalNote: string;
  contactDeadlineRule: string;
  applicationRound: string;
  expiresAt: string;
  createdAt: string;
  /** 정책 검토(policy_gate_status): PENDING 검토 전 · ALLOWED 허용 · BLOCKED 차단 */
  policyStatus: string;
  /** 서버가 계산한 화면 단계(가이드 6-5). 없으면 빈 문자열 */
  serverStage: string;
  /** 최종 결과(COMPLETED일 때 기록) */
  finalResult?: RequestResult;
  closeReason: string;
  agentResult?: RequestResult;
  agentResultNote: string;
  agentOutcome: string;
  requesterResult?: RequestResult;
  requesterResultNote: string;
  paymentId?: number;
  paymentStatus: string;
  raw: Raw;
}

export function toRequest(raw: Raw): TxRequest {
  const s = (...k: string[]) => str(pick(raw, ...k)) ?? '';
  const n = (...k: string[]) => num(pick(raw, ...k));
  return {
    id: n('requestId', 'id') ?? 0,
    status: (s('status') || 'PENDING') as RequestStatus,
    requesterId: n('requesterUserId', 'requesterId', 'requester.userId', 'requester.id'),
    agentId: n('agentUserId', 'agentId', 'agent.userId', 'agent.agentId', 'agent.id'),
    requesterName: s('requesterNickname', 'requesterName', 'requester.nickname') || '이용자',
    agentName: s('agentActivityName', 'agentName', 'agentNickname', 'agent.activityName', 'agent.nickname') || '도우미',
    targetName: s('targetName'),
    serviceCategory: s('serviceCategory'),
    applicationOpenDate: s('applicationOpenDate'),
    applicationOpenTime: s('applicationOpenTime').slice(0, 5),
    scheduledUseDate: s('scheduledUseDate'),
    scheduledUseTime: s('scheduledUseTime').slice(0, 5),
    platformId: n('platformId', 'platform.id'),
    platformName: s('platformName', 'platform.name'),
    otherPlatformName: s('otherPlatformName'),
    locationNote: s('locationNote'),
    requestedQuantity: n('requestedQuantity'),
    requirements: s('requirements'),
    successConditions: s('successConditions'),
    purchaseBudgetMax: n('purchaseBudgetMax'),
    agencyBudgetMax: n('agencyBudgetMax'),
    additionalNote: s('additionalNote'),
    contactDeadlineRule: s('contactDeadlineRule'),
    applicationRound: s('applicationRound'),
    expiresAt: s('expiresAt'),
    createdAt: s('createdAt', 'requestedAt'),
    policyStatus: s('policyGateStatus', 'policyStatus', 'policyReviewStatus', 'policy.status'),
    serverStage: s('stage'),
    finalResult: (s('finalResult') || undefined) as RequestResult | undefined,
    closeReason: s('rejectReason', 'cancelReason', 'closeReason', 'reason'),
    agentResult: (s('agentResult', 'agentReportedResult', 'result.agentResult') || undefined) as RequestResult | undefined,
    agentResultNote: s('agentResultNote', 'agentNote', 'result.agentNote'),
    agentOutcome: s('agentActualOutcomeDescription', 'actualOutcomeDescription', 'result.actualOutcomeDescription'),
    requesterResult: (s('requesterResult', 'requesterReportedResult', 'result.requesterResult') || undefined) as RequestResult | undefined,
    requesterResultNote: s('requesterResultNote', 'requesterNote', 'result.requesterNote'),
    paymentId: n('paymentId', 'payment.paymentId', 'safePayment.paymentId'),
    paymentStatus: s('paymentStatus', 'payment.status', 'safePayment.status'),
    raw,
  };
}

export interface Agreement {
  id: number;
  version: number;
  /** PROPOSED(제안) · FINALIZED(확정) 등 */
  status: string;
  upfrontFeeKrw: number;
  successFeeKrw: number;
  safetyFeeKrw: number;
  safePayment: boolean;
  requirements: string;
  successConditions: string;
  attemptRule: string;
  refundRule: string;
  contactDeadlineRule: string;
  createdAt: string;
  finalizedAt: string;
  paymentId?: number;
  paymentStatus: string;
}

/** 명세: 안전거래 수수료는 성공보수의 3%(원 단위 올림), 최소 1,000원. 직접 거래는 0원 */
export const safetyFee = (successFee: number, safe = true) => (safe ? Math.max(1000, Math.ceil(successFee * 0.03)) : 0);

export function toAgreement(raw: Raw): Agreement {
  const s = (...k: string[]) => str(pick(raw, ...k)) ?? '';
  const n = (...k: string[]) => num(pick(raw, ...k));
  const successFeeKrw = n('successFeeKrw') ?? 0;
  const safePayment = pick(raw, 'safePayment') === undefined ? true : bool(pick(raw, 'safePayment'));
  return {
    id: n('agreementId', 'id') ?? 0,
    version: n('version', 'versionNumber', 'revision') ?? 1,
    status: s('status') || 'PROPOSED',
    upfrontFeeKrw: n('upfrontFeeKrw') ?? 0,
    successFeeKrw,
    safetyFeeKrw: n('safetyFeeKrw') ?? safetyFee(successFeeKrw, safePayment),
    safePayment,
    requirements: s('requirements'),
    successConditions: s('successConditions'),
    attemptRule: s('attemptRule'),
    refundRule: s('refundRule'),
    contactDeadlineRule: s('contactDeadlineRule'),
    createdAt: s('createdAt', 'proposedAt'),
    finalizedAt: s('finalizedAt', 'acceptedAt'),
    paymentId: n('paymentId', 'payment.paymentId'),
    paymentStatus: s('paymentStatus', 'payment.status'),
  };
}

// ── 화면 단계 ─────────────────────────────────────────────
// 명세의 RequestStatus는 8개뿐이라 MATCHED·IN_PROGRESS 안의 세부 단계는 합의·결제·결과로 나눈다.
export type Stage =
  | 'policy_review'
  | 'policy_blocked'
  | 'pending'
  | 'terms_needed'
  | 'terms_sent'
  | 'revision_requested'
  | 'payment'
  | 'ready'
  | 'in_progress'
  | 'result_submitted'
  | 'disputed'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export const stageNames: Record<Stage, string> = {
  policy_review: '요청 검토 중',
  policy_blocked: '진행할 수 없는 요청',
  pending: '도우미 응답 대기',
  terms_needed: '최종 조건 작성 필요',
  terms_sent: '이용자 확인 대기',
  revision_requested: '조건 수정 요청',
  payment: '안전거래 결제 대기',
  ready: '착수 대기',
  in_progress: '예매 진행 중',
  result_submitted: '결과 확인 대기',
  disputed: '결과 확인 중(분쟁)',
  completed: '거래 완료',
  rejected: '요청 거절',
  expired: '요청 만료',
  cancelled: '요청 취소',
};

export const endedStages: Stage[] = ['completed', 'rejected', 'expired', 'cancelled'];

const policyWaiting = ['PENDING', 'REVIEW', 'PENDING_REVIEW', 'IN_REVIEW', 'WAITING'];

/** PENDING 요청의 단계: 정책 검토 결과(policy_gate_status)로 나눈다. ALLOWED가 아니면 도우미가 수락할 수 없다. */
function pendingStage(r: TxRequest): Stage {
  const gate = r.policyStatus.toUpperCase();
  if (gate === 'BLOCKED') return 'policy_blocked';
  return policyWaiting.includes(gate) ? 'policy_review' : 'pending';
}

// 가이드 6-5: 서버 stage → 화면 단계. COMPLETED·DISPUTED 등은 status 값이 그대로 온다.
const serverStages: Record<string, Stage> = {
  CONDITION_PREPARATION: 'terms_needed',
  CONDITION_CONFIRMATION: 'terms_sent',
  CONDITION_CHANGE_REQUESTED: 'revision_requested',
  PAYMENT_WAITING: 'payment',
  READY_TO_START: 'ready',
  IN_PROGRESS: 'in_progress',
  RESULT_CONFIRMATION: 'result_submitted',
  DISPUTED: 'disputed',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export function latestAgreement(agreements: Agreement[]) {
  return [...agreements].sort((a, b) => b.version - a.version || b.id - a.id)[0];
}

export function stageOf(r: TxRequest, agreements: Agreement[] = [], changeRequests: Raw[] = []): Stage {
  const server = r.serverStage.toUpperCase();
  if (server === 'REQUEST_WAITING' || (r.status === 'PENDING' && !server)) return pendingStage(r);
  if (serverStages[server]) return serverStages[server];
  switch (r.status) {
    case 'PENDING':
      return pendingStage(r);
    case 'MATCHED': {
      const latest = latestAgreement(agreements);
      if (!latest) return 'terms_needed';
      if (latest.status === 'FINALIZED') {
        const paid = ['PAID'].includes((latest.paymentStatus || r.paymentStatus).toUpperCase());
        return latest.safePayment && !paid ? 'payment' : 'ready';
      }
      return changeRequests.length ? 'revision_requested' : 'terms_sent';
    }
    case 'IN_PROGRESS':
      return r.agentResult ? 'result_submitted' : 'in_progress';
    case 'DISPUTED':
      return 'disputed';
    case 'COMPLETED':
      return 'completed';
    case 'REJECTED':
      return 'rejected';
    case 'EXPIRED':
      return 'expired';
    default:
      return 'cancelled';
  }
}

/** 목록처럼 합의 정보가 없을 때 쓰는 단계. 서버 stage가 있으면 정확하다. */
export function roughStage(r: TxRequest): Stage {
  if (!r.serverStage && r.status === 'MATCHED') return 'terms_needed';
  return stageOf(r);
}

// ── 내 역할 ────────────────────────────────────────────────
export type Role = 'user' | 'agent';
export function myUserId(me: Raw | null) {
  return num(pick(me, 'userId', 'id')) ?? getTokens()?.userId;
}
/** 요청 당사자 중 내 역할. 응답에 id가 없으면 현재 모드를 쓴다. */
export function roleIn(r: TxRequest, me: Raw | null, mode: Role): Role {
  const id = myUserId(me);
  if (id && r.agentId === id) return 'agent';
  if (id && r.requesterId === id) return 'user';
  return mode;
}

// ── 결과 ───────────────────────────────────────────────────
export const resultNames: Record<RequestResult, string> = { SUCCESS: '성공', PARTIAL: '부분 성공', FAILURE: '실패' };

// ── API 호출 ────────────────────────────────────────────────
const path = (requestId: number) => ({ params: { path: { requestId } } });

export async function fetchRequests(role: 'REQUESTER' | 'AGENT') {
  const data = await unwrap<unknown>(api.GET('/api/requests', { params: { query: { role, page: 0, size: 100 } } }));
  return list(data).map(toRequest);
}

export interface Detail {
  request: TxRequest;
  agreements: Agreement[];
  changeRequests: Raw[];
  evidences: Evidence[];
  contacts: Raw | null;
  payment: Raw | null;
  /** 이용자가 남긴 후기(없으면 null) */
  review: Review | null;
  /** 도우미의 결과 증빙 제출 이력(RESULT). 관리자 파일 검토로 첨부가 CLEAN이 되어야 결과를 제출할 수 있다 */
  resultEvidences: Raw[];
  /** 부분성공 정산(PARTIAL 완료 + 안전거래일 때) */
  partial: Raw | null;
  /** 안전거래 결제의 환불 내역(이용자만) */
  refunds: Raw[];
  stage: Stage;
}

const soft = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

export async function fetchDetail(id: number): Promise<Detail> {
  const request = toRequest(await unwrap<Raw>(api.GET('/api/requests/{requestId}', path(id))));
  const matched = ['MATCHED', 'IN_PROGRESS', 'DISPUTED', 'COMPLETED'].includes(request.status);
  // 가이드 6-4: 연락처는 MATCHED·IN_PROGRESS·DISPUTED에서만 공개되고, 완료·취소 후에는 닫힌다.
  const contactsOpen = ['MATCHED', 'IN_PROGRESS', 'DISPUTED'].includes(request.status);
  const started = ['IN_PROGRESS', 'DISPUTED', 'COMPLETED'].includes(request.status);
  const [agreementsRaw, evidences, contacts, resultEvidencesRaw] = await Promise.all([
    matched ? soft(unwrap<unknown>(api.GET('/api/requests/{requestId}/agreements', path(id))), []) : Promise.resolve([]),
    matched ? soft(unwrap<Evidence[]>(api.GET('/api/requests/{requestId}/attempt-evidences', { params: { path: { requestId: id }, query: { page: 0, size: 20 } } })), []) : Promise.resolve([]),
    contactsOpen ? soft(unwrap<Raw>(api.GET('/api/requests/{requestId}/contacts', path(id))), null) : Promise.resolve(null),
    started ? soft(unwrap<unknown>(api.GET('/api/requests/{requestId}/result/evidence', path(id))), []) : Promise.resolve([]),
  ]);
  const agreements = list(agreementsRaw).map(toAgreement);
  const latest = latestAgreement(agreements);
  const changeRequests =
    latest && latest.status === 'PROPOSED'
      ? list(
          await soft(
            unwrap<unknown>(api.GET('/api/requests/{requestId}/agreements/{agreementId}/change-requests', { params: { path: { requestId: id, agreementId: latest.id } } })),
            [],
          ),
        )
      : [];
  const paymentId = latest?.paymentId ?? request.paymentId;
  // 명세: 결제 상세는 결제한 이용자만 볼 수 있다(도우미는 404). 요청·합의 응답에 결제 상태가 있으면 따로 조회하지 않는다.
  const known = latest?.paymentStatus || request.paymentStatus;
  const payment = paymentId && !known ? await soft(unwrap<Raw>(api.GET('/api/payments/{paymentId}', { params: { path: { paymentId } } })), null) : null;
  if (latest && payment && !latest.paymentStatus) latest.paymentStatus = str(payment.status) ?? '';
  // 후기 없음·삭제·숨김은 404. '후기 없음'으로 본다.
  const completed = request.status === 'COMPLETED';
  const finalized = agreements.find((a) => a.status === 'FINALIZED');
  const final = request.finalResult ?? (request.requesterResult === request.agentResult ? request.agentResult : undefined);
  const [review, partial, refunds] = await Promise.all([
    completed ? soft(unwrap<Review>(api.GET('/api/requests/{requestId}/review', path(id))), null) : Promise.resolve(null),
    completed && final === 'PARTIAL' && finalized?.safePayment ? soft(unwrap<Raw>(api.GET('/api/requests/{requestId}/partial-settlement', path(id))), null) : Promise.resolve(null),
    paymentId && payment ? soft(unwrap<unknown>(api.GET('/api/payments/{paymentId}/refunds', { params: { path: { paymentId } } })).then(list), [] as Raw[]) : Promise.resolve([] as Raw[]),
  ]);
  return {
    request,
    agreements,
    changeRequests,
    evidences: Array.isArray(evidences) ? evidences : [],
    contacts,
    payment,
    review,
    resultEvidences: list(resultEvidencesRaw),
    partial,
    refunds,
    stage: stageOf(request, agreements, changeRequests),
  };
}

export type Load<T> = { status: 'loading' } | { status: 'error'; code: number; message: string } | { status: 'done'; data: T };

/**
 * refreshOnFocus: 창으로 돌아올 때 다시 불러온다. 백엔드는 요청 상태 변경 알림을 아직 보내지 않아서(가이드 12-3),
 * 상대방이 진행한 내용을 보려면 화면을 다시 불러와야 한다.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[], { refreshOnFocus = false } = {}): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!refreshOnFocus) return;
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshOnFocus]);
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ status: 'done', data }),
      (e) => alive && setState({ status: 'error', code: e?.status ?? 0, message: e instanceof Error ? e.message : '불러오지 못했어요.' }),
    );
    return () => {
      alive = false;
    };
    // 호출하는 쪽이 deps를 정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return [state, reload];
}

// ── 파일 업로드 ─────────────────────────────────────────────
// 서버가 발급한 단기 URL로 파일을 직접 올리고, 제출 API에는 storageKey만 보낸다.
async function putFile(target: { uploadUrl?: string; method?: string; requiredHeaders?: Record<string, string>; storageKey?: string }, file: File) {
  if (!target.uploadUrl || !target.storageKey) throw new Error('업로드 주소를 받지 못했어요.');
  const res = await fetch(target.uploadUrl, { method: target.method || 'PUT', headers: target.requiredHeaders, body: file });
  if (!res.ok) throw new Error(`${file.name} 파일을 올리지 못했어요.`);
  return target.storageKey;
}

export async function uploadAttemptFile(file: File) {
  const target = await unwrap(
    api.POST('/api/files/upload-url', { body: { purpose: 'ATTEMPT_EVIDENCE', originalName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size } }),
  );
  return putFile(target, file);
}

export async function uploadResultFile(file: File) {
  const target = await unwrap<Raw>(
    api.POST('/api/evidence-files/upload-url', { body: { purpose: 'RESULT', originalName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size } }),
  );
  return putFile(target as Parameters<typeof putFile>[0], file);
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const fileAccept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm';
