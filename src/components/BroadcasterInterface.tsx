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

interface BroadcasterInterfaceProps {
  streamId: string;
  token: string;
  apiKey: string;
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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card/95 backdrop-blur-sm border border-border rounded-full px-6 py-4 shadow-lg">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-12 w-12"
        onClick={() => camera.toggle()}
      >
        {isCameraMuted ? (
          <VideoOff className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-12 w-12"
        onClick={() => microphone.toggle()}
      >
        {isMicMuted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        className="rounded-full h-12 w-12"
        onClick={handleEndStream}
        disabled={isEnding}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
};

const StreamView = ({ onEndStream }: { onEndStream: () => void }) => {
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  return (
    <div className="relative w-full h-screen bg-background">
      <div className="absolute inset-0">
        {localParticipant && (
          <ParticipantView
            participant={localParticipant}
            ParticipantViewUI={null}
          />
        )}
      </div>
      
      <div className="absolute top-4 left-4 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full font-semibold flex items-center gap-2">
        <span className="h-3 w-3 bg-white rounded-full animate-pulse" />
        LIVE
      </div>

      <BroadcasterControls onEndStream={onEndStream} />
    </div>
  );
};

export const BroadcasterInterface = ({
  streamId,
  token,
  apiKey,
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
        <StreamView onEndStream={handleEndStream} />
      </StreamCall>
    </StreamVideo>
  );
};
