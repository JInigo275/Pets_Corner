import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Loader2, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  price_min: number;
  price_max: number;
  duration_minutes: number;
}

interface Groomer {
  id: string;
  name: string;
  specialty: string | null;
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export default function Booking() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPet, setSelectedPet] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedGroomer, setSelectedGroomer] = useState('');
  const [serviceType, setServiceType] = useState<'walk-in' | 'home-service' | 'pick-up'>('walk-in');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    async function fetchData() {
      if (!user) return;

      const [petsRes, servicesRes, groomersRes] = await Promise.all([
        supabase.from('pets').select('id, name, species').eq('owner_id', user.id),
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('groomers').select('*').eq('is_available', true),
      ]);

      if (petsRes.data) setPets(petsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (groomersRes.data) setGroomers(groomersRes.data);
      setIsLoading(false);
    }

    if (user) fetchData();
  }, [user, authLoading, navigate]);

  const selectedServiceData = services.find(s => s.id === selectedService);
  const estimatedPrice = selectedServiceData
    ? `P${selectedServiceData.price_min.toFixed(0)} - P${selectedServiceData.price_max.toFixed(0)}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedPet || !selectedService || !selectedDate || !selectedTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('appointments').insert({
      customer_id: user.id,
      pet_id: selectedPet,
      service_id: selectedService,
      groomer_id: selectedGroomer || null,
      service_type: serviceType,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      notes: notes || null,
      total_price: selectedServiceData?.price_min,
    });

    if (error) {
      toast.error('Failed to book appointment');
    } else {
      toast.success('Appointment booked successfully!');
      navigate('/dashboard/appointments');
    }

    setIsSubmitting(false);
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
      <div className="container max-w-2xl py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold">Book an Appointment</h1>
          <p className="text-muted-foreground">Schedule a grooming or boarding session for your pet</p>
        </div>

        {pets.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <PawPrint className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 font-display text-xl font-bold">No Pets Found</h2>
            <p className="mb-4 text-muted-foreground">You need to add a pet before booking an appointment.</p>
            <Button onClick={() => navigate('/dashboard/pets')}>Add a Pet</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-8">
            {/* Pet Selection */}
            <div className="space-y-2">
              <Label>Select Pet *</Label>
              <Select value={selectedPet} onValueChange={setSelectedPet}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your pet" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label>Select Service *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} (P{service.price_min} - P{service.price_max})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {estimatedPrice && (
                <p className="text-sm text-muted-foreground">
                  Estimated cost: <span className="font-semibold text-primary">{estimatedPrice}</span>
                </p>
              )}
            </div>

            {/* Service Type */}
            <div className="space-y-3">
              <Label>Service Type *</Label>
              <RadioGroup
                value={serviceType}
                onValueChange={(value) => setServiceType(value as typeof serviceType)}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="walk-in" id="walk-in" className="peer sr-only" />
                  <Label
                    htmlFor="walk-in"
                    className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-border p-4 hover:bg-secondary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="font-medium">Walk-in</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="home-service" id="home-service" className="peer sr-only" />
                  <Label
                    htmlFor="home-service"
                    className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-border p-4 hover:bg-secondary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="font-medium">Home Service</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="pick-up" id="pick-up" className="peer sr-only" />
                  <Label
                    htmlFor="pick-up"
                    className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-border p-4 hover:bg-secondary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="font-medium">Pick-up</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Groomer Selection */}
            <div className="space-y-2">
              <Label>Preferred Groomer (Optional)</Label>
              <Select value={selectedGroomer} onValueChange={setSelectedGroomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Any available groomer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any available groomer</SelectItem>
                  {groomers.map((groomer) => (
                    <SelectItem key={groomer.id} value={groomer.id}>
                      {groomer.name} {groomer.specialty && `- ${groomer.specialty}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Select Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Select Time *</Label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Special Notes (Optional)</Label>
              <Textarea
                placeholder="Any special requests or things we should know about your pet..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </form>
        )}
      </div>
    </Layout>
  );
}
