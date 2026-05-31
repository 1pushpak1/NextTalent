import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ProfileSubmittedPage() {
  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="nst-card rounded-xl p-10 text-center text-[#f5f2ea]">
            <h1 className="mb-4 text-3xl font-bold text-white">Application Submitted Successfully</h1>
            <div className="mx-auto max-w-2xl space-y-5 text-sm leading-7 text-slate-300">
              <p>Thank you for submitting your profile to NextStep Talent.</p>
              <p>Your application has been received and is now under initial review by our internal assessment team.</p>
              <div className="rounded-2xl border border-[#d4af37]/18 bg-black/20 p-5 text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4af37]">What happens next</p>
                <ul className="mt-4 space-y-3 text-slate-300">
                  <li className="flex gap-3"><span className="mt-2 h-2 w-2 flex-none rounded-full bg-[#d4af37]" />Your profile will be reviewed for eligibility and role alignment</li>
                  <li className="flex gap-3"><span className="mt-2 h-2 w-2 flex-none rounded-full bg-[#d4af37]" />If shortlisted, you will be invited to create your candidate login</li>
                  <li className="flex gap-3"><span className="mt-2 h-2 w-2 flex-none rounded-full bg-[#d4af37]" />Further instructions will be shared via email</li>
                </ul>
              </div>
              <p>You do not need to take any further action at this stage.</p>
              <p>If additional information is required, our team will contact you.</p>
              <p className="text-base font-medium text-white">You may now close this page.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
