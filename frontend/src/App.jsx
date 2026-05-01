import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EvaluationProgramPage from './pages/EvaluationProgramPage';
import EligibilityCheckPage from './pages/EligibilityCheckPage';
import ProfileSubmissionPage from './pages/ProfileSubmissionPage';
import ProfileSubmittedPage from './pages/ProfileSubmittedPage';
import InternalEvaluationPage from './pages/InternalEvaluationPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPhonePage from './pages/VerifyPhonePage';
import LoginPage from './pages/LoginPage';
import InitialPaymentPage from './pages/InitialPaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import DeclarationPage from './pages/DeclarationPage';
import OnboardingPage from './pages/OnboardingPage';
import DocumentsPage from './pages/DocumentsPage';
import CandidateDashboardPage from './pages/CandidateDashboardPage';
import ProgramFeePaymentPage from './pages/ProgramFeePaymentPage';
import FinalPaymentPage from './pages/FinalPaymentPage';
import InterviewsPage from './pages/InterviewsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import SelectionSelectedPage from './pages/SelectionSelectedPage';
import SelectionNotSelectedPage from './pages/SelectionNotSelectedPage';
import TestimonialPage from './pages/TestimonialPage';
import StatusNotAcceptedPage from './pages/StatusNotAcceptedPage';
import StatusAcceptedPage from './pages/StatusAcceptedPage';
import EmailSentPage from './pages/EmailSentPage';
import AdminPage from './pages/AdminPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminStageCandidatesPage from './pages/admin/AdminStageCandidatesPage';
import AdminPaymentsOverviewPage from './pages/admin/AdminPaymentsOverviewPage';
import AdminPaymentTypePage from './pages/admin/AdminPaymentTypePage';
import AdminCandidateDetailPage from './pages/admin/AdminCandidateDetailPage';
import AdminCandidatePage from './pages/AdminCandidatePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import GlobalOfficesPage from './pages/GlobalOfficesPage';
import SupportPage from './pages/SupportPage';
import ContactPage from './pages/ContactPage';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalAlertHost from './components/GlobalAlertHost';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/evaluation-program" element={<EvaluationProgramPage />} />
        <Route path="/eligibility-check" element={<EligibilityCheckPage />} />
        <Route
          path="/profile-submission"
          element={
            <ProtectedRoute requireEmailVerified requirePhoneVerified>
              <ProfileSubmissionPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile-submitted" element={<ProfileSubmittedPage />} />
        <Route
          path="/internal-evaluation"
          element={
            <ProtectedRoute requireEmailVerified requirePhoneVerified>
              <InternalEvaluationPage />
            </ProtectedRoute>
          }
        />

        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/initial-payment" element={<ProtectedRoute><InitialPaymentPage /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
        <Route path="/declaration" element={<ProtectedRoute><DeclarationPage /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
        <Route path="/candidate-dashboard" element={<ProtectedRoute><CandidateDashboardPage /></ProtectedRoute>} />
        <Route path="/payment/program-fee" element={<ProtectedRoute><ProgramFeePaymentPage /></ProtectedRoute>} />
        <Route path="/payment/final-payment" element={<ProtectedRoute><FinalPaymentPage /></ProtectedRoute>} />
        <Route path="/interviews" element={<ProtectedRoute><InterviewsPage /></ProtectedRoute>} />
        <Route path="/payment-history" element={<ProtectedRoute><PaymentHistoryPage /></ProtectedRoute>} />
        <Route path="/testimonial" element={<ProtectedRoute><TestimonialPage /></ProtectedRoute>} />
        <Route path="/selection/selected" element={<ProtectedRoute><SelectionSelectedPage /></ProtectedRoute>} />
        <Route path="/selection/not-selected" element={<ProtectedRoute><SelectionNotSelectedPage /></ProtectedRoute>} />

        <Route path="/status/not-accepted" element={<StatusNotAcceptedPage />} />
        <Route path="/status/accepted" element={<StatusAcceptedPage />} />
        <Route path="/email-sent" element={<ProtectedRoute><EmailSentPage /></ProtectedRoute>} />

        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/admin/*"
          element={(
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="evaluation" element={<AdminStageCandidatesPage title="Internal Evaluation" stageKey="evaluation" />} />
          <Route path="document-verification" element={<AdminStageCandidatesPage title="Document Verification" stageKey="document-verification" />} />
          <Route path="hiring" element={<AdminStageCandidatesPage title="Hiring Partner Stage" stageKey="hiring" />} />
          <Route path="interviews" element={<AdminStageCandidatesPage title="Interviews" stageKey="interviews" />} />
          <Route path="selection" element={<AdminStageCandidatesPage title="Selection Results" stageKey="selection" />} />
          <Route path="testimonials" element={<AdminStageCandidatesPage title="Testimonials" stageKey="testimonials" />} />
          <Route path="payments" element={<AdminPaymentsOverviewPage />} />
          <Route path="payments/initial" element={<AdminPaymentTypePage title="Initial Payment ($500)" type="initial" />} />
          <Route path="payments/program" element={<AdminPaymentTypePage title="Program Payment ($3500)" type="program" />} />
          <Route path="payments/final" element={<AdminPaymentTypePage title="Final Payment ($4000)" type="final" />} />
          <Route path="candidate/:id" element={<AdminCandidateDetailPage />} />
          <Route path="candidate/:id/edit" element={<AdminCandidatePage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="/global-offices" element={<GlobalOfficesPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalAlertHost />
    </BrowserRouter>
  );
}
