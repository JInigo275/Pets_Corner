import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { PawPrint, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      const friendlyMsg = error.message.toLowerCase().includes('rate') && error.message.toLowerCase().includes('exceed') 
        ? 'Email rate limit exceeded (1000/hour). Please wait 1 hour before requesting another reset link.'
        : error.message;
      toast.error(friendlyMsg);
    } else {
      setEmailSent(true);
      toast.success('Password reset email sent!');
    }

    setIsLoading(false);
  };

  return (
    <Layout hideFooter>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <PawPrint className="h-7 w-7" />
              </div>
              <h1 className="font-display text-2xl font-bold">Forgot Password</h1>
              <p className="mt-2 text-muted-foreground">
                {emailSent
                  ? 'Check your email for the reset link'
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {emailSent ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 rounded-lg bg-muted/50 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Please check your inbox and spam folder.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Try another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
