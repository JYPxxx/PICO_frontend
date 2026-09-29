import { money } from '../ui/format';

// 프로토타입 discovery-filters.js / discovery.js의 필터·정렬 상태. 실제 검색은 서버(GET /api/agents)가 한다(agent.ts).
export interface Filters {
  min: number;
  max: number;
  dates: string[];
  rating: number;
  success: number;
  sites: string[];
}
export type FilterKey = 'price' | 'date' | 'rating' | 'success' | 'sites';
export type Sort = 'recommend' | 'low' | 'high' | 'rating' | 'trades' | 'success';

export const emptyFilters = (): Filters => ({ min: 0, max: 0, dates: [], rating: 0, success: 0, sites: [] });
export const sortOptions: [Sort, string][] = [
  ['recommend', '추천순'],
  ['low', '착수비 낮은순'],
  ['high', '착수비 높은순'],
  ['rating', '별점순'],
  ['trades', '거래 많은순'],
  ['success', '성공률순'],
];

export function filterLabels(f: Filters): [FilterKey, string][] {
  return (
    [
      f.min || f.max ? ['price', `착수비 ${f.min ? money(f.min) : '0'}원 ~ ${f.max ? money(f.max) + '원' : '제한 없음'}`] : null,
      f.dates.length ? ['date', '예매 날짜 ' + f.dates.join(' · ')] : null,
      f.rating ? ['rating', `별점 ${f.rating} 이상`] : null,
      f.success ? ['success', `성공률 ${f.success}% 이상`] : null,
      f.sites.length ? ['sites', f.sites.join(' · ')] : null,
    ] as ([FilterKey, string] | null)[]
  ).filter((x): x is [FilterKey, string] => !!x);
}

export function removeFilter(f: Filters, key: FilterKey): Filters {
  if (key === 'price') return { ...f, min: 0, max: 0 };
  if (key === 'date') return { ...f, dates: [] };
  return { ...f, [key]: emptyFilters()[key] };
}
