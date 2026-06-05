import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'info',
  isLoading
}) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50">
            <div className="p-8">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                  variant === 'danger' 
                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                )}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                  <p className="text-neutral-400 leading-relaxed text-sm">
                    {description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 px-6 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                  }}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 py-3 px-6 font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg",
                    variant === 'danger'
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                  )}
                >
                  {isLoading ? 'Processing...' : confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
