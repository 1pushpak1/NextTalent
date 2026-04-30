import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';

export default function StatusAcceptedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">Profile Accepted for Next Stage</h1>
          <p className="mt-3 text-slate-600">
            Your profile has passed the internal evaluation stage. Please create your candidate account to continue.
          </p>
          <Link to="/signup" className="mt-5 inline-block"><Button>Create Candidate Account</Button></Link>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
