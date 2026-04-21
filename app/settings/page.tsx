"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Modal from "@/components/ui/Modal";
import Input, { Select } from "@/components/ui/Input";
import { Mail, Phone, Calendar, CheckCircle2, ExternalLink, Copy, Settings, Users, Shield, Edit2, Plus, Smartphone, KeyRound, LogOut, Mic } from "lucide-react";
import { useUser, AppUser, initials } from "@/lib/userContext";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

const ROLE_OPTIONS = [
  { value: "managing_director", label: "Managing Director" },
  { value: "associate", label: "Associate" },
  { value: "analyst", label: "Analyst" },
  { value: "banker", label: "Banker" },
];

export default function SettingsPage() {
  const { currentUser, users, setCurrentUser } = useUser();
  const [activeTab, setActiveTab] = useState<"integrations" | "team" | "profile" | "security">("integrations");
  const [copied, setCopied] = useState<string | null>(null);

  const webhookBase = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks` : "https://your-domain.com/api/webhooks";

  function handleCopy(key: string, text: string) {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Settings" subtitle="Manage integrations, team, and preferences" />

      <div className="p-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
          {(["integrations", "team", "profile", "security"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "integrations" && (
          <div className="space-y-5 max-w-2xl">
            <IntegrationCard
              icon={<Mail size={20} className="text-red-500" />}
              title="Gmail"
              description="Sync sent and received emails automatically. Emails will be matched to contacts by email address."
              status="not_connected"
              badge="OAuth Required"
            >
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  To connect Gmail, set up a Google Cloud project with Gmail API access and OAuth 2.0 credentials.
                </p>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={11} /></a></li>
                  <li>Create a project and enable the Gmail API</li>
                  <li>Create OAuth 2.0 credentials (Web Application)</li>
                  <li>Add your redirect URI: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{webhookBase.replace("/api/webhooks", "")}/api/auth/gmail/callback</code></li>
                  <li>Add <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">GMAIL_CLIENT_ID</code> and <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">GMAIL_CLIENT_SECRET</code> to your <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">.env</code></li>
                </ol>
                <WebhookUrl label="Gmail Webhook" url={`${webhookBase}/gmail`} copied={copied === "gmail"} onCopy={() => handleCopy("gmail", `${webhookBase}/gmail`)} />
              </div>
            </IntegrationCard>

            <IntegrationCard
              icon={<Calendar size={20} className="text-blue-500" />}
              title="Google Calendar"
              description="Sync meetings and appointments with contacts and deals."
              status="not_connected"
              badge="OAuth Required"
            >
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Uses the same Google Cloud project as Gmail. Enable the Calendar API in your project.
                </p>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Enable the Google Calendar API in your Cloud project</li>
                  <li>Add the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">calendar.readonly</code> scope to your OAuth consent screen</li>
                  <li>Calendar events will appear in contact and deal timelines once connected</li>
                </ol>
              </div>
            </IntegrationCard>

            <IntegrationCard
              icon={<Phone size={20} className="text-green-500" />}
              title="Kixie"
              description="Automatically log calls made and received via Kixie into the CRM."
              status="not_connected"
              badge="Webhook"
            >
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Kixie integration works via webhooks. Calls are automatically logged and matched by phone number.
                </p>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Log in to your Kixie dashboard</li>
                  <li>Go to <strong>Settings → Integrations → Webhooks</strong></li>
                  <li>Add the webhook URL below for <strong>Call Completed</strong> events</li>
                </ol>
                <WebhookUrl label="Kixie Webhook URL" url={`${webhookBase}/kixie`} copied={copied === "kixie"} onCopy={() => handleCopy("kixie", `${webhookBase}/kixie`)} />
              </div>
            </IntegrationCard>

            <IntegrationCard
              icon={<Mic size={20} className="text-violet-500" />}
              title="Fireflies.ai"
              description="Automatically save meeting transcripts and AI summaries to matched contacts after every call."
              status="not_connected"
              badge="Webhook"
            >
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Fireflies will POST a transcript to your webhook after every recorded meeting. Participants are matched to contacts by email — summaries and action items are saved as notes.
                </p>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Log in to <a href="https://app.fireflies.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">Fireflies.ai <ExternalLink size={11} /></a></li>
                  <li>Go to <strong>Integrations → Webhooks</strong></li>
                  <li>Add the webhook URL below and select the <strong>Transcript Ready</strong> event</li>
                  <li>(Optional) Add <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">FIREFLIES_WEBHOOK_SECRET=yourtoken</code> to <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">.env</code> and append <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">?secret=yourtoken</code> to the URL below</li>
                </ol>
                <WebhookUrl label="Fireflies Webhook URL" url={`${webhookBase}/fireflies`} copied={copied === "fireflies"} onCopy={() => handleCopy("fireflies", `${webhookBase}/fireflies`)} />
              </div>
            </IntegrationCard>
          </div>
        )}

        {activeTab === "team" && (
          <TeamTab currentUser={currentUser} users={users} onUsersChange={() => window.location.reload()} />
        )}

        {activeTab === "profile" && (
          <ProfileTab currentUser={currentUser} onSave={(updated) => setCurrentUser(updated)} />
        )}

        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

function TeamTab({ currentUser, users, onUsersChange }: {
  currentUser: AppUser | null;
  users: AppUser[];
  onUsersChange: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", email: "", title: "", role: "banker" });
  const [editForm, setEditForm] = useState({ name: "", email: "", title: "", role: "" });

  function openEdit(u: AppUser) {
    setEditForm({ name: u.name, email: u.email, title: u.title ?? "", role: u.role });
    setEditUser(u);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) return;
    setSaving(true);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setSaving(false);
    setShowAdd(false);
    setAddForm({ name: "", email: "", title: "", role: "banker" });
    onUsersChange();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser || !editForm.name.trim()) return;
    setSaving(true);
    await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditUser(null);
    onUsersChange();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users size={16} className="text-slate-500" /> Team Members
          </h3>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            <Plus size={13} /> Add Member
          </button>
        </div>

        <div className="space-y-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 group">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {initials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  {currentUser?.id === u.id && <span className="text-xs text-slate-400">(you)</span>}
                </div>
                <p className="text-xs text-slate-500">{u.email}{u.title ? ` · ${u.title}` : ""}</p>
              </div>
              <span className="text-xs text-slate-400 capitalize hidden group-hover:inline">
                {u.role.replace("_", " ")}
              </span>
              <button onClick={() => openEdit(u)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-200 transition-all text-slate-500">
                <Edit2 size={13} />
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No team members yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-500" /> Roles
        </h3>
        <div className="space-y-2 text-sm text-slate-600">
          {[
            { role: "Managing Director", desc: "Full access to all data, integrations, and settings" },
            { role: "Associate", desc: "Contacts, deals, notes, emails, calls" },
            { role: "Analyst", desc: "View only (read-only access)" },
          ].map(({ role, desc }) => (
            <div key={role} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="font-medium">{role}</span>
              <span className="text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Add Member"}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Full Name" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Jane Smith" />
          <Input label="Email" required type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="jane@firm.com" />
          <Input label="Title" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} placeholder="Associate" />
          <Select label="Role" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} options={ROLE_OPTIONS} />
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit Team Member"
        footer={
          <>
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleEdit} disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Full Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email" required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          <Select label="Role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} options={ROLE_OPTIONS} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ currentUser, onSave }: { currentUser: AppUser | null; onSave: (u: AppUser) => void }) {
  const [form, setForm] = useState({ name: "", email: "", title: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm({ name: currentUser.name, email: currentUser.email, title: currentUser.title ?? "", role: currentUser.role });
    }
  }, [currentUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    onSave(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!currentUser) return null;

  return (
    <div className="max-w-md space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Settings size={16} className="text-slate-500" /> Your Profile
        </h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-semibold">{initials(form.name || currentUser.name)}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900">{form.name || currentUser.name}</p>
            <p className="text-sm text-slate-500">{form.title || currentUser.title}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-800" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-800" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-800" />
          </div>
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLE_OPTIONS} />

          <button type="submit" disabled={saving}
            className="mt-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Notifications</h3>
        <div className="space-y-3 text-sm">
          <ToggleRow label="Email opened notifications" defaultOn />
          <ToggleRow label="New deal assigned to me" defaultOn />
          <ToggleRow label="Sequence step due" defaultOn />
          <ToggleRow label="Daily activity summary" defaultOn={false} />
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const router = useRouter();

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [tfaLoading, setTfaLoading] = useState(false)
  const [tfaMessage, setTfaMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [showDisable, setShowDisable] = useState(false)

  // Password state
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirm: "" })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMessage, setPwdMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setTotpEnabled(!!d.totpEnabled))
  }, [])

  async function startSetup() {
    setTfaLoading(true)
    setTfaMessage(null)
    const res = await fetch("/api/auth/2fa")
    const data = await res.json()
    setQrDataUrl(data.qrDataUrl)
    setTotpSecret(data.secret)
    setTfaLoading(false)
  }

  async function verifyEnable() {
    if (verifyCode.length !== 6) return
    setTfaLoading(true)
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: verifyCode }),
    })
    const data = await res.json()
    if (data.ok) {
      setTotpEnabled(true)
      setQrDataUrl(null)
      setTotpSecret(null)
      setVerifyCode("")
      setTfaMessage({ type: "ok", text: "Two-factor authentication enabled!" })
    } else {
      setTfaMessage({ type: "err", text: data.error ?? "Invalid code" })
    }
    setTfaLoading(false)
  }

  async function verifyDisable() {
    if (disableCode.length !== 6) return
    setTfaLoading(true)
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: disableCode, disable: true }),
    })
    const data = await res.json()
    if (data.ok) {
      setTotpEnabled(false)
      setShowDisable(false)
      setDisableCode("")
      setTfaMessage({ type: "ok", text: "Two-factor authentication disabled." })
    } else {
      setTfaMessage({ type: "err", text: data.error ?? "Invalid code" })
    }
    setTfaLoading(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdMessage({ type: "err", text: "Passwords don't match" })
      return
    }
    setPwdSaving(true)
    setPwdMessage(null)
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }),
    })
    const data = await res.json()
    if (data.ok) {
      setPwdMessage({ type: "ok", text: "Password updated successfully." })
      setPwdForm({ oldPassword: "", newPassword: "", confirm: "" })
    } else {
      setPwdMessage({ type: "err", text: data.error ?? "Failed to update password" })
    }
    setPwdSaving(false)
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div className="max-w-md space-y-5">
      {/* 2FA Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
          <Smartphone size={16} className="text-slate-500" /> Two-Factor Authentication
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Use Authy, Google Authenticator, or any TOTP app to generate login codes.
        </p>

        {tfaMessage && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${tfaMessage.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {tfaMessage.text}
          </div>
        )}

        {totpEnabled === null && <p className="text-sm text-slate-400">Loading...</p>}

        {totpEnabled === false && !qrDataUrl && (
          <button onClick={startSetup} disabled={tfaLoading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {tfaLoading ? "Loading..." : "Set Up 2FA"}
          </button>
        )}

        {qrDataUrl && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Scan this QR code with your authenticator app:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="2FA QR Code" className="w-44 h-44 rounded-lg border border-slate-200" />
            {totpSecret && (
              <p className="text-xs text-slate-500">
                Or enter manually: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">{totpSecret}</code>
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
                value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono tracking-widest"
              />
              <button onClick={verifyEnable} disabled={verifyCode.length !== 6 || tfaLoading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Verify
              </button>
            </div>
          </div>
        )}

        {totpEnabled === true && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-sm font-medium text-green-700">2FA is enabled</span>
            </div>
            {!showDisable ? (
              <button onClick={() => setShowDisable(true)}
                className="text-sm text-slate-500 hover:text-red-600 underline underline-offset-2">
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Enter your current authenticator code to disable:</p>
                <div className="flex gap-2">
                  <input
                    type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
                    value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono tracking-widest"
                  />
                  <button onClick={verifyDisable} disabled={disableCode.length !== 6 || tfaLoading}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                    Disable
                  </button>
                  <button onClick={() => { setShowDisable(false); setDisableCode("") }}
                    className="px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-slate-500" /> Change Password
        </h3>

        {pwdMessage && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${pwdMessage.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {pwdMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Password</label>
            <input type="password" value={pwdForm.oldPassword}
              onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">New Password</label>
            <input type="password" value={pwdForm.newPassword}
              onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Confirm New Password</label>
            <input type="password" value={pwdForm.confirm}
              onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <button type="submit" disabled={pwdSaving || !pwdForm.newPassword}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {pwdSaving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
          <LogOut size={16} className="text-slate-500" /> Sign Out
        </h3>
        <p className="text-sm text-slate-500 mb-4">Sign out of this session. You'll need to sign in again to access the CRM.</p>
        <button onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────────────────────────

function IntegrationCard({ icon, title, description, status, badge, children }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "connected" | "not_connected";
  badge: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                {status === "connected" ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 size={10} /> Connected
                  </span>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-4">
            {expanded ? "Hide" : "Setup"}
          </button>
        </div>
      </div>
      {expanded && children && (
        <div className="border-t border-slate-100 p-5 bg-slate-50">
          {children}
        </div>
      )}
    </div>
  );
}

function WebhookUrl({ label, url, copied, onCopy }: { label: string; url: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate font-mono">
          {url}
        </code>
        <button onClick={onCopy}
          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${copied ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}</span>
      <button onClick={() => setOn(!on)}
        className={`relative w-9 h-5 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}
