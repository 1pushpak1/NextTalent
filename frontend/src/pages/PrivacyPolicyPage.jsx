import InfoPageLayout from '../components/InfoPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <InfoPageLayout title="Privacy Policy" subtitle="Last updated: April 30, 2026">
      <p>
        This is a temporary policy page. NextStep Talent collects only the data required to evaluate candidate
        eligibility, process profile submissions, and manage pathway stages.
      </p>
      <p>
        We use submitted information for review operations, compliance checks, and process communication. We do not sell
        personal data.
      </p>
      <p>
        For data requests, email <a className="font-semibold text-[#3a5f94] underline" href="mailto:support@nextsteptalent.example">support@nextsteptalent.example</a>.
      </p>
    </InfoPageLayout>
  );
}
