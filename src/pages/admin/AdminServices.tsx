import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_min: number;
  price_max: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function AdminServices() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'grooming',
    price_min: '',
    price_max: '',
    duration_minutes: '',
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchServices();
  }, [isAdmin, authLoading, navigate]);

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true });
    
    if (data) setServices(data);
    setIsLoading(false);
  }

  const resetForm = () => {
    setFormData({
      name: '', description: '', category: 'grooming',
      price_min: '', price_max: '', duration_minutes: '', is_active: true,
    });
    setEditingService(null);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      price_min: service.price_min.toString(),
      price_max: service.price_max.toString(),
      duration_minutes: service.duration_minutes.toString(),
      is_active: service.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const serviceData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      category: formData.category,
      price_min: parseFloat(formData.price_min),
      price_max: parseFloat(formData.price_max),
      duration_minutes: parseInt(formData.duration_minutes),
      is_active: formData.is_active,
    };

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);
      
      if (error) toast.error('Failed to update');
      else toast.success('Service updated');
    } else {
      const { error } = await supabase.from('services').insert(serviceData);
      
      if (error) toast.error('Failed to create');
      else toast.success('Service created');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    resetForm();
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;

    const { error } = await supabase.from('services').delete().eq('id', id);
    
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Service deleted');
      fetchServices();
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
            <h1 className="mb-2 font-display text-3xl font-bold">Manage Services</h1>
            <p className="text-muted-foreground">Add and edit available services</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grooming">Grooming</SelectItem>
                        <SelectItem value="boarding">Boarding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Price (₱) *</Label>
                      <Input
                        type="number"
                        value={formData.price_min}
                        onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Price (₱) *</Label>
                      <Input
                        type="number"
                        value={formData.price_max}
                        onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes) *</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingService ? 'Update' : 'Create'} Service
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`rounded-xl border bg-card p-6 transition-all ${
                service.is_active ? 'border-border' : 'border-destructive/30 opacity-60'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Scissors className="h-6 w-6" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mb-1 font-display font-bold">{service.name}</h3>
              <p className="mb-2 text-sm capitalize text-muted-foreground">{service.category}</p>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-primary">
                  P{service.price_min} - P{service.price_max}
                </span>
                <span className="text-muted-foreground">{service.duration_minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
