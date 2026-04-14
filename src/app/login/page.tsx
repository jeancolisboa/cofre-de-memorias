'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { console.error(error); setLoading(false); }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F6] dark:bg-[#0D0D14] px-6">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#161622] border border-gray-100 dark:border-white/10 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-gray-100 dark:shadow-violet-950/30">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Cofre de Memórias
        </h1>
        <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto leading-relaxed">
          Guarde, reviva e preserve os momentos que importam.
        </p>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#161622] border border-gray-100 dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-gray-100/80 dark:shadow-none">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3.5 px-6 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/40 dark:border-gray-400 border-t-white dark:border-t-gray-800 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {loading ? 'Entrando…' : 'Continuar com Google'}
        </button>

        <p className="text-center text-gray-400 text-xs mt-4">
          🔒 Suas memórias ficam seguras e privadas
        </p>
      </div>

      <p className="text-gray-300 dark:text-gray-600 text-xs mt-8">
        Ao entrar, você concorda com os termos de uso.
      </p>
    </main>
  );
}
