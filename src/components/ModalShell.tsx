import React, { useEffect, useRef } from 'react';

interface ModalShellProps {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy: string;
  maxWidth?: string;
  panelClassName?: string;
}

/**
 * Shared modal frame.
 *
 * The overlay itself is the scroll container and the panel sits inside a
 * `min-h-full` flex row. This keeps the top of tall panels (and their close
 * buttons) reachable instead of being clipped by `items-center` + overflow.
 *
 * Opening a modal always resets the overlay to the top and locks background
 * scrolling. Without that, a previously scrolled page (or the browser keeping
 * a clicked trigger in view) can leave a tall panel opened mid-scroll with its
 * header close button above the viewport.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  onClose,
  labelledBy,
  maxWidth = 'max-w-2xl',
  panelClassName = '',
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Start every dialog at its true top so tall panels never hide their
    // close affordance on open.
    if (overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }
    panelRef.current?.focus({ preventScroll: true });

    // Prevent the page behind the dialog from scrolling on wheel/touch.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`relative w-full ${maxWidth} bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl focus:outline-none ${panelClassName}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
