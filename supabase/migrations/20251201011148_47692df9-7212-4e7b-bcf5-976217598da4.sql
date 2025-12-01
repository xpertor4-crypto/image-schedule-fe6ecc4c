-- Create live_stream table
CREATE TABLE public.live_stream (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  stream_id text NOT NULL,
  stream_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT live_stream_status_check CHECK (status IN ('active', 'inactive'))
);

-- Enable Row Level Security
ALTER TABLE public.live_stream ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view all live streams" 
ON public.live_stream 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own live streams" 
ON public.live_stream 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own live streams" 
ON public.live_stream 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own live streams" 
ON public.live_stream 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for live_stream table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream;