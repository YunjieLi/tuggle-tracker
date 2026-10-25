insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-pictures', 'profile-pictures', false, 1048576, array['image/png'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own profile picture"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.filename(name) = 'avatar.png'
);

create policy "Users can upload own profile picture"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.filename(name) = 'avatar.png'
);

create policy "Users can update own profile picture"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.filename(name) = 'avatar.png'
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.filename(name) = 'avatar.png'
);
