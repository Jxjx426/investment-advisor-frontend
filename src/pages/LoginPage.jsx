import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api';

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      return;
    }

    localStorage.setItem('token', data.token);
    onLoginSuccess();
    navigate('/');
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>欢迎回来</h2>
        <p className="auth-subtitle">登入查看你的投资组合</p>

        {error && <p className="form-error">{error}</p>}

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
            placeholder="输入密码"
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

        <button type="submit" className="auth-submit">登入</button>

        <p className="auth-switch">
          还没有帐号？ <Link to="/register">立即注册</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;