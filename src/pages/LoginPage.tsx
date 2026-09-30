import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { requireSupabase } from "../lib/supabase";
import { BrandMark, ErrorState, ThemeToggle } from "../components/ui";
import type { Theme } from "../types";

export default function LoginPage({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("No pudimos iniciar sesión. Revisá tu correo y contraseña.");
      }
    } catch {
      setError("No pudimos conectar. Intentá nuevamente en unos instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-layout">
      <div className="login-theme-toggle">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <section className="login-brand-panel" aria-label="Mur administración">
        <div className="login-brand-content">
          <div className="brand-lockup brand-lockup-login">
            <BrandMark large />
            <strong>mur.</strong>
          </div>
          <p className="login-eyebrow">Cerca de la comunidad.</p>
          <h1>Una mirada clara.<br />Una comunidad mejor.</h1>
          <p className="login-brand-copy">
            Entendé lo que pasa, cuidá las conversaciones y acompañá el crecimiento de Mur.
          </p>
          <div className="login-capabilities">
            <span><Globe2 size={18} /> Explorá la actividad</span>
            <span><ShieldCheck size={18} /> Moderá con contexto</span>
            <span><UsersRound size={18} /> Cuidá la comunidad</span>
          </div>
        </div>
        <span className="login-brand-footer">Mur · Espacio de administración</span>
        <div className="login-grid" aria-hidden="true" />
      </section>

      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <header>
            <div className="login-mobile-brand"><BrandMark /><strong>mur.</strong></div>
            <span className="section-kicker">Bienvenido al equipo</span>
            <h2>Ingresá a tu espacio</h2>
            <p>Usá tu cuenta de Mur para continuar.</p>
          </header>

          {error ? <ErrorState message={error} /> : null}

          <label className="field">
            <span>Correo electrónico</span>
            <span className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="nombre@mur.app"
                required
                disabled={submitting}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>

          <label className="field">
            <span>Contraseña</span>
            <span className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="input-icon-button"
                type="button"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={18} /> : null}
            <span>{submitting ? "Ingresando…" : "Ingresar al panel"}</span>
            {!submitting ? <ArrowRight size={18} /> : null}
          </button>

          <p className="login-footnote">
            <LockKeyhole size={14} /> Acceso exclusivo para administradores de Mur.
          </p>
        </form>
      </section>
    </main>
  );
}
