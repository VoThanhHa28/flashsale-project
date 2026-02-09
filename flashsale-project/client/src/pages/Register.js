import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import './Register.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (api.isApiConfigured()) {
        await api.register(email.trim().toLowerCase(), password, name.trim());
        navigate('/login', { replace: true });
        return;
      }
      // DEV ONLY – remove when backend ready (m sẽ tự thêm lại sau khi t merge auth vào)
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">Đăng ký</h1>
        <form onSubmit={handleSubmit} className="register-form">
          {error && <p className="register-error">{error}</p>}
          <div className="register-field">
            <label htmlFor="register-name">Họ tên</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ tên"
              autoComplete="name"
              disabled={loading}
            />
          </div>
          <div className="register-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vd: email@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="register-field">
            <label htmlFor="register-password">Mật khẩu</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <button type="submit" className="register-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <p className="register-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
