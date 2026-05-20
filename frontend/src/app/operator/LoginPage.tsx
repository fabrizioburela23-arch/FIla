'use client';

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/api/tickets.api';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// ─── Floating label input ─────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  icon?: string;
  rightSlot?: React.ReactNode;
}

function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  disabled = false,
  autoComplete,
  icon,
  rightSlot,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-caps text-on-surface-variant uppercase">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-4 material-symbols-outlined text-on-surface-variant/60 text-xl pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={[
            'w-full h-14 rounded-2xl border border-outline-variant bg-surface-container-low px-4 text-body-md text-on-surface',
            'placeholder-on-surface-variant/40',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'transition-colors',
            icon ? 'pl-11' : '',
            rightSlot ? 'pr-11' : '',
          ].join(' ')}
        />
        {rightSlot && (
          <div className="absolute right-3 flex items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUIStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setAuth(token, user);

      // Redirect based on role
      if (user.role === 'operator' && user.operatorId) {
        navigate(`/operator/${user.operatorId}`, { replace: true });
      } else if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin', { replace: true });
      } else {
        // Fallback for unexpected roles
        addToast('Acceso concedido, pero sin redirección configurada', 'warning');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Credenciales incorrectas. Intentá de nuevo.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Card */}
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
              <span className="material-symbols-outlined text-on-primary text-3xl">
                confirmation_number
              </span>
            </div>
            <h1 className="text-headline-lg text-primary">Fila</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Portal de acceso</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <InputField
              id="email"
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              disabled={isLoading}
              autoComplete="email"
              icon="alternate_email"
            />

            <InputField
              id="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              disabled={isLoading}
              autoComplete="current-password"
              icon="lock"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="flex items-center justify-center rounded-lg p-1 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                'mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-body-md font-semibold transition-all',
                canSubmit
                  ? 'bg-primary text-on-primary hover:opacity-90 active:scale-[0.98]'
                  : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">
                    progress_activity
                  </span>
                  Ingresando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">login</span>
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-label-caps text-on-surface-variant/60 uppercase">
          Solo para personal autorizado
        </p>
      </div>
    </div>
  );
}
