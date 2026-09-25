import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { AuraLogoIcon } from '../AuraLogo';
import { useTranslation } from '../../context/LanguageContext';

type Copy = {
  checking: string;
  confirmed: string;
  active: string;
  activating: string;
  pending: string;
  pendingDetail: string;
  returnToApp: string;
};

const copy: Record<string, Copy> = {
  en: { checking: 'Checking your payment…', confirmed: 'Payment confirmed', active: 'Your AURA VIP access is active.', activating: 'Your VIP access is being activated. This can take a moment.', pending: 'Payment is being processed', pendingDetail: 'Your bank or payment provider has not confirmed it yet. AURA will activate VIP after confirmation.', returnToApp: 'Return to AURA' },
  pl: { checking: 'Sprawdzamy płatność…', confirmed: 'Płatność potwierdzona', active: 'Twój dostęp AURA VIP jest aktywny.', activating: 'Trwa aktywacja VIP. Może to potrwać chwilę.', pending: 'Płatność jest przetwarzana', pendingDetail: 'Bank lub operator płatności jeszcze jej nie potwierdził. AURA włączy VIP po potwierdzeniu.', returnToApp: 'Wróć do AURY' },
  es: { checking: 'Comprobando tu pago…', confirmed: 'Pago confirmado', active: 'Tu acceso AURA VIP está activo.', activating: 'Estamos activando VIP. Puede tardar un momento.', pending: 'El pago está en proceso', pendingDetail: 'Tu banco o proveedor de pagos aún no lo ha confirmado. AURA activará VIP cuando se confirme.', returnToApp: 'Volver a AURA' },
  de: { checking: 'Zahlung wird geprüft…', confirmed: 'Zahlung bestätigt', active: 'Dein AURA VIP-Zugang ist aktiv.', activating: 'Dein VIP-Zugang wird aktiviert. Das kann einen Moment dauern.', pending: 'Zahlung wird bearbeitet', pendingDetail: 'Deine Bank oder dein Zahlungsanbieter hat sie noch nicht bestätigt. AURA aktiviert VIP nach der Bestätigung.', returnToApp: 'Zurück zu AURA' }
};

export function CheckoutConfirmation({ token, pending = false }: { token?: string; pending?: boolean }) {
  const { language } = useTranslation();
  const labels = copy[language] || copy.en;
  const [status, setStatus] = useState<'checking' | 'paid'>(pending ? 'paid' : 'checking');
  const [vipActive, setVipActive] = useState(false);

  useEffect(() => {
    if (pending) return;
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !token) {
      window.location.replace('/?payment=unverified');
      return;
    }
    const controller = new AbortController();
    fetch(`/api/payments/checkout-confirmation?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal
    }).then(async response => {
      if (!response.ok) throw new Error('Verification unavailable');
      return response.json();
    }).then(result => {
      if (result.status === 'paid') {
        setVipActive(result.vipActive === true);
        setStatus('paid');
      } else {
        window.location.replace(result.status === 'pending' ? '/payment/pending' : '/?payment=unverified');
      }
    }).catch(() => {
      if (!controller.signal.aborted) window.location.replace('/payment/pending');
    });
    return () => controller.abort();
  }, [pending, token]);

  const isConfirmed = !pending && status === 'paid';
  const title = pending ? labels.pending : isConfirmed ? labels.confirmed : labels.checking;
  const description = pending ? labels.pendingDetail : isConfirmed ? (vipActive ? labels.active : labels.activating) : '';

  return (
    <main className="min-h-screen bg-[#090a12] text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-fuchsia-500/25 bg-[#141522] p-8 text-center shadow-2xl shadow-fuchsia-950/30">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#202033]">
          <AuraLogoIcon className="h-12 w-12" />
        </div>
        {isConfirmed ? <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" aria-hidden="true" /> : <Clock3 className="mx-auto mb-4 h-10 w-10 text-violet-300" aria-hidden="true" />}
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>}
        <a href="/" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-fuchsia-600 px-5 font-semibold text-white hover:bg-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300">
          {labels.returnToApp}
        </a>
      </div>
    </main>
  );
}
