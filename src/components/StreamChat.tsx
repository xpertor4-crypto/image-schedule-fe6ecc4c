import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface StreamMessage {
  id: string;
  stream_id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

interface StreamChatProps {
  streamId: string; // Database UUID of the live_stream
}

export const StreamChat = ({ streamId }: StreamChatProps) => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [displayName, setDisplayName] = useState('Anonymous');
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user info
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Get display name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        } else {
          setDisplayName(user.email?.split('@')[0] || 'Anonymous');
        }
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('stream_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`stream-chat-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newMsg = payload.new as StreamMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userId) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('stream_messages').insert({
        stream_id: streamId,
        user_id: userId,
        display_name: displayName,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold">Live Chat</h3>
      </div>

      <form onSubmit={handleSendMessage} className="p-2 border-b border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 h-8 text-sm"
            disabled={!userId || isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8"
            disabled={!userId || isSending || !newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No messages yet. Be the first to chat!
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-semibold text-primary">
                  {msg.display_name}:
                </span>{' '}
                <span className="text-foreground">{msg.content}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
