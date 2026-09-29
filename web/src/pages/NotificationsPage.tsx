import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../layout/notifications';
import { utcToLocal } from '../transactions/ui';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';

// 프로토타입 app.js의 notifications 화면. GET /api/notifications
export function NotificationsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { items, unread, open, readAll } = useNotifications(pathname);
  return (
    <>
      <PageTitle title="알림" />
      <div className="notification-header">
        <span>안 읽은 알림 {unread}개</span>
        <button className="text-link" disabled={!unread} onClick={() => void readAll()}>
          모두 읽음
        </button>
      </div>
      <section className="content-card notification-list">
        {items.length ? (
          items.map((n) => (
            <button
              key={n.notificationId}
              className={`notification-item ${!n.readAt ? 'unread' : ''}`}
              onClick={async () => {
                await open(n);
                if (n.requestId) navigate(`/requests/${n.requestId}`);
              }}
            >
              <span className="notification-icon">
                <Icon name={n.requestId ? 'check' : 'bell'} size={20} />
              </span>
              <div>
                <h3>
                  {n.title}
                  {!n.readAt && <i></i>}
                </h3>
                <p>{n.body}</p>
                <small>{utcToLocal(n.createdAt)}</small>
              </div>
              {n.requestId && <Icon name="chevron" size={16} />}
            </button>
          ))
        ) : (
          <div className="empty">
            <h2>아직 도착한 알림이 없어요</h2>
            <p>진행 소식을 이곳에서 알려드릴게요.</p>
          </div>
        )}
      </section>
    </>
  );
}
