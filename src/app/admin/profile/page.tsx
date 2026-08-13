'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader, RoleBadge } from '@/components/admin/ui';
import { ROLE_ACCESS_SUMMARY } from '@/lib/roleAccess';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

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
          <div
            className="w-22 h-22 grid place-items-center bg-ad-accent text-ad-bg ad-num text-[30px] overflow-hidden"
            style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
          >
            {avatarUrl ? '' : initials}
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
