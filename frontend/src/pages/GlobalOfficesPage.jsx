import InfoPageLayout from '../components/InfoPageLayout';

export default function GlobalOfficesPage() {
  return (
    <InfoPageLayout title="Global Offices" subtitle="Temporary office directory">
      <p>
        Our operations are currently coordinated through distributed teams. This page is a temporary placeholder for
        regional office details.
      </p>
      <p><b>Europe Desk:</b> Berlin, Germany (Temporary listing)</p>
      <p><b>Global Support Hub:</b> London, United Kingdom (Temporary listing)</p>
      <p><b>Coordination Contact:</b> <a className="font-semibold text-[#3a5f94] underline" href="mailto:support@nextsteptalent.example">support@nextsteptalent.example</a></p>
    </InfoPageLayout>
  );
}
