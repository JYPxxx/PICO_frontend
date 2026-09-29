// 명세에 응답 필드가 없는(data: object) API에서 값을 꺼내는 도우미.
// 필드명이 확정되기 전까지 후보 이름을 차례로 찾는다. 확정되면 호출하는 쪽에서 후보를 하나로 줄인다.
export type Raw = Record<string, unknown>;

/** 'a.b' 같은 경로도 받는다. null·빈 문자열은 없는 값으로 본다. */
export function pick(raw: unknown, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Raw)[k] : undefined), raw);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() && !isNaN(Number(v)) ? Number(v) : undefined);
export const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
export const bool = (v: unknown) => v === true || v === 'true';
export const list = (v: unknown): Raw[] => (Array.isArray(v) ? v : v && typeof v === 'object' && Array.isArray((v as Raw).items) ? ((v as Raw).items as Raw[]) : []);
