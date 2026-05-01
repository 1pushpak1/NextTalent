import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState([]);

  const hasJoinLink = (item) => String(item?.status || '').toLowerCase() === 'scheduled' && Boolean(String(item?.meetingLink || '').trim());

  useEffect(() => {
    api.get('/interviews/me').then(({ data }) => setInterviews(data)).catch(() => setInterviews([]));
  }, []);

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />
      <main className="flex-1 pb-16 pt-28 lg:ml-64">
        <div className="mx-auto max-w-5xl px-6">
          <div className="nst-card rounded-xl p-8">
            <h1 className="mb-3 text-3xl font-bold text-[#002147]">Interviews</h1>
            {!interviews.length ? (
              <p className="text-[#44474e]">Your interviews have not been scheduled yet. You will be notified once an interview is arranged.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {interviews.map((item) => (
                  <div key={item._id} className="rounded-xl border border-slate-200 p-5">
                    <p><b>Hiring Partner:</b> {item.hiringPartner}</p>
                    <p><b>Country:</b> {item.country}</p>
                    <p><b>Role:</b> {item.role}</p>
                    <p><b>Date:</b> {item.date}</p>
                    <p><b>Time:</b> {item.time}</p>
                    <p><b>Status:</b> {item.status}</p>
                    {hasJoinLink(item) ? (
                      <a href={item.meetingLink} target="_blank" rel="noreferrer">
                        <Button className="mt-4">Join Interview</Button>
                      </a>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">
                        {String(item?.status || '').toLowerCase() === 'completed'
                          ? 'Interview completed.'
                          : 'Join link will appear once the interview is scheduled.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <div className="relative z-30 lg:ml-64">
        <Footer />
      </div>
    </div>
  );
}
