import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { PawPrint, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
}

const speciesOptions = ['dog', 'cat'] as const;

export default function Pets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsDialogOpen(true);
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
      const { error } = await supabase
        .from('pets')
        .update(petData)
        .eq('id', editingPet.id);
      
      if (error) toast.error('Failed to update pet');
      else toast.success('Pet updated successfully');
    } else {
      const { error } = await supabase.from('pets').insert(petData);
      
      if (error) toast.error('Failed to add pet');
      else toast.success('Pet added successfully');
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

  const speciesEmoji = (species: string) => {
    const emojis: Record<string, string> = {
      dog: '🐕',
      cat: '🐱'
    };
    return emojis[species] || '🐾';
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-3xl">
                    {speciesEmoji(pet.species)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(pet)}
                    >
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
                    <span className="rounded-full bg-secondary px-3 py-1">
                      {pet.age} years
                    </span>
                  )}
                  {pet.weight && (
                    <span className="rounded-full bg-secondary px-3 py-1">
                      {pet.weight} lbs
                    </span>
                  )}
                </div>
                {pet.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {pet.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
