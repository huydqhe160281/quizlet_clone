import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { env } from '@/config/env';

export default function RegisterPage() {
  return <RegisterForm googleAuthEnabled={env.googleAuthEnabled} />;
}
