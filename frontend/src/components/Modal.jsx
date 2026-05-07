import { useEffect } from 'react';
import Button from './Button';

export default function Modal({ isOpen, onClose, title, children, hideClose = false }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9000] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[rgba(59,130,246,0.3)] bg-[#080808] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {!hideClose && (
            <Button variant="adminGhost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
