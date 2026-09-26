import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, AlertCircle } from 'lucide-react';

type BoostStatus = 'checking' | 'active' | 'activation_pending' | 'payment_pending' | 'expired' | 'failed';

export function BoostConfirmation({ token }: { token: string }) {
  const [status, setStatus] = useState<BoostStatus>('checking');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) {
      setStatus('failed');
      return;
    }
    const controller = new AbortController();
    let timer: number | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(`/api/profile/boost/checkout-confirmation?session_id=${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal
        });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !['active', 'activation_pending', 'payment_pending', 'expired'].includes(result.status)) {
          setStatus('failed');
          return;
        }
        setStatus(result.status);
        if (typeof result.boostExpiresAt === 'string') setExpiresAt(result.boostExpiresAt);
        if (result.status === 'activation_pending' && attempts++ < 20) {
          timer = window.setTimeout(check, 3000);
        }
      } catch {
        if (!controller.signal.aborted) setStatus('failed');
      }
    };
    void check();
    return () => {
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [token]);

  const title = status === 'active' ? 'Booster jest aktywny' :
    status === 'expired' ? 'Booster zakończył się' :
    status === 'failed' ? 'Nie udało się potwierdzić płatności' :
    status === 'payment_pending' ? 'Płatność jest przetwarzana' :
    status === 'activation_pending' ? 'Płatność potwierdzona' : 'Sprawdzamy płatność…';
  const detail = status === 'active' && expiresAt ? `Twój profil jest wyróżniony do ${new Date(expiresAt).toLocaleString('pl-PL')}.` :
    status === 'activation_pending' ? 'Czekamy na potwierdzenie zakupu przez serwer. Booster włączy się automatycznie.' :
    status === 'payment_pending' ? 'Bank jeszcze nie potwierdził płatności. Booster włączy się dopiero po potwierdzeniu.' :
    status === 'expired' ? 'Opłacone 12 godzin wyróżnienia już minęło.' :
    status === 'failed' ? 'Sprawdź historię płatności lub spróbuj ponownie za chwilę.' : '';

  return (
    <main className="min-h-screen bg-[#090a12] text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/25 bg-[#141522] p-8 text-center shadow-2xl shadow-amber-950/20" aria-live="polite">
        {status === 'active' ? <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" aria-hidden="true" /> :
          status === 'failed' ? <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" aria-hidden="true" /> :
          <Clock3 className="mx-auto mb-4 h-12 w-12 text-amber-300" aria-hidden="true" />}
        <h1 className="text-2xl font-bold">{title}</h1>
        {detail && <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>}
        <a href="/" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-600 px-5 font-semibold text-white hover:bg-amber-500">
          Wróć do AURY
        </a>
      </div>
    </main>
  );
}
