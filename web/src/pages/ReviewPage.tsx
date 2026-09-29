import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { fetchDetail, roleIn, useLoad } from '../transactions/model';
import { Notice, useAction } from '../transactions/ui';
import { useAppState } from '../AppState';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';
import { useToast } from '../ui/Toast';

// 프로토타입 discovery.js의 review()와 pc-interactions.js의 starField().
// 명세: POST /api/requests/{id}/review {rating 1~5, comment ≤400, imageKey?} — COMPLETED 거래의 이용자만, 한 번.
function StarField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <fieldset className="field star-field">
      <legend>
        별점 <em>필수</em>
      </legend>
      <div className="star-picker">
        <div className="star-options" role="radiogroup" aria-label="거래 별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}점`} className={n <= value ? 'filled' : ''} onClick={() => onChange(n)}>
              <Icon name="star" size={28} />
            </button>
          ))}
        </div>
        <output>{value ? `${value}점` : '별점을 선택해 주세요'}</output>
      </div>
    </fieldset>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useAuth();
  const [{ mode }] = useAppState();
  const [load] = useLoad(() => fetchDetail(requestId), [requestId]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const { pending, run } = useAction();

  if (load.status === 'loading')
    return (
      <div className="empty" role="status">
        <p>거래를 불러오는 중이에요.</p>
      </div>
    );
  if (load.status === 'error') return <Navigate to="/requests" replace />;

  const { request: r, stage, review } = load.data;
  if (stage !== 'completed' || roleIn(r, me, mode) !== 'user' || review)
    return (
      <>
        <PageTitle title="후기를 작성할 수 없어요" crumbs={[{ label: '요청 상세', to: `/requests/${requestId}` }]} />
        <div className="empty">
          <p>{review ? '이미 후기를 남긴 거래예요.' : '거래를 완료한 이용자만 한 번 작성할 수 있어요.'}</p>
          <button type="button" className="btn secondary" onClick={() => navigate(`/requests/${requestId}`)}>
            요청 상세로
          </button>
        </div>
      </>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return toast('별점을 선택해 주세요.');
    const ok = await run(async () => {
      let imageKey: string | undefined;
      if (image) {
        // 인증 사진 1장: POST /api/files/upload-url(REVIEW_IMAGE) → 업로드 → imageKey로 전달
        const target = await unwrap(api.POST('/api/files/upload-url', { body: { purpose: 'REVIEW_IMAGE', originalName: image.name, mimeType: image.type, sizeBytes: image.size } }));
        const res = await fetch(target.uploadUrl!, { method: target.method || 'PUT', headers: target.requiredHeaders, body: image });
        if (!res.ok) throw new Error('사진을 올리지 못했어요.');
        imageKey = target.storageKey;
      }
      await unwrap(api.POST('/api/requests/{requestId}/review', { params: { path: { requestId } }, body: { rating, comment: comment.trim() || null, imageKey: imageKey ?? null } }));
    }, '후기를 등록했어요. 고마워요!');
    if (ok) navigate(`/requests/${requestId}`, { replace: true });
  }

  return (
    <>
      <PageTitle title="후기 작성" crumbs={[{ label: '요청 상세', to: `/requests/${requestId}` }]} />
      <div className="account-contained">
        <section className="content-card">
          <h2>{r.targetName}</h2>
          <p className="prose">{r.agentName} 도우미와 함께한 경험을 다른 이용자에게 알려 주세요.</p>
          <form id="review-form" noValidate onSubmit={submit}>
            <StarField value={rating} onChange={setRating} />
            <label className="field">
              <span>
                후기 <small>선택</small>
              </span>
              <textarea rows={5} maxLength={400} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="진행 과정과 결과가 어땠는지 알려 주세요." />
              <small className="counter">{comment.length}/400</small>
            </label>
            <div className="field">
              <span>
                인증 사진 <small>선택 · 1장</small>
              </span>
              <div className="account-inline">
                <label className="btn secondary account-file-label">
                  {image ? '사진 변경' : '사진 선택'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = '';
                      if (f && f.size > 20 * 1024 * 1024) return toast('사진은 20MB까지 올릴 수 있어요.');
                      setImage(f);
                    }}
                  />
                </label>
                {image && (
                  <>
                    <span className="field-helper">{image.name}</span>
                    <button type="button" className="btn ghost" onClick={() => setImage(null)}>
                      삭제
                    </button>
                  </>
                )}
              </div>
              <small className="field-helper">예매 내역이나 좌석 사진을 올릴 수 있어요. 개인정보는 가려 주세요.</small>
            </div>
            <Notice>완료한 거래의 후기에는 거래 인증 배지가 표시돼요.</Notice>
            <div className="account-form-footer">
              <button type="submit" className="btn primary" disabled={pending || !rating}>
                {pending ? '등록 중…' : '후기 등록하기'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
