import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';

export default function TestimonialPage() {
  const [form, setForm] = useState({
    fullName: '',
    country: '',
    selectedDestination: '',
    role: '',
    text: '',
    photoUrl: '',
    consent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent) return alert('Consent checkbox is required.');

    try {
      await api.post('/testimonials', form);
      setSubmitted(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Submission failed');
    }
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <section className="nst-card rounded-xl p-8 md:col-span-8">
              {!submitted ? (
                <>
                  <h1 className="mb-2 text-3xl font-bold text-[#002147]">Share Your Experience</h1>
                  <p className="mb-6 text-[#44474e]">Your feedback helps us maintain selective excellence for future candidates.</p>
                  <form className="space-y-3" onSubmit={submit}>
                    <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                    <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
                    <Input label="Selected Destination" value={form.selectedDestination} onChange={(e) => setForm({ ...form, selectedDestination: e.target.value })} required />
                    <Input label="Role / Field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
                    <Input label="Testimonial Text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
                    <Input label="Upload Photo (optional URL)" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} />
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                      I allow NextStep Talent to use my testimonial on its website and social media channels.
                    </label>
                    <Button type="submit">Submit Testimonial</Button>
                  </form>
                </>
              ) : (
                <>
                  <h1 className="mb-2 text-3xl font-bold text-[#002147]">Thank You for Sharing Your Story</h1>
                  <Button className="mt-4" onClick={() => navigate('/candidate-dashboard')}>Go to Dashboard</Button>
                </>
              )}
            </section>

            <aside className="rounded-xl bg-[#002147] p-6 text-white md:col-span-4">
              <h3 className="mb-3 text-2xl font-semibold">Selected for Elite Pathway</h3>
              <p className="text-sm text-blue-100">Your journey milestone can inspire future candidates across global destinations.</p>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
