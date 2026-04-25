// Edge function: AI-powered freelancer community discovery
// Uses Lovable AI (Gemini with Google Search grounding) to find active India-focused
// freelancer communities on WhatsApp, Telegram, Reddit, LinkedIn — and stores them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Community {
  name: string;
  platform: string; // WhatsApp | Telegram | Reddit | LinkedIn
  member_count: number | null;
  skills: string[]; // Design, Dev, Writing, Marketing
  city: string | null;
  summary: string;
  join_link: string | null;
}

const VALID_PLATFORMS = ["WhatsApp", "Telegram", "Reddit", "LinkedIn"];
const VALID_SKILLS = ["Design", "Dev", "Writing", "Marketing"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a research assistant who finds active, public freelancer communities online.

Your task: Return a JSON list of 10-15 ACTIVE, PUBLIC freelancer communities relevant to India-based designers, developers, writers and marketers.

Look across WhatsApp groups (public invite links), Telegram channels/groups, Reddit subreddits, and LinkedIn Groups.

Hard rules:
- Only include real, well-known, currently active communities. Do not invent links.
- Prefer India-based or India-friendly communities. Global communities popular with Indian freelancers are also OK.
- "join_link" must be a real public URL (e.g. https://t.me/..., https://www.reddit.com/r/..., https://www.linkedin.com/groups/..., https://chat.whatsapp.com/...). If you are unsure of the exact link, set join_link to null — never fabricate.
- "member_count" is your best estimate as an integer (or null if unknown).
- "skills" is an array using ONLY these values: "Design", "Dev", "Writing", "Marketing". Pick all that apply.
- "platform" is exactly one of: "WhatsApp", "Telegram", "Reddit", "LinkedIn".
- "summary" is 2 sentences max, plain language, no marketing fluff.
- Vary skills across the list. Don't return 15 dev-only groups.

Return ONLY a JSON object: { "communities": Community[] }. No prose.`;

    const userPrompt = `Find active freelancer communities for designers, developers, writers, and marketers — with a strong India focus. Include a healthy mix across WhatsApp, Telegram, Reddit, and LinkedIn.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_communities",
              description: "Return discovered freelancer communities",
              parameters: {
                type: "object",
                properties: {
                  communities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        platform: { type: "string", enum: VALID_PLATFORMS },
                        member_count: { type: ["integer", "null"] },
                        skills: {
                          type: "array",
                          items: { type: "string", enum: VALID_SKILLS },
                        },
                        city: { type: ["string", "null"] },
                        summary: { type: "string" },
                        join_link: { type: ["string", "null"] },
                      },
                      required: ["name", "platform", "skills", "summary"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["communities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_communities" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Top up your Lovable AI usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Discovery failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { communities?: Community[] } = {};
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch (e) {
      console.error("parse error", e);
    }

    const communities = (parsed.communities ?? []).filter((c) => {
      if (!c?.name || !c?.platform || !c?.summary) return false;
      if (!VALID_PLATFORMS.includes(c.platform)) return false;
      return true;
    });

    if (communities.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, communities: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Upsert by lowercase join_link (or name if no link). Use a manual approach:
    // pull existing, dedupe in memory, insert only new ones.
    const { data: existing } = await supabase
      .from("discovered_communities")
      .select("id, join_link, name");

    const seen = new Set<string>(
      (existing ?? []).map((r: { join_link: string | null; name: string }) =>
        (r.join_link ?? r.name ?? "").toLowerCase().trim(),
      ),
    );

    const fresh = communities.filter((c) => {
      const key = (c.join_link ?? c.name).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted: unknown[] = [];
    if (fresh.length > 0) {
      const { data: insRes, error: insErr } = await supabase
        .from("discovered_communities")
        .insert(
          fresh.map((c) => ({
            name: c.name,
            platform: c.platform,
            member_count: c.member_count ?? null,
            skills: c.skills ?? [],
            city: c.city ?? null,
            summary: c.summary,
            join_link: c.join_link ?? null,
            discovered_at: new Date().toISOString(),
          })),
        )
        .select();
      if (insErr) {
        console.error("insert error", insErr);
      } else {
        inserted = insRes ?? [];
      }
    }

    return new Response(
      JSON.stringify({ inserted: inserted.length, total_found: communities.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("discover-communities error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
