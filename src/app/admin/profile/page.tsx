'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Grid, Typography, TextField, Button, Avatar, CircularProgress, Divider,
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader, SectionCard, SectionHeading, RoleBadge, adminColors, roleColors } from '@/components/admin/ui';
import { ROLE_ACCESS_SUMMARY, ROLE_ICONS, ROLE_LABELS } from '@/lib/roleAccess';
import toast from 'react-hot-toast';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

const initialsOf = (name: string, email: string) => {
  const src = name.trim() || email;
  return src.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
};

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Seed from the profiles row (source of truth), falling back to whatever the
  // session already carries. The spinner covers the fetch, so the fields are
  // populated in one pass rather than flashing session values first.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;

      const meta = user.user_metadata || {};
      setFullName(data?.full_name || meta.full_name || meta.name || '');
      setPhone(data?.phone || meta.phone || '');
      setAvatarUrl(data?.avatar_url || meta.avatar_url || '');
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const persist = async (patch: { full_name?: string; phone?: string; avatar_url?: string | null }) => {
    if (!user) return false;
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) {
      toast.error(error.message || 'Could not save your profile');
      return false;
    }
    // Mirror into the session so the sidebar/header pick it up immediately
    // instead of only after the next sign-in.
    await supabase.auth.updateUser({
      data: {
        ...(patch.full_name !== undefined ? { full_name: patch.full_name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.avatar_url !== undefined ? { avatar_url: patch.avatar_url ?? '' } : {}),
      },
    });
    return true;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (file.size > MAX_AVATAR_BYTES) { toast.error('Image must be under 3MB.'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Path must start with the user id — the storage policy scopes writes
      // to that first segment so nobody can overwrite someone else's photo.
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); return; }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (await persist({ avatar_url: data.publicUrl })) {
        setAvatarUrl(data.publicUrl);
        toast.success('Profile photo updated');
      }
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!avatarUrl) return;
    setUploading(true);
    if (await persist({ avatar_url: null })) {
      setAvatarUrl('');
      toast.success('Profile photo removed');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    if (await persist({ full_name: fullName.trim(), phone: phone.trim() })) {
      toast.success('Profile saved');
    }
    setSaving(false);
  };

  const email = user?.email || '';
  const accent = userRole && userRole !== 'customer' ? roleColors[userRole].color : adminColors.brand;
  const accentBg = userRole && userRole !== 'customer' ? roleColors[userRole].bg : adminColors.brandSoft;

  return (
    <AdminLayout title="My Profile">
      <PageHeader title="My Profile" subtitle="Your details and photo, shown across the admin panel." />

      {loading ? (
        <SectionCard><Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box></SectionCard>
      ) : (
        <Grid container spacing={2}>
          {/* ── Photo ─────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionCard sx={{ height: '100%' }}>
              <SectionHeading title="Profile photo" subtitle="JPG or PNG, up to 3MB" />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={avatarUrl || undefined}
                    sx={{
                      width: 112, height: 112, fontSize: 36, fontWeight: 800,
                      bgcolor: accentBg, color: accent,
                      border: `3px solid ${adminColors.bgPanel}`, boxShadow: adminColors.shadowMd,
                    }}
                  >
                    {initialsOf(fullName, email)}
                  </Avatar>
                  {uploading && (
                    <Box sx={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.75)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CircularProgress size={28} />
                    </Box>
                  )}
                </Box>

                <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleUpload} />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button
                    variant="outlined" size="small" startIcon={<PhotoCamera />}
                    disabled={uploading} onClick={() => fileRef.current?.click()}
                    sx={{
                      borderRadius: adminColors.radiusMd, textTransform: 'none', fontWeight: 700,
                      color: adminColors.textSecondary, borderColor: adminColors.border,
                      '&:hover': { borderColor: accent, color: accent },
                    }}
                  >
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      size="small" startIcon={<Delete />} disabled={uploading} onClick={handleRemovePhoto}
                      sx={{ borderRadius: adminColors.radiusMd, textTransform: 'none', fontWeight: 700, color: adminColors.danger }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── Details ───────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 8 }}>
            <SectionCard sx={{ height: '100%' }}>
              <SectionHeading title="Your details" subtitle="Name and phone are visible to your team" />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" label="Full name" value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" label="Phone" value={phone}
                    onChange={(e) => setPhone(e.target.value)} placeholder="Optional"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth size="small" label="Email" value={email} disabled
                    helperText="Your sign-in email. Contact an admin to change it."
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained" onClick={handleSave} disabled={saving}
                  sx={{
                    bgcolor: adminColors.brand, '&:hover': { bgcolor: adminColors.brandDark },
                    borderRadius: adminColors.radiusMd, fontWeight: 700, textTransform: 'none',
                    px: 3, boxShadow: 'none',
                  }}
                >
                  {saving ? <CircularProgress size={20} color="inherit" /> : 'Save changes'}
                </Button>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Access — read-only; only an admin can change someone's role */}
              <SectionHeading title="Your access" />
              {userRole && userRole !== 'customer' ? (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.75, borderRadius: adminColors.radiusMd,
                  bgcolor: accentBg, border: `1px solid ${accent}22`,
                }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: adminColors.radiusSm, flexShrink: 0,
                    bgcolor: adminColors.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {ROLE_ICONS[userRole]}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: accent }}>
                        {ROLE_LABELS[userRole]}
                      </Typography>
                      <RoleBadge role={userRole} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: adminColors.textSecondary, mt: 0.2 }}>
                      {ROLE_ACCESS_SUMMARY[userRole]}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted, mt: 1 }}>
                Roles are assigned by an admin from the Team page.
              </Typography>
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </AdminLayout>
  );
}
