import { useState } from "react";
import { api, auth } from "../lib/api.js";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.login(password);
      auth.token = res.token;
      onSuccess();
    } catch (err) {
      setError("That password didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden>✦</span>
          <h1>doozy</h1>
        </div>
        <p className="login-tag">Make today a doozy.</p>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
