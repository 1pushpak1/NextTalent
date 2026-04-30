import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import SignatureModal from '../components/SignatureModal';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function DeclarationPage() {
  const [declarationSigned, setDeclarationSigned] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [activeDoc, setActiveDoc] = useState('');
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
                  <h3 className="text-xl font-semibold text-[#002147]">Candidate Declaration</h3>
                  <p className="text-xs text-slate-500">Document Ref: NST-DEC-2026</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">description</span>
              </div>
              <div className="bg-slate-50 p-5">
                <p className="text-sm text-[#44474e]">Status: {declarationSigned ? 'Signed' : 'Pending Signature'}</p>
                <Button className="mt-4" onClick={() => setActiveDoc('declaration')}>Sign Declaration</Button>
              </div>
            </div>

            <div className="nst-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#002147]">Candidate Contract</h3>
                  <p className="text-xs text-slate-500">Document Ref: NST-CON-2026</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">gavel</span>
              </div>
              <div className="bg-slate-50 p-5">
                <p className="text-sm text-[#44474e]">Status: {contractSigned ? 'Signed' : 'Pending Signature'}</p>
                <Button className="mt-4" onClick={() => setActiveDoc('contract')}>Sign Contract</Button>
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
      <Footer />
    </div>
  );
}
