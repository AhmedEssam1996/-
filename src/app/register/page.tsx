'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';
import { DemoModeBadge } from '@/components/layout/logo';
import { register } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(form.email, form.password, form.fullName);
      router.push('/login?registered=1');
    } catch (err) {
      setError((err as Error).message || 'حصلت مشكلة في إنشاء الحساب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell showAmbient narrow>
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Logo />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full"
        >
          <Card className="border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">أنشئ حساب جديد</CardTitle>
              <CardDescription>ابدأ رحلتك مع هداياك — مجانًا.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <FormField
                  label="الاسم الكامل"
                  name="fullName"
                  type="text"
                  placeholder="محمد أحمد"
                  value={form.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                  className="bg-[var(--card-soft)]"
                />

                <FormField
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  className="bg-[var(--card-soft)]"
                />

                <FormField
                  label="كلمة المرور"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  helper={showPassword ? undefined : 'أدخل 8 أحرف على الأقل'}
                  icon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="hover:text-fg-muted"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  }
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-[var(--hd-rose)]"
                  >
                    {error}
                  </motion.p>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin">●</span>
                      جارٍ الإنشاء...
                    </>
                  ) : (
                    <>
                      <UserPlus className="ml-2 h-4 w-4" />
                      إنشاء الحساب
                    </>
                  )}
                </Button>

                <div className="text-center text-sm">
                  لديك حساب؟{' '}
                  <Link href="/login" className="text-[var(--hd-pink)] hover:text-[var(--hd-pink-soft)]">
                    سجّل دخولك
                  </Link>
                </div>
              </CardFooter>

              <div className="border-t border-[var(--border)] px-6 py-3 text-center">
                <DemoModeBadge />
              </div>
            </form>
          </Card>
        </motion.div>

        <p className="mt-6 text-center text-xs text-fg-faint">
          باستمرارتك، فإنك توافق على{' '}
          <Link href="/terms" className="text-fg-muted underline">
            شروط الاستخدام
          </Link>{' '}
          و{' '}
          <Link href="/privacy" className="text-fg-muted underline">
            سياسة الخصوصية
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
