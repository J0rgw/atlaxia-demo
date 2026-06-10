import { SETUP_STEPS } from '@/types/installation';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {SETUP_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < currentStep
                    ? 'bg-[var(--accent-primary)] text-white'
                    : index === currentStep
                    ? 'bg-[var(--accent-primary)] text-white ring-4 ring-[var(--status-normal-muted)]'
                    : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]'
                )}
              >
                {index < currentStep ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-sm font-medium',
                    index <= currentStep ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-[var(--text-muted)] hidden sm:block">{step.description}</p>
              </div>
            </div>
            {index < SETUP_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4',
                  index < currentStep ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-inset)]'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
