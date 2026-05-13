import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function InterviewsPage() {
  const [slots, setSlots] = useState([]);
  const [eligible, setEligible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [bookingSlotId, setBookingSlotId] = useState('');

  const loadSlots = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/candidate/interview/slots');
      setEligible(Boolean(data?.eligible));
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
      setBackgroundCheckStatus(String(data?.backgroundCheckStatus || 'not_started'));
      setEligibilityMessage('');
    } catch (error) {
      setEligible(false);
      setSlots([]);
      setEligibilityMessage(error?.response?.data?.message || 'Interview slots are not available yet.');
      setBackgroundCheckStatus('not_started');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const bookSlot = async (slotId) => {
    try {
      setBookingSlotId(slotId);
      await api.post('/candidate/interview/book', { slotId });
      alert('Interview booked successfully. A confirmation email has been sent.');
      await loadSlots();
    } catch (error) {
      alert(error?.response?.data?.message || 'Unable to book this slot.');
    } finally {
      setBookingSlotId('');
    }
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />
      <main className="flex-1 pb-16 pt-28 lg:ml-64">
        <div className="mx-auto max-w-5xl px-6">
          <div className="nst-card rounded-xl p-8">
            <h1 className="mb-2 text-3xl font-bold text-[#002147]">Interview Booking</h1>
            <p className="mb-5 text-[#44474e]">
              Candidates can book a 15-minute interview slot only after Admin 3 marks interview required and Sterling background verification is completed.
            </p>

            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><b>Background Check Status:</b> {backgroundCheckStatus.replaceAll('_', ' ')}</p>
              {!eligible && <p className="mt-2 text-rose-700">{eligibilityMessage || 'Interview booking is currently locked.'}</p>}
            </div>

            {loading ? (
              <p className="text-slate-500">Loading slots...</p>
            ) : !eligible ? (
              <p className="text-slate-600">Once you are eligible, available slots will appear here.</p>
            ) : !slots.length ? (
              <p className="text-slate-600">No interview slots are available right now. Please check again later.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {slots.map((slot) => (
                  <article key={slot._id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <p><b>Start:</b> {formatDate(slot.startTime)}</p>
                    <p><b>End:</b> {formatDate(slot.endTime)}</p>
                    <p><b>Timezone:</b> {slot.timezone || 'UTC'}</p>
                    <p><b>Duration:</b> 15 minutes</p>
                    <Button
                      className="mt-4"
                      disabled={Boolean(bookingSlotId)}
                      onClick={() => bookSlot(slot._id)}
                    >
                      {bookingSlotId === slot._id ? 'Booking...' : 'Book Slot'}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <div className="relative z-30 lg:ml-64">
        <Footer />
      </div>
    </div>
  );
}
