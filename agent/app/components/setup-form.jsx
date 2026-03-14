'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { setupAdmin } from 'thepopebot/auth/actions';

export function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await setupAdmin(email, password);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Redirect to login with success indicator — admin must authenticate through the normal flow
      router.push('/login?created=1');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-[28px] border-white/10 bg-white/5 p-0 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">Create Admin Account</CardTitle>
        <CardDescription className="text-white/60">Set up the first coalition operator for this machine.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              className="border-white/10 bg-black/30 text-white placeholder:text-white/35"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              className="border-white/10 bg-black/30 text-white placeholder:text-white/35"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}
          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
