-- Create chat-media storage bucket for Chat page file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 104857600, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-media bucket
CREATE POLICY "Anyone can view chat media" ON storage.objects 
FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can upload chat media" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own chat media" ON storage.objects 
FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);