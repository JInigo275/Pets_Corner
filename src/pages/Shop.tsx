import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShoppingBag, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  price: number | null;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, name, description, image_url, category, price')
        .eq('is_active', true)
        .order('category');
      if (data) setProducts(data);
      setIsLoading(false);
    }
    fetchProducts();
  }, []);

  const categories = [...new Set(products.map((p) => p.category))];

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
      <div className="container py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-3 font-display text-4xl font-bold">Our Shop</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Browse our curated selection of premium pet care products.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No products available yet</p>
            <p className="text-sm text-muted-foreground/70">Check back soon!</p>
          </div>
        ) : (
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="mb-8 flex w-full flex-wrap justify-center gap-1">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products
                    .filter((p) => p.category === category)
                    .map((product) => (
                      <div
                        key={product.id}
                        className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg"
                      >
                        <div className="aspect-square overflow-hidden bg-muted">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-16 w-16 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="mb-1 font-display text-lg font-bold">{product.name}</h3>
                          {product.price != null && (
                            <p className="mb-2 text-base font-semibold text-primary">₱{product.price.toFixed(2)}</p>
                          )}
                          {product.description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
