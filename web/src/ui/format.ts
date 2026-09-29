export const money = (n: number | string | undefined) => Number(n || 0).toLocaleString('ko-KR');
