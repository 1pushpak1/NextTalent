import InfoPageLayout from '../components/InfoPageLayout';

export default function TermsOfServicePage() {
  return (
    <InfoPageLayout title="Terms and Conditions" subtitle="Effective Date: May 12th, 2026" leftAligned>
      <p>
        These Terms and Conditions govern the use of services provided by NG Global Advisory and Consulting LLC., DBA
        NextStep Talent.
      </p>
      <p>By accessing our website or using our services, you agree to comply with these Terms.</p>

      <p className="font-semibold text-[#f7f3ea]">1. ELIGIBILITY</p>
      <p>
        Candidates must review and satisfy the eligibility requirements displayed on the website before proceeding with
        registration or application.
      </p>
      <p>Submission of an application does not guarantee selection, placement, employment, or approval.</p>

      <p className="font-semibold text-[#f7f3ea]">2. ACCOUNT REGISTRATION</p>
      <p>Candidates will be required to:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Create an online account</li>
        <li>Submit forms and documentation</li>
        <li>Upload educational, employment, identity, and supporting records</li>
      </ul>
      <p>Candidates are responsible for maintaining accurate and updated information.</p>

      <p className="font-semibold text-[#f7f3ea]">3. AUTHENTICITY OF DOCUMENTS</p>
      <p>Candidates expressly agree:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Not to submit forged, altered, misleading, or inaccurate documents</li>
        <li>Not to misrepresent qualifications, experience, certifications, or identity</li>
      </ul>
      <p>Any false information may result in:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Immediate rejection</li>
        <li>Termination of services</li>
        <li>Permanent disqualification</li>
        <li>Potential reporting to authorities or partner organizations</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">4. VERIFICATION PROCESS</p>
      <p>Candidates acknowledge and agree that:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Background verification is a mandatory part of the process</li>
        <li>Verification may be conducted through Sterling or another authorized verification provider</li>
        <li>Educational, professional, criminal, identity, and employment records may be verified</li>
      </ul>
      <p>Failure to cooperate with verification requirements may result in disqualification.</p>

      <p className="font-semibold text-[#f7f3ea]">5. PAYMENT OBLIGATIONS</p>
      <p>
        Candidates agree to comply with all applicable payment terms, fee structures, refund policies, and deadlines
        outlined by the Company.
      </p>
      <p>
        Detailed payment and refund terms are published in the Payment & Refund Policy and form part of these Terms.
      </p>
      <p>Failure to complete payments may result in:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Suspension of services</li>
        <li>Cancellation of processing</li>
        <li>Disqualification from opportunities</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">6. NO GUARANTEE OF EMPLOYMENT</p>
      <p>
        The Company acts as a facilitator and bridge between candidates and hiring entities.
      </p>
      <p>The Company does not guarantee:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Employment</li>
        <li>Selection</li>
        <li>Visa approvals</li>
        <li>Immigration outcomes</li>
        <li>Salary levels</li>
        <li>Duration of employment</li>
      </ul>
      <p>Final hiring decisions remain solely with the hiring company.</p>

      <p className="font-semibold text-[#f7f3ea]">7. LIMITATION OF LIABILITY</p>
      <p>The Company shall not be liable for:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Decisions made by hiring companies</li>
        <li>Visa or immigration outcomes</li>
        <li>Third-party delays</li>
        <li>Technical issues</li>
        <li>Candidate ineligibility</li>
        <li>Background verification outcomes</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">8. WEBSITE USE RESTRICTIONS</p>
      <p>Users may not:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Copy website content or business models</li>
        <li>Attempt unauthorized access</li>
        <li>Use automated scraping tools</li>
        <li>Interfere with website functionality</li>
        <li>Reproduce Company intellectual property</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">9. TERMINATION</p>
      <p>The Company reserves the right to terminate or suspend services at its sole discretion for:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Fraudulent activity</li>
        <li>Policy violations</li>
        <li>Non-payment</li>
        <li>Misconduct</li>
        <li>Misrepresentation</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">10. GOVERNING LAW</p>
      <p>These Terms shall be governed by the laws of the State of Georgia, United States.</p>

      <p className="font-semibold text-[#f7f3ea]">11. MODIFICATIONS</p>
      <p>The Company reserves the right to modify these Terms at any time without prior notice.</p>
      <p>Continued use of the website constitutes acceptance of revised Terms.</p>

      <p className="font-semibold text-[#f7f3ea]">12. CONTACT INFORMATION</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>NG Global Advisory and Consulting LLC.</li>
        <li>DBA: NextStep Talent</li>
        <li>Company Address:</li>
        <li>8735 Dunwoody Place Ste N</li>
        <li>Atlanta, GA 30350 United States</li>
        <li>Email Address: contact@NextStepTalent.net</li>
      </ul>
    </InfoPageLayout>
  );
}
