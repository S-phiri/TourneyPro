import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';

interface WizardLayoutProps {
  currentStep: number;
  steps: readonly string[];
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
  saving?: boolean;
  error?: string | null;
  children: ReactNode;
}

const stepLabels: Record<string, string> = {
  format: 'Format',
  basics: 'Basics',
  rules: 'Rules',
  structure: 'Structure',
  review: 'Review',
};

export default function WizardLayout({
  currentStep,
  steps,
  onNext,
  onBack,
  canGoNext,
  saving,
  error,
  children,
}: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-yellow-500 mb-2">Create Competition</h1>
          <p className="text-gray-400">Follow the steps to set up your tournament</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      index < currentStep
                        ? 'bg-yellow-500 text-black'
                        : index === currentStep
                        ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-500'
                        : 'bg-zinc-800 text-gray-400 border-2 border-zinc-700'
                    }`}
                  >
                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className="mt-2 text-xs text-gray-400 text-center">
                    {stepLabels[step] || step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStep ? 'bg-yellow-500' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Saving Indicator */}
        {saving && (
          <div className="mb-6 bg-blue-900/50 border border-blue-500/50 rounded-lg p-4">
            <p className="text-blue-200">Saving draft...</p>
          </div>
        )}

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-8"
        >
          {children}
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < steps.length - 1 && (
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${
                canGoNext
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black'
                  : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

