import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../services/api';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  // Validate email format
  const validateEmailFormat = (email) => {
    if (!email || typeof email !== 'string') return false;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    // Trường hợp không nhập cả email và mật khẩu
    if (!trimmedEmail && !trimmedPassword) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    // Thiếu email
    if (!trimmedEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    // Thiếu mật khẩu
    if (!trimmedPassword) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    // Validate email chi tiết
    if (!validateEmailFormat(trimmedEmail)) {
      setError('Email không đúng định dạng (ví dụ: email@example.com)');
      return;
    }
    if (trimmedEmail.length > 254) {
      setError('Email không được vượt quá 254 ký tự');
      return;
    }

    // Validate mật khẩu chi tiết
    if (!trimmedPassword.trim()) {
      setError('Mật khẩu không được để trống.');
      return;
    }
    if (trimmedPassword.length > 100) {
      setError('Mật khẩu không được vượt quá 100 ký tự');
      return;
    }

    setLoading(true);
    try {
      if (api.isApiConfigured()) {
        const { token, user } = await api.login(trimmedEmail.toLowerCase(), trimmedPassword);
        if (token) api.setToken(token);
        // Luôn cố lấy profile đầy đủ sau login để có role/permissions chính xác.
        const me = token ? await api.getCurrentUser() : null;
        if (me) api.setUser(me);
        else if (user) api.setUser(user);
        const safeRedirect = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
        navigate(safeRedirect, { replace: true });
        return;
      }
      // DEV ONLY – remove when backend ready
      api.setUser({ email: email.trim().toLowerCase(), name: 'User' });
      api.setToken('mock-token');
      const safeRedirect = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      navigate(safeRedirect, { replace: true });
    } catch (err) {
      // Ưu tiên các case đặc biệt cho UX rõ ràng
      const statusCode = Number(err?.status);
      const backendMessage = err?.response?.message || err?.message || '';

      if (statusCode === 401 || backendMessage.includes('Email hoặc mật khẩu')) {
        // Sai email hoặc mật khẩu
        setError('Email hoặc mật khẩu không đúng.');
      } else if (err && err.isNetworkError) {
        // Lỗi kết nối tới backend
        setError('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.');
      } else {
        // Các lỗi khác
        const errorMessage = err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Đăng nhập</h1>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <p className="login-error">{error}</p>}
          
          <div className="login-field">
            <label htmlFor="login-email">Email *</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vd: email@example.com"
              autoComplete="email"
              disabled={loading}
              maxLength={254}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Mật khẩu *</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
        <p className="login-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
