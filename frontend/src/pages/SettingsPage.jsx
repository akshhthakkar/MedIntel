import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Bell, Globe, Shield, Activity, Loader2, Save,
  Trash2, AlertTriangle, Key, ChevronRight, Check,
  Heart, Phone, Mail, Droplets, Wind
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const navy = '#152E57';
const teal = '#0d9488';

// ── Toggle component
function Toggle({ checked, onChange, name }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
      <div style={{ transition: 'background 0.2s' }}
        className="w-11 h-6 rounded-full peer
          bg-gray-200 peer-checked:bg-teal-500
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full" />
    </label>
  );
}

// ── Field wrapper
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: navy }}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Input style
const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition";

// ── Section card
function SectionCard({ title, subtitle, icon: Icon, accent = teal, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"
        style={{ background: '#f8fafc' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}15` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: navy }}>{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Notification row
function NotifRow({ label, desc, name, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold" style={{ color: navy }}>{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} name={name} />
    </div>
  );
}

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'medical',       label: 'Medical',        icon: Heart },
  { id: 'language',      label: 'Language',       icon: Globe },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'security',      label: 'Security',       icon: Shield },
];

export default function SettingsPage() {
  const { user, updateUser, deleteAccount } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    preferredLanguage: user?.preferredLanguage || 'English',
    gender: user?.gender || '',
    bloodGroup: user?.bloodGroup || '',
    allergies: user?.allergies?.join(', ') || '',
    chronicConditions: user?.chronicConditions?.join(', ') || '',
    notificationPreferences: {
      email: user?.notificationPreferences?.email ?? true,
      push: user?.notificationPreferences?.push ?? true,
      medicationReminders: user?.notificationPreferences?.medicationReminders ?? true,
      inApp: user?.notificationPreferences?.inApp ?? true,
      dailyCheckIn: user?.notificationPreferences?.dailyCheckIn ?? false,
      checkInTime: user?.notificationPreferences?.checkInTime ?? '09:00',
      weeklySummary: user?.notificationPreferences?.weeklySummary ?? true,
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const languages = ['English','Hindi','Gujarati','Marathi','Tamil','Telugu','Spanish','French','Arabic','Bengali','Urdu','German','Mandarin'];
  const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNotifChange = e => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        allergies: formData.allergies ? String(formData.allergies).split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: formData.chronicConditions ? String(formData.chronicConditions).split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const res = await updateUser(payload);
      if (res.success) toast.success('Settings saved!');
      else toast.error(res.error || 'Failed to save');
    } catch { toast.error('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleSavePassword = async e => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword)
      return toast.error('Passwords do not match');
    if (passwordData.newPassword.length < 8)
      return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      const res = await authAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data.success) {
        toast.success('Password updated!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure? This permanently deletes all your data and cannot be undone.')) {
      setSaving(true);
      const res = await deleteAccount();
      if (!res.success) { toast.error(res.error || 'Failed'); setSaving(false); }
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
          style={{ background: '#EBF2FF', color: navy }}>
          Account
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: navy }}>Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, medical info, and security preferences.</p>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-12 gap-4 sm:gap-6">
        {/* Sidebar nav */}
        <div className="md:col-span-3">
          {/* Mobile: horizontal scrollable tabs */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={activeTab === id
                  ? { background: navy, color: '#fff', borderColor: navy }
                  : { background: '#fff', color: '#6b7280', borderColor: '#e2e8f0' }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Desktop: vertical sidebar card */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
            {/* Avatar */}
            <div className="p-6 border-b border-gray-50 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-3"
                style={{ background: `linear-gradient(135deg, ${navy}, ${teal})` }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <p className="font-bold text-sm" style={{ color: navy }}>{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            </div>
            <nav className="p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-0.5"
                  style={activeTab === id
                    ? { background: '#EBF2FF', color: navy }
                    : { color: '#6b7280' }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>


        {/* Content */}
        <div className="md:col-span-9 space-y-4">

          {/* ── PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <SectionCard title="Basic Information" subtitle="Your personal details" icon={User}>
                <div className="space-y-4">
                  <Field label="Full Name">
                    <input type="text" name="name" value={formData.name} onChange={handleChange}
                      className={inputCls} required />
                  </Field>
                  <Field label="Email Address" hint="Email cannot be changed once registered.">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input type="email" value={formData.email} disabled
                        className={`${inputCls} pl-9 bg-gray-50 text-gray-400 cursor-not-allowed`} />
                    </div>
                  </Field>
                  <Field label="Phone Number">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                </div>
              </SectionCard>

              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* ── MEDICAL */}
          {activeTab === 'medical' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <SectionCard title="Medical Profile" subtitle="Helps AI personalize your health insights" icon={Heart} accent="#dc2626">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Gender">
                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Blood Group">
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}
                        className={`${inputCls} pl-9`}>
                        <option value="">Select…</option>
                        {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </Field>
                </div>
                <div className="space-y-4">
                  <Field label="Known Allergies" hint="Separate multiple allergies with commas">
                    <div className="relative">
                      <Wind className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input type="text" name="allergies" value={formData.allergies} onChange={handleChange}
                        placeholder="e.g. Penicillin, Peanuts, Latex"
                        className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Chronic Conditions" hint="Separate multiple conditions with commas">
                    <input type="text" name="chronicConditions" value={formData.chronicConditions} onChange={handleChange}
                      placeholder="e.g. Asthma, Hypertension, Diabetes"
                      className={inputCls} />
                  </Field>
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Medical Profile
                </button>
              </div>
            </form>
          )}

          {/* ── LANGUAGE */}
          {activeTab === 'language' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <SectionCard title="Language" subtitle="AI summaries and reports use this language" icon={Globe} accent="#6b46c1">
                <Field label="Preferred Language">
                  <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} className={inputCls}>
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                  <strong>✓ Active:</strong> Lab report analyses, medication notes, and doctor summaries will be generated in <strong>{formData.preferredLanguage}</strong>.
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Language
                </button>
              </div>
            </form>
          )}

          {/* ── NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <SectionCard title="Notification Preferences" subtitle="Control what alerts you receive and when" icon={Bell} accent="#f59e0b">
                <NotifRow label="Email Notifications" desc="Weekly health summaries via email"
                  name="email" checked={formData.notificationPreferences.email} onChange={handleNotifChange} />
                <NotifRow label="In-App Notifications" desc="Alerts inside the MedIntel dashboard"
                  name="inApp" checked={formData.notificationPreferences.inApp} onChange={handleNotifChange} />
                <NotifRow label="Medication Reminders" desc="Alerts when it's time to take your medication"
                  name="medicationReminders" checked={formData.notificationPreferences.medicationReminders} onChange={handleNotifChange} />
                <NotifRow label="Weekly Health Summary" desc="Sunday email digest of your health activity"
                  name="weeklySummary" checked={formData.notificationPreferences.weeklySummary} onChange={handleNotifChange} />
                <div className="pt-3 border-t border-gray-50">
                  <NotifRow label="Daily Check-In Reminder" desc="Remind me to log symptoms every day"
                    name="dailyCheckIn" checked={formData.notificationPreferences.dailyCheckIn} onChange={handleNotifChange} />
                  {formData.notificationPreferences.dailyCheckIn && (
                    <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: '#EBF2FF' }}>
                      <label className="text-sm font-semibold" style={{ color: navy }}>Check-In Time</label>
                      <input type="time" name="checkInTime"
                        value={formData.notificationPreferences.checkInTime}
                        onChange={handleNotifChange}
                        className="ml-auto px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                    </div>
                  )}
                </div>
              </SectionCard>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* ── SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <SectionCard title="Change Password" subtitle="Use a strong password you don't use elsewhere" icon={Key}>
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <Field label="Current Password">
                    <input type="password" name="currentPassword" value={passwordData.currentPassword}
                      onChange={e => setPasswordData({ ...passwordData, [e.target.name]: e.target.value })}
                      className={inputCls} required />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="New Password" hint="Min. 8 characters">
                      <input type="password" name="newPassword" value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, [e.target.name]: e.target.value })}
                        className={inputCls} minLength={8} required />
                    </Field>
                    <Field label="Confirm New Password">
                      <input type="password" name="confirmPassword" value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({ ...passwordData, [e.target.name]: e.target.value })}
                        className={inputCls} minLength={8} required />
                    </Field>
                  </div>
                  {/* Password match indicator */}
                  {passwordData.newPassword && passwordData.confirmPassword && (
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      <Check className="w-3.5 h-3.5" />
                      {passwordData.newPassword === passwordData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button type="submit"
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </SectionCard>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#fca5a5' }}>
                <div className="px-6 py-4 border-b flex items-center gap-3" style={{ background: '#fff5f5', borderColor: '#fca5a5' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-red-700">Danger Zone</h3>
                    <p className="text-xs text-red-400">Irreversible and destructive actions</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-bold text-sm text-gray-900 mb-1">Delete Account</p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        Permanently delete your account and all data — reports, medications, symptom logs. This cannot be undone.
                      </p>
                    </div>
                    <button type="button" onClick={handleDeleteAccount} disabled={saving}
                      className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
