'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';
import { DemoModeBadge } from '@/components/layout/logo';
import { signIn } from '@/hooks/useAuth';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const registered = searchParams.get('registered');

  const [form, setForm] = useState({ email: '', password: '' });
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
      await signIn(form.email, form.password);
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'حصلت مشكلة في تسجيل الدخول.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((v) => !v);
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
          {registered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/12 px-3 py-2 text-sm text-[var(--hd-pink-soft)]"
            >
              تم إنشاء الحساب. فعّل البريد ثم سجّل دخولك.
            </motion.div>
          )}

          <Card className="border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">مرحبًا بعودتك</CardTitle>
              <CardDescription>سجل دخولك وتواصل مع هداياك.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
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
                  autoComplete="current-password"
                  required
                  icon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={toggleShowPassword}
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
                      جارٍ تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      <LogIn className="ml-2 h-4 w-4" />
                      تسجيل دخول
                    </>
                  )}
                </Button>

                <div className="flex justify-between text-sm">
                  <Link href="/forgot-password" className="text-[var(--hd-pink)] hover:text-[var(--hd-pink-soft)]">
                    نسيت كلمة المرور؟
                  </Link>
                  <Link href="/register" className="text-[var(--hd-pink)] hover:text-[var(--hd-pink-soft)]">
                    مفيش حساب؟ سجّل الآن
                  </Link>
                </div>
              </CardFooter>
            </form>

            <div className="border-t border-[var(--border)] px-6 py-3 text-center sm:px-8">
              <DemoModeBadge />
            </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
