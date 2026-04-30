import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-slate-100 bg-white py-12">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="mb-4 text-lg font-bold text-[#002147]">NextStep Talent</div>
          <p className="text-xs leading-relaxed tracking-wide text-slate-500">
            © 2026 NextStep Talent. Selective Excellence in Global Careers.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase text-[#002147]">Legal</h4>
          <div className="space-y-2 text-xs text-slate-500">
            <p><Link className="hover:text-[#002147]" to="/privacy-policy">Privacy Policy</Link></p>
            <p><Link className="hover:text-[#002147]" to="/terms-of-service">Terms of Service</Link></p>
            <p><Link className="hover:text-[#002147]" to="/cookie-policy">Cookie Policy</Link></p>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase text-[#002147]">Company</h4>
          <div className="space-y-2 text-xs text-slate-500">
            <p><Link className="hover:text-[#002147]" to="/global-offices">Global Offices</Link></p>
            <p><Link className="hover:text-[#002147]" to="/support">Support</Link></p>
            <p><Link className="hover:text-[#002147]" to="/contact">Contact</Link></p>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase text-[#002147]">Connect</h4>
          <div className="flex gap-3 text-slate-400">
            <a className="transition hover:text-[#002147]" href="https://example.com" target="_blank" rel="noreferrer" aria-label="Website">
              <span className="material-symbols-outlined">public</span>
            </a>
            <a className="transition hover:text-[#002147]" href="tel:+10000000000" aria-label="Call">
              <span className="material-symbols-outlined">alternate_email</span>
            </a>
            <a className="transition hover:text-[#002147]" href="mailto:support@nextsteptalent.example" aria-label="Email">
              <span className="material-symbols-outlined">mail</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
