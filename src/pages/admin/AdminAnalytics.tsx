import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Scissors, UserCheck, DollarSign, BarChart3, CalendarIcon, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ServiceStat {
  name: string;
  count: number;
  revenue: number;
}

interface GroomerStat {
  name: string;
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

interface EarningsSummary {
  totalRevenue: number;
  totalAppointments: number;
  avgPerAppointment: number;
  totalDiscount: number;
}

const CHART_COLORS = [
  'hsl(174, 60%, 40%)',
  'hsl(24, 90%, 55%)',
  'hsl(142, 70%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
  'hsl(270, 60%, 55%)',
];

const PRESETS = [
  { label: 'Last 7 days', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'This month', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last month', getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'This year', getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: 'All time', getRange: () => ({ from: undefined, to: undefined }) },
] as const;

export default function AdminAnalytics() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
  const [groomerStats, setGroomerStats] = useState<GroomerStat[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary>({ totalRevenue: 0, totalAppointments: 0, avgPerAppointment: 0, totalDiscount: 0 });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const [activePreset, setActivePreset] = useState('Last 30 days');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchAnalytics();
  }, [isAdmin, authLoading, navigate, dateRange]);

  async function fetchAnalytics() {
    setIsLoading(true);
    let query = supabase.from('appointments').select(`*, services(name), groomers(name)`);

    if (dateRange?.from) {
      query = query.gte('appointment_date', format(dateRange.from, 'yyyy-MM-dd'));
    }
    if (dateRange?.to) {
      query = query.lte('appointment_date', format(dateRange.to, 'yyyy-MM-dd'));
    }

    const { data: appointments } = await query;

    if (!appointments) {
      setIsLoading(false);
      return;
    }

    // Service stats
    const serviceMap = new Map<string, { count: number; revenue: number }>();
    appointments.forEach((apt) => {
      const name = apt.services?.name || 'Unknown';
      const existing = serviceMap.get(name) || { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += apt.total_price || 0;
      serviceMap.set(name, existing);
    });
    setServiceStats(
      Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
    );

    // Groomer stats
    const groomerMap = new Map<string, GroomerStat>();
    appointments.forEach((apt) => {
      const name = apt.groomers?.name || 'Unassigned';
      const existing = groomerMap.get(name) || { name, total: 0, completed: 0, cancelled: 0, revenue: 0 };
      existing.total++;
      if (apt.status === 'completed') existing.completed++;
      if (apt.status === 'cancelled') existing.cancelled++;
      existing.revenue += apt.total_price || 0;
      groomerMap.set(name, existing);
    });
    setGroomerStats(
      Array.from(groomerMap.values())
        .filter((g) => g.name !== 'Unassigned')
        .sort((a, b) => b.completed - a.completed)
    );

    // Earnings
    const totalRevenue = appointments.reduce((sum, a) => sum + (a.total_price || 0), 0);
    const totalDiscount = appointments.reduce((sum, a) => sum + (a.discount_applied || 0), 0);
    const completedCount = appointments.filter((a) => a.status === 'completed').length;
    setEarnings({
      totalRevenue,
      totalAppointments: appointments.length,
      avgPerAppointment: completedCount > 0 ? totalRevenue / completedCount : 0,
      totalDiscount,
    });

    setIsLoading(false);
  }

  function handlePreset(preset: typeof PRESETS[number]) {
    setActivePreset(preset.label);
    const range = preset.getRange();
    setDateRange(range.from ? { from: range.from, to: range.to } : undefined);
  }

  function handleDateRangeSelect(range: DateRange | undefined) {
    setDateRange(range);
    setActivePreset('');
  }

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : 'All time';

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Business insights and performance metrics</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant={activePreset === preset.label ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-2', !activePreset && 'border-primary text-primary')}>
                  <CalendarIcon className="h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Earnings Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Revenue', value: `₱${earnings.totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-success bg-success/10' },
            { label: 'Total Appointments', value: earnings.totalAppointments, icon: BarChart3, color: 'text-primary bg-primary/10' },
            { label: 'Avg. per Appointment', value: `₱${earnings.avgPerAppointment.toFixed(0)}`, icon: TrendingUp, color: 'text-accent bg-accent/10' },
            { label: 'Total Discounts', value: `₱${earnings.totalDiscount.toFixed(0)}`, icon: DollarSign, color: 'text-warning bg-warning/10' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
              <p className="font-display text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Most Availed Services */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Most Availed Services</h2>
            </div>
            {serviceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceStats} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 20%, 88%)" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', border: '1px solid hsl(30, 20%, 88%)', borderRadius: '8px' }}
                    formatter={(value: number, name: string) =>
                      name === 'count' ? [value, 'Bookings'] : [`₱${value.toFixed(0)}`, 'Revenue']
                    }
                  />
                  <Bar dataKey="count" fill="hsl(174, 60%, 40%)" radius={[0, 4, 4, 0]} name="count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">No service data for this period</p>
            )}
          </div>

          {/* Service Revenue Distribution */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              <h2 className="font-display text-lg font-bold">Revenue by Service</h2>
            </div>
            {serviceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceStats}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: 'hsl(25, 15%, 45%)' }}
                  >
                    {serviceStats.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`₱${value.toFixed(0)}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">No revenue data for this period</p>
            )}
          </div>
        </div>

        {/* Groomer Performance */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Groomer Performance</h2>
          </div>
          {groomerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Groomer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Total Jobs</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Completed</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Cancelled</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Completion Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groomerStats.map((g) => (
                    <tr key={g.name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{g.name}</td>
                      <td className="px-4 py-3">{g.total}</td>
                      <td className="px-4 py-3 text-success">{g.completed}</td>
                      <td className="px-4 py-3 text-destructive">{g.cancelled}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${g.total > 0 ? (g.completed / g.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {g.total > 0 ? ((g.completed / g.total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">₱{g.revenue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No groomer data for this period</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
