import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';

export default function StatusNotAcceptedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">Profile Not Accepted</h1>
          <p className="mt-3 text-slate-600">
            After internal evaluation, your profile is not aligned with the current requirements. You may reapply when
            requirements are met or explore other destinations as they become available.
          </p>
          <Link to="/" className="mt-5 inline-block"><Button>Return Home</Button></Link>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
