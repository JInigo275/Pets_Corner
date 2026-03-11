import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  PawPrint, 
  Calendar, 
  Scissors,
  Package,
  UserCheck,
  BarChart3,
  Settings,
  Loader2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface AdminStats {
  customerCount: number;
  petCount: number;
  appointmentCount: number;
  serviceCount: number;
  productCount: number;
  groomerCount: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    customerCount: 0,
    petCount: 0,
    appointmentCount: 0,
    serviceCount: 0,
    productCount: 0,
    groomerCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }

    async function fetchStats() {
      const [customersRes, petsRes, appointmentsRes, servicesRes, productsRes, groomersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('pets').select('id', { count: 'exact' }),
        supabase.from('appointments').select('id', { count: 'exact' }),
        supabase.from('services').select('id', { count: 'exact' }),
        supabase.from('products').select('id' , { count: 'exact'}),
        supabase.from('groomers').select('id' , { count: 'exact'}),
      ]);

      setStats({
        customerCount: customersRes.count || 0,
        petCount: petsRes.count || 0,
        appointmentCount: appointmentsRes.count || 0,
        serviceCount: servicesRes.count || 0,
        productCount: productsRes.count || 0, 
        groomerCount: groomersRes.count || 0,
      });
      setIsLoading(false);
    }

    if (isAdmin) fetchStats();
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="mb-2 font-display text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Customers', value: stats.customerCount, icon: Users, href: '/admin/customers', color: 'text-primary bg-primary/10' },
    { label: 'Pets', value: stats.petCount, icon: PawPrint, href: '/admin/pets', color: 'text-accent bg-accent/10' },
    { label: 'Appointments', value: stats.appointmentCount, icon: Calendar, href: '/admin/appointments', color: 'text-warning bg-warning/10' },
    { label: 'Services', value: stats.serviceCount, icon: Scissors, href: '/admin/services', color: 'text-success bg-success/10' },
    { label: 'Products', value: stats.productCount, icon: Package, href: '/admin/products', color: 'text-primary bg-primary/10' },
    { label: 'Groomers', value: stats.groomerCount, icon: UserCheck, href: '/admin/groomers', color: 'text-accent bg-accent/10' },
    { label: 'Analytics', value: null, icon: BarChart3, href: '/admin/analytics', color: 'text-success bg-success/10' },
    { label: 'Settings', value: null, icon: Settings, href: '/admin/settings', color: 'text-warning bg-warning/10' },
  ];

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="mb-2 font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your pet care business</p>
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
              {stat.value !== null && <p className="font-display text-2xl font-bold">{stat.value}</p>}
              {stat.value === null && <p className="font-display text-sm font-medium text-primary">View →</p>}
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="default" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/customers" className="flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Manage Customers</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/pets" className="flex flex-col items-center gap-2">
              <PawPrint className="h-6 w-6" />
              <span>Manage Pets</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/appointments" className="flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Manage Appointments</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/services" className="flex flex-col items-center gap-2">
              <Scissors className="h-6 w-6" />
              <span>Manage Services</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/products" className="flex flex-col items-center gap-2">
              <Package className="h-6 w-6" />
              <span>Manage Products</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/groomers" className="flex flex-col items-center gap-2">
              <UserCheck className="h-6 w-6" />
              <span>Manage Groomers</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/analytics" className="flex flex-col items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="h-auto py-6" asChild>
            <Link to="/admin/settings" className="flex flex-col items-center gap-2">
              <Settings className="h-6 w-6" />
              <span>Appointment Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
