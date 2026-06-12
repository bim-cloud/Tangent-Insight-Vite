-- 0011_purge_link_files.sql
-- One-time cleanup: remove project_metrics rows that are Revit LINK files,
-- DWG/IFC/NWC underlays, family/template files, and backups — these were
-- captured incorrectly and should never have been tracked as projects.
-- Safe to run repeatedly. Only touches obvious non-host files; real models stay.

-- Inspect first (optional): see what WILL be deleted before committing.
--   select project from public.project_metrics
--   where lower(project) ~ '\.(dwg|ifc|nwc|nwd|rfa|rte|skp)$'
--      or lower(project) ~ '\.\d{4}$'
--      or lower(project) similar to '%(xref|-link|_link| link|linked|topography|shared coordinate)%';

delete from public.project_metrics
where lower(project) ~ '\.(dwg|ifc|nwc|nwd|rfa|rte|skp)$'            -- underlay / family / template
   or lower(project) ~ '\.\d{4}$'                                    -- Revit backup files
   or lower(project) similar to '%(xref|-link|_link| link|linked|topography|shared coordinate)%';

-- Also clear any link files that a user accidentally assigned earlier.
delete from public.project_files
where lower(file_name) ~ '\.(dwg|ifc|nwc|nwd|rfa|rte|skp)$'
   or lower(file_name) ~ '\.\d{4}$'
   or lower(file_name) similar to '%(xref|-link|_link| link|linked|topography|shared coordinate)%';
