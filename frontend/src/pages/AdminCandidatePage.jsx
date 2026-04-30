import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const documentStatuses = ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'];
const profileStatuses = ['submitted', 'under_review', 'accepted', 'rejected'];

export default function AdminCandidatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [docStatusDraft, setDocStatusDraft] = useState({});
  const [interviewForm, setInterviewForm] = useState({
    hiringPartner: '',
    country: '',
    role: '',
    date: '',
    time: '',
    meetingLink: '',
  });

  const loadDetails = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/candidates/${id}/details`);
      setData(data);
      const draft = {};
      (data.documents || []).forEach((d) => {
        draft[d._id] = d.status;
      });
      setDocStatusDraft(draft);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate details');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin', { replace: true });
      return;
    }
    if (isAuthenticated && !isAdmin) {
      navigate('/candidate-dashboard', { replace: true });
      return;
    }
    loadDetails();
  }, [id, isAuthenticated, isAdmin, navigate]);

  const profile = data?.profile;
  const candidate = data?.candidate;
  const documents = data?.documents || [];
  const interviews = data?.interviews || [];
  const payments = data?.payments || [];

  const profileSummary = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Full Name', value: `${profile.personalDetails?.firstName || ''} ${profile.personalDetails?.lastName || ''}`.trim() || 'N/A' },
      { label: 'Country of Residence', value: profile.personalDetails?.currentCountryOfResidence || 'N/A' },
      { label: 'Citizenship', value: profile.personalDetails?.citizenship || 'N/A' },
      { label: 'Email', value: profile.personalDetails?.email || candidate?.email || 'N/A' },
      { label: 'Technical Skills', value: profile.skills?.technical || 'N/A' },
      { label: 'Soft Skills', value: profile.skills?.soft || 'N/A' },
    ];
  }, [profile, candidate]);

  const updateCandidateStatus = async (status) => {
    setSaving(true);
    try {
      await api.put(`/admin/candidates/${id}/status`, { status });
      await loadDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update candidate status');
    } finally {
      setSaving(false);
    }
  };

  const updateProfileStatus = async (status) => {
    setSaving(true);
    try {
      await api.put(`/admin/candidates/${id}/profile-status`, { status });
      await loadDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update profile status');
    } finally {
      setSaving(false);
    }
  };

  const updateDocumentStatus = async (documentId) => {
    const status = docStatusDraft[documentId];
    if (!status) return;

    setSaving(true);
    try {
      await api.put(`/admin/candidates/${id}/documents/${documentId}/status`, { status });
      await loadDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update document status');
    } finally {
      setSaving(false);
    }
  };

  const scheduleInterview = async () => {
    if (!interviewForm.hiringPartner || !interviewForm.country || !interviewForm.role || !interviewForm.date || !interviewForm.time) {
      alert('Please fill all required interview fields.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/admin/candidates/${id}/interviews`, interviewForm);
      setInterviewForm({
        hiringPartner: '',
        country: '',
        role: '',
        date: '',
        time: '',
        meetingLink: '',
      });
      await loadDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to schedule interview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-28">
        <Card className="rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Candidate Review Workspace</p>
              <h1 className="text-2xl font-bold text-slate-900">{candidate?.name || 'Candidate Profile'}</h1>
              <p className="text-sm text-slate-600">{candidate?.email || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin"><Button variant="secondary">Back to Candidate List</Button></Link>
              <Button variant="secondary" onClick={loadDetails} disabled={loading || saving}>Refresh</Button>
            </div>
          </div>

          {loading && <p className="mt-4 text-sm text-slate-500">Loading candidate details...</p>}
          {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          {!loading && !error && candidate && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-slate-100 p-3"><p className="text-slate-500">Candidate Status</p><p className="mt-1 font-semibold text-slate-900">{candidate.status || 'N/A'}</p></div>
              <div className="rounded-lg bg-slate-100 p-3"><p className="text-slate-500">Profile Status</p><p className="mt-1 font-semibold text-slate-900">{profile?.status || 'not_submitted'}</p></div>
              <div className="rounded-lg bg-slate-100 p-3"><p className="text-slate-500">Documents</p><p className="mt-1 font-semibold text-slate-900">{documents.length} uploaded</p></div>
            </div>
          )}

          {!loading && !error && candidate && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" disabled={saving} onClick={() => updateCandidateStatus('accepted')}>Approve Candidate</Button>
              <Button variant="danger" disabled={saving} onClick={() => updateCandidateStatus('rejected')}>Reject Candidate</Button>
              <Button variant="secondary" disabled={saving} onClick={() => updateCandidateStatus('selected')}>Mark Selected</Button>
              <Button variant="secondary" disabled={saving} onClick={() => updateCandidateStatus('not_selected')}>Mark Not Selected</Button>
              <Button variant="secondary" disabled={saving} onClick={() => updateCandidateStatus('sent_to_partners')}>Send to Hiring Partners</Button>
            </div>
          )}
        </Card>

        <Card className="rounded-xl border border-slate-200 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">Profile Review</h2>
            <div className="flex flex-wrap gap-2">
              {profileStatuses.map((status) => (
                <Button
                  key={status}
                  variant="secondary"
                  disabled={saving || !profile}
                  onClick={() => updateProfileStatus(status)}
                >
                  Set {status}
                </Button>
              ))}
            </div>
          </div>

          {!profile && <p className="text-sm text-slate-600">No profile submitted yet.</p>}

          {profile && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {profileSummary.map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">{item.label}</p>
                    <p className="mt-1 font-medium text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#002147]">View full submitted profile JSON</summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(profile, null, 2)}</pre>
              </details>
            </>
          )}
        </Card>

        <Card className="rounded-xl border border-slate-200 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-900">Document Verification</h2>
          {!documents.length && <p className="text-sm text-slate-600">No documents uploaded yet.</p>}
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc._id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{doc.documentType}</p>
                    <a
                      className="text-sm font-medium text-[#3a5f94] underline"
                      href={`${getBackendBaseUrl()}${doc.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open file
                    </a>
                  </div>
                  <div>
                    <StatusBadge status={doc.status} />
                  </div>
                  <Select
                    label=""
                    options={documentStatuses}
                    value={docStatusDraft[doc._id] || doc.status}
                    onChange={(e) => setDocStatusDraft((prev) => ({ ...prev, [doc._id]: e.target.value }))}
                  />
                  <Button variant="secondary" disabled={saving} onClick={() => updateDocumentStatus(doc._id)}>Update</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Interview Management</h2>
          <p className="mt-1 text-sm text-slate-600">Schedule interviews directly for this candidate.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input required label="Hiring Partner" value={interviewForm.hiringPartner} onChange={(e) => setInterviewForm({ ...interviewForm, hiringPartner: e.target.value })} />
            <Input required label="Country" value={interviewForm.country} onChange={(e) => setInterviewForm({ ...interviewForm, country: e.target.value })} />
            <Input required label="Role" value={interviewForm.role} onChange={(e) => setInterviewForm({ ...interviewForm, role: e.target.value })} />
            <Input required label="Date" value={interviewForm.date} onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })} />
            <Input required label="Time" value={interviewForm.time} onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })} />
            <Input label="Meeting Link" value={interviewForm.meetingLink} onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={scheduleInterview} disabled={saving}>Schedule Interview</Button>

          <div className="mt-5 space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Scheduled Interviews</h3>
            {!interviews.length && <p className="text-sm text-slate-600">No interviews scheduled yet.</p>}
            {interviews.map((item) => (
              <div key={item._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p><b>Hiring Partner:</b> {item.hiringPartner}</p>
                <p><b>Country:</b> {item.country}</p>
                <p><b>Role:</b> {item.role}</p>
                <p><b>Date:</b> {item.date}</p>
                <p><b>Time:</b> {item.time}</p>
                <p><b>Status:</b> {item.status}</p>
                {item.meetingLink && <a className="font-medium text-[#3a5f94] underline" href={item.meetingLink} target="_blank" rel="noreferrer">Open Meeting Link</a>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-900">Payment Records</h2>
          {!payments.length && <p className="text-sm text-slate-600">No payment records yet.</p>}
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p><b>Type:</b> {payment.type}</p>
                <p><b>Amount:</b> {payment.currency} {payment.amount}</p>
                <p><b>Status:</b> {payment.status}</p>
                <p><b>Method:</b> {payment.method}</p>
                <p><b>Transaction:</b> {payment.transactionId}</p>
              </div>
            ))}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
