import React from 'react';

export const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-stone-100 text-stone-900 font-bold text-sm px-4 py-2.5 rounded-lg shadow-xl animate-tile-pop">
        {message}
      </div>
    </div>
  );
};
