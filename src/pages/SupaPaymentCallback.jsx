import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';
import API from '../utils/api';

/**
 * Flutterwave redirects back here after payment with query params:
 *   ?status=successful&tx_ref=...&transaction_id=...
 * or
 *   ?status=cancelled
 */
export default function SupaPaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'failed' | 'cancelled'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const status = searchParams.get('status');
    const txRef = searchParams.get('tx_ref');
    const transactionId = searchParams.get('transaction_id');

    if (status === 'cancelled') {
      setState('cancelled');
      setMessage('Payment was cancelled. You can try again from Settings.');
      return;
    }

    if (status === 'successful' && (txRef || transactionId)) {
      // Poll supa status — backend webhook should have activated by now
      verifyAndActivate();
    } else {
      setState('failed');
      setMessage('Payment could not be verified. Please contact support if you were charged.');
    }
  }, []);

  const verifyAndActivate = async () => {
    setState('loading');
    // Give the webhook a moment to process
    await new Promise(r => setTimeout(r, 2000));
    try {
      const data = await API.getSupaStatus();
      if (data?.isSupa) {
        // Update local user cache
        const stored = localStorage.getItem('user');
        if (stored) {
          const user = JSON.parse(stored);
          const updated = { ...user, isSupa: true, supaExpiresAt: data.expiresAt };
          localStorage.setItem('user', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
        }
        setState('success');
      } else {
        // Not activated yet — may be a webhook delay
        setState('failed');
        setMessage('Payment received but Supa is not activated yet. It may take a few minutes. If it doesn\'t activate, contact support.');
      }
    } catch {
      setState('failed');
      setMessage('Could not verify payment status. Please check Settings in a moment.');
    }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="bg-discord-sidebar rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        {state === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-discord-brand/20 flex items-center justify-center">
                <FiLoader size={28} className="text-discord-brand animate-spin" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-discord-text mb-2">Verifying payment...</h2>
            <p className="text-discord-muted text-sm">Just a moment while we confirm your subscription.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <HiSparkles size={28} className="text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-discord-text mb-2">You're Supa now! ✨</h2>
            <p className="text-discord-muted text-sm mb-6">Your subscription is active. Enjoy all Supa features.</p>
            <button
              className="discord-btn w-full py-3 font-bold"
              onClick={() => navigate('/')}
            >
              <FiCheck size={16} className="inline mr-2" />
              Go to Feed
            </button>
          </>
        )}

        {(state === 'failed' || state === 'cancelled') && (
          <>
            <div className="flex justify-center mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${state === 'cancelled' ? 'bg-discord-muted/20' : 'bg-discord-red/20'}`}>
                <FiX size={28} className={state === 'cancelled' ? 'text-discord-muted' : 'text-discord-red'} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-discord-text mb-2">
              {state === 'cancelled' ? 'Payment cancelled' : 'Payment issue'}
            </h2>
            <p className="text-discord-muted text-sm mb-6">{message}</p>
            <button
              className="discord-btn w-full py-3 font-bold"
              onClick={() => navigate('/settings')}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
