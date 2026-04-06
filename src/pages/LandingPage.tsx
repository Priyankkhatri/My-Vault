import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, Lock, Fingerprint, Zap, Globe, Brain,
  ChevronDown, ArrowRight, CheckCircle2, Eye, EyeOff,
  KeyRound, Sparkles, Shield, Mail, Github, Twitter,
  Menu, X, ExternalLink, User as UserIcon, LogOut, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// ─── Data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    description: 'AES-256-GCM encryption ensures your data is locked before it ever leaves your device. Zero-knowledge architecture means we literally cannot read your passwords.',
    badge: 'Core',
  },
  {
    icon: Globe,
    title: 'Browser Extension',
    description: 'One-click autofill across every website. Smart form detection, credential saving prompts, and seamless sync with your vault — all from your browser toolbar.',
    badge: 'Extension',
  },
  {
    icon: Brain,
    title: 'AI Security Audit',
    description: 'Powered by AI analysis, get instant visibility into weak, reused, or compromised passwords. Actionable recommendations to harden your digital life.',
    badge: 'AI',
  },
  {
    icon: Zap,
    title: 'Cross-Device Sync',
    description: 'Your encrypted vault syncs instantly across all your devices. Add a password on your phone, access it on your laptop — encrypted end-to-end.',
    badge: 'Sync',
  },
  {
    icon: Fingerprint,
    title: 'Biometric Unlock',
    description: 'Use your fingerprint or face to unlock your vault on supported devices. Fast, secure, and without the hassle of typing your master password every time.',
    badge: 'Security',
  },
  {
    icon: ShieldCheck,
    title: 'Security Dashboard',
    description: 'A real-time overview of your vault health: password strength scores, breach monitoring alerts, and an overall security posture rating.',
    badge: 'Monitor',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create Your Vault',
    description: 'Sign up with your email or Google account. Set a strong master password — the only password you\'ll ever need to remember.',
    icon: Sparkles,
  },
  {
    step: '02',
    title: 'Add Your Credentials',
    description: 'Import existing passwords or start fresh. Our browser extension automatically detects and saves new logins as you browse.',
    icon: KeyRound,
  },
  {
    step: '03',
    title: 'Stay Protected',
    description: 'Vestiga works silently in the background — autofilling credentials, alerting you to breaches, and keeping your digital life secure.',
    icon: Shield,
  },
];

const FAQS = [
  {
    q: 'Is Vestiga really free?',
    a: 'Yes! Vestiga is completely free to use with all core features including the browser extension, cross-device sync, and AI security audits. We believe everyone deserves strong password security.',
  },
  {
    q: 'Can Vestiga see my passwords?',
    a: 'Absolutely not. Vestiga uses a zero-knowledge architecture with end-to-end encryption. Your passwords are encrypted on your device before they reach our servers. We physically cannot decrypt or access your data — only you can, with your master password.',
  },
  {
    q: 'What happens if I forget my master password?',
    a: 'Because of our zero-knowledge design, we cannot recover your master password. We strongly recommend writing it down and storing it in a physically secure location. This is the trade-off for true security — no backdoors, ever.',
  },
  {
    q: 'Is Vestiga open source?',
    a: 'Yes! Our codebase is publicly available on GitHub. We believe in transparency — anyone can audit our encryption implementation and security practices.',
  },
  {
    q: 'Which browsers does the extension support?',
    a: 'Vestiga\'s extension is built for Chromium-based browsers (Chrome, Edge, Brave, Arc) and Firefox. It supports autofill, credential saving, and one-click login across all your favorite websites.',
  },
  {
    q: 'How is Vestiga different from other password managers?',
    a: 'Vestiga combines the security of zero-knowledge encryption with the intelligence of AI-powered security audits. Unlike bloated alternatives, we\'re fast, minimal, and developer-friendly — with a public codebase you can verify yourself.',
  },
];

const TRUST_TICKER = [
  'AES-256-GCM Encryption',
  'Zero-Knowledge Architecture',
  'Open Source Codebase',
  'PBKDF2 Key Derivation',
  'End-to-End Encrypted',
  'No Plaintext Storage',
  'Cross-Device Sync',
  'AI-Powered Audits',
];

// ─── Components ──────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setDropdownOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Security', href: '#security' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-nav shadow-2xl shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-shadow">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Vestiga</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3 relative">
          {session ? (
            <>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <UserIcon size={12} className="text-white" />
                </div>
                <span>{user?.email?.split('@')[0] || 'Account'}</span>
                <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-12 right-0 w-48 bg-[#0F172A] border border-white/10 rounded-xl shadow-xl shadow-black/50 py-1 overflow-hidden"
                >
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ShieldCheck size={16} className="text-teal-400" />
                    Dashboard
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <SettingsIcon size={16} />
                    Settings
                  </Link>
                  <div className="h-px bg-white/10 my-1 font-mono" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </motion.div>
              )}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-5 py-2 rounded-lg transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-px active:scale-[0.98]"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-nav border-t border-white/5 px-6 py-6 space-y-4"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 border-t border-white/10 space-y-3">
            {session ? (
              <>
                <div className="px-2 pb-2 mb-2 border-b border-white/5 text-sm font-medium text-slate-400">
                  {user?.email}
                </div>
                <Link to="/dashboard" className="block text-center text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 py-2.5 rounded-lg mb-2">
                  Dashboard
                </Link>
                <Link to="/settings" className="block text-center text-sm font-medium text-slate-300 py-2.5 rounded-lg border border-white/10 mb-2">
                  Settings
                </Link>
                <button onClick={handleLogout} className="w-full block text-center text-sm font-medium text-red-400 py-2.5 rounded-lg border border-red-400/20 bg-red-400/5">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-center text-sm font-medium text-slate-300 py-2.5 rounded-lg border border-white/10">
                  Login
                </Link>
                <Link to="/signup" className="block text-center text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 py-2.5 rounded-lg">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function HeroSection() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const { session } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/6 rounded-full blur-[80px] animate-float-slow" />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div style={{ y, opacity }} className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 mb-8"
        >
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Open Source & Free Forever</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6"
        >
          Your passwords
          <br />
          deserve a{' '}
          <span className="gradient-text-hero">fortress</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Vestiga is a zero-knowledge, end-to-end encrypted password manager
          with AI-powered security audits and a seamless browser extension.
          <span className="text-slate-300 font-medium"> We can't see your passwords — only you can.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {session ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-base font-medium text-slate-400 hover:text-white px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:bg-white/5"
          >
            See How It Works
            <ChevronDown size={18} />
          </a>
        </motion.div>

        {/* Security Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-16 flex items-center justify-center gap-6 text-xs text-slate-500"
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-teal-500" />
            <span>E2E Encrypted</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-teal-500" />
            <span>Zero-Knowledge</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <Github size={14} className="text-teal-500" />
            <span>Open Source</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} className="text-slate-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function TrustTicker() {
  return (
    <section className="relative py-6 border-y border-white/5 overflow-hidden">
      <div className="animate-ticker flex items-center gap-12 whitespace-nowrap">
        {[...TRUST_TICKER, ...TRUST_TICKER].map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <CheckCircle2 size={14} className="text-teal-500/60 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-3 block">Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need.{' '}
            <span className="text-slate-500">Nothing you don't.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A lean, fast, and fiercely secure password manager built for people who care about their digital safety.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <feature.icon size={20} className="text-teal-400" />
                </div>
                <span className="text-[10px] font-bold text-teal-500/60 uppercase tracking-widest bg-teal-500/5 px-2.5 py-1 rounded-full">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-3 block">Security</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Zero-knowledge means{' '}
            <span className="gradient-text">zero compromise</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* What We Store */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <EyeOff size={20} className="text-teal-400" />
              </div>
              <h3 className="text-lg font-bold text-white">What We Store</h3>
            </div>
            <div className="space-y-3">
              {[
                'Encrypted binary blobs (unreadable)',
                'Your email address (for login)',
                'Encrypted vault metadata',
                'Timestamps for sync',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <Lock size={14} className="text-teal-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* What We Can't See */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8 border-teal-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Eye size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">What We <span className="text-red-400">Cannot</span> See</h3>
            </div>
            <div className="space-y-3">
              {[
                'Your master password (never sent to us)',
                'Your actual passwords or credentials',
                'Your notes, card numbers, or secrets',
                'Any plaintext data — ever',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <X size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Encryption Flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-3xl mx-auto glass-card rounded-2xl p-8"
        >
          <p className="text-center text-xs font-bold text-teal-400 uppercase tracking-[0.15em] mb-6">Encryption Flow</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm">
            {[
              { label: 'Your Password', color: 'text-white' },
              { label: '→', color: 'text-slate-600' },
              { label: 'PBKDF2 Key Derivation', color: 'text-yellow-400' },
              { label: '→', color: 'text-slate-600' },
              { label: 'AES-256-GCM Encryption', color: 'text-teal-400' },
              { label: '→', color: 'text-slate-600' },
              { label: 'Encrypted Blob (stored)', color: 'text-emerald-400' },
            ].map((step, i) => (
              <span key={i} className={`font-mono font-medium ${step.color} text-center`}>
                {step.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { session } = useAuth();
  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-3 block">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Secure in <span className="gradient-text">three steps</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Connector Line (desktop only) */}
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-teal-500/30 to-transparent" />
              )}

              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/10 mb-6 relative">
                <step.icon size={32} className="text-teal-400" />
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-slate-800 border-2 border-teal-500/30 rounded-full flex items-center justify-center text-xs font-bold text-teal-400">
                  {step.step}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          {session ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Create Your Vault
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32 relative">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-3 block">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Common questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 shrink-0 transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180 text-teal-400' : ''
                  }`}
                />
              </button>
              <div className={`faq-answer ${openIndex === i ? 'open' : ''}`}>
                <div>
                  <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { session } = useAuth();
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-teal-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 glow-teal-strong animate-pulse-glow">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to secure your digital life?
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-10">
              Join thousands of security-conscious users who trust Vestiga to protect their most sensitive credentials.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {session ? (
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Go to Dashboard
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2 text-base font-semibold text-slate-900 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Get Started Free
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <a
                href="https://github.com/Priyankkhatri/My-Vault"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-base font-medium text-slate-400 hover:text-white px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:bg-white/5"
              >
                <Github size={18} />
                View on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">Vestiga</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Zero-knowledge, end-to-end encrypted password manager. Your passwords deserve a fortress.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-slate-500 hover:text-white transition-colors">Features</a></li>
              <li><a href="#security" className="text-sm text-slate-500 hover:text-white transition-colors">Security</a></li>
              <li><a href="#faq" className="text-sm text-slate-500 hover:text-white transition-colors">FAQ</a></li>
              <li>
                <a href="https://github.com/Priyankkhatri/My-Vault" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors inline-flex items-center gap-1">
                  GitHub <ExternalLink size={11} />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-slate-500 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-slate-500 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5">
              <li><Link to="/contact" className="text-sm text-slate-500 hover:text-white transition-colors">Contact Us</Link></li>
              <li>
                <a href="mailto:pktimepass01@gmail.com" className="text-sm text-slate-500 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Mail size={12} /> Email
                </a>
              </li>
              <li>
                <a href="https://github.com/Priyankkhatri/My-Vault/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Github size={12} /> Report a Bug
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Vestiga. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck size={12} className="text-teal-600" />
            <span>Built with zero-knowledge security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="bg-[#0A0F1C] min-h-screen">
      <Navbar />
      <HeroSection />
      <TrustTicker />
      <FeaturesSection />
      <SecuritySection />
      <HowItWorks />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
