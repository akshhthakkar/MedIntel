import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  Activity,
  ShieldCheck,
  FileSearch,
  TrendingUp,
  Bell,
  CheckCircle,
  ChevronRight,
  Brain,
  BarChart3,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

const navy = '#152E57';
const navyDark = '#0f1f3d';
const teal = '#0d9488';
const tealLight = '#14b8a6';

// ── Logo mark inline SVG-like component
function BrandMark({ size = 36 }) {
  return (
    <img
      src="/medintel-logo.jpg"
      alt="MedIntel"
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover' }}
    />
  );
}

// ── Stat number with subtle animation
function StatItem({ value, label, sub }) {
  return (
    <div className="text-center px-6 py-4">
      <div className="text-4xl font-black mb-1" style={{ color: teal }}>{value}</div>
      <div className="text-sm font-bold text-white">{label}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Feature card
function FeatureCard({ icon: Icon, title, description, accent }) {
  return (
    <div
      className="group rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-default"
      style={{
        background: '#fff',
        borderColor: '#e5e7eb',
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-extrabold mb-2" style={{ color: navy }}>{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderColor: '#f0f0f0' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <BrandMark size={36} />
              <span className="text-xl font-extrabold tracking-tight" style={{ color: navy }}>
                Med<span style={{ color: teal }}>Intel</span>
              </span>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">How it Works</a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: navy }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-bold px-5 py-2.5 rounded-xl text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative pt-32 pb-24 overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${navyDark} 0%, ${navy} 50%, #1e4a8c 100%)`,
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #0d9488 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-8"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: teal }} />
            AI-Powered Medical Intelligence Platform
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6 animate-fade-in">
            Understand Your Health,<br />
            <span style={{ color: teal }}>Finally.</span>
          </h1>

          <p
            className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in px-4 sm:px-0"
            style={{ color: 'rgba(255,255,255,0.65)', animationDelay: '100ms' }}
          >
            MedIntel turns complex lab reports, medication schedules, and health records into
            clear, actionable intelligence — so you can walk into every doctor's appointment
            fully prepared.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in px-4 sm:px-0" style={{ animationDelay: '200ms' }}>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base font-bold text-white shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto justify-center"
              style={{ background: `linear-gradient(135deg, ${teal}, ${tealLight})` }}
            >
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base font-semibold border transition-all hover:bg-white/10 w-full sm:w-auto justify-center"
              style={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              Sign in to your account
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {['No credit card required', 'HIPAA-aware design', 'Secure & private', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: teal }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section style={{ background: navy }}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            <StatItem value="50K+" label="Reports Analyzed" sub="This year" />
            <StatItem value="98%" label="Accuracy Rate" sub="Lab interpretation" />
            <StatItem value="150+" label="Lab Parameters Tracked" sub="Per report on average" />
            <StatItem value="2 min" label="Avg. Summary Time" sub="From upload to insight" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: teal }}>Platform Features</span>
            <h2 className="text-4xl font-black mt-2 mb-4" style={{ color: navy }}>
              Everything you need to own your health
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From AI-powered report analysis to trend tracking and doctor visit preparation — MedIntel has you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Brain}
              title="AI Report Interpretation"
              description="Upload any lab report and get an instant, plain-language breakdown of every test — what it means, whether it's normal, and what to discuss with your doctor."
              accent="#3b82f6"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Health Trend Analytics"
              description="Watch how your biomarkers evolve over time with beautiful interactive charts. Catch concerning trends early and celebrate your improvements."
              accent={teal}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Medication Safety"
              description="Track all your prescriptions, get dosage reminders, and automatically screen for dangerous drug interactions before they happen."
              accent="#8b5cf6"
            />
            <FeatureCard
              icon={Stethoscope}
              title="Doctor Visit Summaries"
              description="Generate a professional clinical handover note before every appointment — consolidating your latest labs, symptoms, and medications into what your doctor needs."
              accent="#f59e0b"
            />
            <FeatureCard
              icon={Activity}
              title="Symptom Tracking"
              description="Log daily symptoms, vital signs, pain levels, and mood. Build a comprehensive picture of your day-to-day health over time."
              accent="#ef4444"
            />
            <FeatureCard
              icon={BarChart3}
              title="Unified Health Timeline"
              description="See your complete health story in one chronological view — every report, every medication course, every symptom log, in one beautiful dashboard."
              accent="#10b981"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: teal }}>Simple Process</span>
            <h2 className="text-4xl font-black mt-2" style={{ color: navy }}>
              From upload to insight in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div
              className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5"
              style={{ background: `linear-gradient(to right, ${teal}, ${teal})`, opacity: 0.2 }}
            />

            {[
              {
                step: '01',
                title: 'Upload Your Report',
                desc: 'Simply drag & drop any PDF lab report, scan, or medical document. We support all major diagnostic formats.',
                icon: FileSearch,
              },
              {
                step: '02',
                title: 'AI Analyzes & Explains',
                desc: 'Our AI reads every test result, flags abnormalities, and explains everything in plain English within seconds.',
                icon: Brain,
              },
              {
                step: '03',
                title: 'Act on Your Insights',
                desc: 'Get your doctor-ready summary, track your trends, and walk into your next appointment fully informed.',
                icon: HeartPulse,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: teal }}>
                  Step {step}
                </span>
                <h3 className="text-lg font-extrabold mb-2" style={{ color: navy }}>{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${navyDark}, ${navy})` }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(13,148,136,0.2) 0%, transparent 60%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <BrandMark size={48} />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
            Ready to understand your health?
          </h2>
          <p className="mb-10 text-sm sm:text-base px-4 sm:px-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Join MedIntel today. It's free, it's private, and it could change the way you think about your health.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-6 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-white text-base sm:text-lg shadow-2xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto justify-center"
            style={{ background: `linear-gradient(135deg, ${teal}, ${tealLight})` }}
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No credit card required · Secure & private · Cancel anytime
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{ background: navyDark }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {/* Brand */}
            <div className="flex items-center gap-3">
              <BrandMark size={40} />
              <div>
                <span className="text-white font-extrabold text-xl">
                  Med<span style={{ color: teal }}>Intel</span>
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Understand Today. Healthier Tomorrow.
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <p>© {new Date().getFullYear()} MedIntel. All rights reserved.</p>
            <p className="text-center">Not a substitute for professional medical advice. Always consult a qualified healthcare professional.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
