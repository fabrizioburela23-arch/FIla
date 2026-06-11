'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/api/tickets.api';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// ─── Input field ──────────────────────────────────────────────────────────────

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

function InputField({ id, label, type = 'text', value, onChange, disabled = false, autoComplete, icon, rightSlot }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-caps text-on-surface-variant uppercase">{label}</label>
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-4 material-symbols-outlined text-on-surface-variant/60 text-xl pointer-events-none">{icon}</span>
        )}
        <input
          id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} autoComplete={autoComplete}
          className={['w-full h-14 rounded-2xl border border-outline-variant bg-surface-container-low px-4 text-body-md text-on-surface',
            'placeholder-on-surface-variant/40',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-60 disabled:cursor-not-allowed transition-colors',
            icon ? 'pl-11' : '', rightSlot ? 'pr-11' : ''].join(' ')}
        />
        {rightSlot && <div className="absolute right-3 flex items-center">{rightSlot}</div>}
      </div>
    </div>
  );
}

// ─── Standard login tab ───────────────────────────────────────────────────────

function StandardLoginTab({ onSuccess }: { onSuccess: (token: string, user: any) => void }) {
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
      onSuccess(token, user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Credenciales incorrectas. Intentá de nuevo.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <InputField id="email" label="Correo electrónico" type="email" value={email} onChange={setEmail}
        disabled={isLoading} autoComplete="email" icon="alternate_email" />
      <InputField id="password" label="Contraseña" type={showPassword ? 'text' : 'password'} value={password}
        onChange={setPassword} disabled={isLoading} autoComplete="current-password" icon="lock"
        rightSlot={
          <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
            className="flex items-center justify-center rounded-lg p-1 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
          </button>
        }
      />
      <button type="submit" disabled={!canSubmit}
        className={['mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-body-md font-semibold transition-all',
          canSubmit ? 'bg-primary text-on-primary hover:opacity-90 active:scale-[0.98]' : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-60'].join(' ')}>
        {isLoading ? (
          <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Ingresando…</>
        ) : (
          <><span className="material-symbols-outlined text-xl">login</span>Ingresar</>
        )}
      </button>
    </form>
  );
}

// ─── Quick access tab ─────────────────────────────────────────────────────────

interface QuickOperator { id: string; name: string; displayName: string; user: { email: string } }

function QuickAccessTab({ onSuccess }: { onSuccess: (token: string, user: any) => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [operators, setOperators] = useState<QuickOperator[]>([]);
  const [selectedOp, setSelectedOp] = useState<QuickOperator | null>(null);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingOps, setLoadingOps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load all branches (public-ish; branches list is accessible with token but we don't have one yet)
  // Alternatively, let the user type a branch ID — or we can pre-seed the branch list via a public endpoint
  // For simplicity: use a plain slug/branchId input, fetch operators via public endpoint
  const [branchInput, setBranchInput] = useState('');
  const [fetchedBranchId, setFetchedBranchId] = useState('');

  async function lookupBranch() {
    if (!branchInput.trim()) return;
    setLoadingOps(true);
    setOperators([]);
    setSelectedOp(null);
    try {
      const resp = await apiClient.get(`/api/v1/branches/${branchInput.trim()}/operators/quick-access`);
      const ops = resp.data.data as QuickOperator[];
      setOperators(ops.filter((o) => o.user?.email));
      setFetchedBranchId(branchInput.trim());
      if (ops.length === 0) addToast('No hay operadores con credenciales en esa sucursal', 'warning');
    } catch {
      addToast('Sucursal no encontrada', 'error');
    } finally {
      setLoadingOps(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!selectedOp || !password) return;
    setIsLoading(true);
    try {
      const { token, user } = await login(selectedOp.user.email, password);
      onSuccess(token, user);
    } catch {
      addToast('Contraseña incorrecta', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Step 1: enter branch ID */}
      <div className="flex flex-col gap-1.5">
        <label className="text-label-caps text-on-surface-variant uppercase">ID de Sucursal</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupBranch()}
            placeholder="Pega el ID de la sucursal"
            className="flex-1 h-14 rounded-2xl border border-outline-variant bg-surface-container-low px-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={lookupBranch}
            disabled={!branchInput.trim() || loadingOps}
            className="px-4 h-14 rounded-2xl bg-primary text-on-primary text-body-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
          >
            {loadingOps
              ? <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              : <span className="material-symbols-outlined text-xl">search</span>
            }
          </button>
        </div>
        <p className="text-label-caps text-on-surface-variant/60">El administrador de la sucursal te dará este ID</p>
      </div>

      {/* Step 2: pick operator */}
      {operators.length > 0 && (
        <div>
          <label className="text-label-caps text-on-surface-variant uppercase mb-2 block">Seleccioná tu nombre</label>
          <div className="grid grid-cols-2 gap-2">
            {operators.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => { setSelectedOp(op); setPassword(''); }}
                className={['flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left',
                  selectedOp?.id === op.id
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:border-primary/40 hover:bg-surface-container'].join(' ')}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-on-primary font-bold text-[11px] uppercase">{op.displayName?.[0] ?? '?'}</span>
                  </div>
                  <span className="text-body-md font-medium text-on-surface leading-tight">{op.name}</span>
                </div>
                <span className="text-label-caps text-on-surface-variant">{op.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: enter password */}
      {selectedOp && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-on-primary font-bold text-label-caps uppercase">{selectedOp.displayName?.[0]}</span>
            </div>
            <div>
              <p className="text-body-md font-semibold text-on-surface">{selectedOp.name}</p>
              <p className="text-body-sm text-on-surface-variant">{selectedOp.user.email}</p>
            </div>
          </div>

          <InputField id="quick-password" label="Contraseña" type={showPass ? 'text' : 'password'}
            value={password} onChange={setPassword} disabled={isLoading} autoComplete="current-password" icon="lock"
            rightSlot={
              <button type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}
                className="flex items-center justify-center rounded-lg p-1 text-on-surface-variant/60 hover:text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            }
          />

          <button type="submit" disabled={!password || isLoading}
            className={['flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-body-md font-semibold transition-all',
              password && !isLoading ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-60'].join(' ')}>
            {isLoading ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Ingresando…</> : <><span className="material-symbols-outlined text-xl">login</span>Ingresar</>}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'standard' | 'quick';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<Tab>('standard');

  function handleSuccess(token: string, user: any) {
    setAuth(token, user);
    if (user.role === 'operator' && user.operatorId) {
      navigate(`/operator/${user.operatorId}`, { replace: true });
    } else if (user.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
    } else if (user.role === 'admin' || user.role === 'manager') {
      navigate('/admin', { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
              <span className="material-symbols-outlined text-on-primary text-3xl">confirmation_number</span>
            </div>
            <h1 className="text-headline-lg text-primary">Fila</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Portal de acceso</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border border-outline-variant overflow-hidden mb-6">
            <button
              onClick={() => setTab('standard')}
              className={['flex-1 py-2.5 text-body-sm font-medium transition-colors', tab === 'standard' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'].join(' ')}
            >
              Email y contraseña
            </button>
            <button
              onClick={() => setTab('quick')}
              className={['flex-1 py-2.5 text-body-sm font-medium transition-colors flex items-center justify-center gap-1.5', tab === 'quick' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'].join(' ')}
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              Acceso rápido
            </button>
          </div>

          {tab === 'standard' ? (
            <StandardLoginTab onSuccess={handleSuccess} />
          ) : (
            <QuickAccessTab onSuccess={handleSuccess} />
          )}
        </div>
        <p className="mt-6 text-center text-label-caps text-on-surface-variant/60 uppercase">Solo para personal autorizado</p>
      </div>
    </div>
  );
}
