import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Plus, Loader2, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  service_type: 'walk-in' | 'home-service' | 'pick-up';
  total_price: number | null;
  notes: string | null;
  pets: { name: string; species: string } | null;
  services: { name: string; duration_minutes: number | null } | null;
  groomers: { name: string } | null;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/30' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary border-primary/30' },
  'in-progress': { label: 'In Progress', className: 'bg-accent/10 text-accent border-accent/30' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/30' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const serviceTypeLabels: Record<string, string> = {
  'walk-in': 'Walk-in',
  'home-service': 'Home Service',
  'pick-up': 'Pick-up',
};

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  async function fetchAppointments() {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        pets(name, species),
        services(name, duration_minutes),
        groomers(name)
      `)
      .eq('customer_id', user.id)
      .order('appointment_date', { ascending: false });
    
    if (data) setAppointments(data);
    setIsLoading(false);
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);
    
    if (error) toast.error('Failed to cancel appointment');
    else {
      toast.success('Appointment cancelled');
      fetchAppointments();
    }
  };

  const upcomingAppointments = appointments.filter(
    a => a.status !== 'completed' && a.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(
    a => a.status === 'completed' || a.status === 'cancelled'
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const AppointmentCard = ({ apt }: { apt: Appointment }) => (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold">{apt.pets?.name}</h3>
            <Badge variant="outline" className={statusStyles[apt.status].className}>
              {statusStyles[apt.status].label}
            </Badge>
          </div>
          <p className="text-muted-foreground">{apt.services?.name}</p>
        </div>
        {apt.total_price && (
          <span className="text-lg font-bold text-primary">
            P{apt.total_price.toFixed(0)}
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {apt.start_time}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {serviceTypeLabels[apt.service_type]}
        </div>
        {apt.groomers && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            {apt.groomers.name}
          </div>
        )}
      </div>

      {apt.notes && (
        <p className="mb-4 text-sm text-muted-foreground">{apt.notes}</p>
      )}

      {apt.status === 'pending' && (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => handleCancel(apt.id)}
        >
          Cancel Appointment
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground">View and manage your bookings</p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/booking">
              <Plus className="mr-2 h-4 w-4" />
              Book New
            </Link>
          </Button>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 font-display text-xl font-bold">No Appointments</h2>
            <p className="mb-4 text-muted-foreground">
              You haven't booked any appointments yet
            </p>
            <Button variant="hero" asChild>
              <Link to="/booking">Book Your First Appointment</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming */}
            {upcomingAppointments.length > 0 && (
              <div>
                <h2 className="mb-4 font-display text-xl font-bold">Upcoming</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} apt={apt} />
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {pastAppointments.length > 0 && (
              <div>
                <h2 className="mb-4 font-display text-xl font-bold text-muted-foreground">Past Appointments</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pastAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} apt={apt} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
