import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2, Edit2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  customer_id: string;
  appointment_date: string;
  start_time: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  service_type: string;
  total_price: number | null;
  discount_applied: number | null;
  notes: string | null;
  pets: { name: string } | null;
  services: { name: string } | null;
  groomers: { name: string } | null;
}

const statusOptions = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'] as const;

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  confirmed: 'bg-primary/10 text-primary border-primary/30',
  'in-progress': 'bg-accent/10 text-accent border-accent/30',
  completed: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function AdminAppointments() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editStatus, setEditStatus] = useState<Appointment['status']>('pending');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchAppointments();
  }, [isAdmin, authLoading, navigate]);

  async function fetchAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        pets(name),
        services(name),
        groomers(name)
      `)
      .order('appointment_date', { ascending: false });
    
    if (data) setAppointments(data);
    setIsLoading(false);
  }

  const openEdit = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setEditPrice(apt.total_price?.toString() || '');
    setEditDiscount(apt.discount_applied?.toString() || '0');
    setEditStatus(apt.status);
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;

    const { error } = await supabase
      .from('appointments')
      .update({
        status: editStatus,
        total_price: editPrice ? parseFloat(editPrice) : null,
        discount_applied: editDiscount ? parseFloat(editDiscount) : 0,
      })
      .eq('id', selectedAppointment.id);

    if (error) toast.error('Failed to update');
    else {
      toast.success('Appointment updated');
      fetchAppointments();
      setSelectedAppointment(null);
    }
  };

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold">Manage Appointments</h1>
            <p className="text-muted-foreground">View and update all appointments</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Pet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{format(new Date(apt.appointment_date), 'MMM d')}</p>
                          <p className="text-xs text-muted-foreground">{apt.start_time}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{apt.customer_id.substring(0, 8)}...</td>
                    <td className="px-4 py-3">{apt.pets?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{apt.services?.name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusStyles[apt.status]}>
                        {apt.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      P{apt.total_price?.toFixed(0) || '0'}
                      {apt.discount_applied ? (
                        <span className="ml-1 text-xs text-success">-P{apt.discount_applied}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(apt)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Appointment['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Price (P)</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount (P)</Label>
                <Input
                  type="number"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {editPrice && editDiscount && (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success">
                  <span className="font-medium">
                    Final: P{(parseFloat(editPrice) - parseFloat(editDiscount || '0')).toFixed(2)}
                  </span>
                </div>
              )}
              <Button onClick={handleUpdate} className="w-full">
                Update Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
