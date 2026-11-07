CREATE TABLE whatnot_private.cost_references (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  revision integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE whatnot_private.cost_jobs (
  id uuid PRIMARY KEY,
  revision integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  reference jsonb,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE whatnot_private.cost_order_links (
  order_id text NOT NULL,
  currency text NOT NULL,
  job_id uuid NOT NULL REFERENCES whatnot_private.cost_jobs(id),
  PRIMARY KEY(order_id,currency)
);
CREATE TABLE whatnot_private.cost_job_history (
  job_id uuid NOT NULL REFERENCES whatnot_private.cost_jobs(id),
  revision integer NOT NULL,
  data jsonb NOT NULL,
  updated_by text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(job_id,revision)
);
REVOKE ALL ON ALL TABLES IN SCHEMA whatnot_private FROM PUBLIC;
