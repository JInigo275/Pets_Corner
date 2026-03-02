import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, Edit2, Trash2, Upload, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface Groomer {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  is_available: boolean | null;
  created_at: string;
}

export default function AdminGroomers() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroomer, setEditingGroomer] = useState<Groomer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    is_available: true,
  });

  const resetForm = () => {
    setFormData({ name: '', specialty: '', is_available: true });
    setEditingGroomer(null);
    setImageFile(null);
    setImagePreview(null);
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchGroomers();
  }, [isAdmin, authLoading, navigate]);

  async function fetchGroomers() {
    const { data } = await supabase
      .from('groomers')
      .select('*')
      .order('name');
    if (data) setGroomers(data);
    setIsLoading(false);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (groomerId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `groomers/${groomerId}.${ext}`;
    const { error } = await supabase.storage
      .from('pet-photos')
      .upload(path, imageFile, { upsert: true });
    if (error) {
      toast.error('Photo upload failed');
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('pet-photos')
      .getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const openEdit = (groomer: Groomer) => {
    setEditingGroomer(groomer);
    setFormData({
      name: groomer.name,
      specialty: groomer.specialty || '',
      is_available: groomer.is_available ?? true,
    });
    setImagePreview(groomer.photo_url || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const groomerData: any = {
      name: formData.name.trim(),
      specialty: formData.specialty.trim() || null,
      is_available: formData.is_available,
    };

    if (editingGroomer) {
      if (imageFile) {
        const url = await uploadPhoto(editingGroomer.id);
        if (url) groomerData.photo_url = url;
      }
      const { error } = await supabase.from('groomers').update(groomerData).eq('id', editingGroomer.id);
      if (error) toast.error('Failed to update');
      else toast.success('Groomer updated');
    } else {
      const { data, error } = await supabase.from('groomers').insert(groomerData).select('id').single();
      if (error) {
        toast.error('Failed to create');
      } else {
        if (imageFile && data.id) {
          const url = await uploadPhoto(data.id);
          if (url) {
            await supabase.from('groomers').update({ photo_url: url }).eq('id', data.id);
          }
        }
        toast.success('Groomer created');
      }
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    resetForm();
    fetchGroomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this groomer?')) return;
    const { error } = await supabase.from('groomers').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Groomer deleted');
      fetchGroomers();
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
            <h1 className="mb-2 font-display text-3xl font-bold">Manage Groomers</h1>
            <p className="text-muted-foreground">Add, edit, and manage your grooming staff</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>Back to Admin</Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Groomer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGroomer ? 'Edit Groomer' : 'Add New Groomer'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty</Label>
                    <Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} placeholder="e.g. Large breeds, Cats, Show cuts" />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-full object-cover border border-border" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_available} onCheckedChange={(v) => setFormData({ ...formData, is_available: v })} />
                    <Label>Available</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingGroomer ? 'Update' : 'Create'} Groomer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groomers.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center">
              <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-display text-lg font-bold">No groomers yet</h3>
              <p className="text-muted-foreground">Add your first groomer to get started.</p>
            </div>
          )}
          {groomers.map((groomer) => (
            <div
              key={groomer.id}
              className={`rounded-xl border bg-card p-6 transition-all ${groomer.is_available ? 'border-border' : 'border-destructive/30 opacity-60'}`}
            >
              <div className="mb-4 flex items-start justify-between">
                {groomer.photo_url ? (
                  <img src={groomer.photo_url} alt={groomer.name} className="h-14 w-14 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-7 w-7" />
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(groomer)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(groomer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mb-1 font-display font-bold">{groomer.name}</h3>
              {groomer.specialty && <p className="mb-1 text-sm text-muted-foreground">{groomer.specialty}</p>}
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${groomer.is_available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {groomer.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
