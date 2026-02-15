import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Search,
  Users,
  PawPrint,
  Phone,
  MapPin,
  Star,
  CreditCard,
  ChevronLeft,
  Eye,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
}

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  loyalty_card_number: string | null;
  loyalty_points: number | null;
  created_at: string;
  pets: Pet[];
}

interface ServiceHistoryItem {
  id: string;
  service_name: string;
  service_date: string;
  amount_paid: number;
  loyalty_points_earned: number | null;
  pet_id: string;
}

export default function AdminCustomers() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [customerRoles, setCustomerRoles] = useState<Record<string, boolean>>({});
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }

    if (isAdmin) {
      fetchCustomers();
      fetchAdminRoles();
    }
  }, [user, isAdmin, authLoading, navigate]);

  async function fetchAdminRoles() {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');
    
    const roleMap: Record<string, boolean> = {};
    data?.forEach(r => { roleMap[r.user_id] = true; });
    setCustomerRoles(roleMap);
  }

  async function toggleAdminRole(customerId: string, currentlyAdmin: boolean) {
    if (customerId === user?.id) {
      toast.error("You can't remove your own admin role");
      return;
    }
    setTogglingAdmin(customerId);

    if (currentlyAdmin) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', customerId)
        .eq('role', 'admin');
      if (error) toast.error('Failed to remove admin role');
      else toast.success('Admin role removed');
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: customerId, role: 'admin' as const });
      if (error) toast.error('Failed to grant admin role');
      else toast.success('Admin role granted');
    }

    await fetchAdminRoles();
    setTogglingAdmin(null);
  }

  async function fetchCustomers() {
    setIsLoading(true);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profiles) {
      const customersWithPets = await Promise.all(
        profiles.map(async (profile) => {
          const { data: pets } = await supabase
            .from('pets')
            .select('id, name, species, breed, age')
            .eq('owner_id', profile.user_id);
          
          return {
            ...profile,
            pets: pets || [],
          };
        })
      );
      setCustomers(customersWithPets);
    }
    
    setIsLoading(false);
  }

  async function viewCustomerDetails(customer: Customer) {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
    setIsLoadingHistory(true);

    const { data: history } = await supabase
      .from('service_history')
      .select('*')
      .eq('customer_id', customer.user_id)
      .order('service_date', { ascending: false });

    setServiceHistory(history || []);
    setIsLoadingHistory(false);
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.loyalty_card_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSpeciesIcon = (species: string) => {
    const colors: Record<string, string> = {
      dog: 'bg-primary/10 text-primary',
      cat: 'bg-accent/10 text-accent',
      bird: 'bg-warning/10 text-warning',
      rabbit: 'bg-success/10 text-success',
      other: 'bg-muted text-muted-foreground',
    };
    return colors[species] || colors.other;
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
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
                <Users className="h-8 w-8 text-primary" />
                Customer Management
              </h1>
              <p className="mt-1 text-muted-foreground">
                View and manage all customers and their pets
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {customers.length} Customers
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or loyalty card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Customers Table */}
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Loyalty</TableHead>
                <TableHead>Pets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No customers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">{customer.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Since {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {customer.address.substring(0, 30)}...
                          </div>
                        )}
                        {!customer.phone && !customer.address && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.loyalty_card_number && (
                          <div className="flex items-center gap-1 text-sm">
                            <CreditCard className="h-3 w-3 text-primary" />
                            {customer.loyalty_card_number}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 text-warning" />
                          {customer.loyalty_points || 0} pts
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.pets.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No pets</span>
                        ) : (
                          customer.pets.map((pet) => (
                            <Badge
                              key={pet.id}
                              variant="outline"
                              className={`${getSpeciesIcon(pet.species)}`}
                            >
                              <PawPrint className="mr-1 h-3 w-3" />
                              {pet.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant={customerRoles[customer.user_id] ? 'destructive' : 'outline'}
                          size="sm"
                          disabled={togglingAdmin === customer.user_id || customer.user_id === user?.id}
                          onClick={() => toggleAdminRole(customer.user_id, !!customerRoles[customer.user_id])}
                        >
                          {togglingAdmin === customer.user_id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : customerRoles[customer.user_id] ? (
                            <ShieldOff className="mr-1 h-4 w-4" />
                          ) : (
                            <ShieldCheck className="mr-1 h-4 w-4" />
                          )}
                          {customerRoles[customer.user_id] ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewCustomerDetails(customer)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Customer Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Customer Details
              </DialogTitle>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold mb-3">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedCustomer.full_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{selectedCustomer.phone || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{selectedCustomer.address || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Loyalty Card:</span>
                      <p className="font-medium">{selectedCustomer.loyalty_card_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Points:</span>
                      <p className="font-medium flex items-center gap-1">
                        <Star className="h-4 w-4 text-warning" />
                        {selectedCustomer.loyalty_points || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pets */}
                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <PawPrint className="h-4 w-4" />
                    Pets ({selectedCustomer.pets.length})
                  </h3>
                  {selectedCustomer.pets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pets registered</p>
                  ) : (
                    <div className="grid gap-2">
                      {selectedCustomer.pets.map((pet) => (
                        <div
                          key={pet.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${getSpeciesIcon(pet.species)}`}>
                              <PawPrint className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{pet.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}
                                {pet.breed && ` • ${pet.breed}`}
                                {pet.age && ` • ${pet.age} years`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service History */}
                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Loyalty History
                  </h3>
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : serviceHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No service history yet</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {serviceHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{item.service_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.service_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₱{item.amount_paid}</p>
                            <p className="text-xs text-success">
                              +{item.loyalty_points_earned || 0} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
