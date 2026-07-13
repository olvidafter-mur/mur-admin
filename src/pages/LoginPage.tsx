import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
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

    const { error: signInError } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("No pudimos iniciar sesion. Revisa tus credenciales.");
      setSubmitting(false);
    }
  };

  return (
    <main className="login-layout">
      <div className="login-theme-toggle">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <section className="login-brand-panel" aria-label="Mur administracion">
        <div className="login-brand-content">
          <div className="brand-lockup brand-lockup-login">
            <BrandMark large />
            <strong>mur.</strong>
          </div>
          <p className="login-eyebrow">Panel privado</p>
          <h1>Operacion y moderacion en un solo lugar.</h1>
          <p className="login-brand-copy">
            Acceso reservado al equipo responsable de la comunidad.
          </p>
        </div>
        <div className="login-grid" aria-hidden="true" />
      </section>

      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <header>
            <span className="section-kicker">Acceso administrativo</span>
            <h2>Iniciar sesion</h2>
            <p>Usa tu cuenta registrada en Mur.</p>
          </header>

          {error ? <ErrorState message={error} /> : null}

          <label className="field">
            <span>Correo electronico</span>
            <span className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="nombre@mur.app"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>

          <label className="field">
            <span>Contrasena</span>
            <span className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                placeholder="Tu contrasena"
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="input-icon-button"
                type="button"
                title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={18} /> : null}
            <span>{submitting ? "Ingresando" : "Ingresar"}</span>
          </button>

          <p className="login-footnote">
            El acceso se valida con permisos administrativos en la base de datos.
          </p>
        </form>
      </section>
    </main>
  );
}
