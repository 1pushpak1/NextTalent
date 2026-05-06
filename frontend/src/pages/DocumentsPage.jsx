import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import api from '../api/axios';
import { documentChecklist } from '../utils/constants';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: dashboard }, { data }] = await Promise.all([
          api.get('/dashboard/me'),
          api.get('/documents/me'),
        ]);
        const required = getCandidateNextRoute(dashboard);
        if (required !== '/documents') {
          navigate(required, { replace: true });
          return;
        }
        setDocs(data);
      } catch {
        setDocs([]);
      }
    };
    load();
  }, [navigate]);

  const latestDocMap = useMemo(() => {
    const map = {};
    docs.forEach((d) => {
      if (!map[d.documentType]) {
        map[d.documentType] = d;
      }
    });
    return map;
  }, [docs]);

  const submitAll = async () => {
    if (!docs.length) {
      alert('Upload at least one document before submission.');
      return;
    }
    try {
      await api.put('/dashboard/me/status', { status: 'documents_submitted' });
      setShowDone(true);
    } catch {
      alert('Unable to submit documents for review');
    }
  };

  const uploadedCount = Object.keys(latestDocMap).length;
  const progress = Math.min(100, Math.round((uploadedCount / documentChecklist.length) * 100));

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-outlined text-base">folder_shared</span>
              <span>Candidate Portal</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="font-semibold text-[#3a5f94]">Document Collection</span>
            </div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#002147]">Submit Your Credentials</h1>
            <p className="max-w-3xl text-base text-[#44474e]">
              Provide high-resolution scans of required documents. Our compliance team reviews submissions within 24-48
              hours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="nst-card flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#f4f3f7] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#002147] text-white">
                    <span className="material-symbols-outlined">verified_user</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Verification Progress</p>
                    <p className="text-xs text-white">{uploadedCount} of {documentChecklist.length} documents uploaded</p>
                  </div>
                </div>
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-[#3a5f94]" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="space-y-3">
                {documentChecklist.map((doc) => (
                  <FileUpload
                    key={doc}
                    label={doc}
                    status={latestDocMap[doc]?.status || 'Pending'}
                    hasUploadedFile={Boolean(latestDocMap[doc])}
                    onUploaded={(data) =>
                      setDocs((prev) => [data, ...prev.filter((existing) => existing.documentType !== data.documentType)])
                    }
                  />
                ))}
              </div>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-xl bg-[#002147] p-6 text-white">
                <h4 className="mb-3 text-xl font-semibold">Pro Tips</h4>
                <ul className="space-y-3 text-sm text-blue-100">
                  <li className="flex gap-2"><span className="material-symbols-outlined text-base">lightbulb</span> Use high-quality PDF scans.</li>
                  <li className="flex gap-2"><span className="material-symbols-outlined text-base">attach_file</span> Maximum file size is 10MB.</li>
                  <li className="flex gap-2"><span className="material-symbols-outlined text-base">verified</span> Ensure all corners are visible.</li>
                </ul>
              </div>
              <div className="nst-card rounded-xl p-6">
                <h4 className="mb-2 text-sm font-semibold text-[#002147]">Need help?</h4>
                <p className="mb-4 text-sm text-[#44474e]">
                  Our document specialists are available to assist with upload or format issues.
                </p>
                <Button variant="secondary" className="w-full text-white">Contact Support</Button>
              </div>
            </aside>
          </div>

          <div className="mt-10 flex justify-center">
            <Button className="px-10 py-3 text-base" onClick={submitAll}>Submit Documents for Review</Button>
          </div>
        </div>
      </main>

      <Modal isOpen={showDone} onClose={() => setShowDone(false)} title="Success!">
        <p className="text-sm text-slate-600">All documents have been received.</p>
        <Button className="mt-4 w-full text-white" onClick={() => navigate('/candidate-dashboard')}>Go to Dashboard</Button>
      </Modal>
      <Footer />
    </div>
  );
}
