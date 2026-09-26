import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../lib/api";
import { passwordValidationMessage } from "../lib/password";
import { Lock, RotateCcw, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/layout/Logo";

type Screen = "login" | "signup" | "verify-email" | "two-factor" | "forgot" | "reset";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-white px-4 text-sm outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10";
const codeInputClass = "mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-white px-4 text-center text-lg tracking-[0.5em] outline-none transition-colors focus:border-harbor focus:ring-4 focus:ring-harbor/10";
const labelClass = "block text-sm font-semibold text-ink";

const PROMISES = [
  { icon: Truck, label: "Free standard delivery on every order" },
  { icon: Lock, label: "Secure card payments through Stripe" },
  { icon: RotateCcw, label: "Cancel for a full refund until it ships" },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, verifyEmail, resendVerification, verifyLogin } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
  const initialScreen: Screen = location.pathname === "/signup" ? "signup" : "login";

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setScreen(location.pathname === "/signup" ? "signup" : "login");
    setError(null);
    setNotice(null);
  }, [location.pathname]);

  function go(next: Screen) {
    setScreen(next);
    setError(null);
    setNotice(null);
  }

  function clearSecrets() {
    setPassword("");
    setConfirmPassword("");
    setCode("");
  }

  function finishAuth() {
    clearSecrets();
    navigate(from, { replace: true });
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await login(email.trim(), password);
      if ("user" in result) finishAuth();
      else if ("twoFactorRequired" in result) go("two-factor");
      else go("verify-email");
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "EMAIL_VERIFICATION_REQUIRED") {
        go("verify-email");
        setNotice("Verify your email before signing in.");
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Enter your name.");
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      go("verify-email");
      setNotice("We sent a verification code to your email.");
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "EMAIL_ALREADY_REGISTERED") {
        setError(err.message);
        setPassword("");
        setConfirmPassword("");
        return;
      }
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyEmail(email.trim(), code);
      finishAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTwoFactor(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyLogin(email.trim(), code);
      finishAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The sign-in code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.auth.forgotPassword(email.trim());
      go("reset");
      setNotice("If an account exists for that email, a reset code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await api.auth.resetPassword({ email: email.trim(), code, password });
      clearSecrets();
      go("login");
      setNotice("Password updated. Sign in with your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setBusy(true);
    try {
      if (screen === "verify-email") await resendVerification(email.trim());
      else if (screen === "two-factor") await api.auth.resendLoginCode(email.trim());
      else await api.auth.forgotPassword(email.trim());
      setNotice("If the account needs a code, a new one has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please wait before requesting another code.");
    } finally {
      setBusy(false);
    }
  }

  const isCodeScreen = screen === "verify-email" || screen === "two-factor";
  const title = screen === "login" ? "Sign in" : screen === "signup" ? "Create your account" : screen === "forgot" ? "Reset your password" : screen === "reset" ? "Choose a new password" : screen === "two-factor" ? "Enter your sign-in code" : "Verify your email";

  return (
    <main id="main-content" className="min-h-screen bg-canvas lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-mint p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-80 w-80 rounded-full bg-harbor/5 blur-3xl" />
        <Link to="/" aria-label="Harbor Market home" className="relative inline-flex w-fit">
          <Logo />
        </Link>
        <div className="relative">
          <h2 className="max-w-md text-4xl leading-[1.1] font-extrabold tracking-[-0.03em] text-harbor">Everything you need, one market.</h2>
          <ul className="mt-8 space-y-4">
            {PROMISES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm font-semibold text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-harbor">
                  <Icon size={18} aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-harbor/70">Harbor Market is a demo store. Card payments run in Stripe test mode.</p>
      </aside>

      {/* Form column */}
      <div className="flex min-h-screen flex-col items-center px-4 py-10 lg:justify-center">
        <Link to="/" aria-label="Harbor Market home" className="mb-8 inline-flex lg:hidden">
          <Logo />
        </Link>

        <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
        {notice && <p className="mt-3 rounded-xl border border-moss/20 bg-moss/10 px-3 py-2.5 text-sm text-moss">{notice}</p>}
        {error && <p className="mt-3 rounded-xl border border-clay/20 bg-clay/10 px-3 py-2.5 text-sm text-clay" role="alert">{error}</p>}

        {screen === "login" && (
          <form className="mt-4" onSubmit={submitLogin}>
            <label className={labelClass} htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <label className={`mt-4 ${labelClass}`} htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <div className="mt-2 text-right">
              <button type="button" onClick={() => go("forgot")} className="text-sm font-semibold text-harbor hover:underline">Forgot password?</button>
            </div>
            <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-60">Sign in</button>
          </form>
        )}

        {screen === "signup" && (
          <form className="mt-4" onSubmit={submitSignup}>
            <label className={labelClass} htmlFor="signup-name">Your name</label>
            <input id="signup-name" type="text" autoComplete="name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required />
            <label className={`mt-4 ${labelClass}`} htmlFor="signup-email">Email address</label>
            <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <label className={`mt-4 ${labelClass}`} htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <p className="mt-1 text-xs text-slate">Use 8–72 characters with uppercase, lowercase, a number, and a special character.</p>
            <label className={`mt-3 ${labelClass}`} htmlFor="signup-confirm-password">Re-enter password</label>
            <input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-60">Create account</button>
          </form>
        )}

        {isCodeScreen && (
          <form className="mt-4" onSubmit={screen === "two-factor" ? submitTwoFactor : submitVerification}>
            <p className="text-sm text-slate">Enter the six-digit code sent to <span className="font-semibold text-ink">{email}</span>.</p>
            <label className={`mt-4 ${labelClass}`} htmlFor="verification-code">Verification code</label>
            <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={codeInputClass} required />
            <button type="submit" disabled={busy || code.length !== 6} className="mt-5 h-11 w-full rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-60">Verify code</button>
            <button type="button" disabled={busy} onClick={resend} className="mt-3 w-full text-sm font-semibold text-harbor hover:underline">Resend code</button>
          </form>
        )}

        {screen === "forgot" && (
          <form className="mt-4" onSubmit={submitForgot}>
            <p className="text-sm text-slate">Enter your account email and we’ll send reset instructions if it exists.</p>
            <label className={`mt-4 ${labelClass}`} htmlFor="forgot-email">Email address</label>
            <input id="forgot-email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-60">Send reset code</button>
          </form>
        )}

        {screen === "reset" && (
          <form className="mt-4" onSubmit={submitReset}>
            <label className={labelClass} htmlFor="reset-code">Reset code</label>
            <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={codeInputClass} required />
            <label className={`mt-4 ${labelClass}`} htmlFor="reset-password">New password</label>
            <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <p className="mt-1 text-xs text-slate">Use 8–72 characters with uppercase, lowercase, a number, and a special character.</p>
            <label className={`mt-3 ${labelClass}`} htmlFor="reset-confirm-password">Re-enter password</label>
            <input id="reset-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-full bg-harbor text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-60">Update password</button>
            <button type="button" disabled={busy} onClick={resend} className="mt-3 w-full text-sm font-semibold text-harbor hover:underline">Send another code</button>
          </form>
        )}
        </section>

        <p className="mt-6 max-w-md text-center text-sm text-slate">
          {screen === "signup" ? <>Already have an account? <Link to="/login" state={{ from: location.state && (location.state as { from?: unknown }).from }} className="font-semibold text-harbor hover:underline">Sign in</Link></> : screen === "login" ? <>New to Harbor Market? <Link to="/signup" state={{ from: location.state && (location.state as { from?: unknown }).from }} className="font-semibold text-harbor hover:underline">Create your account</Link></> : <button type="button" onClick={() => go("login")} className="font-semibold text-harbor hover:underline">Back to sign in</button>}
        </p>
      </div>
    </main>
  );
}
