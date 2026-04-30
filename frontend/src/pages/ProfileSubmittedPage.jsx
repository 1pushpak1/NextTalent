import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

export default function ProfileSubmittedPage() {
  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="nst-card rounded-xl p-10 text-center">
            <h1 className="mb-3 text-3xl font-bold text-[#002147]">Submission Successful</h1>
            <p className="mx-auto mb-6 max-w-2xl text-[#44474e]">
              Your profile has been successfully submitted. Our team will review your details as part of the evaluation
              process. If your profile aligns with current requirements, you will be contacted with next steps.
            </p>
            <Link to="/internal-evaluation"><Button>Go to Internal Evaluation</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
