-- =====================================================================
-- RJNX GAMING ESPORTS — seed data (idempotent)
-- Safe to run multiple times. Reference data (games, scoring rules,
-- settings, banners, news) is created once and never duplicated.
--
-- DEMO TOURNAMENTS are only created when the platform setting
-- `seed_demo_data` is true (defaults to true in development).
-- Set it to false from the admin panel before going live.
-- =====================================================================

insert into rjnx.platform_settings (key, value, description)
values ('seed_demo_data', 'true'::jsonb, 'Create demo tournaments/teams on seed run')
on conflict (key) do nothing;

-- ------------------------------------------------------------------ games
insert into rjnx.games (slug, name, short_name, sort_order) values
  ('free-fire', 'Free Fire', 'FF', 1),
  ('free-fire-max', 'Free Fire MAX', 'FF MAX', 2),
  ('bgmi', 'BGMI', 'BGMI', 3),
  ('pubg-mobile', 'PUBG Mobile', 'PUBGM', 4),
  ('call-of-duty-mobile', 'Call of Duty Mobile', 'CODM', 5),
  ('valorant', 'Valorant', 'VAL', 6),
  ('mobile-legends', 'Mobile Legends', 'MLBB', 7),
  ('minecraft', 'Minecraft', 'MC', 8)
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------- scoring rules
insert into rjnx.scoring_rules (name, placement_points, kill_points, bonus_rules, tie_breakers, is_default)
select
  'RJNX Battle Royale Standard',
  '[{"placement":1,"points":12},{"placement":2,"points":9},{"placement":3,"points":7},{"placement":4,"points":5},{"placement":5,"points":4},{"placement":6,"points":3},{"placement":7,"points":2},{"placement":8,"points":1},{"placement":9,"points":0},{"placement":10,"points":0}]'::jsonb,
  1,
  '{"chicken_dinner": 2}'::jsonb,
  array['total_points','kills','best_placement','wins'],
  true
where not exists (select 1 from rjnx.scoring_rules where is_default = true);

insert into rjnx.scoring_rules (name, placement_points, kill_points, bonus_rules, tie_breakers, is_default)
select
  'RJNX Elimination Series',
  '[{"placement":1,"points":3},{"placement":2,"points":2},{"placement":3,"points":1}]'::jsonb,
  1,
  null,
  array['total_points','kills'],
  false
where not exists (select 1 from rjnx.scoring_rules where name = 'RJNX Elimination Series');

-- -------------------------------------------------------------- settings
insert into rjnx.platform_settings (key, value, description) values
  ('platform_name', '"RJNX GAMING ESPORTS"'::jsonb, 'Public platform name'),
  ('tagline', '"BE SAVAGE. NOT AVERAGE."'::jsonb, 'Hero tagline'),
  ('support_email', '"support@rjnxgamingesports.com"'::jsonb, 'Support inbox'),
  ('min_withdrawal_warning', '"true"'::jsonb, 'Show compliance notice for paid tournaments'),
  ('payments_enabled', 'false'::jsonb, 'Enable Razorpay entry-fee checkout'),
  ('registrations_enabled', 'true'::jsonb, 'Global registration switch'),
  ('maintenance_mode', 'false'::jsonb, 'Show maintenance banner'),
  ('discord_url', '"https://discord.gg/rjnx"'::jsonb, 'Community Discord'),
  ('instagram_url', '"https://instagram.com/rjnxgamingesports"'::jsonb, 'Instagram'),
  ('youtube_url', '"https://youtube.com/@rjnxgamingesports"'::jsonb, 'YouTube'),
  ('whatsapp_url', '"https://whatsapp.com/channel/rjnx"'::jsonb, 'WhatsApp channel')
on conflict (key) do nothing;

-- --------------------------------------------------------------- banners
insert into rjnx.banners (title, subtitle, image_url, link_url, placement, is_active, sort_order)
select 'BE SAVAGE. NOT AVERAGE.', 'Season 4 is live — enter the arena.', '/brand/hero-arena.svg', '/tournaments', 'home_hero', true, 1
where not exists (select 1 from rjnx.banners where placement = 'home_hero');

insert into rjnx.banners (title, subtitle, image_url, link_url, placement, is_active, sort_order)
select 'Weekly Free Fire Clash', 'Every Friday • 8 PM IST • ₹5,000 pool', '/brand/banner-weekly.svg', '/tournaments', 'home_strip', true, 2
where not exists (select 1 from rjnx.banners where placement = 'home_strip');

-- ------------------------------------------------------------------ news
insert into rjnx.news_articles (slug, title, excerpt, content, cover_url, is_published, published_at)
select
  'rjnx-season-4-launch',
  'RJNX Season 4 launches with a ₹2,50,000 prize circuit',
  'Eight titles, weekly ladders and a grand final in Guwahati. Here is everything players need to know.',
  'Season 4 of RJNX GAMING ESPORTS is officially live. The circuit spans eight titles including Free Fire, BGMI, Valorant and Call of Duty Mobile, with weekly ladders feeding into a grand final hosted in Guwahati.

Players can register solo or with a squad through the tournaments page. Every match uses verified room credentials that are published only to approved participants, and every result is reviewed by our tournament managers before leaderboard points are awarded.

Stay savage.',
  '/brand/news-season4.svg',
  true,
  now() - interval '2 days'
where not exists (select 1 from rjnx.news_articles where slug = 'rjnx-season-4-launch');

insert into rjnx.news_articles (slug, title, excerpt, content, cover_url, is_published, published_at)
select
  'fair-play-policy-update',
  'Fair play update: anti-cheat checks for every listed match',
  'All RJNX matches now require a device and gameplay recording check before results are verified.',
  'To protect the integrity of every bracket, RJNX now requires a gameplay recording link for every match that ends in a top-three placement. Tournament managers review the recording before verifying results.

Players who cannot provide a recording will have the result marked as disputed until the review completes. Repeat violations lead to suspension from the platform.

Read the full rules on any tournament page before registering.',
  '/brand/news-fairplay.svg',
  true,
  now() - interval '6 days'
where not exists (select 1 from rjnx.news_articles where slug = 'fair-play-policy-update');

-- =====================================================================
-- DEMO DATA (development only)
-- =====================================================================
do $$
declare
  v_seed boolean;
  v_ff uuid;
  v_bgmi uuid;
  v_val uuid;
  v_rule uuid;
  v_admin uuid;
  v_t1 uuid;
  v_t2 uuid;
begin
  select coalesce((value)::text::boolean, false) into v_seed
  from rjnx.platform_settings where key = 'seed_demo_data';
  if not coalesce(v_seed, false) then
    return;
  end if;

  select id into v_ff from rjnx.games where slug = 'free-fire';
  select id into v_bgmi from rjnx.games where slug = 'bgmi';
  select id into v_val from rjnx.games where slug = 'valorant';
  select id into v_rule from rjnx.scoring_rules where is_default = true;

  insert into rjnx.tournaments
    (slug, name, game_id, mode, format, description, rules, banner_url, entry_fee, prize_pool,
     prize_distribution, max_slots, min_team_size, max_team_size, registration_starts_at,
     registration_ends_at, starts_at, status, is_featured, requires_approval, scoring_rule_id)
  values
    ('free-fire-weekday-clash-s4', 'Free Fire Weekday Clash S4', v_ff, 'squad', 'battle_royale',
     'Weekly squad battle royale across three matches. Points from placement, kills and chicken dinners decide the champion.',
     '1. Squads of exactly 4 players.\n2. Room ID and password are released 15 minutes before match start.\n3. Emulators are not allowed.\n4. Screen recording required for top-3 placements.\n5. Teaming or cheating results in permanent ban.',
     '/brand/tournament-ff.svg', 20, 5000,
     '[{"place":1,"amount":2500,"label":"Champion"},{"place":2,"amount":1500,"label":"Runner-up"},{"place":3,"amount":1000,"label":"Third"}]'::jsonb,
     64, 4, 4, now() - interval '2 days', now() + interval '5 days', now() + interval '7 days',
     'registration_open', true, false, v_rule),
    ('bgmi-squad-showdown', 'BGMI Squad Showdown', v_bgmi, 'squad', 'single_elimination',
     'Sixteen squads. Single elimination. One winner takes the lion''s share.',
     '1. Squads of 4.\n2. Bracket is seeded by registration order.\n3. No-shows forfeit after 10 minutes.',
     '/brand/tournament-bgmi.svg', 50, 12000,
     '[{"place":1,"amount":7000,"label":"Champion"},{"place":2,"amount":3500,"label":"Runner-up"},{"place":3,"amount":1500,"label":"Third"}]'::jsonb,
     16, 4, 4, now() - interval '1 day', now() + interval '9 days', now() + interval '11 days',
     'registration_open', true, true, v_rule),
    ('valorant-duel-nights', 'Valorant Duel Nights', v_val, 'squad', 'single_elimination',
     '5v5 Valorant knockout under the RJNX anti-cheat policy.',
     '1. Teams of 5.\n2. Standard competitive ruleset.\n3. Custom lobbies hosted by RJNX staff.',
     '/brand/tournament-val.svg', 0, 8000,
     '[{"place":1,"amount":5000,"label":"Champion"},{"place":2,"amount":3000,"label":"Runner-up"}]'::jsonb,
     8, 5, 5, now() - interval '4 days', now() + interval '2 days', now() + interval '4 days',
     'registration_open', false, false, v_rule),
    ('free-fire-solo-sniper-cup', 'Free Fire Solo Sniper Cup', v_ff, 'solo', 'battle_royale',
     'Solo battle royale — only you versus the arena.',
     '1. Solo players only.\n2. AWM / sniper preference lobby.',
     '/brand/tournament-ff-solo.svg', 10, 2000,
     '[{"place":1,"amount":1200,"label":"Champion"},{"place":2,"amount":500,"label":"Runner-up"},{"place":3,"amount":300,"label":"Third"}]'::jsonb,
     48, 1, 1, now() - interval '10 days', now() - interval '2 days', now() + interval '1 day',
     'registration_closed', false, false, v_rule)
  on conflict (slug) do nothing;

  -- A completed tournament so public results/leaderboard pages have data.
  insert into rjnx.tournaments
    (slug, name, game_id, mode, format, description, rules, banner_url, entry_fee, prize_pool,
     prize_distribution, max_slots, min_team_size, max_team_size, registration_starts_at,
     registration_ends_at, starts_at, ends_at, status, is_featured, scoring_rule_id)
  select
    'rjnx-season-3-finals', 'RJNX Season 3 Finals', v_bgmi, 'squad', 'battle_royale',
    'The Season 3 finale. Archived results and final standings.',
    'Archived event — read only.', '/brand/tournament-s3.svg', 0, 15000,
    '[{"place":1,"amount":9000,"label":"Champion"},{"place":2,"amount":4000,"label":"Runner-up"},{"place":3,"amount":2000,"label":"Third"}]'::jsonb,
    32, 4, 4, now() - interval '60 days', now() - interval '45 days',
    now() - interval '40 days', now() - interval '39 days', 'completed', false, v_rule
  where not exists (select 1 from rjnx.tournaments where slug = 'rjnx-season-3-finals');

  insert into rjnx.matches (tournament_id, round, match_number, scheduled_at, status, map_name)
  select t.id, 1, 1, t.starts_at, 'verified', 'Erangel'
  from rjnx.tournaments t
  where t.slug = 'rjnx-season-3-finals'
    and not exists (select 1 from rjnx.matches m where m.tournament_id = t.id and m.match_number = 1);

  insert into rjnx.banners (title, subtitle, image_url, link_url, placement, is_active, sort_order)
  select 'RJNX Season 3 Champions', 'Replay the finals on YouTube', '/brand/banner-winners.svg',
         '/results', 'home_strip', true, 3
  where not exists (select 1 from rjnx.banners where title = 'RJNX Season 3 Champions');
end $$;

-- NOTE: the super-admin bootstrap helper lives in
-- supabase/migrations/0005_admin_bootstrap.sql (it must exist without seeding).
--   select rjnx.bootstrap_super_admin('owner@example.com');
