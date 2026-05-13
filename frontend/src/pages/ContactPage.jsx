import InfoPageLayout from '../components/InfoPageLayout';

export default function ContactPage() {
  return (
    <InfoPageLayout title="Contact" subtitle="Temporary contact details">
      <p>
        For inquiries about programs, partnerships, and candidate operations, use the temporary contact information
        below.
      </p>
      {/* <p>
        General Email: <a className="font-semibold text-[#3a5f94] underline" href="mailto:hello@nextsteptalent.example">hello@nextsteptalent.example</a>
      </p> */}
      <p>
        Support Email: <a className="font-semibold text-[#3a5f94] underline" href="mailto:support@nextsteptalent.net">support@nextsteptalent.net</a>
      </p>
      <p>
        {/* Call: <a className="font-semibold text-[#3a5f94] underline" href="tel:+10000000000">+1 (000) 000-0000</a> */}
      </p>
    </InfoPageLayout>
  );
}
