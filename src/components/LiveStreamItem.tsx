import { Badge } from "@/components/ui/badge";
import { Video, Film } from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  stream_id: string;
  status: string;
  created_at: string;
}

interface LiveStreamItemProps {
  stream: LiveStream;
  onClick: () => void;
  isCoachVideo?: boolean;
}

export const LiveStreamItem = ({ stream, onClick, isCoachVideo }: LiveStreamItemProps) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border cursor-pointer hover:bg-accent/50 transition-colors group"
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${isCoachVideo ? 'bg-primary/10' : 'bg-destructive/10'}`}>
        {isCoachVideo ? (
          <Film className="h-5 w-5 text-primary" />
        ) : (
          <Video className="h-5 w-5 text-destructive" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{stream.title}</h3>
          <Badge variant="destructive" className="shrink-0 animate-pulse">
            LIVE
          </Badge>
          {isCoachVideo && (
            <Badge variant="secondary" className="shrink-0">
              Coach
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
          Click to watch • {isCoachVideo ? 'Coach streaming' : 'Live stream in progress'}
        </p>
      </div>
    </div>
  );
};