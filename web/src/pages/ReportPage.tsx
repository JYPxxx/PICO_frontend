import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { list, num, str } from '../api/pick';
import type { components } from '../api/schema';
import { useLoad } from '../transactions/model';
import { Field, useAction, utcToLocal } from '../transactions/ui';
import { AccountCard, AccountNote } from '../ui/account';
import { PageTitle } from '../ui/PageTitle';

// 백엔드 서비스 흐름 가이드 12-2: 신고. 프로토타입에는 없던 화면이라 계정 화면 마크업을 쓴다.
// POST /api/reports → OPEN → 운영팀 조사(INVESTIGATING) → 처리(RESOLVED/DISMISSED, 사유 공개)
// 거래를 연결하면 신고자가 그 거래의 당사자여야 한다. 신고 증빙 추가 API는 현재 501이라 넣지 않았다.
type Reason = components['schemas']['ReportReason'];
const reasons: [Reason, string][] = [
  ['FRAUD', '사기·금전 피해'],
  ['MACRO', '매크로 등 부정한 예매'],
  ['RESALE', '재판매·티켓 양도'],
  ['FALSE_REVIEW', '거짓 후기'],
  ['OTHER', '기타'],
];
const reasonNames = Object.fromEntries(reasons) as Record<string, string>;
const statusNames: Record<string, string> = { OPEN: '접수', INVESTIGATING: '조사 중', RESOLVED: '처리 완료', DISMISSED: '처리 안 함' };

export function ReportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reportedUserId = Number(params.get('userId'));
  const requestId = Number(params.get('requestId')) || null;
  const name = params.get('name') ?? '상대방';
  const [reason, setReason] = useState<Reason>('FRAUD');
  const [description, setDescription] = useState('');
  const { pending, run } = useAction();

  if (!reportedUserId)
    return (
      <div className="account-contained">
        <PageTitle title="신고하기" />
        <div className="empty">
          <p>신고할 거래 상세에서 '신고하기'를 눌러 주세요.</p>
          <button type="button" className="btn secondary" onClick={() => navigate('/requests')}>
            내 활동으로
          </button>
        </div>
      </div>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    const ok = await run(() => unwrap(api.POST('/api/reports', { body: { reportedUserId, requestId, reason, description: description.trim() } })), '신고를 접수했어요. 처리 결과는 신고 내역에서 확인할 수 있어요.');
    if (ok) navigate('/reports', { replace: true });
  }

  return (
    <div className="account-contained">
      <PageTitle title="신고하기" crumbs={requestId ? [{ label: '요청 상세', to: `/requests/${requestId}` }] : [{ label: '마이페이지', to: '/my' }]} />
      <AccountCard title={`${name} 신고`}>
        <form noValidate onSubmit={submit}>
          <Field label="신고 사유" required>
            <select value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
              {reasons.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="신고 내용" required helper="언제, 어떤 일이 있었는지 구체적으로 적어 주세요.">
            <textarea rows={6} required value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <AccountNote>신고 내용은 운영팀만 확인해요. 처리 결과와 사유는 신고 내역에서 볼 수 있어요. 이용 정지 등 제재는 조사 후 운영팀이 따로 결정해요.</AccountNote>
          <div className="account-form-footer">
            <button type="submit" className="btn primary" disabled={pending || !description.trim()}>
              {pending ? '접수 중…' : '신고 접수'}
            </button>
          </div>
        </form>
      </AccountCard>
    </div>
  );
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [load] = useLoad(() => unwrap<unknown>(api.GET('/api/reports/me', { params: { query: { page: 0, size: 50 } } })).then(list), []);
  return (
    <>
      <PageTitle title="신고 내역" crumbs={[{ label: '마이페이지', to: '/my' }]} />
      <div className="tx-history">
        {load.status === 'loading' ? (
          <div className="empty" role="status">
            <p>신고 내역을 불러오는 중이에요.</p>
          </div>
        ) : load.status === 'error' ? (
          <div className="empty">
            <p>{load.message}</p>
          </div>
        ) : load.data.length ? (
          load.data.map((x) => (
            <article key={String(x.reportId)} className="content-card">
              <div>
                <span className={`tx-status ${['RESOLVED', 'DISMISSED'].includes(str(x.status) ?? '') ? 'muted' : 'amber'}`}>{statusNames[str(x.status) ?? ''] ?? str(x.status)}</span>
                <h3>{reasonNames[str(x.reason) ?? ''] ?? str(x.reason)}</h3>
                <p>
                  {utcToLocal(str(x.createdAt) ?? '')} · {str(x.description)}
                </p>
                {str(x.resolutionNote) && <small>처리 사유: {str(x.resolutionNote)}</small>}
              </div>
              <div>
                {num(x.requestId) && (
                  <button type="button" className="btn secondary" onClick={() => navigate(`/requests/${num(x.requestId)}`)}>
                    거래 상세 보기
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <h2>접수한 신고가 없어요</h2>
            <p>거래 상세 화면에서 상대방을 신고할 수 있어요.</p>
          </div>
        )}
      </div>
    </>
  );
}
