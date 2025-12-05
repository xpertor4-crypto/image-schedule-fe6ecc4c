import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WeekStrip } from "@/components/WeekStrip";
import { CategoryTabs } from "@/components/CategoryTabs";
import { DailyProgress } from "@/components/DailyProgress";
import { TaskListItem } from "@/components/TaskListItem";
import { EventDetailsDialog } from "@/components/EventDetailsDialog";
import { AddEventDialog } from "@/components/AddEventDialog";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CalendarHeader } from "@/components/CalendarHeader";
import { useInstallPWA } from "@/hooks/use-install-pwa";
import { addWeeks, subWeeks, isSameDay, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Menu, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoLiveDialog } from "@/components/GoLiveDialog";
import { LiveStreamItem } from "@/components/LiveStreamItem";
import { BroadcasterInterface } from "@/components/BroadcasterInterface";
import { ViewerInterface } from "@/components/ViewerInterface";
import { SimulatedLiveViewer } from "@/components/SimulatedLiveViewer";

interface CalendarEvent {
  id: string;
  title: string;
  type: "visit" | "appointment" | "activity";
  startTime: string;
  endTime: string;
  date: Date;
  description?: string;
  imageUrl?: string;
  category?: string;
  status?: string;
  evidenceUrl?: string;
  completedAt?: string;
}

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  stream_id: string;
  status: string;
  created_at: string;
}

interface CoachLiveVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  is_live: boolean;
  coach_id: string;
  created_at: string;
}

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState("All");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [useCalendarView, setUseCalendarView] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">("week");
  const [isGoLiveDialogOpen, setIsGoLiveDialogOpen] = useState(false);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastData, setBroadcastData] = useState<any>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewerData, setViewerData] = useState<any>(null);
  const [myActiveStream, setMyActiveStream] = useState<LiveStream | null>(null);
  const [coachLiveVideos, setCoachLiveVideos] = useState<CoachLiveVideo[]>([]);
  const [viewingCoachVideo, setViewingCoachVideo] = useState<CoachLiveVideo | null>(null);
  const navigate = useNavigate();
  const { canInstall, handleInstall } = useInstallPWA();

  const categories = ["All", "Other", "Health", "Study", "Work", "Home", "Art"];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchEvents();
      }
      setLoading(false);
    });

    // Load view preference
    const savedView = localStorage.getItem('useCalendarView');
    setUseCalendarView(savedView === 'true');

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchLiveStreams();
      fetchCoachLiveVideos();

      // Subscribe to realtime updates for live streams
      const channel = supabase
        .channel('live-streams-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_stream'
          },
          (payload) => {
            console.log('Live stream change:', payload);
            fetchLiveStreams();
          }
        )
        .subscribe();

      // Subscribe to coach video changes
      const coachChannel = supabase
        .channel('coach-videos-live-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'coach_videos'
          },
          () => {
            fetchCoachLiveVideos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(coachChannel);
      };
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;

      const formattedEvents: CalendarEvent[] = data.map((event) => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        
        // Map category to type for compatibility with existing UI
        let type: "visit" | "appointment" | "activity" = "activity";
        if (event.category === "meeting") type = "appointment";
        else if (event.category === "personal") type = "visit";
        
        return {
          id: event.id,
          title: event.title,
          type,
          startTime: `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`,
          endTime: `${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')}`,
          date: startTime,
          description: event.description || undefined,
          imageUrl: event.image_url || undefined,
          category: event.category,
          status: event.status || undefined,
          evidenceUrl: event.evidence_url || undefined,
          completedAt: event.completed_at || undefined,
        };
      });

      setEvents(formattedEvents);
    } catch (error: any) {
      toast("Error loading events", {
        description: error.message || "Failed to load events",
      });
    }
  };

  const fetchLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from("live_stream")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLiveStreams(data || []);
      
      // Check if current user has an active stream
      if (user) {
        const userStream = (data || []).find(s => s.user_id === user.id);
        setMyActiveStream(userStream || null);
      }
    } catch (error: any) {
      console.error("Error loading live streams:", error);
    }
  };

  const fetchCoachLiveVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("coach_videos")
        .select("*")
        .eq("is_live", true)
        .order("live_started_at", { ascending: false });

      if (error) throw error;

      setCoachLiveVideos(data || []);
    } catch (error: any) {
      console.error("Error loading coach live videos:", error);
    }
  };

  const joinStreamAsViewer = async (stream: LiveStream) => {
    try {
      const { data, error } = await supabase.functions.invoke('stream-management', {
        body: {
          action: 'getViewerToken',
          streamId: stream.stream_id,
        },
      });

      if (error) throw error;

      setViewerData({
        streamId: stream.stream_id,
        token: data.token,
        apiKey: data.apiKey,
        userId: data.userId,
        dbStreamId: stream.id,
        title: stream.title,
      });
      setIsViewing(true);
    } catch (error: any) {
      console.error('Error joining stream:', error);
      toast.error('Failed to join stream');
    }
  };

  const leaveStream = () => {
    setIsViewing(false);
    setViewerData(null);
  };

  const handleGoLiveClick = async () => {
    if (myActiveStream) {
      // Rejoin existing stream
      try {
        const { data, error } = await supabase.functions.invoke('stream-management', {
          body: { action: 'rejoin' },
        });

        if (error) throw error;

        // Handle case where stream no longer exists
        if (data?.noActiveStream) {
          setMyActiveStream(null);
          setIsGoLiveDialogOpen(true);
          toast.info('Your previous stream has ended. Start a new one!');
          return;
        }

        setBroadcastData({
          streamId: data.streamId,
          token: data.token,
          apiKey: data.apiKey,
          dbStreamId: data.dbStreamId,
        });
        setIsBroadcasting(true);
        toast.success('Rejoined your live stream');
      } catch (error: any) {
        console.error('Error rejoining stream:', error);
        // End the orphaned stream and let user start fresh
        try {
          await supabase.functions.invoke('stream-management', {
            body: { action: 'end', streamId: myActiveStream.stream_id },
          });
        } catch (endError) {
          console.error('Error ending orphaned stream:', endError);
        }
        setMyActiveStream(null);
        fetchLiveStreams();
        setIsGoLiveDialogOpen(true);
        toast.info('Previous stream closed. Start a new one!');
      }
    } else {
      // Open dialog to create new stream
      setIsGoLiveDialogOpen(true);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesDate = isSameDay(event.date, currentDate);
    const matchesCategory = activeCategory === "All" || event.category === activeCategory.toLowerCase();
    return matchesDate && matchesCategory;
  });

  const completedCount = filteredEvents.filter(e => e.status === "completed").length;
  const totalCount = filteredEvents.length;

  const handlePreviousWeek = () => {
    setCurrentDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calendar Grid View
  if (useCalendarView) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <CalendarHeader
          currentDate={currentDate}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDownload={handleInstall}
          showDownload={canInstall}
        />
        
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          viewMode={viewMode}
        />

        <AddEventDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onEventAdded={fetchEvents}
          selectedDate={currentDate}
        />

        <EventDetailsDialog
          event={selectedEvent}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          onStatusUpdate={fetchEvents}
        />
      </div>
    );
  }

  // Modern Task List View
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        
        <Badge 
          variant="secondary" 
          className="bg-app-accent text-app-accent-foreground px-4 py-1.5 text-sm font-medium"
        >
          Today
        </Badge>
        
        <Button 
          onClick={handleGoLiveClick}
          className="rounded-full px-4 py-2 text-sm font-medium"
          variant={myActiveStream ? "secondary" : "default"}
        >
          {myActiveStream ? "Continue Live" : "Go Live"}
        </Button>
      </div>

      {/* Week Strip */}
      <WeekStrip currentDate={currentDate} onDateSelect={setCurrentDate} />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Progress */}
      <DailyProgress completed={completedCount} total={totalCount} />

      {/* Task List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-20">
          {/* Live Streams */}
          {(liveStreams.length > 0 || coachLiveVideos.length > 0) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">
                Live Now
              </h3>
              {liveStreams.map((stream) => (
                <LiveStreamItem
                  key={stream.id}
                  stream={stream}
                  onClick={() => joinStreamAsViewer(stream)}
                />
              ))}
              {coachLiveVideos.map((video) => (
                <LiveStreamItem
                  key={`coach-${video.id}`}
                  stream={{
                    id: video.id,
                    title: video.title,
                    user_id: video.coach_id,
                    stream_id: video.id,
                    status: 'active',
                    created_at: video.created_at,
                  }}
                  onClick={() => setViewingCoachVideo(video)}
                  isCoachVideo
                />
              ))}
            </div>
          )}

          {/* Tasks */}
          {filteredEvents.length === 0 && liveStreams.length === 0 && coachLiveVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tasks or live streams for today</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <>
              {(liveStreams.length > 0 || coachLiveVideos.length > 0) && (
                <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2 mt-4">
                  Today's Tasks
                </h3>
              )}
              {filteredEvents.map((event) => (
                <TaskListItem
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                />
              ))}
            </>
          ) : null}
        </div>
      </ScrollArea>

      {/* Floating Add Button - hidden when viewing stream */}
      {!isViewing && (
        <div className="fixed bottom-24 right-6 z-50">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-app-accent hover:bg-app-accent/90 text-app-accent-foreground shadow-lg"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <AddEventDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onEventAdded={fetchEvents}
        selectedDate={currentDate}
        showTrigger={false}
      />

      <EventDetailsDialog
        event={selectedEvent}
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onStatusUpdate={fetchEvents}
      />

      <GoLiveDialog
        open={isGoLiveDialogOpen}
        onOpenChange={setIsGoLiveDialogOpen}
        onStreamCreated={(data) => {
          setBroadcastData({
            streamId: data.streamId,
            token: data.token,
            apiKey: data.apiKey,
            dbStreamId: data.dbStreamId,
          });
          setIsBroadcasting(true);
          fetchLiveStreams();
        }}
      />

      {isBroadcasting && broadcastData && (
        <BroadcasterInterface
          streamId={broadcastData.streamId}
          token={broadcastData.token}
          apiKey={broadcastData.apiKey}
          dbStreamId={broadcastData.dbStreamId}
          onEndStream={() => {
            setIsBroadcasting(false);
            setBroadcastData(null);
            setMyActiveStream(null);
            fetchLiveStreams();
          }}
        />
      )}

      {isViewing && viewerData && (
        <ViewerInterface
          streamId={viewerData.streamId}
          token={viewerData.token}
          apiKey={viewerData.apiKey}
          userId={viewerData.userId}
          dbStreamId={viewerData.dbStreamId}
          onLeave={leaveStream}
        />
      )}

      {viewingCoachVideo && (
        <SimulatedLiveViewer
          video={viewingCoachVideo}
          onEnd={() => setViewingCoachVideo(null)}
          isHost={false}
        />
      )}
    </div>
  );
};

export default Index;
