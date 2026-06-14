import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react';
import Logo from '../../components/Logo';
import HeritageMotif from '../../components/HeritageMotif';
import Turnstile from '../../components/Turnstile';
import { turnstileEnabled } from '../../lib/turnstile';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../lib/auth';

const fieldBase =
  'w-full rounded bg-paper-2 px-3.5 py-2.5 text-ink placeholder:text-muted transition-colors duration-200 focus:bg-paper border';

const labelClass = 'block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted mb-2';

const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Already signed in — don't show the login form again.
  if (isAuthenticated) return <Navigate to={from} replace />;

  const emailError = (touched.email || submitted) && !emailValid(email)
    ? email.trim() ? 'Enter a valid email address.' : 'Email is required.'
    : undefined;
  const passwordError = (touched.password || submitted) && !password
    ? 'Password is required.'
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!emailValid(email) || !password) return;
    if (turnstileEnabled && !captchaToken) {
      setFormError('Please complete the verification challenge.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password, captchaToken ?? undefined);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.');
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper text-ink">
      {/* Brand panel — desktop only */}
      <aside className="focus-on-dark relative overflow-hidden bg-forest-deep text-on-forest hidden lg:flex flex-col justify-between p-12 xl:p-16">
        <HeritageMotif
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -bottom-24 w-[34rem] h-[34rem] opacity-[0.12]"
          stroke="var(--color-on-forest)"
        />
        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <Logo size="sm" />
          <span className="leading-none">
            <span className="block font-display text-2xl text-on-forest">PLYSS</span>
            <span className="block font-mono text-[0.62rem] uppercase tracking-[0.18em] text-on-forest-2 mt-1">
              Survey administration
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <span className="block w-12 h-0.5 bg-accent mb-7" aria-hidden="true" />
          <h2 className="font-display font-light text-3xl xl:text-4xl leading-[1.12] text-on-forest">
            The console behind the survey.
          </h2>
          <p className="mt-5 text-on-forest-2 leading-relaxed">
            Sign in to manage the figures, content and correspondence that the public
            record is built from. Every change is held to the same standard as the data.
          </p>
        </div>

        <p className="relative font-mono text-[0.7rem] uppercase tracking-[0.16em] text-on-forest-2">
          Authorised access only · Plateau State, Nigeria
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </Link>

          {/* Compact brand — mobile only */}
          <div className="flex items-center gap-3 mt-8 lg:hidden">
            <Logo size="sm" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
              PLYSS · Admin
            </span>
          </div>

          <h1 className="mt-8 lg:mt-10 font-display font-light text-4xl text-ink leading-[1.05]">
            Sign in
          </h1>
          <p className="mt-3 text-ink-2 leading-relaxed">
            Administrator access to the PLYSS survey console.
          </p>

          {formError && (
            <div
              role="alert"
              className="mt-7 flex items-start gap-2.5 rounded border border-danger bg-paper-2 px-4 py-3 text-sm text-danger"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="admin-email" className={labelClass}>Email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'admin-email-error' : undefined}
                placeholder="admin@plyss.org"
                className={`${fieldBase} ${emailError ? 'border-danger' : 'border-rule focus:border-forest'} disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {emailError && (
                <p id="admin-email-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-danger">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className={labelClass}>Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'admin-password-error' : undefined}
                  placeholder="••••••••"
                  className={`${fieldBase} pr-11 ${passwordError ? 'border-danger' : 'border-rule focus:border-forest'} disabled:opacity-60 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-muted hover:text-ink transition-colors duration-200 disabled:opacity-60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p id="admin-password-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-danger">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  {passwordError}
                </p>
              )}
            </div>

            <Turnstile onToken={setCaptchaToken} />

            <button
              type="submit"
              disabled={loading}
              className="chip chip--solid w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            Trouble signing in? Contact the survey’s data lead at{' '}
            <a href="mailto:info@plyss.org" className="text-ink underline underline-offset-2 hover:text-accent-deep transition-colors">
              info@plyss.org
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
