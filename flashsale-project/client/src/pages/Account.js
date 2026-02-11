import * as api from '../services/api';
import './Account.css';

function Account() {
  const user = api.getUser();

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-card">
          <h1 className="account-title">Tài khoản</h1>
          <p className="account-text">
            Bạn chưa đăng nhập. Vui lòng đăng nhập để xem thông tin tài khoản.
          </p>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.email;

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">Xin chào, {displayName}</h1>
        <p className="account-text">
          Trang cài đặt tài khoản sẽ được bổ sung trong các giai đoạn tiếp theo.
        </p>
      </div>
    </div>
  );
}

export default Account;

