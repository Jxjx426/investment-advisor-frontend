import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate(); // React Router提供的function，
  // 让你用code的方式跳转页面（不用使用者点击连结）

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    const res = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/login'), 1000);
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>建立帐号</h2>
        <p className="auth-subtitle">开始追踪你的投资组合</p>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">注册成功，正在跳转登入...</p>}

        <label className="auth-label">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-label">密码</label>
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="至少6位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '隐藏' : '显示'}
          </button>
        </div>

        <label className="auth-label">确认密码</label>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" className="auth-submit">注册</button>

        <p className="auth-switch">
          已经有帐号？ <Link to="/login">立即登入</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;