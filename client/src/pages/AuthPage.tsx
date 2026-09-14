import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../lib/api";
import { passwordValidationMessage } from "../lib/password";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/layout/Logo";

type Screen = "login" | "signup" | "verify-email" | "two-factor" | "forgot" | "reset";

const inputClass = "mt-1 h-11 w-full rounded-md border border-line-strong bg-white px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, verifyEmail, resendVerification, verifyLogin, loginDemo } = useAuth();
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

  async function tryDemo() {
    setError(null);
    setBusy(true);
    try {
      await loginDemo();
      finishAuth();
    } catch {
      setError("Couldn't start the demo account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isCodeScreen = screen === "verify-email" || screen === "two-factor";
  const title = screen === "login" ? "Sign in" : screen === "signup" ? "Create your account" : screen === "forgot" ? "Reset your password" : screen === "reset" ? "Choose a new password" : screen === "two-factor" ? "Enter your sign-in code" : "Verify your email";

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center bg-paper px-4 py-8 sm:py-10">
      <Link to="/" aria-label="amazon-clone home" className="mb-8 inline-flex rounded-md px-2 py-1">
        <Logo tone="light" />
      </Link>

      <div className="mb-6 text-center">
        <p className="eyebrow">Secure account access</p>
        <p className="mt-2 text-sm text-slate">Keep your cart, orders, and saved items together.</p>
      </div>

      <section className="surface w-full max-w-sm rounded-md p-6 sm:p-7">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {notice && <p className="mt-3 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm text-moss">{notice}</p>}
        {error && <p className="mt-3 rounded-md border border-clay/20 bg-clay/10 px-3 py-2 text-sm text-clay" role="alert">{error}</p>}

        {screen === "login" && (
          <form className="mt-4" onSubmit={submitLogin}>
            <label className="block text-sm font-bold text-neutral-800" htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <div className="mt-2 text-right">
              <button type="button" onClick={() => go("forgot")} className="text-sm font-semibold text-harbor hover:underline">Forgot password?</button>
            </div>
            <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Sign in</button>
          </form>
        )}

        {screen === "signup" && (
          <form className="mt-4" onSubmit={submitSignup}>
            <label className="block text-sm font-bold text-neutral-800" htmlFor="signup-name">Your name</label>
            <input id="signup-name" type="text" autoComplete="name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required />
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="signup-email">Email address</label>
            <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <p className="mt-1 text-xs text-slate">Use 8–72 characters with uppercase, lowercase, a number, and a special character.</p>
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="signup-confirm-password">Re-enter password</label>
            <input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Create account</button>
          </form>
        )}

        {isCodeScreen && (
          <form className="mt-4" onSubmit={screen === "two-factor" ? submitTwoFactor : submitVerification}>
            <p className="text-sm text-slate">Enter the six-digit code sent to <span className="font-semibold text-ink">{email}</span>.</p>
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="verification-code">Verification code</label>
            <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${inputClass} text-center text-xl tracking-[0.35em]`} required />
            <button type="submit" disabled={busy || code.length !== 6} className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Verify code</button>
            <button type="button" disabled={busy} onClick={resend} className="mt-3 w-full text-sm font-semibold text-harbor hover:underline">Resend code</button>
          </form>
        )}

        {screen === "forgot" && (
          <form className="mt-4" onSubmit={submitForgot}>
            <p className="text-sm text-slate">Enter your account email and we’ll send reset instructions if it exists.</p>
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="forgot-email">Email address</label>
            <input id="forgot-email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Send reset code</button>
          </form>
        )}

        {screen === "reset" && (
          <form className="mt-4" onSubmit={submitReset}>
            <label className="block text-sm font-bold text-neutral-800" htmlFor="reset-code">Reset code</label>
            <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${inputClass} text-center text-xl tracking-[0.35em]`} required />
            <label className="mt-4 block text-sm font-bold text-neutral-800" htmlFor="reset-password">New password</label>
            <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            <p className="mt-1 text-xs text-slate">Use 8–72 characters with uppercase, lowercase, a number, and a special character.</p>
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="reset-confirm-password">Re-enter password</label>
            <input id="reset-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} required />
            <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Update password</button>
            <button type="button" disabled={busy} onClick={resend} className="mt-3 w-full text-sm font-semibold text-harbor hover:underline">Send another code</button>
          </form>
        )}
      </section>

      {screen === "login" && (
        <>
          <div className="mt-6 flex w-full max-w-sm items-center gap-3 text-xs text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />or<span className="h-px flex-1 bg-neutral-200" /></div>
          <button type="button" onClick={tryDemo} disabled={busy} className="mt-4 w-full max-w-sm rounded-md border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-harbor hover:bg-paper disabled:opacity-60">Try demo account</button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate">
        {screen === "signup" ? <>Already have an account? <Link to="/login" state={{ from: location.state && (location.state as { from?: unknown }).from }} className="font-semibold text-harbor hover:underline">Sign in</Link></> : screen === "login" ? <>New to amazon-clone? <Link to="/signup" state={{ from: location.state && (location.state as { from?: unknown }).from }} className="font-semibold text-harbor hover:underline">Create your account</Link></> : <button type="button" onClick={() => go("login")} className="font-semibold text-harbor hover:underline">Back to sign in</button>}
      </p>
      <p className="mt-auto pt-10 text-center text-xs text-slate">Secure account access for the amazon-clone marketplace.</p>
    </main>
  );
}
