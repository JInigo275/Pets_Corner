import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Loader2, Edit2, Trash2, Upload, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  is_active: boolean;
  price: number | null;
}

export default function AdminProducts() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    is_active: true,
    price: '' as string,
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', category: 'general', is_active: true, price: '' });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) fetchProducts();
  }, [isAdmin, authLoading, navigate]);

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('category');
    if (data) setProducts(data);
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

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `${productId}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, imageFile, { upsert: true });
    if (error) {
      toast.error('Image upload failed');
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      is_active: product.is_active,
      price: product.price != null ? String(product.price) : '',
    });
    setImagePreview(product.image_url || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const productData: any = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      category: formData.category.trim() || 'general',
      is_active: formData.is_active,
      price: formData.price !== '' ? parseFloat(formData.price) : null,
    };

    let productId = editingProduct?.id;

    if (editingProduct) {
      if (imageFile) {
        const url = await uploadImage(editingProduct.id);
        if (url) productData.image_url = url;
      }
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) toast.error('Failed to update');
      else toast.success('Product updated');
    } else {
      const { data, error } = await supabase.from('products').insert(productData).select('id').single();
      if (error) {
        toast.error('Failed to create');
      } else {
        productId = data.id;
        if (imageFile && productId) {
          const url = await uploadImage(productId);
          if (url) {
            await supabase.from('products').update({ image_url: url }).eq('id', productId);
          }
        }
        toast.success('Product created');
      }
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    // Also delete image from storage
    await supabase.storage.from('product-images').remove([`${id}.jpg`, `${id}.png`, `${id}.jpeg`, `${id}.webp`]);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Product deleted');
      fetchProducts();
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
            <h1 className="mb-2 font-display text-3xl font-bold">Manage Products</h1>
            <p className="text-muted-foreground">Add and edit shop products</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. food, toys, grooming" />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₱)</Label>
                    <Input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Leave empty if no price" />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Image: </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-xl object-cover border border-border" />
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
                        Upload Image
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProduct ? 'Update' : 'Create'} Product
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`rounded-xl border bg-card p-6 transition-all ${product.is_active ? 'border-border' : 'border-destructive/30 opacity-60'}`}
            >
              <div className="mb-4 flex items-start justify-between">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mb-1 font-display font-bold">{product.name}</h3>
              {product.price != null && <p className="mb-1 text-sm font-semibold text-primary">₱{product.price.toFixed(2)}</p>}
              <p className="mb-2 text-sm capitalize text-muted-foreground">{product.category}</p>
              {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
