import { useEffect, useState } from 'react';
import Button from './Button';

export default function GlobalAlertHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message = '') => {
      setQueue((prev) => [...prev, String(message)]);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  const currentMessage = queue[0] || '';
  const isOpen = queue.length > 0;

  const closeCurrent = () => {
    setQueue((prev) => prev.slice(1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Notice</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{currentMessage}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={closeCurrent}>OK</Button>
        </div>
      </div>
    </div>
  );
}
