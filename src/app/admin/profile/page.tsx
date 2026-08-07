'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader, SectionCard, RoleBadge } from '@/components/admin/ui';
import { ROLE_ACCESS_SUMMARY, ROLE_LABELS } from '@/lib/roleAccess';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Trash2, User, Mail, Phone, ShieldCheck } from 'lucide-react';

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
          .update({
            full_name: fullName,
            phone: phone,
            avatar_url: avatarUrl,
          })
          .eq('id', user.id);
      }
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Staff Profile Settings">
      <div className="space-y-4 max-w-4xl mx-auto w-full">
        <PageHeader
          title="Account Profile & Credentials"
          subtitle="Manage your personal details and staff role access"
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <SectionCard className="text-center space-y-3">
              <Avatar className="w-20 h-20 mx-auto border-2 border-amber-600 shadow-md">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-stone-900 text-white font-black text-xl">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : 'PP'}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-extrabold text-stone-850 dark:text-stone-100 text-base">
                  {fullName || 'Staff User'}
                </h3>
                <p className="text-[10px] text-stone-400 font-semibold">{user?.email}</p>
              </div>

              <div className="pt-1">
                <RoleBadge role={userRole} />
              </div>
            </SectionCard>
          </div>

          <div className="md:col-span-8">
            <SectionCard className="space-y-4">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b border-stone-200/40 dark:border-[#2C2C2E]/60 pb-2.5">
                <User className="w-4 h-4 text-amber-600" /> Personal Details
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-xl font-bold border-stone-200 dark:border-[#2C2C2E]/65 bg-stone-50/50 dark:bg-stone-900/50 focus-visible:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl font-bold border-stone-200 dark:border-[#2C2C2E]/65 bg-stone-50/50 dark:bg-stone-900/50 focus-visible:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">Email Address</label>
                  <Input
                    disabled
                    value={user?.email || ''}
                    className="rounded-xl bg-stone-100 dark:bg-stone-850 font-medium cursor-not-allowed border-stone-200 dark:border-[#2C2C2E]/65"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1">Avatar Image URL</label>
                  <Input
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="rounded-xl border-stone-200 dark:border-[#2C2C2E]/65 bg-stone-50/50 dark:bg-stone-900/50 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-[#2C2C2E]/60 flex justify-end">
                <Button
                  disabled={saving}
                  onClick={handleSave}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-5 h-9 shadow-xs"
                >
                  Save Profile Changes
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
