import { useCallback, useEffect, useRef, useState } from 'react';
import AdminCandidateTable from '../../components/admin/AdminCandidateTable';
import api from '../../api/axios';
import Button from '../../components/Button';

export default function AdminStageCandidatesPage({ title, stageKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('current');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [candidateDocs, setCandidateDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState({});
  const [bulkComment, setBulkComment] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const { data } = await api.get(`/admin/candidates/stage/${stageKey}`, {
        params: { filter: viewFilter },
      });
      if (!mountedRef.current) return;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      if (!mountedRef.current) return;
      setRows([]);
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, [stageKey, viewFilter]);

  useEffect(() => {
    mountedRef.current = true;
    let intervalId = null;
    const initialLoadId = window.setTimeout(() => {
      load();
    }, 0);
    intervalId = window.setInterval(() => {
      load({ silent: true });
    }, 15000);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoadId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [load]);

  useEffect(() => {
    if (stageKey !== 'document-verification') return;
    if (!selectedCandidateId) {
      setCandidateDocs([]);
      setSelectedDocIds({});
      return;
    }
    const loadCandidateDocs = async () => {
      try {
        const { data } = await api.get(`/admin/candidates/${selectedCandidateId}/profile`);
        const docs = Array.isArray(data?.documents) ? data.documents : [];
        setCandidateDocs(docs);
      } catch {
        setCandidateDocs([]);
      } finally {
        setSelectedDocIds({});
      }
    };
    loadCandidateDocs();
  }, [selectedCandidateId, stageKey]);

  const selectedDocs = candidateDocs.filter((doc) => Boolean(selectedDocIds[doc._id]));
  const allSelectedCandidateDocsApproved = candidateDocs.length > 0 && candidateDocs.every((doc) => String(doc?.status || '') === 'Accepted');

  const applyBulkDocumentAction = async (status) => {
    if (!selectedCandidateId) {
      alert('Select a candidate first.');
      return;
    }
    if (!selectedDocs.length) {
      alert('Select at least one document.');
      return;
    }
    if (status === 'Needs Revision' && !bulkComment.trim()) {
      alert('Add a comment before requesting reupload.');
      return;
    }
    setBulkSaving(true);
    try {
      for (const doc of selectedDocs) {
        await api.put(`/admin/candidates/${selectedCandidateId}/documents/${doc._id}/status`, {
          status,
          reasonNote:
            status === 'Accepted'
              ? 'Bulk approval of selected documents by admin.'
              : `Bulk reupload requested. ${bulkComment.trim()}`,
          adminComment: status === 'Needs Revision' ? bulkComment.trim() : '',
          reviewConfirmed: true,
          evidenceViewed: true,
          sourcePage: '/admin/document-verification',
        });
      }
      const { data } = await api.get(`/admin/candidates/${selectedCandidateId}/profile`);
      setCandidateDocs(Array.isArray(data?.documents) ? data.documents : []);
      setSelectedDocIds({});
      setBulkComment('');
      await load({ silent: true });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to apply bulk document action');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">Use this queue to find candidates who need attention, then open the review workspace to inspect submitted evidence before deciding.</p>
        </div>
        <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewFilter === 'current' ? 'bg-[#c8a96b] text-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setViewFilter('current')}
          >
            Current Queue
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewFilter === 'passed' ? 'bg-[#c8a96b] text-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setViewFilter('passed')}
          >
            Passed Candidates
          </button>
        </div>
      </div>

      {stageKey === 'document-verification' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Document Checklist Bulk Review</h2>
          <p className="mt-1 text-sm text-slate-600">Select candidate, tick documents, then bulk approve or request reupload with comment.</p>
          <div className="mt-3">
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
              value={selectedCandidateId}
              onChange={(event) => setSelectedCandidateId(event.target.value)}
            >
              <option value="">Select candidate</option>
              {rows.map((row) => (
                <option key={row.candidateId || row._id} value={row.candidateId || row._id}>
                  {row.name || 'Candidate'} • {row.email || '—'}
                </option>
              ))}
            </select>
          </div>

          {selectedCandidateId && (
            <div className="mt-4 space-y-3">
              {!candidateDocs.length ? (
                <p className="text-sm text-slate-500">No uploaded documents found for selected candidate.</p>
              ) : (
                candidateDocs.map((doc) => (
                  <label key={doc._id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <span>
                      <p className="text-sm font-semibold text-slate-900">{doc.documentType}</p>
                      <p className="text-xs text-slate-500">{doc.status}</p>
                      {doc.adminComment ? <p className="mt-1 text-xs text-rose-700">Admin comment: {doc.adminComment}</p> : null}
                    </span>
                    {!allSelectedCandidateDocsApproved ? (
                      <input
                        type="checkbox"
                        checked={Boolean(selectedDocIds[doc._id])}
                        onChange={(event) => setSelectedDocIds((prev) => ({ ...prev, [doc._id]: event.target.checked }))}
                      />
                    ) : null}
                  </label>
                ))
              )}

              {!allSelectedCandidateDocsApproved ? (
                <>
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                    placeholder="Comment for candidate (required for reupload request)."
                    value={bulkComment}
                    onChange={(event) => setBulkComment(event.target.value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button variant="adminPrimary" onClick={() => applyBulkDocumentAction('Accepted')} disabled={bulkSaving}>
                      {bulkSaving ? 'Saving...' : `Bulk Approve Selected (${selectedDocs.length})`}
                    </Button>
                    <Button variant="danger" onClick={() => applyBulkDocumentAction('Needs Revision')} disabled={bulkSaving}>
                      {bulkSaving ? 'Saving...' : 'Request Reupload For Selected'}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </section>
      )}
      <AdminCandidateTable rows={rows} loading={loading} stageKey={stageKey} onUpdated={() => load({ silent: true })} />
    </section>
  );
}
