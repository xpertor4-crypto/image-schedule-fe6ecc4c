import { useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  ParticipantView,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StreamChat } from "./StreamChat";

interface BroadcasterInterfaceProps {
  streamId: string;
  token: string;
  apiKey: string;
  dbStreamId: string; // Database UUID for chat
  onEndStream: () => void;
}

const BroadcasterControls = ({ onEndStream }: { onEndStream: () => void }) => {
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const { camera, isMute: isCameraMuted } = useCameraState();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const [isEnding, setIsEnding] = useState(false);

  const handleEndStream = async () => {
    setIsEnding(true);
    try {
      await onEndStream();
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card/90 backdrop-blur-sm border border-border rounded-full px-4 py-3 shadow-lg z-10">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => camera.toggle()}
      >
        {isCameraMuted ? (
          <VideoOff className="h-4 w-4" />
        ) : (
          <Video className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => microphone.toggle()}
      >
        {isMicMuted ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={handleEndStream}
        disabled={isEnding}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StreamView = ({ onEndStream, dbStreamId }: { onEndStream: () => void; dbStreamId: string }) => {
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Video area */}
      <div className="absolute inset-0 md:right-80">
        {localParticipant && (
          <ParticipantView
            participant={localParticipant}
            ParticipantViewUI={null}
          />
        )}
        <div className="absolute top-4 left-4 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full font-semibold flex items-center gap-2 z-10">
          <span className="h-3 w-3 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
        <BroadcasterControls onEndStream={onEndStream} />
      </div>
      
      {/* Chat sidebar - desktop */}
      <div className="hidden md:flex absolute top-0 right-0 w-80 h-full p-2">
        <StreamChat streamId={dbStreamId} />
      </div>
      
      {/* Mobile chat overlay */}
      <div className="md:hidden absolute bottom-20 left-2 right-2 h-48 z-20">
        <StreamChat streamId={dbStreamId} />
      </div>
    </div>
  );
};

export const BroadcasterInterface = ({
  streamId,
  token,
  apiKey,
  dbStreamId,
  onEndStream,
}: BroadcasterInterfaceProps) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeStream = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Initialize Stream Video Client
        const videoClient = new StreamVideoClient({
          apiKey,
          user: {
            id: user.id,
            name: user.email || "Anonymous",
          },
          token,
        });

        // Create and join the livestream call
        const livestreamCall = videoClient.call("livestream", streamId);
        await livestreamCall.join({ create: true });

        // Enable camera and microphone
        await livestreamCall.camera.enable();
        await livestreamCall.microphone.enable();
        
        // Start broadcasting - makes the stream available for viewers
        await livestreamCall.goLive();

        setClient(videoClient);
        setCall(livestreamCall);
        setIsInitializing(false);
        
        toast.success("You're now live!");
      } catch (error: any) {
        console.error("Error initializing stream:", error);
        toast.error(error.message || "Failed to initialize stream");
        onEndStream();
      }
    };

    initializeStream();

    return () => {
      if (call) {
        call.leave();
      }
      if (client) {
        client.disconnectUser();
      }
    };
  }, [streamId, token, apiKey]);

  const handleEndStream = async () => {
    try {
      // Leave the call
      if (call) {
        await call.leave();
      }

      // Disconnect client
      if (client) {
        await client.disconnectUser();
      }

      // Update stream status in database
      const { error } = await supabase.functions.invoke("stream-management", {
        body: {
          action: "end",
          streamId,
        },
      });

      if (error) throw error;

      toast.success("Live stream ended");
      onEndStream();
    } catch (error: any) {
      console.error("Error ending stream:", error);
      toast.error(error.message || "Failed to end stream");
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Initializing camera...</p>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return null;
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <StreamView onEndStream={handleEndStream} dbStreamId={dbStreamId} />
      </StreamCall>
    </StreamVideo>
  );
};
