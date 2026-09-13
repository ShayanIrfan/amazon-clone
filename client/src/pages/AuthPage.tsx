import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Step = "email" | "password" | "create";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Sent here by RequireAuth (e.g. from /checkout) — go back there on success
  // instead of always dropping the shopper at the home page.
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const { login, signup, loginDemo } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function changeEmail() {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return setError("Enter your email.");

    setBusy(true);
    try {
      const { exists } = await api.auth.checkEmail(trimmed);
      setEmail(trimmed);
      setStep(exists ? "password" : "create");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Enter your name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setBusy(true);
    try {
      await signup(name.trim(), email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function tryDemo() {
    setError(null);
    setBusy(true);
    try {
      await loginDemo();
      navigate(from, { replace: true });
    } catch {
      setError("Couldn't start the demo account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <Link to="/" className="mb-4">
        <span className="text-2xl font-bold text-neutral-900 italic">amazon-clone</span>
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-neutral-200 p-6">
        {step === "email" && (
          <form onSubmit={submitEmail}>
            <h1 className="text-2xl font-normal text-neutral-900">Sign in or create account</h1>
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="email">
              Email or mobile phone number
            </label>
            <input
              id="email"
              type="text"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-400 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-amazon-red">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-60"
            >
              Continue
            </button>
            <p className="mt-4 text-xs text-neutral-600">
              By continuing, you agree to amazon-clone's Conditions of Use and Privacy Notice.
            </p>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={submitPassword}>
            <h1 className="text-2xl font-normal text-neutral-900">Sign in</h1>
            <p className="mt-2 text-sm">
              {email}{" "}
              <button type="button" onClick={changeEmail} className="text-link hover:underline">
                Change
              </button>
            </p>
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-400 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-amazon-red">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-60"
            >
              Sign in
            </button>
          </form>
        )}

        {step === "create" && (
          <form onSubmit={submitCreate}>
            <h1 className="text-2xl font-normal text-neutral-900">Create account</h1>
            <p className="mt-2 text-sm">
              {email}{" "}
              <button type="button" onClick={changeEmail} className="text-link hover:underline">
                Change
              </button>
            </p>
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-400 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
            />
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="new-password">
              Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-400 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
            />
            <p className="mt-1 text-xs text-neutral-500">At least 6 characters.</p>
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="confirm-password">
              Re-enter password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-400 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-amazon-red">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-60"
            >
              Create your account
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 flex w-full max-w-sm items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        or
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <button
        type="button"
        onClick={tryDemo}
        disabled={busy}
        className="mt-4 w-full max-w-sm rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
      >
        Try demo account
      </button>
      <p className="mt-2 max-w-sm text-center text-xs text-neutral-500">
        Skip sign-up and explore as a demo shopper — no account needed.
      </p>
    </div>
  );
}
