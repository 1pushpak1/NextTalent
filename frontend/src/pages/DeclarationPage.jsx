import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import SignatureModal from '../components/SignatureModal';
import Modal from '../components/Modal';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

const DOCUMENTS = {
  declaration: {
    title: 'Candidate Declaration',
    ref: 'NST-DEC-2026',
    icon: 'description',
    body: `I hereby declare that all personal, educational, and professional information provided by me to NextStep Talent is true, accurate, and complete to the best of my knowledge.

I understand that this declaration is required for internal evaluation, partner matching, and process compliance.

I acknowledge that any false, misleading, or incomplete information may result in disqualification from the pathway process.

By signing this declaration, I accept full responsibility for the authenticity of submitted details and supporting documents.`,
  },
  contract: {
    title: 'Candidate Contract',
    ref: 'NST-CON-2026',
    icon: 'gavel',
    body: `This Candidate Contract outlines the service scope, candidate obligations, payment structure, and process milestones under the NextStep Talent pathway.

The candidate agrees to provide required documents on time, comply with interview schedules, and maintain truthful communication throughout the process.

NextStep Talent will provide structured support for evaluation, onboarding coordination, and partner process management as per program terms.

By signing this contract, the candidate confirms understanding and acceptance of all applicable terms and conditions.`,
  },
};

export default function DeclarationPage() {
  const [declarationSigned, setDeclarationSigned] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [activeDoc, setActiveDoc] = useState('');
  const [previewDoc, setPreviewDoc] = useState('');
  const [viewed, setViewed] = useState({ declaration: false, contract: false });
  const navigate = useNavigate();

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        const required = getCandidateNextRoute(data);
        if (required !== '/declaration') {
          navigate(required, { replace: true });
        }
      } catch {
        navigate('/candidate-dashboard', { replace: true });
      }
    };
    guard();
  }, [navigate]);

  const continueFlow = async () => {
    try {
      await api.put('/dashboard/me/status', { status: 'declaration_signed' });
      navigate('/onboarding');
    } catch {
      alert('Unable to update status');
    }
  };

  const openPreview = (docKey) => {
    setPreviewDoc(docKey);
    setViewed((prev) => ({ ...prev, [docKey]: true }));
  };

  const downloadDocumentFile = (docKey) => {
    const doc = DOCUMENTS[docKey];
    if (!doc) return;

    const payload = `${doc.title}\nDocument Ref: ${doc.ref}\n\n${doc.body}\n`;
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.ref}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const documentStatus = (docKey, signed) => {
    if (signed) return 'Signed';
    return viewed[docKey] ? 'Viewed - Pending Signature' : 'Pending View';
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-semibold text-green-700">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Payment Received
            </div>
            <h1 className="mb-2 text-4xl font-bold text-[#002147]">Declaration & Candidate Agreement</h1>
            <p className="mx-auto max-w-2xl text-[#44474e]">
              Please review and sign both documents to finalize your enrollment for the next pathway stage.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="nst-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#002147]">{DOCUMENTS.declaration.title}</h3>
                  <p className="text-xs text-slate-500">Document Ref: {DOCUMENTS.declaration.ref}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">{DOCUMENTS.declaration.icon}</span>
              </div>
              <div className="bg-slate-50 p-5">
                <p className="text-sm text-[#44474e]">Status: {documentStatus('declaration', declarationSigned)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openPreview('declaration')}>View Declaration</Button>
                  <Button disabled={!viewed.declaration} onClick={() => setActiveDoc('declaration')}>Sign Declaration</Button>
                </div>
              </div>
            </div>

            <div className="nst-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#002147]">{DOCUMENTS.contract.title}</h3>
                  <p className="text-xs text-slate-500">Document Ref: {DOCUMENTS.contract.ref}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">{DOCUMENTS.contract.icon}</span>
              </div>
              <div className="bg-slate-50 p-5">
                <p className="text-sm text-[#44474e]">Status: {documentStatus('contract', contractSigned)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openPreview('contract')}>View Contract</Button>
                  <Button disabled={!viewed.contract} onClick={() => setActiveDoc('contract')}>Sign Contract</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button disabled={!(declarationSigned && contractSigned)} onClick={continueFlow}>
              Continue to Team Contact / Onboarding
            </Button>
          </div>
        </div>
      </main>

      <SignatureModal
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc('')}
        title="DocuSign-style Signature"
        onConfirm={() => {
          if (activeDoc === 'declaration') setDeclarationSigned(true);
          if (activeDoc === 'contract') setContractSigned(true);
          setActiveDoc('');
        }}
      />
      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc('')}
        title={previewDoc ? DOCUMENTS[previewDoc].title : 'Document Preview'}
      >
        {previewDoc && (
          <div className="space-y-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Document Ref: {DOCUMENTS[previewDoc].ref}
            </p>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 whitespace-pre-line text-[#334155]">
              {DOCUMENTS[previewDoc].body}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => downloadDocumentFile(previewDoc)}>
                Download File
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPreviewDoc('');
                  setActiveDoc(previewDoc);
                }}
              >
                Sign
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Footer />
    </div>
  );
}
