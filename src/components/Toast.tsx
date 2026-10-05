import React from 'react';

export type ToastVariant = 'neutral' | 'error';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  neutral: 'bg-paper text-ink',
  error: 'bg-danger text-paper',
};

export const Toast: React.FC<{ message: string | null; variant?: ToastVariant }> = ({
  message,
  variant = 'neutral',
}) => {
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-xs flex justify-center">
      <div
        className={`font-bold text-sm px-4 py-2.5 rounded-lg shadow-2xl animate-tile-pop text-center ${VARIANT_CLASSES[variant]}`}
      >
        {message}
      </div>
    </div>
  );
};
