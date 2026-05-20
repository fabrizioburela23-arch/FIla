import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  analyticsApi,
  branchesApi,
  type AnalyticsSummary,
  type Branch,
  type TimelinePoint,
} from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { formatMinutes } from '@/lib/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className="material-symbols-outlined icon-fill text-[20px] text-white">{icon}</span>
      </div>
      <p className="text-label-caps text-on-surface-variant uppercase">{label}</p>
      <p className="text-headline-lg text-on-surface">{value}</p>
    </div>
  );
}

// ─── Branch status row ────────────────────────────────────────────────────────

function BranchRow({ branch }: { branch: Branch }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-outline-variant last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-medium text-on-surface truncate">{branch.name}</p>
        <p className="text-label-caps text-on-surface-variant uppercase">{branch.city}</p>
      </div>
      <span
        className={[
          'text-label-caps font-semibold px-3 py-1 rounded-full uppercase',
          branch.isOpen
            ? 'bg-secondary-container text-on-secondary-container'
            : 'bg-surface-container-highest text-on-surface-variant',
        ].join(' ')}
      >
        {branch.isOpen ? 'Abierta' : 'Cerrada'}
      </span>
      {branch.operatorCount !== undefined && (
        <div className="flex items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">badge</span>
          <span className="text-label-caps">{branch.operatorCount}</span>
        </div>
      )}
      <Link
        to="/admin/branches"
        className="text-primary text-label-caps uppercase hover:underline flex items-center gap-0.5"
      >
        Ver
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayISO();
    Promise.all([
      analyticsApi.getSummary({ from: today, to: today }),
      analyticsApi.getTimeline({ from: today, to: today }),
      branchesApi.list(),
    ])
      .then(([s, t, b]) => {
        setSummary(s);
        setTimeline(t);
        setBranches(b);
      })
      .catch(() => {
        // Silently handle – individual sections show empty states
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-background min-h-full pb-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Panel General</h1>
        <p className="text-body-md text-on-surface-variant capitalize mt-1">{todayLabel()}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="confirmation_number"
              iconBg="bg-primary"
              label="Turnos Hoy"
              value={summary?.total.toString() ?? '—'}
            />
            <StatCard
              icon="schedule"
              iconBg="bg-secondary"
              label="Tiempo Prom. Espera"
              value={summary ? formatMinutes(summary.avgWaitSecs) : '—'}
            />
            <StatCard
              icon="timer"
              iconBg="bg-tertiary"
              label="Tiempo Prom. Atención"
              value={summary ? formatMinutes(summary.avgAttentionSecs) : '—'}
            />
            <StatCard
              icon="task_alt"
              iconBg="bg-primary-container"
              label="Tasa Completados %"
              value={summary ? `${summary.completedPct.toFixed(1)} %` : '—'}
            />
          </div>

          {/* Branch quick status */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md text-on-surface">Estado de Sucursales</h2>
              <Link
                to="/admin/branches"
                className="text-primary text-label-caps uppercase hover:underline flex items-center gap-0.5"
              >
                Ver todas
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </div>
            {branches.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">store_off</span>
                <p className="text-body-md">No hay sucursales registradas.</p>
                <Link to="/admin/branches" className="text-primary text-label-caps uppercase hover:underline">
                  Crear primera sucursal
                </Link>
              </div>
            ) : (
              <div>
                {branches.slice(0, 6).map((b) => (
                  <BranchRow key={b.id} branch={b} />
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-headline-md text-on-surface mb-4">Turnos por hora hoy</h2>
              {timeline.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl">bar_chart_off</span>
                  <p className="text-body-md">Sin datos para hoy.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d6" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#434654' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#434654' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #c3c6d6', fontSize: 13 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#003d9b"
                      strokeWidth={2}
                      dot={false}
                      name="Turnos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* TPE vs TPA per service */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-headline-md text-on-surface mb-4">TPE vs TPA por Servicio</h2>
              {!summary || summary.byService.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl">bar_chart_off</span>
                  <p className="text-body-md">Sin datos de servicios.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={summary.byService.map((s) => ({
                      name: s.serviceName.length > 12 ? `${s.serviceName.slice(0, 12)}…` : s.serviceName,
                      TPE: Math.round(s.avgWaitSecs / 60),
                      TPA: Math.round(s.avgAttentionSecs / 60),
                    }))}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#434654' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#434654' }}
                      tickLine={false}
                      axisLine={false}
                      unit=" min"
                    />
                    <Tooltip
                      formatter={(v: number) => `${v} min`}
                      contentStyle={{ borderRadius: 12, border: '1px solid #c3c6d6', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="TPE" fill="#003d9b" radius={[4, 4, 0, 0]} name="Esp. (min)" />
                    <Bar dataKey="TPA" fill="#006d39" radius={[4, 4, 0, 0]} name="Aten. (min)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
