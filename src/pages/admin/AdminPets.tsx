import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PawPrint, Plus, Loader2, Edit2, Trash2, Search, ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
  owner_id: string;
  created_at: string;
  owner_name?: string;
}

interface OwnerOption {
  user_id: string;
  full_name: string;
}

const speciesOptions = ['dog', 'cat'] as const;

const speciesEmoji = (species: string) => {
  const emojis: Record<string, string> = {
    dog: '🐕', cat: '🐱',
  };
  return emojis[species] || '🐾';
};

export default function AdminPets() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);

  const [formData, setFormData] = useState({
    name: '', species: '' as Pet['species'] | '', breed: '',
    age: '', weight: '', notes: '', owner_id: '',
  });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!authLoading && !isAdmin) { navigate('/dashboard'); return; }
    if (isAdmin) {
      fetchPets();
      fetchOwners();
    }
  }, [user, isAdmin, authLoading, navigate]);

  async function fetchPets() {
    setIsLoading(true);
    const { data: petsData } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });

    if (petsData) {
      const ownerIds = [...new Set(petsData.map(p => p.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setPets(petsData.map(p => ({ ...p, owner_name: profileMap.get(p.owner_id) || 'Unknown' })));
    }
    setIsLoading(false);
  }

  async function fetchOwners() {
    const { data } = await supabase.from('profiles').select('user_id, full_name').order('full_name');
    if (data) setOwners(data);
  }

  const resetForm = () => {
    setFormData({ name: '', species: '', breed: '', age: '', weight: '', notes: '', owner_id: '' });
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
      owner_id: pet.owner_id,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.species || !formData.owner_id) {
      toast.error('Please select species and owner');
      return;
    }

    setIsSubmitting(true);
    const petData = {
      name: formData.name.trim(),
      species: formData.species as Pet['species'],
      breed: formData.breed.trim() || null,
      age: formData.age ? parseInt(formData.age) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      notes: formData.notes.trim() || null,
      owner_id: formData.owner_id,
    };

    if (editingPet) {
      const { error } = await supabase.from('pets').update(petData).eq('id', editingPet.id);
      if (error) toast.error('Failed to update pet');
      else toast.success('Pet updated');
    } else {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('pets')
        .select('id, name')
        .eq('owner_id', formData.owner_id)
        .ilike('name', formData.name.trim());

      if (existing && existing.length > 0) {
        toast.warning(`This owner already has a pet named "${formData.name.trim()}". Adding anyway.`);
      }

      const { error } = await supabase.from('pets').insert(petData);
      if (error) toast.error('Failed to add pet');
      else toast.success('Pet added');
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    resetForm();
    fetchPets();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('pets').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Failed to delete pet');
    else {
      toast.success('Pet deleted');
      fetchPets();
    }
    setDeleteTarget(null);
  };

  const filteredPets = pets.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.species.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
                <PawPrint className="h-8 w-8 text-primary" />
                Pet Management
              </h1>
              <p className="mt-1 text-muted-foreground">View and manage all registered pets</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {pets.length} Pets
              </Badge>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, breed, species, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pet</TableHead>
                <TableHead>Species / Breed</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <PawPrint className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No pets found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPets.map((pet) => (
                  <TableRow key={pet.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{speciesEmoji(pet.species)}</span>
                        <div className="font-medium">{pet.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{pet.species}</Badge>
                      {pet.breed && <p className="text-xs text-muted-foreground mt-1">{pet.breed}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {pet.age && <Badge variant="secondary">{pet.age} yrs</Badge>}
                        {pet.weight && <Badge variant="secondary">{pet.weight} lbs</Badge>}
                        {!pet.age && !pet.weight && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{pet.owner_name}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(pet)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(pet)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPet ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Owner *</Label>
                <Select value={formData.owner_id} onValueChange={(v) => setFormData({ ...formData, owner_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Species *</Label>
                <Select value={formData.species} onValueChange={(v) => setFormData({ ...formData, species: v as Pet['species'] })}>
                  <SelectTrigger><SelectValue placeholder="Select species" /></SelectTrigger>
                  <SelectContent>
                    {speciesOptions.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{speciesEmoji(s)} {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Breed</Label>
                  <Input value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Age (years)</Label>
                  <Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} min="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs)</Label>
                <Input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : editingPet ? 'Update Pet' : 'Add Pet'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this pet and cannot be undone. Any associated appointments may be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
