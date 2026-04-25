-- Schedule daily AI discovery at 05:00 UTC (~10:30 AM IST)
select cron.schedule(
  'discover-communities-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://mrnmzweiobttwlmvsuqo.supabase.co/functions/v1/discover-communities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybm16d2Vpb2J0dHdsbXZzdXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjgyNTAsImV4cCI6MjA5MjQ0NDI1MH0.vzunfz6TzmERTZGuZYXjHVU4-bvKBmYpGGf7Bk03UmE"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);