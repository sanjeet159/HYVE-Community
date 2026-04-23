// Edge function: AI-powered "Why join Hyve?" suggestions
// Streams 3 short, personalized first-person reasons based on the applicant's profile.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  full_name?: string;
  primary_skill?: string;
  other_specialization?: string | null;
  experience?: string;
  city?: string;
  current_text?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: Body = await req.json().catch(() => ({}));

    const skill =
      body.primary_skill === "Other" && body.other_specialization
        ? body.other_specialization
        : body.primary_skill || "creative work";

    const profileBits = [
      body.full_name && `Name: ${body.full_name}`,
      `Primary skill: ${skill}`,
      body.experience && `Experience: ${body.experience} years`,
      body.city && `City: ${body.city}`,
      body.current_text && `What they've started writing: "${body.current_text}"`,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are a warm, thoughtful copywriter helping freelancers fill out a community application for "Hyve" — a curated WhatsApp community of designers, developers, writers and marketers.

Your job: write 3 SHORT, personal, first-person suggestions for "Why do you want to join Hyve?".

Rules:
- Each suggestion: 2-3 sentences max, sounds like a real human, not corporate.
- Match the applicant's craft and experience level.
- Vary the angles: e.g. one about community/peers, one about growth/learning, one about projects/work.
- No emojis. No clichés like "passionate" or "synergy". No exclamation marks.
- If they've already started typing, gently build on their direction — don't ignore it.
- Return ONLY a JSON object with a "suggestions" array of 3 strings. No prose, no markdown.`;

    const userPrompt = `Applicant profile:\n${profileBits}\n\nGenerate 3 distinct suggestions.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI request failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { suggestions?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 3)
      : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-why-join error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
