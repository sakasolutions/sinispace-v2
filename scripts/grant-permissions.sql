-- SQL Script zum Vergeben von Datenbank-Rechten
-- Führe dies als postgres Superuser aus!

-- Rechte auf alle bestehenden Tabellen
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "sinispace_user";

-- Rechte auf alle Sequenzen (für AUTO_INCREMENT)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "sinispace_user";

-- Rechte für zukünftige Tabellen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "sinispace_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "sinispace_user";

-- Optional: Superuser-Rechte (NUR wenn wirklich nötig!)
-- ALTER USER "sinispace_user" WITH SUPERUSER;

-- Prüfe Rechte
SELECT 
    tablename, 
    tableowner,
    has_table_privilege('sinispace_user', tablename, 'SELECT') as can_select,
    has_table_privilege('sinispace_user', tablename, 'INSERT') as can_insert,
    has_table_privilege('sinispace_user', tablename, 'UPDATE') as can_update,
    has_table_privilege('sinispace_user', tablename, 'DELETE') as can_delete,
    has_table_privilege('sinispace_user', tablename, 'ALTER') as can_alter
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
