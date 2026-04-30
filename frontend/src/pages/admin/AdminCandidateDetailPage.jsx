import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const documentStatuses = ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'];
const paymentStatuses = ['completed', 'pending', 'failed', 'refunded'];

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const displayValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && !value.trim()) return 'N/A';
  return String(value);
};

const FieldGrid = ({ rows = [] }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {rows.map((row) => (
      <div key={row.label} className="rounded-md bg-slate-100 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
        <p className="mt-1 font-medium text-slate-900">{displayValue(row.value)}</p>
      </div>
    ))}
  </div>
);

export default function AdminCandidateDetailPage() {
  const { id } = useParams();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [docStatusDraft, setDocStatusDraft] = useState({});
  const [paymentStatusDraft, setPaymentStatusDraft] = useState({});
  const [notesDraft, setNotesDraft] = useState('');
  const [interviewForm, setInterviewForm] = useState({
    hiringPartner: '',
    country: '',
    role: '',
    date: '',
    time: '',
    meetingLink: '',
  });

  const load = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    try {
      const { data } = await api.get(`/admin/candidates/${id}/details`);
      if (!mountedRef.current) return;
      setData(data);
      setNotesDraft(data?.adminNotes || '');

      const nextDocDraft = {};
      (data.documents || []).forEach((doc) => {
        nextDocDraft[doc._id] = doc.status;
      });
      setDocStatusDraft(nextDocDraft);

      const nextPaymentDraft = {};
      (data.payments || []).forEach((payment) => {
        nextPaymentDraft[payment._id] = payment.status;
      });
      setPaymentStatusDraft(nextPaymentDraft);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.response?.data?.message || 'Failed to load candidate details');
      setData(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    const timerId = window.setTimeout(() => {
      load();
    }, 0);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const candidate = data?.candidate;
  const profile = data?.profile;
  const documents = data?.documents || [];
  const payments = data?.payments || [];
  const interviews = data?.interviews || [];

  const personalDetailsRows = useMemo(() => {
    if (!profile?.personalDetails) return [];
    const details = profile.personalDetails;
    return [
      { label: 'First Name', value: details.firstName },
      { label: 'Middle Name', value: details.middleName },
      { label: 'Last Name', value: details.lastName },
      { label: 'Date of Birth', value: details.dateOfBirth },
      { label: 'Country of Birth', value: details.countryOfBirth },
      { label: 'Citizenship', value: details.citizenship },
      { label: 'Current Country of Residence', value: details.currentCountryOfResidence },
      { label: 'Current Visa Status', value: details.currentVisaStatus },
      { label: 'Email', value: details.email || candidate?.email },
    ];
  }, [profile, candidate]);

  const education = profile?.education || null;
  const certifications = profile?.certifications || [];
  const workExperience = profile?.workExperience || [];
  const skills = profile?.skills || {};
  const languages = profile?.languages || [];

  const setDocumentStatus = async (documentId) => {
    setSaving(true);
    try {
      await api.put(`/admin/candidates/${id}/documents/${documentId}/status`, {
        status: docStatusDraft[documentId],
      });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update document status');
    } finally {
      setSaving(false);
    }
  };

  const setPaymentStatus = async (paymentId) => {
    setSaving(true);
    try {
      await api.put(`/admin/payments/${paymentId}/status`, {
        status: paymentStatusDraft[paymentId] || 'pending',
      });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update payment status');
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/candidates/${id}/notes`, { notes: notesDraft });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to save notes');
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
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to schedule interview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidate Application</h1>
        <p className="text-sm text-slate-600">Full application details with admin actions.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading candidate details...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!loading && !error && candidate && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Current Status</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-1 font-medium text-slate-900">{candidate.name}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-900">{candidate.email}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 font-medium text-slate-900">{candidate.status || 'N/A'}</p>
              </div>
            </div>
            <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              Step approvals are controlled from each admin stage page using the tick/cross/review actions.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
            {!personalDetailsRows.length && <p className="mt-3 text-sm text-slate-500">No personal details submitted.</p>}
            {Boolean(personalDetailsRows.length) && <div className="mt-3"><FieldGrid rows={personalDetailsRows} /></div>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Education</h2>
            {!education && <p className="mt-3 text-sm text-slate-500">No education details submitted.</p>}
            {education && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">High School</p>
                  <FieldGrid rows={[
                    { label: 'Start Date', value: education.highSchool?.startDate },
                    { label: 'End Date', value: education.highSchool?.endDate },
                    { label: 'Track', value: education.highSchool?.track },
                    { label: 'Country', value: education.highSchool?.country },
                  ]} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Diploma</p>
                  <FieldGrid rows={[
                    { label: 'Not Applicable', value: education.diploma?.notApplicable },
                    { label: 'Duration', value: education.diploma?.duration },
                    { label: 'Has Training', value: education.diploma?.hasTraining },
                    { label: 'Start Date', value: education.diploma?.startDate },
                    { label: 'End Date', value: education.diploma?.endDate },
                    { label: 'Field', value: education.diploma?.field },
                    { label: 'Country', value: education.diploma?.country },
                  ]} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Bachelor&apos;s</p>
                  <FieldGrid rows={[
                    { label: 'Start Date', value: education.bachelors?.startDate },
                    { label: 'End Date', value: education.bachelors?.endDate },
                    { label: 'Field', value: education.bachelors?.field },
                    { label: 'Country', value: education.bachelors?.country },
                  ]} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Master&apos;s</p>
                  <FieldGrid rows={[
                    { label: 'Not Applicable', value: education.masters?.notApplicable },
                    { label: 'Start Date', value: education.masters?.startDate },
                    { label: 'End Date', value: education.masters?.endDate },
                    { label: 'Field', value: education.masters?.field },
                    { label: 'Country', value: education.masters?.country },
                  ]} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Additional Qualifications</p>
                  {!education.additionalQualifications?.length && <p className="text-sm text-slate-500">No additional qualifications.</p>}
                  <div className="space-y-2">
                    {(education.additionalQualifications || []).map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Qualification {idx + 1}</p>
                        <FieldGrid rows={[
                          { label: 'Qualification Name', value: item.qualificationName },
                          { label: 'Field', value: item.field },
                          { label: 'Start Date', value: item.startDate },
                          { label: 'End Date', value: item.endDate },
                          { label: 'Country', value: item.country },
                        ]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
            {!certifications.length && <p className="mt-3 text-sm text-slate-500">No certifications submitted.</p>}
            <div className="mt-3 space-y-2">
              {certifications.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Certification {idx + 1}</p>
                  <FieldGrid rows={[
                    { label: 'Certification Name', value: item.certificationName },
                    { label: 'Issuing Organization', value: item.issuingOrganization },
                    { label: 'Year Completed', value: item.yearCompleted },
                  ]} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Work Experience</h2>
            {!workExperience.length && <p className="mt-3 text-sm text-slate-500">No work experience submitted.</p>}
            <div className="mt-3 space-y-2">
              {workExperience.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Experience {idx + 1}</p>
                  <FieldGrid rows={[
                    { label: 'Organization Name', value: item.organizationName },
                    { label: 'Job Title', value: item.jobTitle },
                    { label: 'Responsibilities', value: item.responsibilities },
                    { label: 'Start Date', value: item.startDate },
                    { label: 'End Date', value: item.endDate },
                    { label: 'Currently Working Here', value: item.currentlyWorkingHere },
                    { label: 'Country', value: item.country },
                  ]} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
            <div className="mt-3">
              <FieldGrid rows={[
                { label: 'Technical Skills', value: skills.technical },
                { label: 'Soft Skills', value: skills.soft },
              ]} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Languages</h2>
            {!languages.length && <p className="mt-3 text-sm text-slate-500">No languages submitted.</p>}
            <div className="mt-3 space-y-2">
              {languages.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Language {idx + 1}</p>
                  <FieldGrid rows={[
                    { label: 'Language', value: item.language },
                    { label: 'Proficiency Level', value: item.proficiencyLevel },
                    { label: 'Certified', value: item.certified },
                    { label: 'Certificate Title', value: item.certificateTitle },
                  ]} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Documents (with Status)</h2>
            {!documents.length && <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>}
            <div className="mt-3 space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{doc.documentType}</p>
                      <a className="text-xs font-medium text-[#3a5f94] underline" href={`${getBackendBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer">Open file</a>
                    </div>
                    <p className="text-sm text-slate-600">{doc.status}</p>
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={docStatusDraft[doc._id] || doc.status}
                      onChange={(e) => setDocStatusDraft((prev) => ({ ...prev, [doc._id]: e.target.value }))}
                    >
                      {documentStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => setDocumentStatus(doc._id)} disabled={saving}>Update</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
            {!payments.length && <p className="mt-3 text-sm text-slate-500">No payments found.</p>}
            <div className="mt-3 space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] md:items-center">
                    <p className="text-sm text-slate-700"><b>Type:</b> {payment.type}</p>
                    <p className="text-sm text-slate-700"><b>Amount:</b> {payment.currency} {payment.amount}</p>
                    <p className="text-sm text-slate-700"><b>Txn:</b> {payment.transactionId}</p>
                    <p className="text-sm text-slate-700"><b>Date:</b> {new Date(payment.createdAt).toLocaleDateString()}</p>
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={paymentStatusDraft[payment._id] || payment.status}
                      onChange={(e) => setPaymentStatusDraft((prev) => ({ ...prev, [payment._id]: e.target.value }))}
                    >
                      {paymentStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => setPaymentStatus(payment._id)} disabled={saving}>Save</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Interviews</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Hiring Partner" value={interviewForm.hiringPartner} onChange={(e) => setInterviewForm({ ...interviewForm, hiringPartner: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Country" value={interviewForm.country} onChange={(e) => setInterviewForm({ ...interviewForm, country: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Role" value={interviewForm.role} onChange={(e) => setInterviewForm({ ...interviewForm, role: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Date" value={interviewForm.date} onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Time" value={interviewForm.time} onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Meeting Link" value={interviewForm.meetingLink} onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })} />
            </div>
            <button type="button" className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={scheduleInterview} disabled={saving}>Add Interview</button>

            <div className="mt-4 space-y-2">
              {!interviews.length && <p className="text-sm text-slate-500">No interviews scheduled.</p>}
              {interviews.map((item) => (
                <div key={item._id} className="rounded-md border border-slate-200 p-2 text-sm text-slate-700">
                  <p><b>{item.hiringPartner}</b> • {item.role} • {item.country}</p>
                  <p>{item.date} {item.time} • {item.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Admin Notes</h2>
            <textarea
              className="mt-3 min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write internal admin notes about this candidate..."
            />
            <button type="button" className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={saveNotes} disabled={saving}>Save Notes</button>
          </div>
        </>
      )}
    </section>
  );
}
