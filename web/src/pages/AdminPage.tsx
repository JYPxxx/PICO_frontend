import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap, ApiError } from '../api/client';
import { list, num, pick, str, type Raw } from '../api/pick';
import type { components } from '../api/schema';
import { useLoad } from '../transactions/model';
import { Field, MoneyInput, Notice, useAction, utcToLocal, won } from '../transactions/ui';
import { Modal } from '../ui/Modal';
import { PageTitle } from '../ui/PageTitle';

// 관리자 화면. 프로토타입에 없어서 기존 화면 부품(content-card, tabs, document-rows, btn)으로 만든다.
// 백엔드 서비스 흐름 가이드 12-4의 관리자 기능 중 openapi.json에 있는 API만 쓴다(후기 숨김·신고 처리는 명세에 없음).
// 권한은 서버가 검사한다(ROLE_ADMIN이 아니면 403). 메뉴에는 노출하지 않고 /admin 주소로 들어온다.
// 목록 응답 필드가 명세에 없는 API가 많아(data: object) pick()으로 찾고, 항목마다 원본 응답을 펼쳐 볼 수 있게 했다.

type Tab = 'policy' | 'files' | 'profiles' | 'attempts' | 'settlements' | 'requests' | 'payments' | 'users' | 'setup';
const tabs: [Tab, string][] = [
  ['policy', '요청 정책 검토'],
  ['files', '증빙 파일 검토'],
  ['profiles', '도우미 심사'],
  ['attempts', '시도 증빙 대리 승인'],
  ['settlements', '부분성공 정산'],
  ['requests', '분쟁·만료'],
  ['payments', '결제 확인'],
  ['users', '회원 제재'],
  ['setup', '약관·예매처'],
];

const categoryNames: Record<string, string> = { CONCERT: '콘서트', MUSICAL: '뮤지컬', SPORTS: '스포츠', COURSE: '강좌', FACILITY: '시설', OTHER: '기타' };
const purposeNames: Record<string, string> = { CAREER: '경력', ACTIVITY: '활동', BUSINESS: '사업자', RESULT: '결과', ATTEMPT: '시도', REPORT: '신고' };

const s = (raw: unknown, ...keys: string[]) => str(pick(raw, ...keys)) ?? '';
const n = (raw: unknown, ...keys: string[]) => num(pick(raw, ...keys));

function errorText(e: unknown) {
  if (e instanceof ApiError && e.status === 403) return '관리자 권한이 필요해요. 관리자 계정(users.is_admin)으로 로그인해 주세요.';
  return e instanceof Error ? e.message : '불러오지 못했어요.';
}

/** 목록 불러오기 공통: 로딩·오류·빈 목록 처리와 새로 고침 */
function ListBlock({ title, desc, load, reload, empty, children }: { title: string; desc?: string; load: ReturnType<typeof useLoad<Raw[]>>[0]; reload: () => void; empty: string; children: (rows: Raw[]) => ReactNode }) {
  return (
    <section className="content-card">
      <div className="title-between">
        <h2>{title}</h2>
        <button type="button" className="btn ghost" onClick={reload}>
          새로 고침
        </button>
      </div>
      {desc && <p className="record-note">{desc}</p>}
      {load.status === 'loading' ? (
        <p className="prose">불러오는 중이에요.</p>
      ) : load.status === 'error' ? (
        <Notice tone="error">{load.message}</Notice>
      ) : load.data.length ? (
        children(load.data)
      ) : (
        <p className="prose">{empty}</p>
      )}
    </section>
  );
}

function useAdminList(fetcher: () => Promise<unknown>) {
  return useLoad<Raw[]>(
    () =>
      fetcher().then(list, (e) => {
        throw new Error(errorText(e));
      }),
    [],
  );
}

/** 항목 한 줄: 요약 + 원본 응답 + 동작 버튼 */
function Item({ title, rows, raw, children }: { title: ReactNode; rows: [string, ReactNode][]; raw: Raw; children?: ReactNode }) {
  return (
    <article className="admin-item">
      <div>
        <strong>{title}</strong>
        <dl className="document-rows">
          {rows
            .filter(([, v]) => v !== '' && v !== undefined && v !== null)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        <details>
          <summary>원본 응답</summary>
          <pre className="dev-json">{JSON.stringify(raw, null, 2)}</pre>
        </details>
      </div>
      {children && <div className="admin-actions">{children}</div>}
    </article>
  );
}

/** 사유(필수)를 받아 실행하는 모달 */
function NoteModal({ title, fields, submitText, danger, onClose, onSubmit }: { title: string; fields: { name: string; label: string; required?: boolean; type?: string; helper?: string; initial?: string }[]; submitText: string; danger?: boolean; onClose: () => void; onSubmit: (v: Record<string, string>) => Promise<unknown> }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ''])));
  const [pending, setPending] = useState(false);
  const missing = fields.some((f) => f.required && !values[f.name]?.trim());
  return (
    <Modal title={title} onClose={onClose}>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (missing || !e.currentTarget.checkValidity()) return;
          setPending(true);
          await onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])));
          setPending(false);
        }}
      >
        {fields.map((f) => (
          <Field key={f.name} label={f.label} required={f.required} helper={f.helper}>
            {f.type === 'textarea' ? (
              <textarea rows={3} required={f.required} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            ) : (
              <input type={f.type ?? 'text'} required={f.required} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            )}
          </Field>
        ))}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            돌아가기
          </button>
          <button type="submit" className={`btn ${danger ? 'danger' : 'primary'}`} disabled={missing || pending}>
            {pending ? '처리 중…' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type Dialog = { title: string; fields: Parameters<typeof NoteModal>[0]['fields']; submitText: string; danger?: boolean; action: (v: Record<string, string>) => Promise<unknown>; success: string } | null;

function useDialog(reload: () => void) {
  const { pending, run } = useAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const modal = dialog && (
    <NoteModal
      title={dialog.title}
      fields={dialog.fields}
      submitText={dialog.submitText}
      danger={dialog.danger}
      onClose={() => setDialog(null)}
      onSubmit={async (v) => {
        const ok = await run(() => dialog.action(v), dialog.success);
        if (ok) {
          setDialog(null);
          reload();
        }
      }}
    />
  );
  return { open: setDialog, modal, pending, run };
}

const noteField = (label = '검토 메모') => ({ name: 'note', label, required: true, type: 'textarea' });

// ── 요청 정책 검토 ─────────────────────────────────────────
function PolicyTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/requests/policy-pending', { params: { query: { page: 0, size: 100 } } })));
  const { open, modal, pending } = useDialog(reload);
  const decide = (row: Raw, allowed: boolean) =>
    open({
      title: allowed ? '대리 신청 허용' : '대리 신청 차단',
      fields: [noteField(allowed ? '허용 근거' : '차단 사유'), { name: 'sourceUrl', label: '근거 URL', required: true, type: 'url', helper: '예매처 이용약관·공지 등 판단 근거 주소(https://…)', initial: s(row, 'officialApplicationUrl', 'platform.homepageUrl', 'platformHomepageUrl') }],
      submitText: allowed ? '허용' : '차단',
      danger: !allowed,
      success: allowed ? '허용했어요. 도우미가 수락할 수 있어요.' : '차단했어요.',
      action: (v) => unwrap(api.POST('/api/admin/requests/{requestId}/policy', { params: { path: { requestId: n(row, 'requestId', 'id')! } }, body: { allowed, note: v.note, sourceUrl: v.sourceUrl } })),
    });
  return (
    <>
      <ListBlock title="정책 검토 대기 요청" desc="대리 신청이 허용되는 대상인지 판단해요. 허용(ALLOWED)되어야 도우미가 수락할 수 있어요." load={load} reload={reload} empty="검토할 요청이 없어요.">
        {(rows) =>
          rows.map((row) => (
            <Item
              key={String(n(row, 'requestId', 'id'))}
              raw={row}
              title={`#${n(row, 'requestId', 'id')} ${s(row, 'targetName')}`}
              rows={[
                ['분야', categoryNames[s(row, 'serviceCategory')] ?? s(row, 'serviceCategory')],
                ['예매처', s(row, 'platformName', 'platform.name', 'otherPlatformName')],
                ['티켓 오픈', [s(row, 'applicationOpenDate'), s(row, 'applicationOpenTime')].filter(Boolean).join(' ')],
                ['공식 신청 URL', s(row, 'officialApplicationUrl')],
                ['요청 내용', s(row, 'requirements')],
                ['요청 시각', utcToLocal(s(row, 'createdAt'))],
              ]}
            >
              <button type="button" className="btn primary" disabled={pending} onClick={() => decide(row, true)}>
                허용
              </button>
              <button type="button" className="btn ghost tx-danger" disabled={pending} onClick={() => decide(row, false)}>
                차단
              </button>
            </Item>
          ))
        }
      </ListBlock>
      {modal}
    </>
  );
}

// ── 증빙 파일 검토(CAREER·ACTIVITY·BUSINESS·RESULT) ─────────────
function FilesTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/evidence-files', { params: { query: { size: 100 } } })));
  const { open, modal, pending, run } = useDialog(reload);
  const fileId = (row: Raw) => n(row, 'fileId', 'attachmentId', 'id')!;
  const preview = (row: Raw) =>
    run(async () => {
      const p = await unwrap<unknown>(api.GET('/api/admin/evidence-files/{fileId}/preview', { params: { path: { fileId: fileId(row) } } }));
      const url = typeof p === 'string' ? p : s(p, 'url', 'downloadUrl', 'previewUrl');
      if (!url) throw new Error('열람 URL을 받지 못했어요.');
      window.open(url, '_blank', 'noopener');
    });
  const review = (row: Raw, approved: boolean) =>
    open({
      title: approved ? '파일 승인(CLEAN)' : '파일 차단(BLOCKED)',
      fields: [noteField()],
      submitText: approved ? '승인' : '차단',
      danger: !approved,
      success: approved ? '승인했어요.' : '차단했어요.',
      action: (v) => unwrap(api.POST('/api/admin/evidence-files/{fileId}/review', { params: { path: { fileId: fileId(row) } }, body: { approved, note: v.note } })),
    });
  return (
    <>
      <ListBlock title="검토 대기 증빙 파일" desc="경력·활동·사업자(도우미 심사)와 결과 증빙 파일이에요. 승인(CLEAN)되어야 심사 신청·결과 제출에 쓸 수 있어요. 승인은 악성코드 검사를 뜻하지 않아요." load={load} reload={reload} empty="검토할 파일이 없어요.">
        {(rows) =>
          rows.map((row) => (
            <Item
              key={String(fileId(row))}
              raw={row}
              title={`${purposeNames[s(row, 'purpose')] ?? s(row, 'purpose')} 증빙 · ${s(row, 'originalName', 'fileName')}`}
              rows={[
                ['파일 번호', fileId(row)],
                ['사례 번호', n(row, 'caseNumber')],
                ['요청·프로필', n(row, 'requestId') ? `요청 #${n(row, 'requestId')}` : n(row, 'profileId') ? `프로필 #${n(row, 'profileId')}` : ''],
                ['올린 회원', n(row, 'ownerUserId', 'uploaderUserId', 'userId')],
                ['형식·크기', [s(row, 'mimeType'), n(row, 'sizeBytes') ? `${Math.ceil(n(row, 'sizeBytes')! / 1024)}KB` : ''].filter(Boolean).join(' · ')],
                ['설명', s(row, 'description')],
                ['제출 시각', utcToLocal(s(row, 'submittedAt', 'createdAt'))],
              ]}
            >
              <button type="button" className="btn secondary" disabled={pending} onClick={() => preview(row)}>
                파일 보기
              </button>
              <button type="button" className="btn primary" disabled={pending} onClick={() => review(row, true)}>
                승인
              </button>
              <button type="button" className="btn ghost tx-danger" disabled={pending} onClick={() => review(row, false)}>
                차단
              </button>
            </Item>
          ))
        }
      </ListBlock>
      {modal}
    </>
  );
}

// ── 도우미 심사 ────────────────────────────────────────────
function ProfilesTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/agent-profiles', { params: { query: { page: 0, size: 100 } } })));
  const { open, modal, pending, run } = useDialog(reload);
  const [evidence, setEvidence] = useState<{ id: number; rows: Raw[] } | null>(null);
  const profileId = (row: Raw) => n(row, 'profileId', 'profileVersionId', 'id')!;
  const review = (row: Raw, approved: boolean) =>
    open({
      title: approved ? '프로필 승인(게시)' : '프로필 반려',
      fields: [noteField(approved ? '승인 메모' : '반려 사유(도우미에게 보여요)')],
      submitText: approved ? '승인' : '반려',
      danger: !approved,
      success: approved ? '승인했어요. 이전 게시본은 보관돼요.' : '반려했어요.',
      action: (v) => unwrap(api.POST('/api/admin/agent-profiles/{profileId}/review', { params: { path: { profileId: profileId(row) } }, body: { approved, note: v.note } })),
    });
  return (
    <>
      <ListBlock title="심사 대기 프로필" desc="승인하면 도우미 찾기에 게시돼요. 서버가 본인·정산계좌 인증과 경력 증빙 3건(CLEAN)을 다시 확인해요." load={load} reload={reload} empty="심사할 프로필이 없어요.">
        {(rows) =>
          rows.map((row) => (
            <Item
              key={String(profileId(row))}
              raw={row}
              title={`${s(row, 'activityName')} · 프로필 #${profileId(row)}`}
              rows={[
                ['회원', n(row, 'userId', 'agentUserId')],
                ['한 줄 소개', s(row, 'headline')],
                ['분야', (pick(row, 'categories') as string[] | undefined)?.map((c) => categoryNames[c] ?? c).join(' · ') ?? categoryNames[s(row, 'primaryCategory')]],
                ['예매처', list(pick(row, 'platforms')).map((p) => s(p, 'name')).join(' · ')],
                ['비용', `착수비 ${won(n(row, 'upfrontFeeKrw'))} · 수고비 ${won(n(row, 'successFeeMin'))} ~ ${won(n(row, 'successFeeMax'))}`],
                ['경력', s(row, 'careerDescription')],
                ['신청 시각', utcToLocal(s(row, 'submittedAt'))],
              ]}
            >
              <button
                type="button"
                className="btn secondary"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const rows = list(await unwrap<unknown>(api.GET('/api/admin/agent-profiles/{profileId}/evidence', { params: { path: { profileId: profileId(row) } } })));
                    setEvidence({ id: profileId(row), rows });
                  })
                }
              >
                증빙 보기
              </button>
              <button type="button" className="btn primary" disabled={pending} onClick={() => review(row, true)}>
                승인
              </button>
              <button type="button" className="btn ghost tx-danger" disabled={pending} onClick={() => review(row, false)}>
                반려
              </button>
            </Item>
          ))
        }
      </ListBlock>
      {evidence && (
        <Modal title={`프로필 #${evidence.id} 증빙`} onClose={() => setEvidence(null)} wide>
          {evidence.rows.length ? (
            evidence.rows.map((e, i) => (
              <Item
                key={i}
                raw={e}
                title={`${purposeNames[s(e, 'purpose')] ?? s(e, 'purpose')} ${n(e, 'caseNumber') ? `사례 ${n(e, 'caseNumber')}` : ''}`}
                rows={[
                  ['상태', s(e, 'status')],
                  ['설명', s(e, 'description')],
                  ['첨부', list(pick(e, 'attachments')).map((f) => `${s(f, 'originalName')} (${s(f, 'scanStatus')})`).join(', ')],
                ]}
              />
            ))
          ) : (
            <p className="prose">제출된 증빙이 없어요.</p>
          )}
          <p className="record-note">파일 승인·차단은 '증빙 파일 검토' 탭에서 해요.</p>
        </Modal>
      )}
      {modal}
    </>
  );
}

// ── 시도 증빙 대리 승인(24시간 미검토) ────────────────────────
function AttemptsTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/attempt-evidences/overdue', { params: { query: { page: 0, size: 100 } } })));
  const { open, modal, pending } = useDialog(reload);
  return (
    <>
      <ListBlock title="검토 기한 지난 시도 증빙" desc="제출 후 24시간이 지나도록 이용자가 검토하지 않은 증빙이에요. 대리 승인하면 착수비 지급 조건을 확인해요. 반려는 이용자만 할 수 있어요." load={load} reload={reload} empty="대리 승인할 증빙이 없어요.">
        {(rows) =>
          rows.map((row) => (
            <Item
              key={String(n(row, 'evidenceId'))}
              raw={row}
              title={`요청 #${n(row, 'requestId')} · ${n(row, 'revision')}차 시도 증빙`}
              rows={[
                ['설명', s(row, 'description')],
                ['첨부', list(pick(row, 'attachments')).map((f) => `${s(f, 'originalName')} (${s(f, 'scanStatus')})`).join(', ')],
                ['제출 시각', utcToLocal(s(row, 'submittedAt'))],
              ]}
            >
              {list(pick(row, 'attachments'))
                .filter((f) => s(f, 'url'))
                .map((f, i) => (
                  <a key={i} className="btn secondary" href={s(f, 'url')} target="_blank" rel="noreferrer">
                    첨부 {i + 1} 보기
                  </a>
                ))}
              <button
                type="button"
                className="btn primary"
                disabled={pending}
                onClick={() =>
                  open({
                    title: '시도 증빙 대리 승인',
                    fields: [{ name: 'note', label: '승인 메모', type: 'textarea' }],
                    submitText: '승인',
                    success: '대리 승인했어요.',
                    action: (v) => unwrap(api.POST('/api/admin/attempt-evidences/{evidenceId}/approve', { params: { path: { evidenceId: n(row, 'evidenceId')! } }, body: { reviewNote: v.note || null } })),
                  })
                }
              >
                대리 승인
              </button>
            </Item>
          ))
        }
      </ListBlock>
      {modal}
    </>
  );
}

// ── 부분성공 정산 결정 ─────────────────────────────────────
function SettlementsTab() {
  const [pendingLoad, reloadPending] = useAdminList(() => unwrap(api.GET('/api/admin/partial-settlements/pending', { params: { query: { page: 0, size: 100 } } })));
  const [unproposedLoad, reloadUnproposed] = useAdminList(() => unwrap(api.GET('/api/admin/partial-settlements/unproposed', { params: { query: { page: 0, size: 100 } } })));
  const [target, setTarget] = useState<Raw | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const { pending, run } = useAction();
  const fee = n(target, 'successFeeKrw') ?? 0;
  const reloadAll = () => {
    reloadPending();
    reloadUnproposed();
  };
  const rows = (row: Raw): [string, ReactNode][] => [
    ['성공보수', won(n(row, 'successFeeKrw'))],
    ['도우미 제안', n(row, 'proposedAmountKrw') !== undefined ? `${won(n(row, 'proposedAmountKrw'))} · ${s(row, 'proposalNote')}` : '제안 없음'],
    ['이용자 거절 사유', s(row, 'rejectionNote')],
    ['상태', s(row, 'status')],
  ];
  const decideButton = (row: Raw) => (
    <button
      type="button"
      className="btn primary"
      onClick={() => {
        setTarget(row);
        setAmount(n(row, 'proposedAmountKrw') ?? 0);
        setNote('');
      }}
    >
      금액 결정
    </button>
  );
  return (
    <>
      <ListBlock title="결정 대기 정산" desc="이용자가 거절했거나 제안 후 24시간 동안 응답이 없는 정산이에요." load={pendingLoad} reload={reloadPending} empty="결정할 정산이 없어요.">
        {(list_) =>
          list_.map((row) => (
            <Item key={String(n(row, 'requestId'))} raw={row} title={`요청 #${n(row, 'requestId')}`} rows={rows(row)}>
              {decideButton(row)}
            </Item>
          ))
        }
      </ListBlock>
      <ListBlock title="도우미 제안 없는 부분성공" desc="결과 확정 후 24시간 동안 도우미가 금액을 제안하지 않은 거래예요." load={unproposedLoad} reload={reloadUnproposed} empty="해당 거래가 없어요.">
        {(list_) =>
          list_.map((row) => (
            <Item key={String(n(row, 'requestId'))} raw={row} title={`요청 #${n(row, 'requestId')}`} rows={rows(row)}>
              {decideButton(row)}
            </Item>
          ))
        }
      </ListBlock>
      {target && (
        <Modal title={`요청 #${n(target, 'requestId')} 정산 결정`} onClose={() => setTarget(null)}>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (amount > fee || !note.trim()) return;
              const ok = await run(
                () => unwrap(api.POST('/api/admin/requests/{requestId}/partial-settlement/decide', { params: { path: { requestId: n(target, 'requestId')! } }, body: { amountKrw: amount, note: note.trim() } })),
                '정산 금액을 결정했어요. 도우미 몫은 자동 지급 요청되고, 잔액은 이용자가 환불을 요청해요.',
              );
              if (ok) {
                setTarget(null);
                reloadAll();
              }
            }}
          >
            <Field label="도우미 몫(원)" required helper={`0원 ~ ${won(fee)}`}>
              <MoneyInput required max={fee} value={amount} onChange={setAmount} />
            </Field>
            <p className="record-note">이용자 환불 예정: {won(Math.max(0, fee - amount))}</p>
            <Field label="결정 사유" required>
              <textarea rows={3} required value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {amount > fee && <Notice tone="error">성공보수보다 많이 정할 수 없어요.</Notice>}
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setTarget(null)}>
                돌아가기
              </button>
              <button type="submit" className="btn primary" disabled={pending || amount > fee || !note.trim()}>
                결정
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ── 분쟁 확정·요청 만료 ─────────────────────────────────────
function RequestsTab() {
  const { pending, run } = useAction();
  const [requestId, setRequestId] = useState('');
  const [result, setResult] = useState<components['schemas']['RequestResult']>('SUCCESS');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [expired, setExpired] = useState<number | null>(null);

  async function resolve(e: FormEvent) {
    e.preventDefault();
    if (!Number(requestId) || !note.trim()) return;
    const ok = await run(
      () => unwrap(api.POST('/api/admin/requests/{requestId}/resolve', { params: { path: { requestId: Number(requestId) } }, body: { result, note: note.trim(), actualOutcomeDescription: outcome.trim() || undefined } })),
      '분쟁 결과를 확정했어요. 요청이 완료로 바뀌고 정산이 판단돼요.',
    );
    if (ok) {
      setNote('');
      setOutcome('');
    }
  }

  return (
    <>
      <section className="content-card">
        <h2>분쟁 결과 확정</h2>
        <p className="record-note">도우미와 이용자의 결과가 달라 분쟁(DISPUTED)이 된 요청의 최종 결과를 정해요. 명세에 분쟁 목록 API가 없어 요청 번호를 직접 입력해요.</p>
        <form noValidate onSubmit={resolve}>
          <div className="form-grid">
            <Field label="요청 번호" required>
              <input inputMode="numeric" required value={requestId} onChange={(e) => setRequestId(e.target.value.replace(/[^0-9]/g, ''))} />
            </Field>
            <Field label="최종 결과" required>
              <select value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
                <option value="SUCCESS">성공</option>
                <option value="PARTIAL">부분 성공</option>
                <option value="FAILURE">실패</option>
              </select>
            </Field>
          </div>
          <Field label="확정 사유" required>
            <textarea rows={3} required value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="실제 결과">
            <input value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </Field>
          {Number(requestId) > 0 && (
            <p className="record-note">
              <Link to={`/requests/${requestId}`}>요청 #{requestId} 상세 보기</Link> (관리자가 거래 당사자가 아니면 상세가 열리지 않을 수 있어요)
            </p>
          )}
          <button type="submit" className="btn primary" disabled={pending || !Number(requestId) || !note.trim()}>
            결과 확정
          </button>
        </form>
      </section>
      <section className="content-card">
        <h2>기한 지난 요청 만료</h2>
        <p className="record-note">수락 기한이 지난 대기(PENDING) 요청을 만료(EXPIRED)로 정리해요. 자동 작업(RequestExpiryJob)이 꺼져 있을 때 써요.</p>
        <button
          type="button"
          className="btn secondary"
          disabled={pending}
          onClick={() => run(async () => setExpired(num(await unwrap<unknown>(api.POST('/api/admin/requests/expire'))) ?? 0))}
        >
          지금 만료 처리
        </button>
        {expired !== null && <Notice tone="success">{expired}건을 만료 처리했어요.</Notice>}
      </section>
    </>
  );
}

// ── 결제 확인 ─────────────────────────────────────────────
const reviewTypes: Record<string, string> = { EVENT: '실패 웹훅', PAYMENT_FLAG: '수동 확인 표시', PAYMENT_STUCK: 'PG 확인 지연', REFUND_STUCK: '환불 지연' };
function PaymentsTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/payments/review', { params: { query: { page: 0, size: 100 } } })));
  const { open, modal, pending } = useDialog(reload);
  return (
    <>
      <ListBlock title="결제 확인 목록" desc="자동 처리가 사람에게 넘긴 결제예요. 처리 기록은 상태를 바꾸지 않으니, 돈을 움직이는 조치(PG 취소 등)는 따로 한 뒤 기록해요." load={load} reload={reload} empty="확인할 결제가 없어요.">
        {(rows) =>
          rows.map((row) => (
            <Item
              key={s(row, 'key')}
              raw={row}
              title={`${reviewTypes[s(row, 'type')] ?? s(row, 'type')} · 주문 ${s(row, 'orderNumber')}`}
              rows={[
                ['결제', `#${n(row, 'paymentId')} · ${s(row, 'paymentStatus')} · ${won(n(row, 'amountKrw'))}`],
                ['코드', s(row, 'code')],
                ['내용', s(row, 'detail')],
                ['발생 시각', utcToLocal(s(row, 'occurredAt'))],
              ]}
            >
              <button
                type="button"
                className="btn primary"
                disabled={pending}
                onClick={() =>
                  open({
                    title: '처리 완료 기록',
                    fields: [noteField('확인·조치 내용')],
                    submitText: '기록',
                    success: '처리 완료로 기록했어요.',
                    action: (v) => unwrap(api.POST('/api/admin/payments/review/resolutions', { body: { key: s(row, 'key'), note: v.note } })),
                  })
                }
              >
                처리 완료 기록
              </button>
            </Item>
          ))
        }
      </ListBlock>
      {modal}
    </>
  );
}

// ── 회원 제재 ─────────────────────────────────────────────
function UsersTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/users', { params: { query: { page: 0, size: 100 } } })));
  const { open, modal, pending } = useDialog(reload);
  const restrict = (row: Raw, kind: 'user' | 'agent', suspended: boolean) =>
    open({
      title: `${kind === 'user' ? '이용' : '도우미 활동'} ${suspended ? '정지' : '정지 해제'}`,
      fields: [noteField('사유')],
      submitText: suspended ? '정지' : '해제',
      danger: suspended,
      success: suspended ? '정지했어요.' : '해제했어요.',
      action: (v) => {
        const opts = { params: { path: { userId: n(row, 'userId', 'id')! } }, body: { suspended, reason: v.note } };
        return unwrap(kind === 'user' ? api.PUT('/api/admin/users/{userId}/restriction', opts) : api.PUT('/api/admin/users/{userId}/agent-restriction', opts));
      },
    });
  return (
    <>
      <ListBlock title="회원 목록" desc="이용 정지는 로그인과 모든 이용을, 도우미 활동 정지는 요청 수신·수락·착수를 막아요. 정지하면 그 회원의 모든 세션이 끊겨요." load={load} reload={reload} empty="회원이 없어요.">
        {(rows) =>
          rows.map((row) => {
            const suspended = s(row, 'status') === 'SUSPENDED';
            const agentSuspended = pick(row, 'agentSuspended', 'agentRestricted', 'agentSuspendedAt') ? true : false;
            return (
              <Item
                key={String(n(row, 'userId', 'id'))}
                raw={row}
                title={`#${n(row, 'userId', 'id')} ${s(row, 'nickname')}`}
                rows={[
                  ['이메일', s(row, 'email')],
                  ['상태', s(row, 'status')],
                  ['본인인증', s(row, 'identityStatus')],
                  ['관리자', pick(row, 'isAdmin', 'admin') ? '예' : ''],
                  ['가입', utcToLocal(s(row, 'createdAt'))],
                ]}
              >
                <button type="button" className={`btn ${suspended ? 'secondary' : 'ghost tx-danger'}`} disabled={pending} onClick={() => restrict(row, 'user', !suspended)}>
                  {suspended ? '이용 정지 해제' : '이용 정지'}
                </button>
                <button type="button" className={`btn ${agentSuspended ? 'secondary' : 'ghost tx-danger'}`} disabled={pending} onClick={() => restrict(row, 'agent', !agentSuspended)}>
                  {agentSuspended ? '도우미 정지 해제' : '도우미 활동 정지'}
                </button>
              </Item>
            );
          })
        }
      </ListBlock>
      {modal}
    </>
  );
}

// ── 약관·예매처 ────────────────────────────────────────────
type PlatformBody = components['schemas']['PlatformInput'];
const emptyPlatform: PlatformBody = { code: '', name: '', homepageUrl: 'https://', enabled: true, policyAssessment: 'ALLOW', policySourceUrl: '', policyNote: '' };
const assessments: [PlatformBody['policyAssessment'], string][] = [
  ['ALLOW', '허용'],
  ['CONDITIONAL', '조건부 허용'],
  ['BLOCK', '차단'],
  ['UNKNOWN', '미확인'],
];

function SetupTab() {
  const [load, reload] = useAdminList(() => unwrap(api.GET('/api/admin/platforms')));
  const { pending, run } = useAction();
  const [platform, setPlatform] = useState<{ id?: number; body: PlatformBody } | null>(null);
  const [policy, setPolicy] = useState({ type: 'TERMS' as components['schemas']['PolicyDocumentType'], version: '', contentUrl: 'https://', contentSha256: '', effectiveAt: '' });

  async function savePlatform(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!platform || !e.currentTarget.checkValidity()) return;
    const body = { ...platform.body, policySourceUrl: platform.body.policySourceUrl || undefined, policyNote: platform.body.policyNote || undefined };
    const ok = await run(
      () => unwrap(platform.id ? api.PUT('/api/admin/platforms/{platformId}', { params: { path: { platformId: platform.id } }, body }) : api.POST('/api/admin/platforms', { body })),
      platform.id ? '예매처를 수정했어요.' : '예매처를 등록했어요.',
    );
    if (ok) {
      setPlatform(null);
      reload();
    }
  }

  async function savePolicy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return;
    await run(
      () => unwrap(api.POST('/api/admin/policies', { body: { ...policy, effectiveAt: new Date(policy.effectiveAt).toISOString().slice(0, 19) } })),
      '새 약관 버전을 등록했어요. 시행 시각부터 회원가입·요청에 쓰여요.',
    );
  }

  async function hashFromUrl() {
    await run(async () => {
      const res = await fetch(policy.contentUrl);
      if (!res.ok) throw new Error('원문을 불러오지 못했어요.');
      const buf = await crypto.subtle.digest('SHA-256', await res.arrayBuffer());
      setPolicy({ ...policy, contentSha256: [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') });
    }, '원문 해시를 계산했어요.');
  }

  return (
    <>
      <section className="content-card">
        <div className="title-between">
          <h2>예매처</h2>
          <button type="button" className="btn secondary" onClick={() => setPlatform({ body: { ...emptyPlatform } })}>
            예매처 등록
          </button>
        </div>
        <p className="record-note">요청서·도우미 신청의 예매처 선택지예요. 대리 신청 정책이 허용·조건부 허용이어야 수락·착수할 수 있어요.</p>
        {load.status === 'loading' ? (
          <p className="prose">불러오는 중이에요.</p>
        ) : load.status === 'error' ? (
          <Notice tone="error">{load.message}</Notice>
        ) : load.data.length ? (
          load.data.map((row) => (
            <Item
              key={String(n(row, 'platformId', 'id'))}
              raw={row}
              title={`${s(row, 'name')} (${s(row, 'code')})`}
              rows={[
                ['홈페이지', s(row, 'homepageUrl')],
                ['정책', assessments.find(([v]) => v === s(row, 'policyAssessment'))?.[1] ?? s(row, 'policyAssessment')],
                ['사용', pick(row, 'enabled') === false ? '꺼짐' : '켜짐'],
                ['근거', s(row, 'policySourceUrl')],
                ['메모', s(row, 'policyNote')],
              ]}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setPlatform({
                    id: n(row, 'platformId', 'id'),
                    body: {
                      code: s(row, 'code'),
                      name: s(row, 'name'),
                      homepageUrl: s(row, 'homepageUrl'),
                      enabled: pick(row, 'enabled') !== false,
                      policyAssessment: (s(row, 'policyAssessment') || 'UNKNOWN') as PlatformBody['policyAssessment'],
                      policySourceUrl: s(row, 'policySourceUrl'),
                      policyNote: s(row, 'policyNote'),
                    },
                  })
                }
              >
                수정
              </button>
            </Item>
          ))
        ) : (
          <p className="prose">등록된 예매처가 없어요.</p>
        )}
      </section>

      <section className="content-card">
        <h2>새 약관 버전 등록</h2>
        <p className="record-note">이용약관·개인정보·연락처 제공 동의 문서의 원문 주소와 원문의 SHA-256 해시를 등록해요. 시행 시각이 지나면 현재 약관(GET /api/policies)으로 쓰여요.</p>
        <form noValidate onSubmit={savePolicy}>
          <div className="form-grid">
            <Field label="문서 종류" required>
              <select value={policy.type} onChange={(e) => setPolicy({ ...policy, type: e.target.value as typeof policy.type })}>
                <option value="TERMS">서비스 이용약관</option>
                <option value="PRIVACY">개인정보 처리방침</option>
                <option value="CONTACT_SHARING">연락처 제공 동의</option>
              </select>
            </Field>
            <Field label="버전" required>
              <input required maxLength={30} value={policy.version} onChange={(e) => setPolicy({ ...policy, version: e.target.value })} placeholder="예: 2026-10-01" />
            </Field>
          </div>
          <Field label="원문 주소" required>
            <input type="url" required pattern="https?://.+" maxLength={1000} value={policy.contentUrl} onChange={(e) => setPolicy({ ...policy, contentUrl: e.target.value })} />
          </Field>
          <Field label="원문 SHA-256" required helper="원문 파일의 SHA-256(16진수 64자리). 원문 주소에서 계산하거나 직접 붙여 넣어요.">
            <input required pattern="[a-fA-F0-9]{64}" value={policy.contentSha256} onChange={(e) => setPolicy({ ...policy, contentSha256: e.target.value.trim() })} />
          </Field>
          <div className="account-inline">
            <button type="button" className="btn ghost" disabled={pending || !/^https?:\/\/.+/.test(policy.contentUrl)} onClick={() => void hashFromUrl()}>
              원문 주소에서 해시 계산
            </button>
            <small className="field-helper">다른 도메인이면 브라우저 보안 정책(CORS) 때문에 실패할 수 있어요.</small>
          </div>
          <Field label="시행 시각" required>
            <input type="datetime-local" required value={policy.effectiveAt} onChange={(e) => setPolicy({ ...policy, effectiveAt: e.target.value })} />
          </Field>
          <button type="submit" className="btn primary" disabled={pending}>
            약관 등록
          </button>
        </form>
      </section>

      {platform && (
        <Modal title={platform.id ? '예매처 수정' : '예매처 등록'} onClose={() => setPlatform(null)}>
          <form noValidate onSubmit={savePlatform}>
            <div className="form-grid">
              <Field label="코드" required helper="영문 대문자·숫자·_ 30자까지">
                <input required pattern="[A-Z0-9_]{1,30}" value={platform.body.code} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, code: e.target.value.toUpperCase() } })} />
              </Field>
              <Field label="이름" required>
                <input required maxLength={100} value={platform.body.name} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, name: e.target.value } })} />
              </Field>
            </div>
            <Field label="홈페이지" required>
              <input type="url" required pattern="https?://.+" value={platform.body.homepageUrl} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, homepageUrl: e.target.value } })} />
            </Field>
            <Field label="대리 신청 정책" required>
              <select value={platform.body.policyAssessment} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, policyAssessment: e.target.value as PlatformBody['policyAssessment'] } })}>
                {assessments.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="정책 근거 URL">
              <input type="url" pattern="https?://.+" value={platform.body.policySourceUrl ?? ''} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, policySourceUrl: e.target.value } })} />
            </Field>
            <Field label="정책 메모">
              <textarea rows={2} value={platform.body.policyNote ?? ''} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, policyNote: e.target.value } })} />
            </Field>
            <label className="check-row">
              <input type="checkbox" checked={platform.body.enabled ?? true} onChange={(e) => setPlatform({ ...platform, body: { ...platform.body, enabled: e.target.checked } })} />
              사용(목록에 표시)
            </label>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setPlatform(null)}>
                돌아가기
              </button>
              <button type="submit" className="btn primary" disabled={pending}>
                저장
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('policy');
  return (
    <>
      <PageTitle title="관리자" />
      <p className="record-note">관리자 계정(users.is_admin)으로만 동작해요. 모든 작업은 서버에 바로 반영되니 확인 후 실행해 주세요.</p>
      <div className="request-tabs tx-tabs admin-tabs" role="tablist" aria-label="관리자 메뉴">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'policy' && <PolicyTab />}
      {tab === 'files' && <FilesTab />}
      {tab === 'profiles' && <ProfilesTab />}
      {tab === 'attempts' && <AttemptsTab />}
      {tab === 'settlements' && <SettlementsTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'setup' && <SetupTab />}
    </>
  );
}
