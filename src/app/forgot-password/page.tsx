'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';
import { resetPassword } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSent(true);
    } catch (err) {
      setError((err as Error).message || 'حصلت مشكلة في إرسال الرابط.');
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
              <CardTitle className="text-xl">نسيت كلمة المرور؟</CardTitle>
              <CardDescription>
                {isSent
                  ? 'تحقّق من بريدك الإلكتروني للرابط.'
                  : 'أدخل بريدك وأرسل لك رابط إعادة التعيين.'}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {isSent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-6 text-center"
                  >
                    <div className="mb-3 text-5xl">📧</div>
                    <p className="text-sm text-fg-muted">
                      لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى{' '}
                      <span className="font-medium text-[var(--hd-pink-soft)]">{email}</span>.
                    </p>
                    <p className="mt-2 text-xs text-fg-faint">
                      الرابط صالح لمدة ساعتين.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <FormField
                      label="البريد الإلكتروني"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      icon={<Mail className="h-4 w-4" />}
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
                  </>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-3">
                {!isSent && (
                  <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin">●</span>
                        جارٍ الإرسال...
                      </>
                    ) : (
                      <>
                        <Mail className="ml-2 h-4 w-4" />
                        إرسال رابط إعادة التعيين
                      </>
                    )}
                  </Button>
                )}

                <Link
                  href="/login"
                  className="text-center text-sm text-[var(--hd-pink)] hover:text-[var(--hd-pink-soft)]"
                >
                  عودة لتسجيل الدخول
                </Link>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  );
}
