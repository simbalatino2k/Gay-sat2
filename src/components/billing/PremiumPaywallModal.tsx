/**
 * AURA GAY 18+ — Store-Compliant Premium Paywall Modal
 * Adheres strictly to:
 * - Google Play Subscription Policy & Billing Guidelines
 * - Apple App Store Review Guidelines (Guideline 3.1.2)
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Shield, RefreshCw, ExternalLink, Crown, AlertCircle } from 'lucide-react';
import type { StoreProduct, UserEntitlement } from '../../types';
import { billingClient } from '../../services/billingClient';
import { PREMIUM_FEATURES } from '../../config/billingConfig';

interface PremiumPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entitlement: UserEntitlement) => void;
  initialProductId?: string;
}

export const PremiumPaywallModal: React.FC<PremiumPaywallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProductId
}) => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const platform = billingClient.getPlatform();

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingProducts(true);
    setFeedbackMessage(null);

    billingClient.getProducts().then((loaded) => {
      if (!mounted) return;
      setProducts(loaded);
      setIsLoadingProducts(false);
      if (loaded.length > 0 && !selectedProductId) {
        // Default to middle or yearly plan
        const def = loaded.find((p) => p.tier === 'yearly') || loaded[0];
        setSelectedProductId(def.id);
      }
    }).catch(() => {
      if (mounted) setIsLoadingProducts(false);
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedProductId) return;
    setIsPurchasing(true);
    setFeedbackMessage(null);

    const result = await billingClient.purchase(selectedProductId);
    setIsPurchasing(false);

    if (result.success) {
      setFeedbackMessage({
        type: 'success',
        text: result.message || 'Subscription successfully activated!'
      });
      if (result.entitlement && onSuccess) {
        onSuccess(result.entitlement);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: result.error || 'Unable to complete purchase.'
      });
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setFeedbackMessage(null);

    const result = await billingClient.restorePurchases();
    setIsRestoring(false);

    if (result.success) {
      setFeedbackMessage({
        type: 'success',
        text: result.message || 'Subscription restored!'
      });
      if (result.entitlement && onSuccess) {
        onSuccess(result.entitlement);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setFeedbackMessage({
        type: 'info',
        text: result.error || result.message || 'No active subscriptions found for this account.'
      });
    }
  };

  const handleManage = () => {
    billingClient.openSubscriptionManagement();
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  return (
    <div
      id="aura-premium-paywall-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        id="aura-premium-paywall-card"
        className="relative w-full max-w-lg bg-zinc-950 border border-violet-500/30 rounded-2xl shadow-2xl p-6 text-zinc-100 my-auto"
      >
        {/* Close Button */}
        <button
          id="btn-close-paywall"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
          aria-label="Close paywall"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Neon Accent */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-400 mb-3 shadow-lg shadow-violet-900/30">
            <Crown className="w-7 h-7" />
          </div>
          <h2 id="paywall-title" className="text-2xl font-black tracking-tight text-white">
            AURA <span className="text-violet-400">PREMIUM</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Unlock the complete, unfiltered adult connection experience.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            id="paywall-feedback-alert"
            className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Plan Selector Grid */}
        {products.length === 0 && !isLoadingProducts ? (
          <div id="products-unavailable-alert" className="py-6 px-4 text-center rounded-xl bg-zinc-900/60 border border-zinc-800 mb-6 space-y-1">
            <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xs font-semibold text-zinc-200">Subscription products are temporarily unavailable.</p>
            <p className="text-[11px] text-zinc-400">Please verify your store connection and try again later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {isLoadingProducts ? (
              <div className="col-span-3 py-8 text-center text-xs text-zinc-500 animate-pulse">
                Loading localized store pricing...
              </div>
            ) : (
              products.map((prod) => {
                const isSelected = prod.id === selectedProductId;
                const isYearly = prod.tier === 'yearly';
                return (
                  <button
                    key={prod.id}
                    id={`btn-plan-${prod.tier}`}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`relative flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/30 ring-1 ring-violet-500/50 shadow-md shadow-violet-950/50'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    {isYearly && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-violet-600 text-[10px] font-bold tracking-wider uppercase text-white rounded-full shadow">
                        Best Value
                      </span>
                    )}
                    <span className="text-xs font-semibold text-zinc-300 mt-1">
                      {prod.tier === 'yearly' ? '12 Months' : prod.tier === 'three_month' ? '3 Months' : '1 Month'}
                    </span>
                    <span className="text-base font-black text-white my-1">
                      {prod.localizedPrice}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {prod.tier === 'yearly' ? 'Annual bill' : prod.tier === 'three_month' ? 'Every 3 mos' : 'Billed monthly'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Value Prop Features */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 mb-4 space-y-2.5">
          {PREMIUM_FEATURES.map((feat) => (
            <div key={feat.key} className="flex items-start gap-2.5 text-xs">
              <div className="w-4 h-4 rounded-full bg-violet-900/50 border border-violet-500/40 flex items-center justify-center shrink-0 mt-0.5 text-violet-300">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-zinc-200">{feat.label}: </span>
                <span className="text-zinc-400">{feat.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Promo Code & Renewal Transparency */}
        {selectedProduct?.tier === 'yearly' && (
          <div className="mb-5 p-3 rounded-xl bg-violet-950/30 border border-violet-700/50 text-xs text-zinc-300 space-y-1">
            <div className="flex items-center justify-between font-semibold text-violet-300">
              <span>Promo Code</span>
              <span className="text-[11px] px-1.5 py-0.5 bg-violet-900/60 rounded border border-violet-500/40 text-violet-200">Private Checkout</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Masz kod promocyjny? Wpisz swój kod bezpośrednio w polu &quot;Dodaj kod promocyjny&quot; na bezpiecznej stronie płatności.
            </p>
            <p className="text-[10px] text-zinc-400 pt-0.5 border-t border-violet-900/40">
              * Kod rabatowy naliczany jest w podsumowaniu zamówienia.
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          id="btn-subscribe-now"
          disabled={isPurchasing || isLoadingProducts || products.length === 0 || !selectedProductId}
          onClick={handlePurchase}
          className="w-full py-4 px-6 rounded-2xl font-black text-base text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xl shadow-violet-900/50 flex items-center justify-center gap-2.5"
        >
          {isPurchasing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Łączenie ze sklepem...</span>
            </>
          ) : (
            <span>Wybierz Premium</span>
          )}
        </button>

        {/* Restore Purchases & Manage Subscription */}
        <div className="flex items-center justify-between mt-4 px-1 text-xs">
          <button
            id="btn-restore-purchases"
            disabled={isRestoring}
            onClick={handleRestore}
            className="text-violet-400 hover:text-violet-300 transition flex items-center gap-1.5 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>Restore Purchases</span>
          </button>

          <button
            id="btn-manage-subscription"
            onClick={handleManage}
            className="text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 font-medium"
          >
            <span>Manage Subscription</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Mandatory Store Legal Disclosure */}
        <div className="mt-5 pt-4 border-t border-zinc-900 text-[10px] text-zinc-400 leading-relaxed space-y-1.5 text-center">
          <p>
            Payment will be charged to your {platform === 'android' ? 'Google Play' : platform === 'ios' ? 'Apple ID' : 'selected payment'} account at confirmation of purchase.
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current billing period.
          </p>
          <p>
            You can manage or cancel your subscription anytime in your {platform === 'android' ? 'Google Play Account' : platform === 'ios' ? 'Apple ID' : 'Account'} settings.
          </p>
          <p className="text-zinc-400 font-medium">
            Important: Deleting your AURA account does NOT cancel your store subscription. You must cancel through {platform === 'android' ? 'Google Play' : platform === 'ios' ? 'Apple Subscriptions' : 'your billing portal'}.
          </p>
          <div className="flex items-center justify-center gap-4 pt-1 font-medium text-zinc-400">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              Terms of Service
            </a>
            <span>•</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
