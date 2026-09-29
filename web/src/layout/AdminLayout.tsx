import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { str } from '../api/pick';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../ui/Icon';

// 관리자 화면 전용 셸. 이용자·도우미 메뉴, 모드 전환, 알림은 관리자 작업과 관계없어 보여 주지 않는다.
// 헤더 마크업·클래스는 AppLayout(프로토타입 header())과 같은 것을 써서 모양을 맞춘다.
export function AdminLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const name = str(me?.nickname) ?? '';

  useEffect(() => {
    document.title = '관리자 · PICO';
  }, []);

  return (
    <>
      <header className="topbar admin-topbar">
        <div className="nav-wrap">
          <Link className="brand" to="/admin">
            <span className="brand-symbol">
              <Icon name="ticket" size={26} />
            </span>
            PICO <span className="admin-brand-badge">관리자</span>
          </Link>
          <div className="header-right">
            {name && <span className="admin-user">{name}님</span>}
            <button className="support-link" onClick={() => navigate('/')}>
              서비스 화면으로
            </button>
            <button className="header-login" onClick={() => void logout().then(() => navigate('/login'))}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="page admin" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
