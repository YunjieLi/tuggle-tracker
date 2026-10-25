-- Start the name-and-password account system with a clean user list.
-- Deleting these auth users also cascades to their username mappings and activities.
delete from auth.users
where id in (select user_id from public.baby_usernames);
