drop policy if exists "admin can delete elementos" on elementos;
create policy "admin/user can delete elementos" on elementos
  for delete using (current_user_role() in ('admin', 'user'));
