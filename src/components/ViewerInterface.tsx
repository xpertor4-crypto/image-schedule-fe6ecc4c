import { useEffect, useState } from 'react';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  ParticipantView,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ViewerInterfaceProps {
  streamId: string;
  token: string;
  apiKey: string;
  userId: string;
  onLeave: () => void;
}

const StreamView = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  
  const remoteParticipants = participants.filter(p => !p.isLocalParticipant);

  if (remoteParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground">Waiting for broadcaster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ParticipantView
        participant={remoteParticipants[0]}
        className="w-full h-full"
      />
      <div className="absolute top-4 left-4">
        <div className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold animate-pulse">
          LIVE
        </div>
      </div>
    </div>
  );
};

export const ViewerInterface = ({ 
  streamId, 
  token, 
  apiKey, 
  userId,
  onLeave 
}: ViewerInterfaceProps) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const streamClient = new StreamVideoClient({
          apiKey,
          user: { id: userId },
          token,
        });

        const liveCall = streamClient.call('livestream', streamId);
        await liveCall.join();

        setClient(streamClient);
        setCall(liveCall);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing viewer:', err);
        setError(err.message || 'Failed to join stream');
        setIsLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (call) {
        call.leave().catch(console.error);
      }
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, [streamId, token, apiKey, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Connecting to stream...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={onLeave}>Go Back</Button>
      </div>
    );
  }

  if (!client || !call) {
    return null;
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="relative w-full h-screen bg-background">
          <div className="absolute top-4 right-4 z-50">
            <Button
              onClick={onLeave}
              variant="secondary"
              size="icon"
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <StreamView />
        </div>
      </StreamCall>
    </StreamVideo>
  );
};
