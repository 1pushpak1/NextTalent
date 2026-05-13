import InfoPageLayout from '../components/InfoPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <InfoPageLayout title="Privacy Policy" subtitle="Effective Date: May 12th, 2026" leftAligned>
      <p>
        This Privacy Policy describes how NG Global Advisory and Consulting LLC., operating under the DBA NextStep
        Talent (“Company,” “we,” “our,” or “us”), collects, uses, stores, and protects personal information submitted
        through our website and services.
      </p>
      <p>By using our website, you agree to the terms of this Privacy Policy.</p>

      <p className="font-semibold text-[#f7f3ea]">1. INFORMATION WE COLLECT</p>
      <p>We may collect the following information from candidates and users:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Full name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Residential address</li>
        <li>Passport details</li>
        <li>Educational qualifications</li>
        <li>Employment history</li>
        <li>Certifications and supporting documents</li>
        <li>Resume/CV</li>
        <li>Login credentials</li>
        <li>Payment-related information</li>
        <li>IP address and browser/device information</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">2. HOW WE USE YOUR INFORMATION</p>
      <p>Your information may be used for:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Candidate eligibility review</li>
        <li>Recruitment and placement processes</li>
        <li>Verification and background screening</li>
        <li>Communication regarding opportunities</li>
        <li>Payment processing</li>
        <li>Compliance and fraud prevention</li>
        <li>Internal operational purposes</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">3. THIRD-PARTY SERVICES</p>
      <p>
        We may use trusted third-party service providers, including but not limited to:
      </p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>Stripe (payment processing)</li>
        <li>Sterling (background verification)</li>
        <li>Hosting and technical infrastructure providers</li>
      </ul>
      <p>
        These third parties may process information only as necessary to provide services connected to our operations.
      </p>

      <p className="font-semibold text-[#f7f3ea]">4. BACKGROUND VERIFICATION</p>
      <p>
        Candidates may be required to undergo mandatory background verification through Sterling or another approved
        verification provider.
      </p>
      <p>
        By proceeding with our services, candidates consent to the sharing of necessary documents and information for
        verification purposes.
      </p>

      <p className="font-semibold text-[#f7f3ea]">5. DATA SECURITY</p>
      <p>
        We implement commercially reasonable administrative, technical, and organizational safeguards to protect user
        data.
      </p>
      <p>
        However, no online system can guarantee absolute security, and users acknowledge this risk when submitting
        information online.
      </p>

      <p className="font-semibold text-[#f7f3ea]">6. CONFIDENTIALITY OF BUSINESS MATERIALS</p>
      <p>
        All website content, operational structures, workflows, designs, graphics, text, processes, databases, and
        business models are proprietary to NG Global Advisory and Consulting LLC . DBA NextStep Talent.
      </p>
      <p>Unauthorized copying, reproduction, distribution, or commercial use is strictly prohibited.</p>

      <p className="font-semibold text-[#f7f3ea]">7. USER RESPONSIBILITIES</p>
      <p>Users agree:</p>
      <ul className="list-disc space-y-2 pl-5 text-left">
        <li>To provide accurate and truthful information</li>
        <li>Not to upload fraudulent, misleading, or forged documents</li>
        <li>Not to misuse the website or attempt unauthorized access</li>
      </ul>

      <p className="font-semibold text-[#f7f3ea]">8. DATA RETENTION</p>
      <p>
        We may retain submitted information for operational, legal, compliance, and verification purposes for a
        reasonable duration, even if a candidate does not proceed further.
      </p>

      <p className="font-semibold text-[#f7f3ea]">9. LIMITATION OF LIABILITY</p>
      <p>
        The Company shall not be liable for delays, interruptions, technical failures, third-party platform outages, or
        events beyond reasonable control.
      </p>

      <p className="font-semibold text-[#f7f3ea]">10. CHANGES TO THIS POLICY</p>
      <p>
        We reserve the right to modify this Privacy Policy at any time without prior notice. Updated versions will be
        posted on the website.
      </p>

      <p className="font-semibold text-[#f7f3ea]">11. CONTACT INFORMATION</p>
      <p>
        NG Global Advisory and Consulting LLC.
        <br />
        DBA: NextStep Talent
        <br />
        Company Address:
        <br />
        8735 Dunwoody Place Ste N
        <br />
        Atlanta, GA 30350 United States
        <br />
        Email Address:{' '}
        <a className="font-semibold text-[#3a5f94] underline" href="mailto:contact@NextStepTalent.net">
          contact@NextStepTalent.net
        </a>
      </p>
    </InfoPageLayout>
  );
}
