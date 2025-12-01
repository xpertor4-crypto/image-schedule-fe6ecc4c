import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GETSTREAM_API_KEY = Deno.env.get('GETSTREAM_API_KEY');
    const GETSTREAM_API_SECRET = Deno.env.get('GETSTREAM_API_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GETSTREAM_API_KEY || !GETSTREAM_API_SECRET) {
      throw new Error('GetStream credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, title, streamId } = await req.json();
    console.log('Stream management action:', action, { title, streamId, userId: user.id });

    if (action === 'create') {
      // Generate unique stream ID
      const uniqueStreamId = `stream_${user.id}_${Date.now()}`;
      
      // Generate Stream token using JWT
      const payload = {
        user_id: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      };

      const streamToken = await generateStreamToken(payload, GETSTREAM_API_SECRET);

      // Insert into database
      const { data: streamData, error: insertError } = await supabase
        .from('live_stream')
        .insert({
          user_id: user.id,
          title,
          stream_id: uniqueStreamId,
          stream_token: streamToken,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting stream:', insertError);
        throw insertError;
      }

      console.log('Stream created successfully:', streamData);

      return new Response(
        JSON.stringify({
          streamId: uniqueStreamId,
          token: streamToken,
          apiKey: GETSTREAM_API_KEY,
          data: streamData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'end') {
      // Update stream status to inactive
      const { error: updateError } = await supabase
        .from('live_stream')
        .update({
          status: 'inactive',
          ended_at: new Date().toISOString(),
        })
        .eq('stream_id', streamId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error ending stream:', updateError);
        throw updateError;
      }

      console.log('Stream ended successfully:', streamId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in stream-management:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simple JWT generation for GetStream
async function generateStreamToken(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  
  const message = `${headerB64}.${payloadB64}`;
  const messageBytes = encoder.encode(message);
  const secretBytes = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageBytes);
  const signatureB64 = base64urlEncode(signature);
  
  return `${message}.${signatureB64}`;
}

function base64urlEncode(data: string | ArrayBuffer): string {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}