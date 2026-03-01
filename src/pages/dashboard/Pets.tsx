import { useEffect, useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { PawPrint, Plus, Loader2, Edit2, Trash2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
  photo_url: string | null;
}

const speciesOptions = ['dog', 'cat'] as const;

const speciesEmoji = (species: string) => {
  const emojis: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    };
  return emojis[species] || '🐾';
};

export default function Pets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    species: '' as Pet['species'] | '',
    breed: '',
    age: '',
    weight: '',
    notes: '',
  });

  useEffect(() => {
    fetchPets();
  }, [user]);

  async function fetchPets() {
    if (!user) return;
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPets(data);
    setIsLoading(false);
  }

  const resetForm = () => {
    setFormData({ name: '', species: '', breed: '', age: '', weight: '', notes: '' });
    setEditingPet(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEditDialog = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      age: pet.age?.toString() || '',
      weight: pet.weight?.toString() || '',
      notes: pet.notes || '',
    });
    setPhotoPreview(pet.photo_url || null);
    setPhotoFile(null);
    setIsDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = async (petId: string): Promise<string | null> => {
    if (!photoFile || !user) return null;
    const ext = photoFile.name.split('.').pop();
    const path = `${user.id}/${petId}.${ext}`;

    const { error } = await supabase.storage
      .from('pet-photos')
      .upload(path, photoFile, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.species) return;
    setIsSubmitting(true);

    const petData = {
      name: formData.name.trim(),
      species: formData.species as Pet['species'],
      breed: formData.breed.trim() || null,
      age: formData.age ? parseInt(formData.age) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      notes: formData.notes.trim() || null,
      owner_id: user.id,
    };

    if (editingPet) {
      let photo_url = editingPet.photo_url;
      if (photoFile) {
        const url = await uploadPhoto(editingPet.id);
        if (url) photo_url = url;
      } else if (!photoPreview) {
        photo_url = null;
      }

      const { error } = await supabase
        .from('pets')
        .update({ ...petData, photo_url })
        .eq('id', editingPet.id);

      if (error) toast.error('Failed to update pet');
      else toast.success('Pet updated successfully');
    } else {
      const { data: newPet, error } = await supabase
        .from('pets')
        .insert(petData)
        .select('id')
        .single();

      if (error || !newPet) {
        toast.error('Failed to add pet');
      } else {
        if (photoFile) {
          const url = await uploadPhoto(newPet.id);
          if (url) {
            await supabase.from('pets').update({ photo_url: url }).eq('id', newPet.id);
          }
        }
        toast.success('Pet added successfully');
      }
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    resetForm();
    fetchPets();
  };

  const handleDelete = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;
    const { error } = await supabase.from('pets').delete().eq('id', petId);
    if (error) toast.error('Failed to delete pet');
    else {
      toast.success('Pet deleted');
      fetchPets();
    }
  };

  if (isLoading) {
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
            <h1 className="mb-2 font-display text-3xl font-bold">My Pets</h1>
            <p className="text-muted-foreground">Manage your registered pets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPet ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Pet" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {photoPreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                        <X className="mr-1 h-3 w-3" /> Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Buddy"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Species *</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => setFormData({ ...formData, species: value as Pet['species'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {speciesEmoji(s)} {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Breed</Label>
                    <Input
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="Golden Retriever"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age (years)</Label>
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="3"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="25.5"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special needs or allergies..."
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPet ? 'Update Pet' : 'Add Pet'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {pets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <PawPrint className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 font-display text-xl font-bold">No Pets Yet</h2>
            <p className="mb-4 text-muted-foreground">
              Add your first pet to start booking appointments
            </p>
            <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Pet
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-3xl">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
                    ) : (
                      speciesEmoji(pet.species)
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(pet)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(pet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="mb-1 font-display text-xl font-bold">{pet.name}</h3>
                <p className="mb-3 text-sm capitalize text-muted-foreground">
                  {pet.breed || pet.species}
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {pet.age && (
                    <span className="rounded-full bg-secondary px-3 py-1">{pet.age} years</span>
                  )}
                  {pet.weight && (
                    <span className="rounded-full bg-secondary px-3 py-1">{pet.weight} lbs</span>
                  )}
                </div>
                {pet.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{pet.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
