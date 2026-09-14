import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";

const inputClass = "mt-1 h-11 w-full rounded-md border border-line-strong bg-white px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15";

export default function SecurityPage() {
  const security = useQuery({ queryKey: ["accountSecurity"], queryFn: api.auth.security });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<"idle" | "enable-code" | "disable">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (security.isLoading) return <PageLoader label="Loading security settings" />;
  if (security.isError || !security.data) return <ErrorState message="Couldn't load your security settings." onRetry={() => security.refetch()} />;

  async function requestEnable() {
    setError(null);
    setBusy(true);
    try {
      await api.auth.requestTwoFactor(password);
      setMode("enable-code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start two-factor setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.auth.confirmTwoFactor(code);
      setRecoveryCodes(result.recoveryCodes);
      setMode("idle");
      setPassword("");
      setCode("");
      await security.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      await api.auth.disableTwoFactor({ password, recoveryCode });
      setMode("idle");
      setPassword("");
      setRecoveryCode("");
      await security.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disable two-factor authentication.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell py-6">
      <Link to="/account" className="text-sm font-semibold text-harbor hover:underline">← Back to your account</Link>
      <p className="eyebrow mt-6">Account security</p>
      <h1 className="page-title mt-1 text-ink">Login &amp; Security</h1>
      <p className="mt-2 max-w-xl text-sm text-slate">Protect your account and control how new sessions are verified.</p>

      <section className="surface mt-6 max-w-2xl rounded-md p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-slate">
              {security.data.twoFactorEnabled ? "Enabled. New sign-ins require an emailed verification code." : "Add an email code after your password for extra protection."}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${security.data.twoFactorEnabled ? "bg-moss/15 text-moss" : "bg-paper text-slate"}`}>
            {security.data.twoFactorEnabled ? "Enabled" : "Off"}
          </span>
        </div>

        {error && <p className="mt-4 rounded-md border border-clay/20 bg-clay/10 px-3 py-2 text-sm text-clay" role="alert">{error}</p>}

        {!security.data.twoFactorEnabled && mode === "idle" && (
          <div className="mt-5 max-w-sm">
            <label className="block text-sm font-bold text-neutral-800" htmlFor="security-password">Confirm your password</label>
            <input id="security-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
            <button type="button" disabled={busy || !password} onClick={requestEnable} className="mt-4 rounded-md bg-marigold px-4 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60">Send setup code</button>
          </div>
        )}

        {!security.data.twoFactorEnabled && mode === "enable-code" && (
          <div className="mt-5 max-w-sm">
            <p className="text-sm text-slate">Enter the six-digit code sent to your account email.</p>
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="security-code">Setup code</label>
            <input id="security-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${inputClass} text-center text-xl tracking-[0.35em]`} />
            <button type="button" disabled={busy || code.length !== 6} onClick={confirmEnable} className="mt-4 rounded-md bg-harbor px-4 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-60">Enable two-factor authentication</button>
          </div>
        )}

        {security.data.twoFactorEnabled && mode === "idle" && (
          <div className="mt-5">
            <p className="text-sm text-slate">Recovery codes remaining: <span className="font-semibold text-ink">{security.data.recoveryCodesRemaining}</span></p>
            <button type="button" onClick={() => setMode("disable")} className="mt-4 rounded-md border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-harbor hover:bg-paper">Disable two-factor authentication</button>
          </div>
        )}

        {security.data.twoFactorEnabled && mode === "disable" && (
          <div className="mt-5 max-w-sm">
            <label className="block text-sm font-bold text-neutral-800" htmlFor="disable-password">Password</label>
            <input id="disable-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
            <label className="mt-3 block text-sm font-bold text-neutral-800" htmlFor="recovery-code">Recovery code</label>
            <input id="recovery-code" type="text" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} className={inputClass} />
            <button type="button" disabled={busy || !password || !recoveryCode} onClick={disable} className="mt-4 rounded-md bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60">Disable two-factor authentication</button>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-semibold text-ink">Save your recovery codes</h3>
            <p className="mt-1 text-sm text-slate">These are shown once. Store them somewhere safe before leaving this page.</p>
            <pre className="amount mt-3 grid grid-cols-2 gap-2 rounded-md bg-ink p-4 text-sm tracking-[0.12em] text-white">{recoveryCodes.join("\n")}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
