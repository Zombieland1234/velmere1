begin;

-- The exact-migration corpus exporter was a temporary owner-controlled
-- reconstruction bridge. It is not part of the customer product or a durable
-- Data API surface. Remove it completely so no anonymous/authenticated caller
-- can invoke a privileged migration-export endpoint.
drop function if exists public.velmere_r7_export_exact_migration_corpus();

comment on schema public is
  'Velmere public customer API schema. Temporary migration-corpus export removed by R7 security reconciliation.';

commit;
