import { useState } from 'react';
import { api, unwrap } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageTitle } from '../ui/PageTitle';

// 명세에 응답 스키마가 없는 API(data: object)의 실제 모양을 확인하는 개발용 화면.
// 필드가 확정되면 타입을 정의하고 이 화면은 삭제한다.
const checks = [
  { label: 'GET /api/health', auth: false, run: () => api.GET('/api/health') },
  { label: 'GET /api/policies', auth: false, run: () => api.GET('/api/policies') },
  { label: 'GET /api/platforms', auth: false, run: () => api.GET('/api/platforms') },
  { label: 'GET /api/agents', auth: false, run: () => api.GET('/api/agents', { params: { query: { page: 0, size: 5 } } }) },
  { label: 'GET /api/me', auth: true, run: () => api.GET('/api/me') },
  { label: 'GET /api/requests', auth: true, run: () => api.GET('/api/requests', { params: { query: { page: 0, size: 5 } } }) },
  { label: 'GET /api/requests/counts', auth: true, run: () => api.GET('/api/requests/counts') },
  { label: 'GET /api/notifications', auth: true, run: () => api.GET('/api/notifications') },
  { label: 'GET /api/matching-passes/balance', auth: true, run: () => api.GET('/api/matching-passes/balance') },
];

export function ApiCheckPage() {
  const { loggedIn } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});

  async function run(check: (typeof checks)[number]) {
    setResults((r) => ({ ...r, [check.label]: '불러오는 중…' }));
    let text: string;
    try {
      text = JSON.stringify(await unwrap(check.run() as never), null, 2);
    } catch (e) {
      text = `오류: ${e instanceof Error ? e.message : String(e)}`;
    }
    setResults((r) => ({ ...r, [check.label]: text }));
  }

  return (
    <>
      <PageTitle title="API 연결 확인" />
      <p className="record-note">백엔드 연결과 응답 모양을 확인하는 개발용 화면이에요.</p>
      {checks.map((c) => (
        <section key={c.label} className="content-card">
          <div className="dev-check">
            <code>{c.label}</code>
            <button className="btn secondary" onClick={() => run(c)} disabled={c.auth && !loggedIn}>
              {c.auth && !loggedIn ? '로그인 필요' : '호출'}
            </button>
          </div>
          {results[c.label] && <pre className="dev-json">{results[c.label]}</pre>}
        </section>
      ))}
    </>
  );
}
