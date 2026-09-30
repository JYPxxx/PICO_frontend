export const money = (n: number | string | undefined) => Number(n || 0).toLocaleString('ko-KR');

/** 메일의 링크 전체를 붙여 넣어도, token= 뒤 값만 붙여 넣어도 토큰만 꺼낸다. */
export function tokenFrom(value: string) {
  const v = value.trim();
  const at = v.indexOf('token=');
  if (at < 0) return v;
  const raw = v.slice(at + 6).split(/[&#\s]/)[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
