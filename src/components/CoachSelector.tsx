import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  email?: string;
  unread_count?: number;
}

interface CoachSelectorProps {
  onSelectCoach: (coachId: string, coachName: string) => void;
  selectedCoachId?: string;
}

const CoachSelector = ({ onSelectCoach, selectedCoachId }: CoachSelectorProps) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
    
    // Subscribe to profile changes
    const channel = supabase
      .channel('profiles-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          if (currentUserId) {
            fetchPeople(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const userIsCoach = roleData?.role === 'coach';
      setIsCoach(userIsCoach);
      
      await fetchPeople(user.id, userIsCoach);
    } catch (error: any) {
      toast({
        title: "Error checking role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPeople = async (userId: string, userIsCoach?: boolean) => {
    try {
      const isCoachRole = userIsCoach ?? isCoach;

      if (isCoachRole) {
        // Fetch users who have messaged this coach
        const { data: conversations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        if (!conversations || conversations.length === 0) {
          setPeople([]);
          return;
        }

        const conversationIds = conversations.map(c => c.conversation_id);

        // Get conversation details with last message timestamps
        const { data: conversationDetails } = await supabase
          .from('conversations')
          .select('id, last_message_at')
          .in('id', conversationIds);

        // Get all participants from these conversations (excluding the coach)
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, conversation_id')
          .in('conversation_id', conversationIds)
          .neq('user_id', userId);

        if (!participants || participants.length === 0) {
          setPeople([]);
          return;
        }

        const userIds = [...new Set(participants.map(p => p.user_id))];

        // Get profiles and emails for these users
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        // Get last message timestamp and unread count for each user
        const peopleWithDetails = await Promise.all(
          (userProfiles || []).map(async (profile) => {
            // Find the conversation with this user
            const userConversation = participants.find(p => p.user_id === profile.id);
            const conversationDetail = conversationDetails?.find(c => c.id === userConversation?.conversation_id);
            
            // Get unread message count for this conversation
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', userConversation?.conversation_id)
              .neq('sender_id', userId)
              .is('read_at', null);
            
            return {
              ...profile,
              lastMessageAt: conversationDetail?.last_message_at || null,
              unread_count: unreadCount || 0
            };
          })
        );

        // Sort by latest message (most recent first)
        const sortedPeople = peopleWithDetails.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });

        setPeople(sortedPeople);
      } else {
        // Fetch coaches (existing behavior)
        const { data: coachRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'coach');

        if (!coachRoles) {
          setPeople([]);
          return;
        }

        const coachIds = coachRoles.map(r => r.user_id);

        const { data: coachProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', coachIds);

        setPeople(coachProfiles || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading people",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectPerson = (person: Person) => {
    onSelectCoach(person.id, person.display_name);
    setOpen(false);
  };

  const getInitials = (person: Person) => {
    if (person.avatar_url) return "";
    
    // Use first letter of email if no display name or avatar
    if (person.email) {
      return person.email.charAt(0).toUpperCase();
    }
    
    return person.display_name.substring(0, 2).toUpperCase();
  };

  const selectedPerson = people.find(p => p.id === selectedCoachId);
  const label = isCoach ? "Select User" : "Select Coach";

  return (
    <>
      {people.length === 0 ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">?</span>
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </button>
      ) : (
        <ScrollArea className="w-full max-w-[300px]">
          <div className="flex items-center gap-1.5 pb-2">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => setOpen(true)}
                className="relative group flex-shrink-0"
                title={person.display_name}
              >
                <Avatar className="w-10 h-10 border-2 border-background hover:border-primary transition-all hover:scale-110">
                  <AvatarImage src={person.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 font-semibold">
                    {getInitials(person)}
                  </AvatarFallback>
                </Avatar>
                {person.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
                {person.unread_count && person.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {person.unread_count > 9 ? '9+' : person.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelectPerson(person)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:border-primary hover:bg-accent ${
                    selectedCoachId === person.id ? 'border-primary bg-accent' : 'border-transparent bg-muted/30'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10 font-semibold">
                        {getInitials(person)}
                      </AvatarFallback>
                    </Avatar>
                    {person.is_online && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-foreground">{person.display_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{person.is_online ? 'Online' : 'Offline'}</span>
                      {person.unread_count && person.unread_count > 0 && (
                        <span className="text-xs font-semibold text-red-500">
                          • {person.unread_count} unread
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedCoachId === person.id && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoachSelector;
