'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function GoogleButton() {
  const handleClick = () => {
    void signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick}>
      Continue with Google
    </Button>
  );
}
