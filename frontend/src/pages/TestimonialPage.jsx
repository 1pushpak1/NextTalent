import { useRef, useState } from 'react';
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
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const openPhotoPicker = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent) return alert('Consent checkbox is required.');

    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('country', form.country);
      formData.append('selectedDestination', form.selectedDestination);
      formData.append('role', form.role);
      formData.append('text', form.text);
      formData.append('consent', String(form.consent));
      if (form.photoUrl) {
        formData.append('photoUrl', form.photoUrl);
      }
      if (selectedPhotoFile) {
        formData.append('photo', selectedPhotoFile);
      }

      await api.post('/testimonials', formData);
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
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-[#44474e]">
                        Testimonial Text
                        <span className="ml-1 text-rose-600">*</span>
                      </span>
                      <textarea
                        className="min-h-[180px] w-full rounded-lg border border-[#c4c6cf] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#3a5f94] focus:ring-2 focus:ring-[#3a5f94]/20"
                        value={form.text}
                        onChange={(e) => setForm({ ...form, text: e.target.value })}
                        required
                      />
                    </label>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#44474e]">Photo</p>
                          <p className="text-xs text-slate-500">
                            Upload a testimonial photo to accompany your story.
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".png,.jpg,.jpeg,.webp"
                          onChange={handlePhotoUpload}
                        />
                        <Button className="text-white" type="button" variant="secondary" onClick={openPhotoPicker}>
                          {selectedPhotoFile || photoPreviewUrl || form.photoUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                      </div>
                      {(photoPreviewUrl || form.photoUrl) && (
                        <div className="mt-4">
                          <img
                            src={photoPreviewUrl || form.photoUrl}
                            alt="Testimonial upload preview"
                            className="h-32 w-32 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                        </div>
                      )}
                    </div>
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
                  <Button className="mt-4 text-white" onClick={() => navigate('/candidate-dashboard')}>Go to Dashboard</Button>
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
