import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to: string;
}

// 프로토타입 pageTitle() + breadcrumbs(). crumbs가 비면 현재 위치 표시를 생략한다.
export function PageTitle({ title, crumbs = [], current }: { title: string; crumbs?: Crumb[]; current?: string }) {
  return (
    <>
      {crumbs.length > 0 && (
        <nav className="page-breadcrumbs" aria-label="현재 위치">
          {crumbs.map((c) => (
            <Fragment key={c.to}>
              <Link to={c.to}>{c.label}</Link>
              <span aria-hidden="true">›</span>
            </Fragment>
          ))}
          <span aria-current="page">{current ?? title}</span>
        </nav>
      )}
      <div className="pc-page-title">
        <h1>{title}</h1>
      </div>
    </>
  );
}
