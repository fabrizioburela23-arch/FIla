import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
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
  type Branch,
  type AnalyticsSummary,
  type TimelinePoint,
  type ByServiceRow,
  type ByOperatorRow,
} from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { formatMinutes } from '@/lib/utils/formatters';

// ─── Date range helpers ───────────────────────────────────────────────────────

type RangeKey = 'today' | '7d' | '30d';

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRange(key: RangeKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (key === '7d') from.setDate(from.getDate() - 6);
  else if (key === '30d') from.setDate(from.getDate() - 29);
  return { from: toISO(from), to: toISO(to) };
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        <p className="text-label-caps uppercase">{label}</p>
      </div>
      <p className="text-headline-lg text-on-surface">{value}</p>
      {sub && <p className="text-label-caps text-on-surface-variant">{sub}</p>}
    </div>
  );
}

// ─── Sortable service table ───────────────────────────────────────────────────

type SortField = 'count' | 'avgWaitSecs' | 'avgAttentionSecs';

function ServiceTable({ rows }: { rows: ByServiceRow[] }) {
  const [sortBy, setSortBy] = useState<SortField>('count');
  const [sortDesc, setSortDesc] = useState(true);

  function handleSort(field: SortField) {
    if (sortBy === field) setSortDesc((d) => !d);
    else { setSortBy(field); setSortDesc(true); }
  }

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return sortDesc ? -diff : diff;
  });

  function ColHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortBy === field;
    return (
      <th
        className="px-4 py-3 text-label-caps text-on-surface-variant uppercase cursor-pointer hover:text-on-surface select-none"
        onClick={() => handleSort(field)}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className="material-symbols-outlined text-[14px]">
            {active ? (sortDesc ? 'arrow_downward' : 'arrow_upward') : 'unfold_more'}
          </span>
        </span>
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-on-surface-variant text-body-md">
        Sin datos de servicios para el período seleccionado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase">Servicio</th>
            <ColHeader field="count" label="Turnos" />
            <ColHeader field="avgWaitSecs" label="TPE" />
            <ColHeader field="avgAttentionSecs" label="TPA" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.serviceId}
              className="border-b border-outline-variant last:border-0 hover:bg-surface-container-lowest transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.serviceColor }}
                  />
                  <span className="text-body-md text-on-surface">{row.serviceName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-body-md text-on-surface">{row.count}</td>
              <td className="px-4 py-3 text-body-md text-on-surface">
                {formatMinutes(row.avgWaitSecs)}
              </td>
              <td className="px-4 py-3 text-body-md text-on-surface">
                {formatMinutes(row.avgAttentionSecs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sortable operator table ──────────────────────────────────────────────────

type OperatorSortField = 'count' | 'avgWaitSecs' | 'avgAttentionSecs';

function OperatorTable({ rows }: { rows: ByOperatorRow[] }) {
  const [sortBy, setSortBy] = useState<OperatorSortField>('count');
  const [sortDesc, setSortDesc] = useState(true);

  function handleSort(field: OperatorSortField) {
    if (sortBy === field) setSortDesc((d) => !d);
    else { setSortBy(field); setSortDesc(true); }
  }

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return sortDesc ? -diff : diff;
  });

  function ColHeader({ field, label }: { field: OperatorSortField; label: string }) {
    const active = sortBy === field;
    return (
      <th
        className="px-4 py-3 text-label-caps text-on-surface-variant uppercase cursor-pointer hover:text-on-surface select-none"
        onClick={() => handleSort(field)}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className="material-symbols-outlined text-[14px]">
            {active ? (sortDesc ? 'arrow_downward' : 'arrow_upward') : 'unfold_more'}
          </span>
        </span>
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-on-surface-variant text-body-md">
        Sin datos de operadores para el período seleccionado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase">Operador</th>
            <ColHeader field="count" label="Turnos" />
            <ColHeader field="avgWaitSecs" label="TPE" />
            <ColHeader field="avgAttentionSecs" label="TPA" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.operatorId}
              className="border-b border-outline-variant last:border-0 hover:bg-surface-container-lowest transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-on-primary text-[11px] font-bold uppercase">
                      {row.operatorName[0]}
                    </span>
                  </div>
                  <span className="text-body-md text-on-surface">{row.operatorName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-body-md text-on-surface">{row.count}</td>
              <td className="px-4 py-3 text-body-md text-on-surface">
                {formatMinutes(row.avgWaitSecs)}
              </td>
              <td className="px-4 py-3 text-body-md text-on-surface">
                {formatMinutes(row.avgAttentionSecs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d',    label: 'Últimos 7 días' },
  { key: '30d',   label: 'Últimos 30 días' },
];

export default function AnalyticsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Load branches on mount
  useEffect(() => {
    branchesApi.list().then((list) => setBranches(list)).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    const { from, to } = getRange(rangeKey);
    const params = { from, to, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) };
    setLoading(true);
    Promise.all([
      analyticsApi.getSummary(params),
      analyticsApi.getTimeline(params),
    ])
      .then(([s, t]) => {
        setSummary(s);
        setTimeline(t);
      })
      .catch(() => {
        setSummary(null);
        setTimeline([]);
      })
      .finally(() => setLoading(false));
  }, [rangeKey, selectedBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="bg-background min-h-full pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface">Analítica</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Métricas de rendimiento del sistema de turnos
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        {/* Range toggles */}
        <div className="flex rounded-xl overflow-hidden border border-outline-variant bg-white">
          {RANGE_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRangeKey(key)}
              className={[
                'px-4 py-2.5 text-label-caps font-semibold transition-colors',
                rangeKey === key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Branch filter */}
        {branches.length > 0 && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-10 px-3 border border-outline-variant rounded-xl text-body-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {loading && <Spinner size="sm" />}
      </div>

      {loading && !summary ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              icon="confirmation_number"
              label="Total"
              value={summary?.total.toString() ?? '—'}
            />
            <KPICard
              icon="task_alt"
              label="Completados"
              value={summary?.completed.toString() ?? '—'}
              sub={summary ? `${summary.completedPct.toFixed(1)} % completados` : undefined}
            />
            <KPICard
              icon="person_off"
              label="No se presentaron"
              value={summary?.noShow.toString() ?? '—'}
            />
            <KPICard
              icon="cancel"
              label="Cancelados"
              value={summary?.cancelled.toString() ?? '—'}
            />
            <KPICard
              icon="percent"
              label="% Completados"
              value={summary ? `${summary.completedPct.toFixed(1)} %` : '—'}
            />
            <KPICard
              icon="schedule"
              label="TPE (prom.)"
              value={summary ? formatMinutes(summary.avgWaitSecs) : '—'}
              sub="Tiempo de espera"
            />
            <KPICard
              icon="timer"
              label="TPA (prom.)"
              value={summary ? formatMinutes(summary.avgAttentionSecs) : '—'}
              sub="Tiempo de atención"
            />
          </div>

          {/* Daily trend chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-headline-md text-on-surface mb-4">Tendencia diaria</h2>
            {timeline.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl">bar_chart_off</span>
                <p className="text-body-md">Sin datos en este período.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#c3c6d6" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: '#434654' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#434654' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #c3c6d6', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#003d9b"
                    strokeWidth={2}
                    dot={false}
                    name="Turnos"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWaitSecs"
                    stroke="#006d39"
                    strokeWidth={2}
                    dot={false}
                    name="TPE (seg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By service */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant">
                <h2 className="text-headline-md text-on-surface">Por Servicio</h2>
              </div>
              <ServiceTable rows={summary?.byService ?? []} />
            </div>

            {/* By operator */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant">
                <h2 className="text-headline-md text-on-surface">Por Operador</h2>
              </div>
              <OperatorTable rows={summary?.byOperator ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
