import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreamChat } from "@/components/StreamChat";
import { 
  ArrowLeft, 
  Radio, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoachVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_live: boolean;
}

interface SimulatedLiveViewerProps {
  video: CoachVideo;
  onEnd: () => void;
  isHost?: boolean;
}

export const SimulatedLiveViewer = ({ video, onEnd, isHost = false }: SimulatedLiveViewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-play when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }

    // Simulate viewer count updates
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleVideoEnd = () => {
    if (isHost) {
      onEnd();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row"
    >
      {/* Video Area */}
      <div className="relative flex-1 md:mr-80">
        <video
          ref={videoRef}
          src={video.video_url}
          className="w-full h-full object-contain"
          playsInline
          onEnded={handleVideoEnd}
        />

        {/* Overlay Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={onEnd}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {viewerCount}
                  </Badge>
                </div>
                <h1 className="text-white font-semibold mt-1">{video.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* End Stream Button for Host */}
        {isHost && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto">
            <Button 
              variant="destructive" 
              onClick={onEnd}
              className="w-full md:w-auto"
            >
              End Live Stream
            </Button>
          </div>
        )}
      </div>

      {/* Chat Sidebar - Desktop */}
      <div className="hidden md:flex absolute top-0 right-0 w-80 h-full p-2">
        <StreamChat streamId={video.id} />
      </div>

      {/* Mobile Chat Overlay */}
      <div className="md:hidden absolute bottom-20 left-2 right-2 h-48 z-20">
        <StreamChat streamId={video.id} />
      </div>
    </div>
  );
};
