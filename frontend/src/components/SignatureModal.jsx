import { useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

export default function SignatureModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Sign Document',
  description,
  metaFields = null,
}) {
  const canvasRef = useRef(null);
  const [tab, setTab] = useState('type');
  const [typed, setTyped] = useState('');
  const [drawing, setDrawing] = useState(false);

  const start = (event) => {
    if (tab !== 'draw') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    setDrawing(true);
  };

  const move = (event) => {
    if (!drawing || tab !== 'draw') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const stop = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submit = () => {
    if (tab === 'type') {
      if (!typed.trim()) return alert('Type your signature');
      onConfirm({ type: 'typed', value: typed.trim() });
      return;
    }
    const dataUrl = canvasRef.current.toDataURL();
    onConfirm({ type: 'drawn', value: dataUrl });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{description}</p>}

      {metaFields && (
        <div className="mb-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p><b>Full Name:</b> {metaFields.fullName || '-'}</p>
          <p><b>Date & Time:</b> {metaFields.dateTime || '-'}</p>
          <p><b>Location:</b> {metaFields.location || '-'}</p>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <Button type="button" variant={tab === 'type' ? 'primary' : 'secondary'} onClick={() => setTab('type')}>
          Type Signature
        </Button>
        <Button type="button" variant={tab === 'draw' ? 'primary' : 'secondary'} onClick={() => setTab('draw')}>
          Draw Signature
        </Button>
      </div>

      {tab === 'type' ? (
        <Input label="Signature" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type full name" />
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            className="w-full rounded-xl border border-slate-300"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={stop}
            onMouseLeave={stop}
          />
          <div className="mt-2">
            <Button type="button" variant="secondary" onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={submit}>
          Sign & Continue
        </Button>
      </div>
    </Modal>
  );
}
