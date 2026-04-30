import InfoPageLayout from '../components/InfoPageLayout';

export default function CookiePolicyPage() {
  return (
    <InfoPageLayout title="Cookie Policy" subtitle="Last updated: April 30, 2026">
      <p>
        This is a temporary cookie policy page. The platform may use essential cookies to keep sessions secure and to
        support authenticated navigation.
      </p>
      <p>
        Analytics and preference cookies may be introduced later with explicit controls and user notice.
      </p>
      <p>
        For cookie-related concerns, contact <a className="font-semibold text-[#3a5f94] underline" href="mailto:support@nextsteptalent.example">support@nextsteptalent.example</a>.
      </p>
    </InfoPageLayout>
  );
}
