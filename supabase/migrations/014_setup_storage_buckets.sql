-- Create a public bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Set up RLS policies for product-images bucket
-- Allow public read access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Allow authenticated uploads
create policy "Authenticated uploads"
on storage.objects for insert
with check (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated updates
create policy "Authenticated updates"
on storage.objects for update
using (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated deletes
create policy "Authenticated deletes"
on storage.objects for delete
using (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
);
