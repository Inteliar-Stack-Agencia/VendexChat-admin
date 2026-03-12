-- Create a public bucket for store images (logo, banner, sliders)
insert into storage.buckets (id, name, public)
values ('stores', 'stores', true)
on conflict (id) do nothing;

-- Allow public read access to store images
create policy "Public Access stores"
on storage.objects for select
using ( bucket_id = 'stores' );

-- Allow authenticated uploads to stores bucket
create policy "Authenticated uploads stores"
on storage.objects for insert
with check (
  bucket_id = 'stores'
  and auth.role() = 'authenticated'
);

-- Allow authenticated updates to stores bucket
create policy "Authenticated updates stores"
on storage.objects for update
using (
  bucket_id = 'stores'
  and auth.role() = 'authenticated'
);

-- Allow authenticated deletes from stores bucket
create policy "Authenticated deletes stores"
on storage.objects for delete
using (
  bucket_id = 'stores'
  and auth.role() = 'authenticated'
);
