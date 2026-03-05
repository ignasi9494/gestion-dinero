"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: authError } = await login({ email, password });
        if (authError) {
          setError(mapAuthError(authError.message));
        } else {
          router.push("/dashboard");
        }
      } else {
        const { error: authError } = await register({ email, password });
        if (authError) {
          setError(mapAuthError(authError.message));
        } else {
          setSuccess(
            "Cuenta creada. Revisa tu email para confirmar tu cuenta."
          );
          setMode("login");
          setPassword("");
        }
      }
    } catch {
      setError("Ha ocurrido un error inesperado. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="gradient-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            GestionDinero
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestion de gastos familiares
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5">
          <h2 className="mb-6 text-center text-lg font-semibold text-card-foreground">
            {mode === "login" ? "Iniciar sesion" : "Crear cuenta"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Contrasena
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "register" ? "Minimo 6 caracteres" : "Tu contrasena"
                  }
                  minLength={mode === "register" ? 6 : undefined}
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-11 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="gradient-primary flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "login" ? (
                "Entrar"
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Registrate
                </button>
              </>
            ) : (
              <>
                Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Inicia sesion
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tus datos financieros se almacenan de forma segura.
        </p>
      </div>
    </div>
  );
}

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email o contrasena incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirma tu email antes de iniciar sesion.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con este email.";
  }
  if (message.includes("Password should be at least")) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }
  if (message.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento.";
  }
  return message;
}
