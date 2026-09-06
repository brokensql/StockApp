import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Store, ArrowLeft, ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingScreenProps {
  currentProfile?: UserProfile;
  onFinish: (profile: { ownerName: string; storeName: string }) => void;
  onSkip?: () => void;
  onCancel?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  currentProfile,
  onFinish,
  onSkip,
  onCancel,
}) => {
  const hasExistingName = Boolean(
    currentProfile?.ownerName &&
      currentProfile.ownerName.trim() !== '' &&
      currentProfile.ownerName !== 'Store Owner'
  );
  const hasExistingStore = Boolean(
    currentProfile?.storeName &&
      currentProfile.storeName.trim() !== '' &&
      currentProfile.storeName !== 'My Store'
  );

  const [step, setStep] = useState<'welcome' | 'profile'>(
    hasExistingName ? 'profile' : 'welcome'
  );
  const [ownerName, setOwnerName] = useState(
    hasExistingName ? currentProfile!.ownerName : ''
  );
  const [storeName, setStoreName] = useState(
    hasExistingStore ? currentProfile!.storeName : ''
  );
  const [error, setError] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleGetStarted = () => {
    setStep('profile');
    setError('');
  };

  const handleFinish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = ownerName.trim();
    const trimmedStore = storeName.trim();

    if (!trimmedName && !trimmedStore) {
      setError('Please enter your name or store name to continue.');
      return;
    }

    setIsFinishing(true);
    setTimeout(() => {
      onFinish({
        ownerName: trimmedName || currentProfile?.ownerName || 'Store Owner',
        storeName: trimmedStore || currentProfile?.storeName || 'My Store',
      });
    }, 250);
  };

  const handleSkip = () => {
    if (onCancel) {
      onCancel();
    } else if (onSkip) {
      onSkip();
    } else {
      onFinish({
        ownerName: currentProfile?.ownerName || 'Store Owner',
        storeName: currentProfile?.storeName || 'My Store',
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f7f9fb] flex items-center justify-center p-0 sm:p-4 selection:bg-[#4F8065]/20">
      {/* Mobile viewport container */}
      <div
        id="onboarding-container"
        className="w-full max-w-[420px] min-h-[100dvh] sm:min-h-[680px] bg-[#f7f9fb] sm:rounded-[32px] sm:border sm:border-[#DEE3DE] sm:shadow-[0_10px_30px_rgba(37,40,37,0.04)] flex flex-col justify-between overflow-hidden relative"
      >
        <AnimatePresence mode="wait">
          {step === 'welcome' ? (
            <motion.div
              key="welcome-step"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between px-7 pt-12 pb-10"
            >
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Clean Geometric Brand Visual */}
                <div
                  id="brand-visual-grid"
                  className="w-[110px] h-[110px] mb-12 grid grid-cols-2 gap-2.5 items-end"
                  aria-label="StockApp Brand Icon"
                >
                  <div id="shape-1" className="h-[60%] bg-[#4F8065] rounded-[8px]" />
                  <div id="shape-2" className="h-[100%] bg-[#4F8065] opacity-85 rounded-[8px]" />
                  <div id="shape-3" className="h-[80%] bg-[#4F8065] opacity-60 rounded-[8px]" />
                  <div id="shape-4" className="h-[40%] bg-[#9F3F46] rounded-[8px]" />
                </div>

                {/* Welcoming Headline */}
                <h1
                  id="onboarding-headline"
                  className="text-[32px] font-semibold leading-[1.18] tracking-[-0.02em] mb-3 text-[#252825]"
                >
                  {hasExistingName ? (
                    <>Welcome back,<br />{currentProfile?.ownerName}</>
                  ) : (
                    <>Welcome to<br />StockApp</>
                  )}
                </h1>

                {/* Supporting Copy */}
                <p
                  id="onboarding-subtext"
                  className="text-[15px] font-normal leading-[1.5] text-[#6E746F] max-w-[280px]"
                >
                  {hasExistingName
                    ? `Your store "${currentProfile?.storeName || 'My Store'}" is ready and all data is preserved.`
                    : 'A simple way to manage your inventory and sales offline.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-8">
                {hasExistingName ? (
                  <div className="space-y-3">
                    <button
                      id="continue-to-store-cta"
                      type="button"
                      onClick={handleSkip}
                      className="w-full h-13 bg-[#4F8065] hover:bg-[#436e57] active:bg-[#3D684F] text-white text-[15px] font-semibold rounded-[16px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      aria-label="Continue to store"
                    >
                      <span>Continue to Store</span>
                      <ArrowRight size={18} />
                    </button>

                    <button
                      id="edit-profile-cta"
                      type="button"
                      onClick={handleGetStarted}
                      className="w-full py-3 bg-[#FAF9F6] hover:bg-gray-100 border border-[#DEE3DE] text-[#252825] text-[14px] font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Update Name or Store Name</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      id="get-started-cta"
                      type="button"
                      onClick={handleGetStarted}
                      className="w-full h-13 bg-[#4F8065] hover:bg-[#436e57] active:bg-[#3D684F] text-white text-[15px] font-semibold rounded-[16px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      aria-label="Get started"
                    >
                      <span>Get started</span>
                      <ArrowRight size={18} />
                    </button>

                    <button
                      id="skip-action-cta"
                      type="button"
                      onClick={handleSkip}
                      className="block w-full text-center mt-4 py-2 text-[14px] text-[#6E746F] hover:text-[#252825] font-medium transition-colors cursor-pointer"
                      aria-label="Skip for now"
                    >
                      Skip for now
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile-step"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between px-7 pt-7 pb-10"
            >
              {/* Top Navigation */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (hasExistingName && onCancel) {
                      onCancel();
                    } else {
                      setStep('welcome');
                    }
                  }}
                  className="p-2 -ml-2 text-[#6E746F] hover:text-[#252825] rounded-lg inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors cursor-pointer"
                  aria-label={hasExistingName ? 'Return to store' : 'Back to welcome screen'}
                >
                  <ArrowLeft size={17} />
                  <span>{hasExistingName ? 'Return to Store' : 'Back'}</span>
                </button>

                <div className="mt-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4F8065]/10 border border-[#4F8065]/20 flex items-center justify-center text-[#4F8065] mb-3">
                    <Store size={20} />
                  </div>
                  <h2 className="text-[24px] font-semibold text-[#252825] tracking-[-0.02em] leading-tight">
                    {hasExistingName ? 'Store profile details' : 'Set up your profile'}
                  </h2>
                  <p className="text-[14px] text-[#6E746F] mt-1">
                    {hasExistingName
                      ? 'Update your name or store name. Your inventory and sales are safe.'
                      : 'Enter your name and store name to personalize your store app.'}
                  </p>
                </div>
              </div>

              {/* Profile Setup Form */}
              <form onSubmit={handleFinish} className="flex-1 flex flex-col justify-between mt-5">
                <div className="space-y-4">
                  {hasExistingName && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#4F8065]/10 border border-[#4F8065]/25 rounded-xl text-[12px] text-[#3D684F] font-medium">
                      <ShieldCheck size={16} className="text-[#4F8065] flex-shrink-0" />
                      <span>Your products and sales records are completely safe.</span>
                    </div>
                  )}
                  {/* Name Input */}
                  <div>
                    <label
                      htmlFor="setup-owner-name"
                      className="block text-[13px] font-medium text-[#252825] mb-1.5"
                    >
                      Your Name <span className="text-[#9F3F46]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6E746F]">
                        <User size={17} />
                      </div>
                      <input
                        id="setup-owner-name"
                        type="text"
                        value={ownerName}
                        onChange={(e) => {
                          setOwnerName(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="e.g. Maria Santos"
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#DEE3DE] text-[15px] text-[#252825] placeholder:text-[#6E746F]/50 focus:outline-none focus:border-[#4F8065] focus:ring-1 focus:ring-[#4F8065] bg-gray-50/40 focus:bg-white transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Store Name Input */}
                  <div>
                    <label
                      htmlFor="setup-store-name"
                      className="block text-[13px] font-medium text-[#252825] mb-1.5"
                    >
                      Store Name <span className="text-[#9F3F46]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6E746F]">
                        <Store size={17} />
                      </div>
                      <input
                        id="setup-store-name"
                        type="text"
                        value={storeName}
                        onChange={(e) => {
                          setStoreName(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="e.g. Maria's General Store"
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#DEE3DE] text-[15px] text-[#252825] placeholder:text-[#6E746F]/50 focus:outline-none focus:border-[#4F8065] focus:ring-1 focus:ring-[#4F8065] bg-gray-50/40 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Validation Error Message */}
                  {error && (
                    <p className="text-[12px] font-medium text-[#9F3F46] bg-[#9F3F46]/10 px-3 py-2 rounded-lg">
                      {error}
                    </p>
                  )}

                  {/* Optional Note */}
                  <div className="bg-[#FAF9F6] border border-[#DEE3DE] rounded-xl p-3.5 mt-2">
                    <p className="text-[12px] text-[#6E746F] leading-relaxed">
                      💡 <strong>Note:</strong> Email, phone number, and address are left empty as they are optional. You can configure them anytime under the <strong>Profile</strong> page.
                    </p>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-6">
                  <button
                    id="finish-setup-cta"
                    type="submit"
                    disabled={isFinishing}
                    className="w-full h-13 bg-[#4F8065] hover:bg-[#436e57] active:bg-[#3D684F] disabled:opacity-75 text-white text-[15px] font-semibold rounded-[16px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    aria-label="Finish profile setup"
                  >
                    {isFinishing ? (
                      <span>Saving profile...</span>
                    ) : (
                      <>
                        <span>{hasExistingName ? 'Save & Return to Store' : 'Finish'}</span>
                        <Check size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
