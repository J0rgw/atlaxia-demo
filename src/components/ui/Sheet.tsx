import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-modal-scrim bg-black/40 backdrop-blur-[1px]',
      'transition-opacity duration-200',
      'data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

interface SheetContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'> {
  side?: 'right' | 'left';
  width?: string;
  title?: ReactNode;
  description?: ReactNode;
  hideCloseButton?: boolean;
}

const SheetContent = forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  (
    {
      className,
      children,
      side = 'right',
      width = 'w-[360px]',
      title,
      description,
      hideCloseButton = false,
      ...props
    },
    ref
  ) => {
    const sideClasses =
      side === 'right'
        ? 'right-0 top-0 h-full border-l data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full'
        : 'left-0 top-0 h-full border-r data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full';

    return (
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-modal flex flex-col bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-card',
            'transition-transform duration-200 ease-out',
            'focus:outline-none',
            sideClasses,
            width,
            className
          )}
          {...props}
        >
          {(title || description) && (
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              {title && (
                <DialogPrimitive.Title className="text-sm font-semibold text-[var(--text-primary)]">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}
          {!title && !description && (
            <>
              <DialogPrimitive.Title className="sr-only">Panel</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Slide-over panel</DialogPrimitive.Description>
            </>
          )}

          <div className="flex-1 overflow-y-auto">{children}</div>

          {!hideCloseButton && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute right-2 top-2 p-1 rounded-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetPortal, SheetOverlay };
