import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Home, Clock, Calendar, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_min: number;
  price_max: number;
  duration_minutes: number | null;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (data) setServices(data);
      setIsLoading(false);
    }

    fetchServices();
  }, []);

  const groomingServices = services.filter(s => s.category === 'grooming');
  const boardingServices = services.filter(s => s.category === 'boarding');

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
    return `${hours}h ${mins}m`;
  };

  const ServiceCard = ({ service }: { service: Service }) => (
    <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {service.category === 'grooming' ? (
            <Scissors className="h-6 w-6" />
          ) : (
            <Home className="h-6 w-6" />
          )}
        </div>
        {service.duration_minutes ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDuration(service.duration_minutes)}
          </div>
        ) : null}
      </div>
      <h3 className="mb-2 font-display text-lg font-bold">{service.name}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-primary">
          ₱{service.price_min.toFixed(0)} - ₱{service.price_max.toFixed(0)}
        </span>
        <Button size="sm" asChild>
          <Link to="/booking">Book Now</Link>
        </Button>
      </div>
    </div>
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

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-secondary via-background to-secondary/50 py-16">
        <div className="container text-center">
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl">Our Services</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            From grooming to comfortable boarding, we offer comprehensive care for your beloved pets.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-16">
        <div className="container">
          <Tabs defaultValue="grooming" className="w-full">
            <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="grooming" className="gap-2">
                <Scissors className="h-4 w-4" />
                Grooming
              </TabsTrigger>
              <TabsTrigger value="boarding" className="gap-2">
                <Home className="h-4 w-4" />
                Boarding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grooming">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groomingServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="boarding">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boardingServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Service Types */}
          <div className="mt-16">
            <h2 className="mb-8 text-center font-display text-2xl font-bold">Service Options</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Calendar className="h-7 w-7" />
                </div>
                <h3 className="mb-2 font-display font-bold">Walk-in</h3>
                <p className="text-sm text-muted-foreground">
                  Visit our salon directly. No appointment needed for basic services.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Home className="h-7 w-7" />
                </div>
                <h3 className="mb-2 font-display font-bold">Home Service</h3>
                <p className="text-sm text-muted-foreground">
                  We come to you! Premium grooming in the comfort of your home.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <h3 className="mb-2 font-display font-bold">Pick-up Service</h3>
                <p className="text-sm text-muted-foreground">
                  We'll pick up your pet and bring them back, freshly groomed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-secondary/50 py-16">
        <div className="container text-center">
          <h2 className="mb-4 font-display text-2xl font-bold">Ready to Book?</h2>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            Choose your preferred service and schedule an appointment that works for you.
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/booking">
              <Calendar className="mr-2 h-5 w-5" />
              Book Appointment
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
