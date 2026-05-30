import InfoPageLayout from '../components/InfoPageLayout';
import Accordion from '../components/Accordion';

export default function PaymentRefundPolicyPage() {
  const sections = [
    {
      title: '1. INITIAL SCREENING PAYMENT',
      content: (
        <>
          <p>After internal eligibility review and approval, candidates may be invited to proceed with an initial payment of:</p>
          <p className="font-semibold">USD $500 (Non-Refundable)</p>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>This payment confirms the candidate’s intent and seriousness toward the process.</li>
            <li>This payment is processed through Stripe.</li>
            <li>Applicable Stripe transaction/processing fees shall be borne by the candidate and added where applicable.</li>
            <li>This amount is strictly non-refundable under any circumstances once paid.</li>
          </ul>
        </>
      ),
    },
    {
      title: '2. FIRST PLACEMENT DEPOSIT',
      content: (
        <>
          <p>After document review and onboarding progression, candidates are required to pay:</p>
          <p className="font-semibold">USD $3,000 + USD $100 Banking/Transfer Fee</p>
          <p className="font-semibold">Total: USD $3,100</p>
          <p>The USD $100 banking fee is non-refundable and covers transaction and banking charges.</p>
        </>
      ),
    },
    {
      title: '3. REFUND CONDITIONS',
      content: (
        <>
          <p className="font-semibold">A. Candidate NOT Selected After Interviews</p>
          <p>If the candidate completes the interview process but is not selected by the hiring company:</p>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>USD $200 shall be deducted as administrative/processing charges.</li>
            <li>Remaining balance shall be refunded.</li>
          </ul>
          <p>Example:</p>
          <p>USD $3,100 paid</p>
          <p>Less USD $200 processing deduction</p>
          <p>Refund Amount: USD $2,900</p>
          <p>Administrative and banking components remain non-refundable.</p>
          <p className="font-semibold mt-3">B. Candidate Selected But Declines to Join</p>
          <p>If the candidate receives selection/offer confirmation and voluntarily refuses, declines, withdraws, or fails to join the company, the entire amount becomes non-refundable.</p>
          <p className="font-semibold mt-3">C. Visa Refusal / Immigration Rejection</p>
          <p>If the candidate is selected but the visa or immigration process is officially denied or rejected, the refundable portion may be returned after verification of official refusal documentation. Administrative and banking charges still apply.</p>
        </>
      ),
    },
    {
      title: '4. FINAL PAYMENT',
      content: (
        <>
          <p>Upon successful selection by the hiring company, candidates shall pay the remaining balance of:</p>
          <p className="font-semibold">USD $3,100</p>
          <p>before final onboarding and deployment processes are completed.</p>
        </>
      ),
    },
    {
      title: '5. PAYMENT METHODS',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Initial payments shall be processed through Stripe.</li>
          <li>Remaining payments shall be transferred directly to the Company’s designated U.S. business bank account.</li>
          <li>Bank details shall only be shared through official communication channels.</li>
        </ul>
      ),
    },
    {
      title: '6. REFUND TIMELINES',
      content: <p>Approved refunds may take 14–30 business days depending on banking systems, international transfers, compliance reviews, and payment processing timelines.</p>,
    },
    {
      title: '7. CHARGEBACKS & DISPUTES',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Unauthorized chargebacks or payment disputes after service initiation may result in immediate suspension of services.</li>
          <li>Permanent disqualification.</li>
          <li>Legal recovery actions where applicable.</li>
        </ul>
      ),
    },
    {
      title: '8. COMPANY RIGHTS',
      content: (
        <ul className="list-disc space-y-2 pl-5 text-left">
          <li>Reject candidates at any stage.</li>
          <li>Suspend or terminate applications involving fraudulent information.</li>
          <li>Modify pricing or policies without prior notice.</li>
        </ul>
      ),
    },
  ];

  return (
    <InfoPageLayout title="Payment and Refund Policy" subtitle="Effective Date: May 12th, 2026" leftAligned>
      <p>
        This Payment and Refund Policy applies to all candidates engaging with services provided by NG Global Advisory and
        Consulting LLC., DBA NextStep Talent.
      </p>
      <p>By proceeding with our services and making payments, you acknowledge and agree to the following terms.</p>

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
