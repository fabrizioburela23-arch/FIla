import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { superadminApi, type GlobalStats } from '@/services/api/superadmin.api';
import { Spinner } from '@/components/ui/Spinner';

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-display-sm font-bold text-on-surface">{value}</p>
        <p className="text-body-sm text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}

export default function SuperadminDashboardPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-8">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Panel Master</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Vista global de la plataforma Fila</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Empresas totales"     value={stats.totalAccounts}    icon="business"       color="bg-primary" />
          <StatCard label="Empresas activas"     value={stats.activeAccounts}   icon="check_circle"   color="bg-secondary" />
          <StatCard label="Usuarios registrados" value={stats.totalUsers}       icon="group"          color="bg-tertiary" />
          <StatCard label="Turnos hoy"           value={stats.totalTicketsToday} icon="confirmation_number" color="bg-error" />
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/superadmin/empresas"
          className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">business</span>
          </div>
          <div className="flex-1">
            <p className="text-title-md font-semibold text-on-surface">Gestión de Empresas</p>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Crear, suspender y ver todas las empresas</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
