import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { list, str } from '../api/pick';
import { isApprovedAgent } from '../agent/profile';
import { useLoad } from '../transactions/model';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';
import { useToast } from '../ui/Toast';

// 프로토타입 account.js의 availability 화면(availabilityField). 도우미가 예매를 도울 수 있는 날짜를 고른다.
// 명세(GET·PUT /api/me/agent/availability)는 날짜가 아니라 UTC 시간 구간(startsAt·endsAt, ISO LocalDateTime)을 받는다.
// 변환 규칙(프론트에서 정함): 고른 날짜 하루 = 한국 시각 00:00~24:00 = UTC 전날 15:00 ~ 당일 15:00.
// 연속된 날짜는 한 구간으로 합친다. 읽을 때는 구간이 걸친 한국 날짜를 모두 선택된 날짜로 본다.
// 도우미 검색의 availableDates 필터가 "한국 날짜 기준 하루 중 가능한 시간이 겹치는 날짜"라 이 규칙과 맞는다.
const KST = 9 * 3600e3;
const DAY = 24 * 3600e3;
const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD'(한국 날짜)의 00:00 KST를 UTC 밀리초로 */
const kstMidnight = (date: string) => Date.parse(`${date}T00:00:00Z`) - KST;
/** UTC 밀리초 → 한국 날짜 'YYYY-MM-DD' */
const kstDate = (ms: number) => new Date(ms + KST).toISOString().slice(0, 10);
/** UTC 밀리초 → 명세 형식(UTC LocalDateTime, Z 없음) */
const utcLocal = (ms: number) => new Date(ms).toISOString().slice(0, 19);
const parseUtc = (v: string) => Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);

export function datesToIntervals(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  const intervals: { startsAt: string; endsAt: string }[] = [];
  let start = 0;
  let end = 0;
  for (const d of sorted) {
    const s = kstMidnight(d);
    if (end && s === end) end = s + DAY;
    else {
      if (end) intervals.push({ startsAt: utcLocal(start), endsAt: utcLocal(end) });
      start = s;
      end = s + DAY;
    }
  }
  if (end) intervals.push({ startsAt: utcLocal(start), endsAt: utcLocal(end) });
  return intervals;
}

export function intervalsToDates(intervals: { startsAt?: string; endsAt?: string }[]) {
  const dates = new Set<string>();
  for (const it of intervals) {
    const s = parseUtc(it.startsAt ?? '');
    const e = parseUtc(it.endsAt ?? '');
    if (!(s < e)) continue;
    // 구간이 조금이라도 걸친 한국 날짜를 모두 넣는다(끝 시각은 포함하지 않음).
    for (let t = kstMidnight(kstDate(s)); t < e; t += DAY) dates.add(kstDate(t));
  }
  return [...dates].sort();
}

export function AvailabilityPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [load] = useLoad(async () => {
    if (!(await isApprovedAgent())) return null;
    const raw = await unwrap<unknown>(api.GET('/api/me/agent/availability'));
    return intervalsToDates(list(raw).map((x) => ({ startsAt: str(x.startsAt), endsAt: str(x.endsAt) })));
  }, []);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const timer = useRef<number>(undefined);
  const today = kstDate(Date.now());

  // 변경은 0.6초 뒤 한 번에 저장한다(프로토타입: 변경 내용 자동 저장).
  useEffect(() => {
    if (selected === null) return;
    clearTimeout(timer.current);
    setStatus('저장 중…');
    timer.current = window.setTimeout(async () => {
      try {
        await unwrap(api.PUT('/api/me/agent/availability', { body: { intervals: datesToIntervals(selected) } }));
        setStatus('저장했어요.');
      } catch (e) {
        setStatus('');
        toast(e instanceof Error ? e.message : '예매 가능 날짜를 저장하지 못했어요.');
      }
    }, 600);
    return () => clearTimeout(timer.current);
  }, [selected, toast]);

  if (load.status === 'loading')
    return (
      <div className="empty" role="status">
        <p>예매 가능 날짜를 불러오는 중이에요.</p>
      </div>
    );
  if (load.status === 'error' || load.data === null)
    return (
      <>
        <PageTitle title="예매 가능 날짜" crumbs={[{ label: '매칭 관리', to: '/matches' }]} />
        <div className="empty">
          <p>{load.status === 'error' ? load.message : '도우미 승인 후 설정할 수 있어요.'}</p>
          <button type="button" className="btn primary" onClick={() => navigate(load.status === 'error' ? '/matches' : '/application')}>
            {load.status === 'error' ? '매칭 관리로' : '도우미 신청 확인'}
          </button>
        </div>
      </>
    );

  // 지난 날짜는 저장하지 않는다.
  const dates = (selected ?? load.data).filter((d) => d >= today);
  const toggle = (d: string) => setSelected(dates.includes(d) ? dates.filter((x) => x !== d) : [...dates, d].sort());
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();

  return (
    <>
      <PageTitle title="예매 가능 날짜" crumbs={[{ label: '매칭 관리', to: '/matches' }]} />
      <section className="content-card account-contained">
        <div className="helper-availability">
          <div className="availability-calendar-heading">
            <h2>예매 가능한 날짜</h2>
            <span>여러 날짜 선택 가능</span>
          </div>
          <p className="prose">날짜를 누르면 선택되고, 다시 누르면 해제돼요. 변경 내용은 자동 저장돼요.</p>
          <div className="availability-calendar">
            <div className="availability-month-nav">
              <button type="button" className="icon-btn" aria-label="이전 달" onClick={() => setMonth(new Date(y, m - 1, 1))}>
                <Icon name="chevron" size={18} />
              </button>
              <strong aria-live="polite">
                {y}년 {m + 1}월
              </strong>
              <button type="button" className="icon-btn" aria-label="다음 달" onClick={() => setMonth(new Date(y, m + 1, 1))}>
                <Icon name="chevron" size={18} />
              </button>
            </div>
            <div className="availability-weekdays" aria-hidden="true">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="availability-calendar-days" role="group" aria-label="예매 가능 날짜 선택">
              {Array.from({ length: first }, (_, i) => (
                <span key={`b${i}`} className="availability-blank" aria-hidden="true"></span>
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
                return (
                  <button
                    key={date}
                    type="button"
                    className={`availability-day ${date === today ? 'is-today' : ''}`}
                    aria-label={`${y}년 ${m + 1}월 ${i + 1}일`}
                    aria-pressed={dates.includes(date)}
                    aria-current={date === today ? 'date' : undefined}
                    disabled={date < today}
                    onClick={() => toggle(date)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="availability-selection">
            <h3>
              선택한 날짜 <span>{dates.length}일</span>
            </h3>
            <div className="availability-dates">
              {dates.length ? (
                dates.map((d) => (
                  <button key={d} type="button" className="chip" aria-label={`${d} 선택 해제`} onClick={() => toggle(d)}>
                    {d} ×
                  </button>
                ))
              ) : (
                <p className="record-note">선택한 날짜가 없어요. 달력에서 날짜를 선택해 주세요.</p>
              )}
            </div>
          </div>
          <p className="record-note">
            도우미 검색의 예매 날짜 필터에만 사용하며, 공개 프로필에는 표시하지 않아요. 선택한 날짜는 한국 시각 하루 전체(00:00~24:00)로 저장돼요.
          </p>
          <p className="record-note" role="status">
            {status}
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={() => navigate('/matches')}>
          매칭 관리로
        </button>
      </section>
    </>
  );
}
