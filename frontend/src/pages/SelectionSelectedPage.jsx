import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';

export default function SelectionSelectedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">Congratulations, You Have Been Selected</h1>
          <p className="mt-3 text-slate-600">
            Your result has been announced as selected. Please complete the final payment step to continue.
          </p>
          <Link to="/payment/final-payment" className="mt-5 inline-block"><Button>Pay Final Payment USD 3,100</Button></Link>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
