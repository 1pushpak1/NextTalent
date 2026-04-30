import InfoPageLayout from '../components/InfoPageLayout';

export default function SupportPage() {
  return (
    <InfoPageLayout title="Support" subtitle="Temporary support channels">
      <p>
        Need help with eligibility checks, profile submission, documents, or payment flow? Use the temporary support
        channels below.
      </p>
      <p>
        Email: <a className="font-semibold text-[#3a5f94] underline" href="mailto:support@nextsteptalent.example">support@nextsteptalent.example</a>
      </p>
      <p>
        Phone: <a className="font-semibold text-[#3a5f94] underline" href="tel:+10000000000">+1 (000) 000-0000</a>
      </p>
    </InfoPageLayout>
  );
}
