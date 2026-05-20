import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ticketsApi } from '@/services/api/tickets.api';
import { Spinner } from '@/components/ui/Spinner';

interface Summary {
  totals: { total: number; completed: number; noShow: number; cancelled: number; completionRate: number };
  averages: { avgWaitMinutes: number; avgAttentionMinutes: number };
  byService: Array<{ service: { name: string; color: string }; count: number; avgWaitMinutes: number; avgAttentionMinutes: number }>;
}

interface TimelineEntry { date: string; total: number; completed: number }

function StatCard({ icon, iconBg, label, value, sub }: { icon: string; iconBg: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <p className="text-label-caps text-on-surface-variant uppercase">{label}</p>
      <p className="text-headline-lg text-on-surface mt-1">{value}</p>
      {sub && <p className="text-label-caps text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today); from.setDate(from.getDate() - 7);

    Promise.all([
      ticketsApi.getAnalyticsSummary({ from: from.toISOString(), to: today.toISOString() }),
      ticketsApi.getAnalyticsTimeline({ from: from.toISOString(), to: today.toISOString() }),
    ]).then(([s, t]) => {
      setSummary(s);
      setTimeline(t.timeline ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile text-on-surface font-semibold">Panel General</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="confirmation_number" iconBg="bg-primary-fixed text-on-primary-fixed" label="Turnos (7 días)" value={summary?.totals.total ?? 0} />
        <StatCard icon="schedule" iconBg="bg-secondary-container text-on-secondary-container" label="TPE Promedio" value={`${summary?.averages.avgWaitMinutes ?? 0} min`} sub="Tiempo de espera" />
        <StatCard icon="timer" iconBg="bg-tertiary-fixed text-on-tertiary-fixed" label="TPA Promedio" value={`${summary?.averages.avgAttentionMinutes ?? 0} min`} sub="Tiempo de atención" />
        <StatCard icon="check_circle" iconBg="bg-secondary-container text-on-secondary-container" label="Completados" value={`${summary?.totals.completionRate ?? 0}%`} sub={`${summary?.totals.completed ?? 0} turnos`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-headline-md text-on-surface mb-4">Turnos por día</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#003d9b" name="Total" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#006d39" name="Completados" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-headline-md text-on-surface mb-4">TPE y TPA por servicio</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary?.byService ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d6" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit=" min" />
              <YAxis type="category" dataKey="service.name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgWaitMinutes" fill="#003d9b" name="TPE" radius={[0, 4, 4, 0]} />
              <Bar dataKey="avgAttentionMinutes" fill="#006d39" name="TPA" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/admin/branches', icon: 'store', label: 'Gestionar Sucursales', color: 'bg-primary-fixed text-on-primary-fixed' },
          { to: '/admin/operators', icon: 'badge', label: 'Ver Operadores', color: 'bg-secondary-container text-on-secondary-container' },
          { to: '/admin/analytics', icon: 'analytics', label: 'Ver Analítica', color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <span className="text-body-md font-medium text-on-surface group-hover:text-primary transition-colors">{item.label}</span>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
