import { useEffect, useState } from 'react';
import Button from './Button';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';

export default function GlobalAlertHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message = '') => {
      setQueue((prev) => [...prev, capitalizeFirstLetter(message)]);
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
    <div className="fixed inset-0 z-[9100] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(200,169,107,0.3)] bg-[#080808] p-5 text-white shadow-2xl [&_button]:!border-[#c8a96b] [&_button]:!bg-[#c8a96b] [&_button]:!text-black">
        <h3 className="text-lg font-bold text-white">Notice</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white">{currentMessage}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={closeCurrent}>OK</Button>
        </div>
      </div>
    </div>
  );
}
