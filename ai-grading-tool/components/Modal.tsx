'use client';

import React, { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
};

export default function Modal({ open, title, children, onClose, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg border border-gray-200 w-full max-w-lg mx-4">
        {title ? <div className="px-4 py-3 border-b text-lg font-semibold">{title}</div> : null}
        <div className="px-4 py-4">{children}</div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}


