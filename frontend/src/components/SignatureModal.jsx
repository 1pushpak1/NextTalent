import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

export default function SignatureModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  confirmDisabled = false,
  title = 'Sign Document',
  description,
  metaFields = null,
  statusMessage = '',
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [tab, setTab] = useState('type');
  const [typed, setTyped] = useState('');

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    hasDrawnRef.current = false;
    isDrawingRef.current = false;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(180 * ratio));

    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (!isOpen) return;
    if (tab !== 'draw') return;
    initCanvas();
  }, [isOpen, tab]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const start = (event) => {
    if (tab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getPoint(event);
    if (!point) return;

    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
  };

  const move = (event) => {
    if (tab !== 'draw' || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getPoint(event);
    if (!point) return;

    event.preventDefault();
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stop = (event) => {
    if (event) {
      event.preventDefault();
      canvasRef.current?.releasePointerCapture?.(event.pointerId);
    }
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    isDrawingRef.current = false;
  };

  const submit = () => {
    if (tab === 'type') {
      if (!typed.trim()) return alert('Type your signature');
      onConfirm({ type: 'typed', value: typed.trim() });
      return;
    }
    if (!hasDrawnRef.current) return alert('Draw your signature');
    const dataUrl = canvasRef.current.toDataURL();
    onConfirm({ type: 'drawn', value: dataUrl });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && <p className="mb-3 whitespace-pre-line text-sm text-white">{description}</p>}

      {metaFields && (
        <div className="mb-3 grid gap-2 rounded-xl border border-[rgba(200,169,107,0.24)] bg-[#101011] p-3 text-sm text-white">
          <p><b>Full Name:</b> {metaFields.fullName || '-'}</p>
          <p><b>Date & Time:</b> {metaFields.dateTime || '-'}</p>
          <p><b>Location:</b> {metaFields.location || '-'}</p>
        </div>
      )}

      {statusMessage && (
        <p className="mb-3 rounded-xl border border-[#d4af37]/18 bg-[rgba(212,175,55,0.08)] px-3 py-2 text-sm text-[#f7e7ba]">
          {statusMessage}
        </p>
      )}

      <div className="mb-3 flex gap-2">
        <Button
          type="button"
          className={tab === 'draw' ? 'text-white' : ''}
          variant={tab === 'type' ? 'primary' : 'secondary'}
          onClick={() => setTab('type')}
        >
          Type Signature
        </Button>
        <Button type="button" className="text-white" variant={tab === 'draw' ? 'primary' : 'secondary'} onClick={() => setTab('draw')}>
          Draw Signature
        </Button>
      </div>

      {tab === 'type' ? (
        <Input label="Signature" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type full name" />
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            height={180}
            className="h-[180px] w-full touch-none rounded-xl border border-slate-300 bg-[#111318]"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
          />
        </div>
      )}

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-[rgba(200,169,107,0.22)] bg-[#080808] pt-3">
        {tab === 'draw' && (
          <Button type="button" className="text-white" variant="secondary" onClick={clearCanvas} disabled={loading}>
            Clear
          </Button>
        )}
        <Button type="button" onClick={submit} disabled={loading || confirmDisabled}>
          {loading ? 'Continuing....' : 'Sign & Continue'}
        </Button>
      </div>
    </Modal>
  );
}
