import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import './Register.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const navigate = useNavigate();

  // Validate email format
  const validateEmailFormat = (email) => {
    if (!email || typeof email !== 'string') return false;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  };

  // Validate password và cập nhật requirements
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8 && password.length <= 100,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    setPasswordRequirements(requirements);
    
    if (!password || password.trim().length === 0) {
      return { valid: false, message: 'Mật khẩu không được để trống' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' };
    }
    if (password.length > 100) {
      return { valid: false, message: 'Mật khẩu không được vượt quá 100 ký tự' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ hoa (A-Z)' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ thường (a-z)' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải có ít nhất 1 số (0-9)' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)' };
    }
    return { valid: true };
  };

  // Validate name
  const validateName = (name) => {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: 'Họ tên không được để trống' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { valid: false, message: 'Họ tên không được để trống' };
    }
    if (trimmedName.length < 2) {
      return { valid: false, message: 'Họ tên phải có ít nhất 2 ký tự' };
    }
    if (trimmedName.length > 100) {
      return { valid: false, message: 'Họ tên không được vượt quá 100 ký tự' };
    }
    if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(trimmedName)) {
      return { valid: false, message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' };
    }
    return { valid: true };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      validatePassword(newPassword);
    } else {
      setPasswordRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate name
    if (!name.trim()) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.message);
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!validateEmailFormat(email)) {
      setError('Email không đúng định dạng (ví dụ: email@example.com)');
      return;
    }
    if (email.length > 254) {
      setError('Email không được vượt quá 254 ký tự');
      return;
    }

    // Validate password
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      if (api.isApiConfigured()) {
        await api.register(email.trim().toLowerCase(), password, name.trim());
        setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }
      // DEV ONLY – remove when backend ready
      setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true);

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">Đăng ký</h1>
        <form onSubmit={handleSubmit} className="register-form">
          {error && <p className="register-error">{error}</p>}
          {success && <p className="register-success">{success}</p>}
          
          <div className="register-field">
            <label htmlFor="register-name">Họ tên *</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ tên (tối thiểu 2 ký tự)"
              autoComplete="name"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-email">Email *</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vd: email@example.com"
              autoComplete="email"
              disabled={loading}
              maxLength={254}
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Mật khẩu *</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Tối thiểu 8 ký tự: chữ hoa, thường, số và ký tự đặc biệt"
              autoComplete="new-password"
              disabled={loading}
              maxLength={100}
            />
            {password && (
              <div className="register-password-requirements">
                <p className="register-requirements-title">Yêu cầu mật khẩu:</p>
                <ul className="register-requirements-list">
                  <li className={passwordRequirements.length ? 'valid' : 'invalid'}>
                    {passwordRequirements.length ? '✓' : '✗'} Ít nhất 8 ký tự
                  </li>
                  <li className={passwordRequirements.uppercase ? 'valid' : 'invalid'}>
                    {passwordRequirements.uppercase ? '✓' : '✗'} Có chữ hoa (A-Z)
                  </li>
                  <li className={passwordRequirements.lowercase ? 'valid' : 'invalid'}>
                    {passwordRequirements.lowercase ? '✓' : '✗'} Có chữ thường (a-z)
                  </li>
                  <li className={passwordRequirements.number ? 'valid' : 'invalid'}>
                    {passwordRequirements.number ? '✓' : '✗'} Có số (0-9)
                  </li>
                  <li className={passwordRequirements.special ? 'valid' : 'invalid'}>
                    {passwordRequirements.special ? '✓' : '✗'} Có ký tự đặc biệt (!@#$%^&*...)
                  </li>
                </ul>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="register-submit" 
            disabled={loading || (password && !allRequirementsMet)}
          >
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
