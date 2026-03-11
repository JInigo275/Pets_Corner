import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DailyLimit {
  id: string;
  date: string;
  max_appointments: number;
}

export default function AdminSettings() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [limits, setLimits] = useState<DailyLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [maxAppointments, setMaxAppointments] = useState('15');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchLimits();
  }, [isAdmin, authLoading, navigate]);

  async function fetchLimits() {
    const { data } = await supabase
      .from('daily_appointment_limits')
      .select('*')
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date', { ascending: true });
    if (data) setLimits(data);
    setIsLoading(false);
  }

  const handleSave = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    const limit = parseInt(maxAppointments);
    if (isNaN(limit) || limit < 0) {
      toast.error('Please enter a valid number');
      return;
    }

    setIsSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('daily_appointment_limits')
      .upsert({ date: dateStr, max_appointments: limit }, { onConflict: 'date' });

    if (error) toast.error('Failed to save limit');
    else {
      toast.success(`Limit set to ${limit} for ${format(selectedDate, 'PPP')}`);
      fetchLimits();
      setSelectedDate(undefined);
      setMaxAppointments('15');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('daily_appointment_limits').delete().eq('id', id);
    if (error) toast.error('Failed to remove limit');
    else {
      toast.success('Custom limit removed (default 15 will apply)');
      fetchLimits();
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
      <div className="container max-w-3xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold">Appointment Settings</h1>
            <p className="text-muted-foreground">Set daily appointment limits. Default is 15 per day.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
        </div>

        {/* Set limit form */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Set Daily Limit
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border border-border"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Max Appointments</Label>
                <Input
                  type="number"
                  min="0"
                  value={maxAppointments}
                  onChange={(e) => setMaxAppointments(e.target.value)}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 to block all bookings for this date.
                </p>
              </div>
              {selectedDate && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p><span className="font-medium">Date:</span> {format(selectedDate, 'PPP')}</p>
                  <p><span className="font-medium">Limit:</span> {maxAppointments || '15'} appointments</p>
                </div>
              )}
              <Button onClick={handleSave} disabled={isSaving || !selectedDate} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Limit
              </Button>
            </div>
          </div>
        </div>

        {/* Existing custom limits */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-semibold">Custom Limits</h2>
            <p className="text-sm text-muted-foreground">Dates without custom limits default to 15.</p>
          </div>
          {limits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Settings className="mb-3 h-10 w-10 opacity-40" />
              <p>No custom limits set</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {limits.map((limit) => (
                <div key={limit.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{format(new Date(limit.date + 'T00:00:00'), 'PPP')}</p>
                    <p className="text-sm text-muted-foreground">
                      Max: <span className="font-semibold text-foreground">{limit.max_appointments}</span> appointments
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(limit.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
