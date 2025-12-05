import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Video, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface CoachVideoCardProps {
  video: CoachVideo;
  onGoLive: () => void;
  onDelete: () => void;
}

export const CoachVideoCard = ({ video, onGoLive, onDelete }: CoachVideoCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted">
        <video
          src={video.video_url}
          className="w-full h-full object-cover"
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <Video className="h-12 w-12 text-white/80" />
        </div>
        {video.is_live && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 left-2 flex items-center gap-1"
          >
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground">
          Uploaded {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
        </p>
      </CardContent>

      <CardFooter className="gap-2">
        {video.is_live ? (
          <Button 
            className="flex-1" 
            variant="destructive"
            onClick={onGoLive}
          >
            <Radio className="h-4 w-4 mr-2 animate-pulse" />
            View Live
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            onClick={onGoLive}
          >
            <Play className="h-4 w-4 mr-2" />
            Go Live
          </Button>
        )}
        <Button 
          variant="outline" 
          size="icon"
          onClick={onDelete}
          disabled={video.is_live}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
