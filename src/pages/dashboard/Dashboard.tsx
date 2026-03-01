import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  PawPrint, 
  Calendar, 
  Star, 
  CreditCard,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  petCount: number;
  upcomingAppointments: number;
  loyaltyPoints: number;
  totalSpent: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  pets: { name: string } | null;
  services: { name: string } | null;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    petCount: 0,
    upcomingAppointments: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const [petsRes, appointmentsRes, historyRes] = await Promise.all([
        supabase.from('pets').select('id', { count: 'exact' }).eq('owner_id', user.id),
        supabase
          .from('appointments')
          .select('id, appointment_date, start_time, status, pets(name), services(name)')
          .eq('customer_id', user.id)
          .gte('appointment_date', today)
          .order('appointment_date', { ascending: true })
          .limit(5),
        supabase
          .from('service_history')
          .select('amount_paid')
          .eq('customer_id', user.id),
      ]);

      const totalSpent = historyRes.data?.reduce((sum, h) => sum + Number(h.amount_paid), 0) || 0;

      setStats({
        petCount: petsRes.count || 0,
        upcomingAppointments: appointmentsRes.data?.length || 0,
        loyaltyPoints: profile?.loyalty_points || 0,
        totalSpent,
      });

      setRecentAppointments(appointmentsRes.data || []);
      setIsLoading(false);
    }

    fetchDashboardData();
  }, [user, profile]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'My Pets', value: stats.petCount, icon: PawPrint, href: '/dashboard/pets', color: 'text-primary bg-primary/10' },
    { label: 'Upcoming', value: stats.upcomingAppointments, icon: Calendar, href: '/dashboard/appointments', color: 'text-accent bg-accent/10' },
    { label: 'Loyalty Points', value: stats.loyaltyPoints, icon: Star, href: '/dashboard/loyalty', color: 'text-warning bg-warning/10' },
    { label: 'Total Spent', value: `P${stats.totalSpent.toFixed(0)}`, icon: CreditCard, href: '/dashboard/history', color: 'text-success bg-success/10' },
  ];

  return (
    <Layout>
      <div className="container py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-display text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your pet care activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.href}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl font-bold">{stat.value}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="hero" size="lg" className="h-auto py-6" asChild>
            <Link to="/booking" className="flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Book Appointment</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/dashboard/pets" className="flex flex-col items-center gap-2">
              <PawPrint className="h-6 w-6" />
              <span>Manage Pets</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/services" className="flex flex-col items-center gap-2">
              <Star className="h-6 w-6" />
              <span>View Services</span>
            </Link>
          </Button>
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Upcoming Appointments</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/appointments">View All</Link>
            </Button>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming appointments</p>
              <Button variant="default" size="sm" className="mt-4" asChild>
                <Link to="/booking">Book Now</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{apt.pets?.name || 'Pet'}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.services?.name || 'Service'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">{apt.start_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loyalty Card */}
        {profile?.loyalty_card_number && (
          <div className="mt-6 rounded-xl hero-gradient p-6 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Loyalty Card</p>
                <p className="font-mono text-lg font-bold">{profile.loyalty_card_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Points</p>
                <p className="font-display text-2xl font-bold">{stats.loyaltyPoints}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
