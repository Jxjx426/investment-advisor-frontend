import { useState } from "react";
import { request } from "../api";
export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("token", data.token);
      onLoginSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-intro">
        <span className="brand-mark">m.</span>
        <p className="eyebrow">MY INVESTMENT TRACKER</p>
        <h1>
          Your money.
          <br />A clearer picture.
        </h1>
        <p>
          Two portfolios, one place to keep track.
          <br />
          Built for you and your father.
        </p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
        <h2>Welcome back</h2>
        <p>Sign in to your investment tracker.</p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in →"}
        </button>
        <small>
          One private account manages both portfolios.
          <br />
          Your session stays signed in for seven days.
        </small>
      </form>
    </main>
  );
}
