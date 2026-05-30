import InfoPageLayout from '../components/InfoPageLayout';
import Accordion from '../components/Accordion';

export default function TermsOfServicePage() {
  const sections = [
    {
      title: '1. ELIGIBILITY',
      content: (
        <>
          <p>
            Candidates must review and satisfy the eligibility requirements displayed on the website before proceeding with
            registration or application.
          </p>
          <p>Submission of an application does not guarantee selection, placement, employment, or approval.</p>
        </>
      ),
    },
    {
      title: '2. ACCOUNT REGISTRATION',
      content: (
        <>
          <p>Candidates will be required to:</p>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>Create an online account</li>
            <li>Submit forms and documentation</li>
            <li>Upload educational, employment, identity, and supporting records</li>
          </ul>
          <p>Candidates are responsible for maintaining accurate and updated information.</p>
        </>
      ),
    },
    {
      title: '3. AUTHENTICITY OF DOCUMENTS',
      content: (
        <>
          <p>Candidates expressly agree:</p>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>Not to submit forged, altered, misleading, or inaccurate documents</li>
            <li>Not to misrepresent qualifications, experience, certifications, or identity</li>
          </ul>
          <p>Any false information may result in immediate rejection, termination of services, permanent disqualification, or potential reporting to authorities.</p>
        </>
      ),
    },
    {
      title: '4. VERIFICATION PROCESS',
      content: (
        <>
          <p>Candidates acknowledge and agree that background verification is a mandatory part of the process and may be conducted through Sterling or another authorized provider.</p>
          <p>Failure to cooperate with verification requirements may result in disqualification.</p>
        </>
      ),
    },
    {
      title: '5. PAYMENT OBLIGATIONS',
      content: (
        <>
          <p>
            Candidates agree to comply with all applicable payment terms, fee structures, refund policies, and deadlines
            outlined by the Company.
          </p>
          <p>Detailed payment and refund terms are published in the Payment & Refund Policy and form part of these Terms.</p>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>Failure to complete payments may result in suspension of services.</li>
            <li>Cancellation of processing.</li>
            <li>Disqualification from opportunities.</li>
          </ul>
        </>
      ),
    },
    {
      title: '6. NO GUARANTEE OF EMPLOYMENT',
      content: (
        <>
          <p>
            The Company acts as a facilitator and bridge between candidates and hiring entities. The Company does not guarantee employment, selection, visa approvals, immigration outcomes, salary levels, or duration of employment.
          </p>
          <p>Final hiring decisions remain solely with the hiring company.</p>
        </>
      ),
    },
    {
      title: '7. LIMITATION OF LIABILITY',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Decisions made by hiring companies</li>
          <li>Visa or immigration outcomes</li>
          <li>Third-party delays</li>
          <li>Technical issues</li>
          <li>Candidate ineligibility</li>
          <li>Background verification outcomes</li>
        </ul>
      ),
    },
    {
      title: '8. WEBSITE USE RESTRICTIONS',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Copy website content or business models</li>
          <li>Attempt unauthorized access</li>
          <li>Use automated scraping tools</li>
          <li>Interfere with website functionality</li>
          <li>Reproduce Company intellectual property</li>
        </ul>
      ),
    },
    {
      title: '9. TERMINATION',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Fraudulent activity</li>
          <li>Policy violations</li>
          <li>Non-payment</li>
          <li>Misconduct</li>
          <li>Misrepresentation</li>
        </ul>
      ),
    },
    {
      title: '10. GOVERNING LAW',
      content: <p>These Terms shall be governed by the laws of the State of Georgia, United States.</p>,
    },
    {
      title: '11. MODIFICATIONS',
      content: (
        <>
          <p>The Company reserves the right to modify these Terms at any time without prior notice.</p>
          <p>Continued use of the website constitutes acceptance of revised Terms.</p>
        </>
      ),
    },
    {
      title: '12. CONTACT INFORMATION',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>NG Global Advisory and Consulting LLC.</li>
          <li>DBA: NextStep Talent</li>
          <li>Company Address: 8735 Dunwoody Place Ste N, Atlanta, GA 30350 United States</li>
          <li>Email Address: contact@NextStepTalent.net</li>
        </ul>
      ),
    },
  ];

  return (
    <InfoPageLayout title="Terms and Conditions" subtitle="Effective Date: May 12th, 2026" leftAligned>
      <p>
        These Terms and Conditions govern the use of services provided by NG Global Advisory and Consulting LLC., DBA
        NextStep Talent.
      </p>
      <p>By accessing our website or using our services, you agree to comply with these Terms.</p>

      <div className="mt-6 space-y-3">
        {sections.map((s) => (
          <Accordion key={s.title} title={s.title}>
            {s.content}
          </Accordion>
        ))}
      </div>
    </InfoPageLayout>
  );
}
