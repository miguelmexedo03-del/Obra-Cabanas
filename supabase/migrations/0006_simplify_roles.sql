-- Add 'user' role value to enum; migrate encarregado/operario → user.
-- Postgres does not support removing enum values, so old values remain
-- in the type but are never assigned to any profile row.

alter type user_role add value if not exists 'user';

-- Must run outside transaction after enum DDL
update profiles set role = 'user' where role in ('encarregado', 'operario');
