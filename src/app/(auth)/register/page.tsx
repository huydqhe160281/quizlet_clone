import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { env } from '@/lib/env';

export default function RegisterPage() {
  return <RegisterForm googleAuthEnabled={env.googleAuthEnabled} />;
}
