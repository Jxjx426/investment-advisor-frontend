import { useState } from "react";
import { request } from "../api";
import Icon from "../components/Icon";
export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const credentials = {
      email: String(values.get('email') || '').trim(),
      password: String(values.get('password') || ''),
    };
    setBusy(true);
    setError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
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
      <form className="login-form" onSubmit={submit}>
        <div className="login-brand">
          <Icon name="research" size={25} />
          <h1>Investments</h1>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
