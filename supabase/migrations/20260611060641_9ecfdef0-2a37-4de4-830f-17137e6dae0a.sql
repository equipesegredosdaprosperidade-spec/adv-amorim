CREATE TABLE public.site_published_state (
  singleton_key TEXT PRIMARY KEY DEFAULT 'main' CHECK (singleton_key = 'main'),
  content_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_dataurl TEXT,
  theme_override JSONB,
  whatsapp_number TEXT,
  whatsapp_message TEXT,
  pixel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  site_enabled BOOLEAN NOT NULL DEFAULT true,
  version BIGINT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_published_state TO anon, authenticated;
GRANT ALL ON public.site_published_state TO service_role;

ALTER TABLE public.site_published_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published site state is readable by everyone"
ON public.site_published_state FOR SELECT
TO anon, authenticated
USING (singleton_key = 'main');

CREATE OR REPLACE FUNCTION public.update_site_published_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_site_published_state_updated_at
BEFORE UPDATE ON public.site_published_state
FOR EACH ROW EXECUTE FUNCTION public.update_site_published_state_updated_at();

INSERT INTO public.site_published_state (singleton_key) VALUES ('main')
ON CONFLICT (singleton_key) DO NOTHING;

ALTER TABLE public.site_published_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='site_published_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_published_state;
  END IF;
END $$;

CREATE TABLE public.site_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version BIGINT NOT NULL,
  label TEXT,
  content_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_dataurl TEXT,
  theme_override JSONB,
  whatsapp_number TEXT,
  whatsapp_message TEXT,
  pixel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  site_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX site_version_history_version_idx ON public.site_version_history (version DESC);

GRANT ALL ON public.site_version_history TO service_role;

ALTER TABLE public.site_version_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public site state channel reads" ON realtime.messages';
    EXECUTE $f$
      CREATE POLICY "Allow public site state channel reads"
        ON realtime.messages FOR SELECT TO anon, authenticated
        USING (
          realtime.topic() = 'site-published-state-live'
          OR realtime.topic() LIKE 'realtime:public:site_published_state%'
        )
    $f$;
  END IF;
END $$;