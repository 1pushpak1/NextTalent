import Button from './Button';

export default function Modal({ isOpen, onClose, title, children, hideClose = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9000] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[rgba(200,169,107,0.3)] bg-[#080808] p-5 text-white shadow-2xl [&_button]:!border-[#c8a96b] [&_button]:!bg-[#c8a96b] [&_button]:!text-black">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {!hideClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
