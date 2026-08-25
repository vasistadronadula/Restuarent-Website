'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader, RoleBadge } from '@/components/admin/ui';
import { ROLE_ACCESS_SUMMARY } from '@/lib/roleAccess';
import { toast } from 'sonner';

import { Camera, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import { CameraCaptureModal } from '@/components/common/CameraCaptureModal';

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Session expired');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'general');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');

      setAvatarUrl(data.url);
      toast.success('Avatar updated! Click Save changes to persist.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      if (supabase) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (active && data) {
          setFullName(data.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
          setPhone(data.phone || user.user_metadata?.phone || '');
          setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || '');
        } else if (active) {
          setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
          setPhone(user.user_metadata?.phone || '');
          setAvatarUrl(user.user_metadata?.avatar_url || '');
        }
      }
    })();
    return () => { active = false; };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName, phone, avatar_url: avatarUrl })
          .eq('id', user.id);
      }
      toast.success('Profile updated.');
    } catch {
      toast.error('Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || 'Pala Pitta')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <AdminLayout title="Your profile">
      <PageHeader
        title="Your profile"
        subtitle="Your name, contact number and photo, as other staff see them."
      />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

        <section className="border-2 border-ad-line p-5">
          <div className="relative group w-24 h-24 mx-auto sm:mx-0">
            <div
              className="w-24 h-24 rounded-2xl grid place-items-center bg-ad-accent text-ad-bg ad-num text-[30px] overflow-hidden border border-ad-line shadow-sm"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
            >
              {avatarUrl ? '' : initials}
            </div>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFile(file);
            }}
          />

          <CameraCaptureModal
            open={cameraOpen}
            onOpenChange={setCameraOpen}
            onCapture={handleAvatarFile}
            title="Take Profile Photo"
          />

          <div className="flex items-center gap-2 mt-3.5 flex-wrap">
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => setCameraOpen(true)}
              className="ad-btn ad-btn-primary ad-btn-sm text-xs flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Camera
            </button>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="ad-btn ad-btn-secondary ad-btn-sm text-xs flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => setAvatarUrl('')}
                className="ad-btn ad-btn-sm text-xs text-red-600 hover:text-red-700"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="ad-num text-[22px] mt-4 wrap-break-word">{fullName || 'Staff user'}</div>
          <div className="mt-2"><RoleBadge role={userRole} /></div>

          <hr className="ad-rule my-4" />

          <div className="flex flex-col gap-3 text-[13px]">
            <div>
              <span className="ad-muted">Email</span>
              <br />
              <span className="wrap-break-word">{user?.email || '—'}</span>
            </div>
            <div>
              <span className="ad-muted">Member since</span>
              <br />
              {joined}
            </div>
            <div>
              <span className="ad-muted">Access</span>
              <br />
              {userRole ? ROLE_ACCESS_SUMMARY[userRole] : '—'}
            </div>
          </div>
        </section>

        <section>
          <div className="ad-section-head">
            <h3 className="ad-h text-[17px]">Account details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="ad-field">
              <label htmlFor="pf-name">Full name</label>
              <input
                id="pf-name"
                className="ad-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="ad-field">
              <label htmlFor="pf-phone">Phone</label>
              <input
                id="pf-phone"
                className="ad-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
            </div>

            <div className="ad-field sm:col-span-2">
              <label htmlFor="pf-email">Email</label>
              <input
                id="pf-email"
                className="ad-input"
                value={user?.email || ''}
                disabled
                style={{ color: 'var(--ad-n600)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              className="ad-btn ad-btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="ad-btn ad-btn-secondary"
              onClick={() => window.location.reload()}
              disabled={saving}
            >
              Discard
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
