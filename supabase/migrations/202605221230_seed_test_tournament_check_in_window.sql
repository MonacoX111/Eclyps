do $$
declare
  name_expression text := '''''';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'name'
  ) then
    name_expression := name_expression || ', name';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'display_name'
  ) then
    name_expression := name_expression || ', display_name';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'title'
  ) then
    name_expression := name_expression || ', title';
  end if;

  execute format(
    $sql$
      update tournaments
      set
        check_in_opens_at = now(),
        check_in_closes_at = now() + interval '7 days'
      where lower(coalesce(%s)) = 'test'
        and (
          check_in_opens_at is null
          or check_in_closes_at is null
          or check_in_closes_at <= now()
          or check_in_closes_at <= check_in_opens_at
        )
    $sql$,
    name_expression
  );
end $$;
