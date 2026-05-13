import { useEffect, useMemo, useRef, useState } from 'react';
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
    title: 'Candidate Document Authenticity Declaration',
    ref: 'NST-DEC-2026',
    icon: 'description',
    body: `NG Global Advisory and Consulting LLC.
DBA: NextStep Talent

DECLARATION AND UNDERTAKING

I, the undersigned candidate, hereby declare, confirm, and undertake that:

1. All information, documents, records, certifications, educational qualifications, employment details, identification documents, passport information, resumes/CVs, and supporting materials submitted by me to NG Global Advisory and Consulting LLC., DBA NextStep Talent are true, accurate, genuine, complete, and valid to the best of my knowledge.

2. I confirm that:
- No document submitted has been altered, manipulated, forged, misrepresented, or fraudulently created.
- No false information or misleading representation has been intentionally provided by me.

3. I understand and acknowledge that:
- My documents and information may be reviewed internally and/or verified through third-party verification agencies including Sterling or other authorized verification providers.
- Any discrepancy, falsification, omission, or fraudulent representation may result in:
  - Immediate disqualification from the process
  - Cancellation of my application
  - Termination of services without refund where applicable
  - Reporting to partner organizations, employers, verification agencies, or relevant authorities if required

4. I authorize NG Global Advisory and Consulting LLC., DBA NextStep Talent and its authorized partners or verification agencies to verify my submitted information, educational records, employment history, certifications, identity details, and supporting documentation.

5. I acknowledge that submission of documents and participation in the process does not guarantee selection, employment, visa approval, or placement.

6. I confirm that I have read, understood, and agreed to:
- Terms and Conditions
- Privacy Policy
- Payment and Refund Policy

available on the official website of NG Global Advisory and Consulting LLC., DBA NextStep Talent.

By typing my full legal name below, I acknowledge that this electronic signature is legally binding and equivalent to my handwritten signature.

CANDIDATE DETAILS

Full Name: _______________________________

Date of Birth: ____________________________

Passport Number: _________________________

Email Address: ___________________________

Phone Number: ___________________________

Country of Residence: _____________________

SIGNATURE

Candidate Signature: ______________________

Date: _________________________________

IP Address / Digital Consent ID: __________________`,
  },
  contract: {
    title: 'Career Development and Candidate Services Agreement',
    ref: 'NST-CON-2026',
    icon: 'gavel',
    body: `CAREER DEVELOPMENT AND CANDIDATE SERVICES AGREEMENT

This Career Development and Candidate Services Agreement (“Agreement”) is entered into between:

NG Global Advisory and Consulting LLC.
DBA: NextStep Talent
(Hereinafter referred to as the “Company”)

AND

The registered candidate (“Candidate”).

By digitally signing this Agreement and proceeding with payment, the Candidate acknowledges and agrees to the following terms and conditions.

1. NATURE OF SERVICES

The Company operates as a career development, candidate advisory, and professional support organization.

The Company assists candidates through structured professional support services intended to improve career readiness, profile presentation, and opportunity alignment with employers, hiring firms, recruiters, staffing entities, or affiliated partners.

The Company is not the direct employer of the Candidate.

2. SERVICES PROVIDED

The Candidate understands that the Company may provide services including but not limited to:

- Candidate profile assessment
- Career pathway evaluation
- Opportunity alignment analysis
- Resume/CV enhancement and restructuring
- Professional profile optimization
- Interview preparation guidance
- Guidance regarding skill enhancement, certifications, or training recommendations
- Documentation review and onboarding assistance
- Administrative support during application processing
- Coordination with hiring companies, staffing firms, recruiters, or affiliated entities
- Verification coordination through authorized third-party providers including Sterling or equivalent providers

The scope of services may vary depending on market conditions, employer requirements, candidate qualifications, verification outcomes, and operational considerations.

3. ELIGIBILITY AND APPLICATION PROCESS

The Candidate confirms that:
- They have independently reviewed eligibility criteria before applying
- Submission of an application does not guarantee selection or placement
- The Company reserves the right to reject or discontinue any application at its discretion

The onboarding process may include:
1. Initial profile review
2. Internal evaluation
3. Initial payment stage
4. Document submission
5. Verification process
6. Employer/hiring partner review
7. Interview coordination
8. Final onboarding procedures

4. INITIAL NON-REFUNDABLE PAYMENT

Following preliminary review and internal approval, the Candidate may be invited to proceed with an initial payment of:

USD $500 (Non-Refundable)

The Candidate acknowledges and agrees that:
- This payment confirms seriousness and intent to proceed
- This payment covers initial onboarding, profile evaluation, administrative review, operational processing, and related advisory services
- This payment is strictly non-refundable under any circumstances once paid
- Payment may be processed through Stripe
- Applicable transaction or processing fees may be added and shall be borne by the Candidate

5. DOCUMENT SUBMISSION & AUTHENTICITY

The Candidate agrees:
- All submitted information and documents must be accurate, genuine, and valid
- No forged, manipulated, altered, misleading, or fraudulent documents shall be submitted
- Misrepresentation may result in:
  - Immediate disqualification
  - Termination of services
  - Permanent ban from future opportunities
  - Non-refund of applicable fees
  - Reporting to employers, verification agencies, authorities, or affiliated entities where necessary

6. BACKGROUND VERIFICATION

The Candidate acknowledges that:
- Verification is a mandatory stage of the process
- Verification may be conducted through Sterling or other authorized third-party verification agencies
- Educational records, employment history, certifications, identity details, passport information, and other submitted documents may be reviewed and verified

Failure to complete verification requirements may result in disqualification.

7. FIRST PLACEMENT DEPOSIT

After document review and onboarding progression, the Candidate shall pay:

USD $3,000
PLUS
USD $100 Banking / Transfer Fee

Total: USD $3,100

The Candidate understands:
- The USD $100 banking/transfer fee is non-refundable
- This payment covers professional advisory services, onboarding support, operational handling, employer coordination, profile optimization, interview facilitation, and administrative processing

8. REFUND TERMS

A. Candidate Not Selected After Interviews

If the Candidate completes interviews but is not selected by the hiring company:

- USD $200 shall be deducted toward administrative and operational expenses
- Remaining eligible balance may be refunded

Example:

USD $3,100 Paid
Less USD $200 Processing Charges
Refund Eligible: USD $2,900

Administrative and banking charges remain non-refundable.

B. Candidate Selected But Declines to Join

If the Candidate:
- Receives selection confirmation,
- Receives an offer,
- Is approved by the hiring company,
- Or voluntarily withdraws/refuses to join,

then:
- All amounts paid become fully non-refundable.

C. Visa Refusal / Immigration Rejection

For international candidates:

If the Candidate receives official visa or immigration refusal after selection:
- Eligible refundable amounts may be processed after submission and verification of official refusal documentation

Administrative, operational, processing, and banking charges may still apply.

9. FINAL PAYMENT

Upon successful selection by the hiring company, the Candidate agrees to pay the remaining balance of:

USD $3,100

before final onboarding, deployment, or employer integration processes are completed.

Failure to complete payment obligations may result in cancellation of onboarding.

10. NO GUARANTEE OF EMPLOYMENT

The Candidate expressly acknowledges and agrees that:
- The Company does not guarantee employment, interviews, job offers, visa approvals, salary levels, immigration approvals, or placement outcomes
- Final decisions remain solely with hiring companies or employers
- Selection depends on external factors including:
  - Employer requirements
  - Interview performance
  - Verification outcomes
  - Immigration eligibility
  - Market conditions
  - Operational considerations

11. PROFESSIONAL DEVELOPMENT SERVICES

The Candidate acknowledges that part of the Company’s services may include:
- Resume restructuring
- Professional profile enhancement
- Career guidance
- Certification recommendations
- Skill enhancement recommendations
- Career readiness advisory support

Such services are advisory and developmental in nature.

12. PAYMENT METHODS

The Candidate agrees that:
- Initial payments may be processed through Stripe
- Subsequent payments may be made directly to the Company’s designated U.S. business bank account
- Bank details shall only be shared through official communication channels

13. CHARGEBACKS & PAYMENT DISPUTES

Unauthorized payment reversals, disputes, or chargebacks after service initiation may result in:
- Immediate termination of services
- Permanent disqualification
- Legal recovery action where applicable

14. PRIVACY & DATA CONSENT

The Candidate authorizes the Company and its authorized partners to:
- Store and process submitted information
- Share relevant information with verification agencies, hiring companies, staffing entities, and operational partners where necessary for processing purposes

The Candidate acknowledges and agrees to the Company’s Privacy Policy.

15. WEBSITE & INTELLECTUAL PROPERTY

All website content, workflows, systems, branding, graphics, operational structures, and materials remain the intellectual property of NG Global Advisory and Consulting LLC., DBA NextStep Talent.

Unauthorized copying, reproduction, or misuse is prohibited.

16. LIMITATION OF LIABILITY

The Company shall not be liable for:
- Employer decisions
- Hiring delays
- Visa outcomes
- Immigration refusals
- Third-party verification outcomes
- Technical interruptions
- Market conditions
- Actions of external employers or staffing entities

17. TERMINATION

The Company reserves the right to suspend or terminate services for:
- Fraudulent activity
- Misrepresentation
- Non-cooperation
- Policy violations
- Payment disputes
- Inappropriate conduct

18. GOVERNING LAW

This Agreement shall be governed by the laws of the State of Georgia, United States.

19. DIGITAL ACCEPTANCE

By digitally signing below, the Candidate confirms that:
- They have read and understood this Agreement
- They voluntarily agree to all terms
- They understand the payment and refund conditions
- They understand the nature and limitations of the services provided
- Their electronic signature is legally binding

By typing my full legal name below, I acknowledge that this electronic signature is legally binding and equivalent to my handwritten signature.

CANDIDATE DETAILS

Full Name: _______________________________

Date of Birth: ____________________________

Passport Number: _________________________

Email Address: ___________________________

Phone Number: ___________________________

Country of Residence: _____________________

SIGNATURE

Candidate Signature: ______________________

Date: _________________________________

IP Address / Digital Consent ID: __________________`,
  },
};

const formatIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceDocField = (body, label, value) => {
  const pattern = new RegExp(`(${escapeRegex(label)}:\\s*)_+`);
  const nextValue = String(value || 'N/A').trim() || 'N/A';
  return body.replace(pattern, `$1${nextValue}`);
};

const injectCandidateDetails = (body, details) => {
  const replacements = [
    ['Full Name', details.fullName],
    ['Date of Birth', details.dateOfBirth],
    ['Passport Number', details.passportNumber],
    ['Email Address', details.emailAddress],
    ['Phone Number', details.phoneNumber],
    ['Country of Residence', details.countryOfResidence],
    ['Candidate Signature', details.candidateSignature],
    ['Date', details.signatureDate],
    ['IP Address / Digital Consent ID', details.digitalConsentId],
  ];
  return replacements.reduce((text, [label, value]) => replaceDocField(text, label, value), body);
};

export default function DeclarationPage() {
  const [declarationSigned, setDeclarationSigned] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [declarationSignature, setDeclarationSignature] = useState(null);
  const [contractSignature, setContractSignature] = useState(null);
  const [activeDoc, setActiveDoc] = useState('');
  const [previewDoc, setPreviewDoc] = useState('');
  const [viewed, setViewed] = useState({ declaration: false, contract: false });
  const [scrolledToEnd, setScrolledToEnd] = useState({ declaration: false, contract: false });
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const previewBodyRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        setDashboardData(data);
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
      if (!agreeChecked) {
        alert('Please check "I Agree" to continue.');
        return;
      }
      if (!scrolledToEnd.declaration || !scrolledToEnd.contract) {
        alert('Please read both documents fully before signing.');
        return;
      }
      if (!declarationSignature?.value || !contractSignature?.value) {
        alert('Please complete both signatures.');
        return;
      }

      const typedLegalName =
        declarationSignature?.type === 'typed'
          ? declarationSignature?.value
          : contractSignature?.type === 'typed'
            ? contractSignature?.value
            : (candidateDetails?.fullName && candidateDetails.fullName !== 'N/A'
                ? candidateDetails.fullName
                : candidateDetails?.emailAddress?.split('@')?.[0] || '');

      if (!typedLegalName || String(typedLegalName).trim().length < 3) {
        alert('A typed full legal name is required to complete legal consent.');
        return;
      }

      await api.post('/candidate/consents/sign', {
        documents: [
          {
            documentType: 'document_authenticity_declaration',
            documentVersion: DOCUMENTS.declaration.ref,
            candidateTypedName: typedLegalName,
            signature: declarationSignature,
            checkboxAcknowledged: true,
            scrolledToEnd: Boolean(scrolledToEnd.declaration),
          },
          {
            documentType: 'candidate_services_agreement',
            documentVersion: DOCUMENTS.contract.ref,
            candidateTypedName: typedLegalName,
            signature: contractSignature,
            checkboxAcknowledged: true,
            scrolledToEnd: Boolean(scrolledToEnd.contract),
          },
        ],
      });
      navigate('/onboarding');
    } catch (error) {
      alert(error?.response?.data?.message || 'Unable to update status');
    }
  };

  const openPreview = (docKey) => {
    setPreviewDoc(docKey);
  };

  const activeDocReadyForSigning = useMemo(() => {
    if (!previewDoc) return false;
    return Boolean(scrolledToEnd[previewDoc]);
  }, [previewDoc, scrolledToEnd]);

  const candidateDetails = useMemo(() => {
    const candidate = dashboardData?.candidate || {};
    const profile = dashboardData?.profile || {};
    const personalDetails = profile?.personalDetails || {};
    const existingConsent = candidate?.declarationConsent || {};

    const fullName = [
      personalDetails?.firstName,
      personalDetails?.middleName,
      personalDetails?.lastName,
    ].filter(Boolean).join(' ').trim() || candidate?.name || '';

    const declarationSignatureValue = declarationSignature?.value || existingConsent?.declarationSignature?.value || existingConsent?.typedLegalName || '';
    const contractSignatureValue = contractSignature?.value || existingConsent?.contractSignature?.value || existingConsent?.typedLegalName || '';
    const signatureDateValue = declarationSignature?.signedAt || contractSignature?.signedAt || existingConsent?.signedAt || new Date().toISOString();
    const digitalConsentId = existingConsent?.ipAddress || existingConsent?.consentId || 'Captured securely on final consent';

    return {
      fullName: fullName || 'N/A',
      dateOfBirth: formatIsoDate(personalDetails?.dateOfBirth) || 'N/A',
      passportNumber: personalDetails?.passportNumber || 'N/A',
      emailAddress: candidate?.email || dashboardData?.contact?.email || 'N/A',
      phoneNumber: candidate?.phone || dashboardData?.contact?.phone || 'N/A',
      countryOfResidence: personalDetails?.currentCountryOfResidence || dashboardData?.eligibility?.currentLocation || dashboardData?.eligibility?.country || 'N/A',
      declarationSignature: declarationSignatureValue || 'Pending signature',
      contractSignature: contractSignatureValue || 'Pending signature',
      signatureDate: formatIsoDate(signatureDateValue) || 'N/A',
      digitalConsentId,
    };
  }, [contractSignature, dashboardData, declarationSignature]);

  const filledDocumentBodies = useMemo(
    () => ({
      declaration: injectCandidateDetails(DOCUMENTS.declaration.body, {
        ...candidateDetails,
        candidateSignature: candidateDetails.declarationSignature,
      }),
      contract: injectCandidateDetails(DOCUMENTS.contract.body, {
        ...candidateDetails,
        candidateSignature: candidateDetails.contractSignature,
      }),
    }),
    [candidateDetails]
  );

  const handlePreviewScroll = () => {
    const node = previewBodyRef.current;
    if (!node || !previewDoc) return;
    const nearBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 6;
    if (nearBottom) {
      setScrolledToEnd((prev) => ({ ...prev, [previewDoc]: true }));
      setViewed((prev) => ({ ...prev, [previewDoc]: true }));
    }
  };

  const downloadDocumentFile = (docKey) => {
    const doc = DOCUMENTS[docKey];
    if (!doc) return;

    const bodyText = filledDocumentBodies[docKey] || doc.body;
    const payload = `${doc.title}\nDocument Ref: ${doc.ref}\n\n${bodyText}\n`;
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
                  <Button className="text-white" variant="secondary" onClick={() => openPreview('declaration')}>View Declaration</Button>
                  <Button className="text-white" disabled={!scrolledToEnd.declaration} onClick={() => setActiveDoc('declaration')}>Sign Declaration</Button>
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
                  <Button className="text-white" variant="secondary" onClick={() => openPreview('contract')}>View Contract</Button>
                  <Button className="text-white" disabled={!scrolledToEnd.contract} onClick={() => setActiveDoc('contract')}>Sign Contract</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <label className="mx-auto mb-4 flex max-w-2xl items-start justify-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={agreeChecked}
                onChange={(e) => setAgreeChecked(e.target.checked)}
                className="mt-1"
              />
              <span>
                I Agree to proceed with legally binding electronic consent after reading both documents fully.
              </span>
            </label>
            <Button className="text-white" disabled={!(declarationSigned && contractSigned && agreeChecked)} onClick={continueFlow}>
              Continue
            </Button>
          </div>
        </div>
      </main>

      <SignatureModal
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc('')}
        title="Signature"
        enableAcknowledge
        onConfirm={(signaturePayload) => {
          const signatureWithTimestamp = {
            ...signaturePayload,
            signedAt: new Date().toISOString(),
          };
          if (activeDoc === 'declaration') {
            setDeclarationSigned(true);
            setDeclarationSignature(signatureWithTimestamp);
          }
          if (activeDoc === 'contract') {
            setContractSigned(true);
            setContractSignature(signatureWithTimestamp);
          }
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
            <div
              ref={previewBodyRef}
              onScroll={handlePreviewScroll}
              className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 whitespace-pre-line text-white"
            >
              {filledDocumentBodies[previewDoc] || DOCUMENTS[previewDoc].body}
            </div>
            {!activeDocReadyForSigning && (
              <p className="text-xs text-amber-300">Scroll to the end of this document to enable signing.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" className="text-white" variant="secondary" onClick={() => downloadDocumentFile(previewDoc)}>
                Download File
              </Button>
              <Button
                type="button"
                disabled={!activeDocReadyForSigning}
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
