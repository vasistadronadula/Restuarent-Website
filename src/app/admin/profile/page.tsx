'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader, SectionCard, RoleBadge } from '@/components/admin/ui';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

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
          title="Profile Settings"
          subtitle="Manage your personal credentials and contact details"
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <SectionCard className="text-center space-y-3">
              <Avatar className="w-16 h-16 mx-auto border border-stone-200">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-stone-100 text-stone-850 font-semibold text-lg">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : 'PP'}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-stone-900 text-sm">
                  {fullName || 'Staff User'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">{user?.email}</p>
              </div>

              <div className="pt-1">
                <RoleBadge role={userRole} />
              </div>
            </SectionCard>
          </div>

          <div className="md:col-span-8">
            <SectionCard className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="w-4 h-4 text-[#059669]" /> Personal Details
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="focus-visible:ring-emerald-500 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="focus-visible:ring-emerald-500 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                  <Input
                    disabled
                    value={user?.email || ''}
                    className="bg-slate-50 cursor-not-allowed text-slate-500 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Avatar Image URL</label>
                  <Input
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="focus-visible:ring-emerald-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  disabled={saving}
                  onClick={handleSave}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold h-9.5 px-5 rounded-xl shadow-xs transition-all active:scale-[0.98]"
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
