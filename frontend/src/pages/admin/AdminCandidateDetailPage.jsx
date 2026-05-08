import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import api from '../../api/axios';

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const hasDisplayValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const displayValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const filterFilledRows = (rows = []) => rows.filter((row) => hasDisplayValue(row.value));
const buildFullName = (details = {}, fallback = '') => {
  const combined = [details.firstName, details.middleName, details.lastName].filter((part) => hasDisplayValue(part)).join(' ').trim();
  return combined || fallback || 'N/A';
};
const paymentStatuses = ['completed', 'pending', 'failed', 'refunded'];
const getPaymentTitle = (type) =>
  type === 'initial' ? 'Initial Payment' : type === 'program' ? 'Program Fee' : 'Final Payment';
const formatStatus = (value) => {
  if (!value) return '—';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const FieldGrid = ({ rows = [] }) => {
  const visibleRows = filterFilledRows(rows);
  if (!visibleRows.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {visibleRows.map((row) => (
        <div key={row.label} className="rounded-md bg-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
          <p className="mt-1 font-medium text-slate-900">{displayValue(row.value)}</p>
        </div>
      ))}
    </div>
  );
};

export default function AdminCandidateDetailPage() {
  const { id } = useParams();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [paymentStatusDraft, setPaymentStatusDraft] = useState({});
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/admin/candidates/${id}/details`);
        if (!mountedRef.current) return;
        setData(data);
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
    };

    load();
    return () => {
      mountedRef.current = false;
    };
  }, [id]);

  const candidate = data?.candidate;
  const profile = data?.profile;
  const eligibility = data?.eligibility || null;
  const documents = data?.documents || [];
  const payments = data?.payments || [];
  const testimonial = data?.testimonial || null;
  const education = profile?.education || null;
  const certifications = (profile?.certifications || []).filter((item) =>
    [item.certificationName, item.issuingOrganization, item.yearCompleted].some(hasDisplayValue),
  );
  const workExperience = (profile?.workExperience || []).filter((item) =>
    [item.organizationName, item.jobTitle, item.responsibilities, item.startDate, item.endDate, item.country, item.currentlyWorkingHere].some(hasDisplayValue),
  );
  const languages = (profile?.languages || []).filter((item) =>
    [item.language, item.proficiencyLevel, item.certificateTitle, item.certified === 'Yes'].some(hasDisplayValue),
  );

  const personalDetailsRows = useMemo(() => {
    if (!profile?.personalDetails) return [];
    const details = profile.personalDetails;
    return filterFilledRows([
      { label: 'First Name', value: details.firstName },
      { label: 'Middle Name', value: details.middleName },
      { label: 'Last Name', value: details.lastName },
      { label: 'Date of Birth', value: details.dateOfBirth },
      { label: 'Country of Birth', value: details.countryOfBirth },
      { label: 'Citizenship', value: details.citizenship },
      { label: 'Current Country of Residence', value: details.currentCountryOfResidence },
      { label: 'Current Visa Status', value: details.currentVisaStatus },
      { label: 'Email', value: details.email || candidate?.email },
    ]);
  }, [profile, candidate]);

  const candidateFullName = useMemo(
    () => buildFullName(profile?.personalDetails || {}, candidate?.name || ''),
    [profile, candidate],
  );

  const additionalQualifications = useMemo(
    () =>
      (education?.additionalQualifications || []).filter((item) =>
        [item.qualificationName, item.field, item.startDate, item.endDate, item.country].some(hasDisplayValue),
      ),
    [education],
  );

  const skillRows = filterFilledRows([
    { label: 'Technical Skills', value: profile?.skills?.technical },
    { label: 'Soft Skills', value: profile?.skills?.soft },
    { label: 'Additional Information', value: profile?.additionalInfo },
  ]);

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  };

  const printInvoice = (payment) => {
    if (!payment) return;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${getPaymentTitle(payment.type)} Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin: 0 0 8px; color: #002147; }
            .subtitle { color: #475569; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .field { background: #f8fafc; border-radius: 12px; padding: 12px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .value { margin-top: 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>${getPaymentTitle(payment.type)} Invoice</h1>
          <div class="subtitle">${escapeHtml(candidateFullName)}</div>
          <div class="grid">
            <div class="field"><div class="label">Status</div><div class="value">${payment.status || '—'}</div></div>
            <div class="field"><div class="label">Amount</div><div class="value">${payment.currency || 'USD'} ${payment.amount || 0}</div></div>
            <div class="field"><div class="label">Transaction ID</div><div class="value">${payment.transactionId || '—'}</div></div>
            <div class="field"><div class="label">Method</div><div class="value">${payment.method || '—'}</div></div>
            <div class="field"><div class="label">Date</div><div class="value">${formatDate(payment.createdAt)}</div></div>
            <div class="field"><div class="label">Type</div><div class="value">${getPaymentTitle(payment.type)}</div></div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) return;
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => iframe.remove(), 1000);
    };
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
  };

  const updatePaymentStatus = async (paymentId) => {
    setSaving(true);
    try {
      await api.put(`/admin/payments/${paymentId}/status`, {
        status: paymentStatusDraft[paymentId] || 'pending',
      });
      const { data } = await api.get(`/admin/candidates/${id}/details`);
      if (!mountedRef.current) return;
      setData(data);
      const nextPaymentDraft = {};
      (data.payments || []).forEach((payment) => {
        nextPaymentDraft[payment._id] = payment.status;
      });
      setPaymentStatusDraft(nextPaymentDraft);
      const refreshedPayment = (data.payments || []).find((payment) => payment._id === paymentId) || null;
      setEditingPayment(null);
      if (selectedPayment?._id === paymentId) {
        setSelectedPayment(refreshedPayment);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update payment status');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const exportProfilePdf = () => {
    if (!candidate) return;

    const section = (title, content) => {
      if (!content) return '';
      return `
        <section class="section">
          <h2>${escapeHtml(title)}</h2>
          ${content}
        </section>
      `;
    };

    const fieldGridMarkup = (rows = []) => {
      const visibleRows = filterFilledRows(rows);
      if (!visibleRows.length) return '';
      return `
        <div class="grid">
          ${visibleRows
            .map(
              (row) => `
                <div class="field">
                  <div class="label">${escapeHtml(row.label)}</div>
                  <div class="value">${escapeHtml(displayValue(row.value))}</div>
                </div>
              `,
            )
            .join('')}
        </div>
      `;
    };

    const cardListMarkup = (title, items = [], getRows) => {
      if (!items.length) return '';
      return `
        <div class="stack">
          ${items
            .map((item, idx) => {
              const rows = getRows(item, idx);
              const grid = fieldGridMarkup(rows);
              if (!grid) return '';
              return `
                <div class="subcard">
                  <div class="subheading">${escapeHtml(`${title} ${idx + 1}`)}</div>
                  ${grid}
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    };

    const documentRows = documents.map((doc) => [
      { label: 'Document Type', value: doc.documentType },
      { label: 'Status', value: doc.status },
      { label: 'File URL', value: `${getBackendBaseUrl()}${doc.fileUrl}` },
    ]);

    const paymentRows = payments.map((payment) => [
      { label: 'Type', value: payment.type },
      { label: 'Amount', value: `${payment.currency} ${payment.amount}` },
      { label: 'Transaction ID', value: payment.transactionId },
      { label: 'Status', value: payment.status },
      { label: 'Date', value: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '' },
    ]);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(candidateFullName)} - Candidate Profile</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { font-size: 28px; margin: 0 0 8px; color: #002147; }
            .subtitle { color: #475569; margin-bottom: 24px; }
            .section { margin-top: 24px; }
            .section h2 { font-size: 18px; margin: 0 0 12px; color: #002147; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .field { background: #f1f5f9; border-radius: 10px; padding: 12px; break-inside: avoid; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .value { margin-top: 6px; font-size: 14px; font-weight: 600; color: #0f172a; white-space: pre-wrap; word-break: break-word; }
            .stack { display: grid; gap: 12px; }
            .subcard { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            .subheading { margin-bottom: 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .note { background: #f8fafc; border-radius: 10px; padding: 12px; white-space: pre-wrap; }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(candidateFullName)}</h1>
          <div class="subtitle">${escapeHtml(candidate?.email || '')}</div>
          ${section(
            'Candidate Summary',
            fieldGridMarkup([
              { label: 'Name', value: candidateFullName },
              { label: 'Email', value: profile?.personalDetails?.email || candidate?.email },
              { label: 'Profile Status', value: profile?.status || 'not_submitted' },
            ]),
          )}
          ${section('Personal Details', fieldGridMarkup(personalDetailsRows))}
          ${section(
            'Education',
            [
              fieldGridMarkup([
                { label: 'High School Start Date', value: education?.highSchool?.startDate },
                { label: 'High School End Date', value: education?.highSchool?.endDate },
                { label: 'High School Track', value: education?.highSchool?.track },
                { label: 'High School Country', value: education?.highSchool?.country },
              ]),
              fieldGridMarkup([
                { label: 'Diploma Duration', value: education?.diploma?.duration },
                { label: 'Diploma Has Training', value: education?.diploma?.hasTraining },
                { label: 'Diploma Start Date', value: education?.diploma?.startDate },
                { label: 'Diploma End Date', value: education?.diploma?.endDate },
                { label: 'Diploma Field', value: education?.diploma?.field },
                { label: 'Diploma Country', value: education?.diploma?.country },
              ]),
              fieldGridMarkup([
                { label: "Bachelor's Start Date", value: education?.bachelors?.startDate },
                { label: "Bachelor's End Date", value: education?.bachelors?.endDate },
                { label: "Bachelor's Field", value: education?.bachelors?.field },
                { label: "Bachelor's Country", value: education?.bachelors?.country },
              ]),
              fieldGridMarkup([
                { label: "Master's Start Date", value: education?.masters?.startDate },
                { label: "Master's End Date", value: education?.masters?.endDate },
                { label: "Master's Field", value: education?.masters?.field },
                { label: "Master's Country", value: education?.masters?.country },
              ]),
              cardListMarkup('Additional Qualification', additionalQualifications, (item) => [
                { label: 'Qualification Name', value: item.qualificationName },
                { label: 'Field', value: item.field },
                { label: 'Start Date', value: item.startDate },
                { label: 'End Date', value: item.endDate },
                { label: 'Country', value: item.country },
              ]),
            ].filter(Boolean).join(''),
          )}
          ${section(
            'Certifications',
            cardListMarkup('Certification', certifications, (item) => [
              { label: 'Certification Name', value: item.certificationName },
              { label: 'Issuing Organization', value: item.issuingOrganization },
              { label: 'Year Completed', value: item.yearCompleted },
            ]),
          )}
          ${section(
            'Work Experience',
            cardListMarkup('Experience', workExperience, (item) => [
              { label: 'Organization Name', value: item.organizationName },
              { label: 'Job Title', value: item.jobTitle },
              { label: 'Responsibilities', value: item.responsibilities },
              { label: 'Start Date', value: item.startDate },
              { label: 'End Date', value: item.endDate },
              { label: 'Currently Working Here', value: item.currentlyWorkingHere },
              { label: 'Country', value: item.country },
            ]),
          )}
          ${section('Skills and Additional Information', fieldGridMarkup(skillRows))}
          ${section(
            'Languages',
            cardListMarkup('Language', languages, (item) => [
              { label: 'Language', value: item.language },
              { label: 'Proficiency Level', value: item.proficiencyLevel },
              { label: 'Certified', value: item.certified === 'Yes' ? item.certified : '' },
              { label: 'Certificate Title', value: item.certificateTitle },
            ]),
          )}
          ${section(
            'Documents',
            cardListMarkup('Document', documentRows, (rows) => rows),
          )}
          ${section(
            'Payment History',
            cardListMarkup('Payment', paymentRows, (rows) => rows),
          )}
          ${testimonial ? section(
            'Candidate Testimonial',
            `
              ${fieldGridMarkup([
                { label: 'Name', value: testimonial.fullName },
                { label: 'Country', value: testimonial.country },
                { label: 'Destination', value: testimonial.selectedDestination },
                { label: 'Role', value: testimonial.role },
              ])}
              ${hasDisplayValue(testimonial.text) ? `<div class="note">${escapeHtml(testimonial.text)}</div>` : ''}
            `,
          ) : ''}
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      frameWindow.focus();
      frameWindow.print();
      cleanup();
    };

    document.body.appendChild(iframe);
    const frameDocument = iframe.contentDocument;
    if (!frameDocument) {
      cleanup();
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Profile</h1>
          <p className="text-sm text-slate-600">Read-only submitted profile view. Only filled candidate details are shown here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/dashboard">
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={exportProfilePdf}>Export PDF</Button>
          <Link to={`/admin/candidate/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading candidate details...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!loading && !error && candidate && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Candidate Summary</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-1 font-medium text-slate-900">{candidateFullName}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-900">{candidate.email || 'N/A'}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Profile Status</p>
                <p className="mt-1 font-medium text-slate-900">{profile?.status || 'not_submitted'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
            {!personalDetailsRows.length ? (
              <p className="mt-3 text-sm text-slate-500">No personal details submitted.</p>
            ) : (
              <div className="mt-3">
                <FieldGrid rows={personalDetailsRows} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Initial Eligibility Details</h2>
            {!eligibility ? (
              <p className="mt-3 text-sm text-slate-500">No eligibility record found.</p>
            ) : (
              <div className="mt-3">
                <FieldGrid rows={[
                  { label: 'Destination', value: eligibility.destination },
                  { label: 'Country', value: eligibility.country },
                  { label: 'IT Background', value: eligibility.hasITBackground },
                  { label: 'Qualification', value: eligibility.qualification },
                  { label: 'Language', value: eligibility.languageAnswer },
                  { label: 'Current Location', value: eligibility.currentLocation },
                  { label: 'Willing To Relocate', value: eligibility.willingToRelocate },
                  { label: 'Comfortable With Fees', value: eligibility.comfortableWithFees },
                  { label: 'Eligible', value: eligibility.isEligible },
                  { label: 'Rejection Reason', value: eligibility.rejectionReason },
                ]} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Education</h2>
            {!education ? (
              <p className="mt-3 text-sm text-slate-500">No education details submitted.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {filterFilledRows([
                  { label: 'Start Date', value: education.highSchool?.startDate },
                  { label: 'End Date', value: education.highSchool?.endDate },
                  { label: 'Track', value: education.highSchool?.track },
                  { label: 'Country', value: education.highSchool?.country },
                ]).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">High School</p>
                    <FieldGrid rows={[
                      { label: 'Start Date', value: education.highSchool?.startDate },
                      { label: 'End Date', value: education.highSchool?.endDate },
                      { label: 'Track', value: education.highSchool?.track },
                      { label: 'Country', value: education.highSchool?.country },
                    ]} />
                  </div>
                )}

                {filterFilledRows([
                  { label: 'Duration', value: education.diploma?.duration },
                  { label: 'Has Training', value: education.diploma?.hasTraining },
                  { label: 'Start Date', value: education.diploma?.startDate },
                  { label: 'End Date', value: education.diploma?.endDate },
                  { label: 'Field', value: education.diploma?.field },
                  { label: 'Country', value: education.diploma?.country },
                ]).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Diploma</p>
                    <FieldGrid rows={[
                      { label: 'Duration', value: education.diploma?.duration },
                      { label: 'Has Training', value: education.diploma?.hasTraining },
                      { label: 'Start Date', value: education.diploma?.startDate },
                      { label: 'End Date', value: education.diploma?.endDate },
                      { label: 'Field', value: education.diploma?.field },
                      { label: 'Country', value: education.diploma?.country },
                    ]} />
                  </div>
                )}

                {filterFilledRows([
                  { label: 'Start Date', value: education.bachelors?.startDate },
                  { label: 'End Date', value: education.bachelors?.endDate },
                  { label: 'Field', value: education.bachelors?.field },
                  { label: 'Country', value: education.bachelors?.country },
                ]).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Bachelor&apos;s</p>
                    <FieldGrid rows={[
                      { label: 'Start Date', value: education.bachelors?.startDate },
                      { label: 'End Date', value: education.bachelors?.endDate },
                      { label: 'Field', value: education.bachelors?.field },
                      { label: 'Country', value: education.bachelors?.country },
                    ]} />
                  </div>
                )}

                {filterFilledRows([
                  { label: 'Start Date', value: education.masters?.startDate },
                  { label: 'End Date', value: education.masters?.endDate },
                  { label: 'Field', value: education.masters?.field },
                  { label: 'Country', value: education.masters?.country },
                ]).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Master&apos;s</p>
                    <FieldGrid rows={[
                      { label: 'Start Date', value: education.masters?.startDate },
                      { label: 'End Date', value: education.masters?.endDate },
                      { label: 'Field', value: education.masters?.field },
                      { label: 'Country', value: education.masters?.country },
                    ]} />
                  </div>
                )}

                {!!additionalQualifications.length && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Additional Qualifications</p>
                    <div className="space-y-2">
                      {additionalQualifications.map((item, idx) => (
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
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
            {!certifications.length ? (
              <p className="mt-3 text-sm text-slate-500">No certifications submitted.</p>
            ) : (
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
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Work Experience</h2>
            {!workExperience.length ? (
              <p className="mt-3 text-sm text-slate-500">No work experience submitted.</p>
            ) : (
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
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Skills and Additional Information</h2>
            {!skillRows.length ? (
              <p className="mt-3 text-sm text-slate-500">No skills or additional information submitted.</p>
            ) : (
              <div className="mt-3">
                <FieldGrid rows={skillRows} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Languages</h2>
            {!languages.length ? (
              <p className="mt-3 text-sm text-slate-500">No languages submitted.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {languages.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Language {idx + 1}</p>
                    <FieldGrid rows={[
                      { label: 'Language', value: item.language },
                      { label: 'Proficiency Level', value: item.proficiencyLevel },
                      { label: 'Certified', value: item.certified === 'Yes' ? item.certified : '' },
                      { label: 'Certificate Title', value: item.certificateTitle },
                    ]} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Signature Audit</h2>
            {!profile?.signature?.value ? (
              <p className="mt-3 text-sm text-slate-500">No signature captured.</p>
            ) : (
              <div className="mt-3">
                <FieldGrid rows={[
                  { label: 'Signature Type', value: profile.signature.type },
                  { label: 'Signed At', value: profile.signature.signedAt },
                  { label: 'IP Address', value: profile.signature?.audit?.ipAddress },
                  { label: 'User Agent', value: profile.signature?.audit?.userAgent },
                  { label: 'Session ID', value: profile.signature?.audit?.sessionId },
                  { label: 'Platform', value: profile.signature?.audit?.signedFrom?.platform },
                  { label: 'Mobile', value: profile.signature?.audit?.signedFrom?.mobile },
                  { label: 'Accept Language', value: profile.signature?.audit?.signedFrom?.language },
                ]} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            {!documents.length ? (
              <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {documents.map((doc) => (
                  <div key={doc._id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{doc.documentType}</p>
                        <p className="mt-1 text-sm text-slate-600">Status: {doc.status}</p>
                      </div>
                      <a className="text-sm font-medium text-[#3a5f94] underline" href={`${getBackendBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer">
                        Open file
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {payments.length ? `${payments.length} payment record${payments.length === 1 ? '' : 's'}` : 'No payments found.'}
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-500">expand_more</span>
            </summary>
            {!payments.length ? (
              <p className="mt-3 text-sm text-slate-500">No payments found.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {payments.map((payment) => (
                  <article key={payment._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice — <span className="normal-case font-semibold text-emerald-700">{formatStatus(payment.status)}</span></p>
                        <h3 className="mt-1 text-xl font-bold text-[#002147]">{getPaymentTitle(payment.type)}</h3>
                        <p className="mt-1 text-xs text-slate-500">Transaction ID: {payment.transactionId || '—'}</p>
                        {payment.receiptUrl && (
                          <a className="mt-1 inline-block text-xs text-[#3a5f94] underline" href={`${getBackendBaseUrl()}${payment.receiptUrl}`} target="_blank" rel="noreferrer">View Receipt</a>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                          <p className="text-base font-semibold text-slate-900">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                          <p className="text-xl font-bold text-[#002147]">{payment.currency || 'USD'} {payment.amount || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => setSelectedPayment(payment)}>View</Button>
                      <Button variant="secondary" onClick={() => printInvoice(payment)}>Download Invoice</Button>
                      <Button onClick={() => setEditingPayment(payment)} disabled={saving}>Edit Payment Status</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </details>

          {testimonial && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">Candidate Testimonial</h2>
              <div className="mt-3 space-y-3">
                <FieldGrid rows={[
                  { label: 'Name', value: testimonial.fullName },
                  { label: 'Country', value: testimonial.country },
                  { label: 'Destination', value: testimonial.selectedDestination },
                  { label: 'Role', value: testimonial.role },
                ]} />
                {hasDisplayValue(testimonial.text) && (
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-800">{testimonial.text}</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={Boolean(selectedPayment)} onClose={() => setSelectedPayment(null)} title="Transaction Details">
        {selectedPayment && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Type</p><p className="mt-1 font-medium text-slate-900">{getPaymentTitle(selectedPayment.type)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-medium text-slate-900">{formatStatus(selectedPayment.status)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Amount</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.currency || 'USD'} {selectedPayment.amount || 0}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Method</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.method || '—'}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.transactionId || '—'}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-medium text-slate-900">{formatDate(selectedPayment.createdAt)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Receipt</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.receiptUrl ? <a className="text-[#d7c08a] underline" href={`${getBackendBaseUrl()}${selectedPayment.receiptUrl}`} target="_blank" rel="noreferrer">Open receipt</a> : '—'}</p></div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(editingPayment)}
        onClose={() => !saving && setEditingPayment(null)}
        title="Edit Payment Status"
      >
        {editingPayment && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment Type</p>
                <p className="mt-1 font-medium text-slate-900">{getPaymentTitle(editingPayment.type)}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p>
                <p className="mt-1 font-medium text-slate-900">{editingPayment.transactionId || '—'}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current Status</p>
                <p className="mt-1 font-medium text-slate-900">{formatStatus(editingPayment.status)}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                <p className="mt-1 font-medium text-slate-900">{editingPayment.currency || 'USD'} {editingPayment.amount || 0}</p>
              </div>
            </div>

            <Select
              label="Payment Status"
              options={paymentStatuses}
              value={paymentStatusDraft[editingPayment._id] || editingPayment.status}
              onChange={(e) => setPaymentStatusDraft((prev) => ({ ...prev, [editingPayment._id]: e.target.value }))}
            />

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingPayment(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => updatePaymentStatus(editingPayment._id)} disabled={saving}>
                {saving ? 'Saving...' : 'Save Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
