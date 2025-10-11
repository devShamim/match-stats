-- SQL to set up Supabase Storage for player profile images
-- Run this in your Supabase SQL Editor

-- Create storage bucket for player images
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-images', 'player-images', true);

-- Create storage policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload player images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'player-images' AND
  auth.role() = 'authenticated'
);

-- Create storage policy to allow everyone to view player images
CREATE POLICY "Anyone can view player images" ON storage.objects
FOR SELECT USING (bucket_id = 'player-images');

-- Create storage policy to allow users to update their own images
CREATE POLICY "Users can update their own player images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'player-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policy to allow users to delete their own images
CREATE POLICY "Users can delete their own player images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'player-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional: Create a function to generate unique file names
CREATE OR REPLACE FUNCTION generate_player_image_path(user_id UUID, file_extension TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'player-images/' || user_id::text || '/' || gen_random_uuid()::text || '.' || file_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
