import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';

export default function EmailSentPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">Email Sent</h1>
          <p className="mt-3 text-slate-600">Please check your inbox for next steps from NextStep Talent.</p>
          <Link to="/candidate-dashboard" className="mt-5 inline-block"><Button>Return to Dashboard</Button></Link>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
