import { Link } from 'react-router-dom';
import { Calendar, Zap, FileText, Activity, Shield, DollarSign, ArrowRight, Star, Users, Stethoscope, Sun, Moon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Book appointments instantly with real-time availability and automated reminders.',
      color: '#7C6EF8',
      bgColor: '#F0EEFF',
    },
    {
      icon: Zap,
      title: 'AVA AI Triage',
      description: 'Get instant symptom assessment and urgency classification powered by AI.',
      color: '#16A34A',
      bgColor: '#DCFCE7',
    },
    {
      icon: FileText,
      title: 'Digital Prescriptions',
      description: 'Secure electronic prescriptions with automatic pharmacy integration.',
      color: '#2563EB',
      bgColor: '#DBEAFE',
    },
    {
      icon: Activity,
      title: 'Medical Records',
      description: 'Access your complete health history anytime, anywhere, securely.',
      color: '#D97706',
      bgColor: '#FEF3C7',
    },
    {
      icon: Shield,
      title: 'Care Timeline',
      description: 'Track your health journey with a unified chronological timeline.',
      color: '#DC2626',
      bgColor: '#FEE2E2',
    },
    {
      icon: DollarSign,
      title: 'Insurance & Billing',
      description: 'Seamless insurance claims and transparent billing management.',
      color: '#0891B2',
      bgColor: '#CFFAFE',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#404040]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-text-primary">HelixaCare</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-surface-subtle border border-slate-200 dark:border-[#404040] flex items-center justify-center text-text-secondary hover:bg-surface-warm transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login">
              <Button variant="primary">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-gradient-to-br from-[#FFF8F2] via-[#F4EEFF] to-[#EEF3FF] dark:from-[#2A2420] dark:via-[#241F30] dark:to-[#1E232D]">
        {/* Floating blobs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-brand-200 dark:bg-brand-500/20 rounded-full blur-[80px] opacity-40 animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-200 dark:bg-blue-500/20 rounded-full blur-[100px] opacity-30 animate-float-delayed" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left: Text */}
          <div>
            <h1 className="text-[64px] font-black text-text-primary tracking-tight leading-[1.1] mb-6">
              Your health,{' '}
              <span className="bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">
                always accessible
              </span>
            </h1>
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              HelixaCare connects patients, doctors, and care teams in one seamless platform.
              Book appointments, get AI-powered triage, and manage your health journey—all in one place.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/register">
                <Button size="lg" variant="primary" className="shadow-lg hover:shadow-xl transition-shadow">
                  I'm a Patient
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="shadow-md hover:shadow-lg transition-shadow">
                  I'm a Doctor
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div>
                <p className="text-3xl font-extrabold text-text-primary">10K+</p>
                <p className="text-sm text-text-muted">Patients</p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div>
                <p className="text-3xl font-extrabold text-text-primary">500+</p>
                <p className="text-sm text-text-muted">Doctors</p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div>
                <p className="text-3xl font-extrabold text-text-primary">4.9★</p>
                <p className="text-sm text-text-muted">Rating</p>
              </div>
            </div>
          </div>

          {/* Right: Illustration placeholder */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform">
              <div className="bg-gradient-to-br from-[#2D2580] to-[#4C1D95] rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Zap size={24} />
                  <span className="font-bold">AVA Triage</span>
                </div>
                <p className="text-sm text-white/80 mb-4">I have chest pain and difficulty breathing since this morning...</p>
                <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-sm font-bold">
                  EMERGENCY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[42px] font-extrabold text-text-primary tracking-tight mb-4">
              Everything you need for modern healthcare
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Comprehensive tools designed to make healthcare accessible, efficient, and patient-centered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all group"
              >
                <div
                  className="w-[46px] h-[46px] rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: feature.bgColor }}
                >
                  <feature.icon size={24} style={{ color: feature.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#1A0F2E] via-[#0F1829] to-[#091620] text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-[42px] font-extrabold tracking-tight mb-6">
              Meet AVA: Your AI Health Assistant
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Get instant symptom assessment and urgency classification. AVA helps you understand when to seek care and what type of care you need.
            </p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-white/90">Emergency — Immediate medical attention required</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-white/90">Urgent — See a doctor within 24 hours</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-white/90">Standard — Schedule an appointment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-white/90">Self-Care — Manage at home</span>
              </div>
            </div>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="!bg-white !text-brand-700 hover:!bg-slate-50 !border-white">
                Try AVA Triage
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="space-y-4">
              <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                <p className="text-sm">I have chest pain and difficulty breathing since this morning...</p>
              </div>
              <div className="bg-white/20 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] ml-auto">
                <p className="text-xs font-semibold mb-2">AVA</p>
                <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-sm font-bold mb-3">
                  URGENT
                </div>
                <p className="text-sm">Based on your symptoms, I recommend seeking immediate medical attention. Please visit the emergency room or call emergency services.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-surface-warm">
        <div className="max-w-[760px] mx-auto">
          <div className="bg-gradient-to-br from-[#2D2580] to-[#4C1D95] rounded-2xl p-12 text-center text-white">
            <h2 className="text-[36px] font-extrabold tracking-tight mb-4">
              Ready to transform your healthcare experience?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join thousands of patients and doctors already using HelixaCare.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="!bg-white !text-brand-700 hover:!bg-slate-50 !border-white">
                  Get Started
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="!text-white !border-white/30 hover:!bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="font-bold text-text-primary">HelixaCare</span>
          </div>
          <p className="text-sm text-text-muted">© 2026 HelixaCare. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
