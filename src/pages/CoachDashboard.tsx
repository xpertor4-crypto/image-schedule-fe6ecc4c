import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VideoUpload } from "@/components/VideoUpload";
import { CoachVideoCard } from "@/components/CoachVideoCard";
import { SimulatedLiveViewer } from "@/components/SimulatedLiveViewer";
import { ArrowLeft, Upload, Video } from "lucide-react";
import { toast } from "sonner";

interface CoachVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  is_live: boolean;
  live_started_at: string | null;
  created_at: string;
}

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<CoachVideo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<CoachVideo | null>(null);

  useEffect(() => {
    checkCoachRole();
    fetchVideos();
    
    // Subscribe to video changes for real-time updates
    const channel = supabase
      .channel('coach-videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_videos'
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkCoachRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'coach');

    setIsCoach(roles && roles.length > 0);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('coach_videos')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return;
    }

    setVideos(data || []);
  };

  const handleGoLive = async (video: CoachVideo) => {
    const { error } = await supabase
      .from('coach_videos')
      .update({ 
        is_live: true, 
        live_started_at: new Date().toISOString() 
      })
      .eq('id', video.id);

    if (error) {
      toast.error('Failed to start live stream');
      return;
    }

    toast.success('Video is now live!');
    setViewingVideo({ ...video, is_live: true });
  };

  const handleEndLive = async (videoId: string) => {
    const { error } = await supabase
      .from('coach_videos')
      .update({ 
        is_live: false, 
        live_started_at: null 
      })
      .eq('id', videoId);

    if (error) {
      toast.error('Failed to end live stream');
      return;
    }

    toast.success('Live stream ended');
    setViewingVideo(null);
  };

  const handleDeleteVideo = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    // Delete from storage first
    const fileName = video.video_url.split('/').pop();
    if (fileName) {
      await supabase.storage.from('coach-videos').remove([fileName]);
    }

    // Delete from database
    const { error } = await supabase
      .from('coach_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      toast.error('Failed to delete video');
      return;
    }

    toast.success('Video deleted');
    fetchVideos();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Video className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-4">
          Only coaches can access this dashboard.
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  if (viewingVideo) {
    return (
      <SimulatedLiveViewer
        video={viewingVideo}
        onEnd={() => handleEndLive(viewingVideo.id)}
        isHost={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Coach Dashboard</h1>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">No Videos Yet</h2>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first video to start streaming
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <CoachVideoCard
                key={video.id}
                video={video}
                onGoLive={() => handleGoLive(video)}
                onDelete={() => handleDeleteVideo(video.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <VideoUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={() => {
          fetchVideos();
          setShowUpload(false);
        }}
      />
    </div>
  );
}
