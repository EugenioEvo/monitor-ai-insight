
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const googleCloudApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
const gcpCredentials = Deno.env.get('GCP_VISION_CREDENTIALS');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Google Vision OCR] Function started');
    
    if (!googleCloudApiKey || googleCloudApiKey === 'your-google-key-here') {
      console.error('[Google Vision OCR] API key not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Google Cloud API key not configured',
        error_type: 'ConfigurationError'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { base64Data, fileName } = requestBody;

    console.log(`[Google Vision OCR] Processing file: ${fileName}`);

    if (!base64Data) {
      console.error('[Google Vision OCR] Missing base64Data');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing base64Data parameter',
        error_type: 'ValidationError'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    console.log('[Google Vision OCR] Calling Google Vision API...');
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Data
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Vision OCR] API error:', errorText);
      throw new Error(`Google Vision API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const textAnnotation = result.responses[0]?.textAnnotations?.[0];
    
    if (!textAnnotation) {
      throw new Error('No text detected by Google Vision');
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Google Vision OCR] Processing completed in ${processingTime}ms`);

    const ocrResult = {
      success: true,
      engine: 'google_vision',
      text: textAnnotation.description,
      confidence_score: textAnnotation.confidence || 0.9,
      processing_time_ms: processingTime,
      cost_estimate: 0.005,
      fileName: fileName
    };

    return new Response(JSON.stringify(ocrResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Vision OCR] Function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error',
      error_type: error.name || 'InternalError'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
