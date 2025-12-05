-- Create storage bucket for coach videos
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-videos', 'coach-videos', true);

-- Storage policies for coach videos
CREATE POLICY "Coaches can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'coach-videos' 
  AND public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Anyone can view coach videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-videos');

CREATE POLICY "Coaches can delete their videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'coach-videos' 
  AND public.has_role(auth.uid(), 'coach')
);

-- Create table for coach videos metadata
CREATE TABLE public.coach_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  is_live BOOLEAN DEFAULT false,
  live_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view coach videos"
ON public.coach_videos FOR SELECT
USING (true);

CREATE POLICY "Coaches can create their own videos"
ON public.coach_videos FOR INSERT
WITH CHECK (
  auth.uid() = coach_id 
  AND public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update their own videos"
ON public.coach_videos FOR UPDATE
USING (
  auth.uid() = coach_id 
  AND public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete their own videos"
ON public.coach_videos FOR DELETE
USING (
  auth.uid() = coach_id 
  AND public.has_role(auth.uid(), 'coach')
);

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_videos;

-- Update trigger
CREATE TRIGGER update_coach_videos_updated_at
BEFORE UPDATE ON public.coach_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();