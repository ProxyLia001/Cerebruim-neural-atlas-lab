create type public.app_role as enum ('admin','creator','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  pro boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','creator')) $$;

create policy "own or staff read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "own or staff read roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create table public.pending_admins (email text primary key, created_at timestamptz not null default now());
grant select on public.pending_admins to authenticated;
grant all on public.pending_admins to service_role;
alter table public.pending_admins enable row level security;
create policy "creator reads pending" on public.pending_admins for select to authenticated
  using (public.has_role(auth.uid(),'creator'));

create table public.gift_codes (
  code text primary key,
  active boolean not null default true,
  uses integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.gift_codes to authenticated;
grant all on public.gift_codes to service_role;
alter table public.gift_codes enable row level security;
create policy "staff manage codes" on public.gift_codes for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
insert into public.gift_codes (code, note) values ('JUDGE2026','Competition judges'),('ADMISSIONVIP','Admissions panel');

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text not null,
  size bigint not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.scans to authenticated;
grant all on public.scans to service_role;
alter table public.scans enable row level security;
create policy "own scans read" on public.scans for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own scans insert" on public.scans for insert to authenticated with check (user_id = auth.uid());
create policy "own scans delete" on public.scans for delete to authenticated using (user_id = auth.uid());

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  text text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;
create policy "own notes all" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.payment_settings (
  id integer primary key default 1 check (id = 1),
  account_number text not null,
  bank_name text not null,
  account_name text not null,
  monthly_price numeric not null,
  yearly_price numeric not null,
  updated_at timestamptz not null default now()
);
grant select on public.payment_settings to anon, authenticated;
grant update on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;
alter table public.payment_settings enable row level security;
create policy "anyone reads payment" on public.payment_settings for select to anon, authenticated using (true);
create policy "creator updates payment" on public.payment_settings for update to authenticated
  using (public.has_role(auth.uid(),'creator')) with check (public.has_role(auth.uid(),'creator'));
insert into public.payment_settings (account_number, bank_name, account_name, monthly_price, yearly_price)
values ('8083773780','OPay','Bosede Hope James',4,40);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare e text := lower(new.email);
begin
  insert into public.profiles (id, email, pro) values (new.id, e, e = 'abigailjames8221@gmail.com');
  if e = 'abigailjames8221@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'creator');
  elsif exists (select 1 from public.pending_admins where email = e) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    delete from public.pending_admins where email = e;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.redeem_code(_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.gift_codes set uses = uses + 1 where code = upper(trim(_code)) and active;
  if not found then return false; end if;
  if auth.uid() is not null then update public.profiles set pro = true where id = auth.uid(); end if;
  return true;
end $$;
grant execute on function public.redeem_code(text) to anon, authenticated;

create or replace function public.set_admin(_email text, _admin boolean)
returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(_email)); uid uuid;
begin
  if not public.has_role(auth.uid(),'creator') then return 'Only the Creator can change admins.'; end if;
  if e = 'abigailjames8221@gmail.com' then return 'The Creator''s role can''t be changed.'; end if;
  select id into uid from public.profiles where email = e;
  if uid is null then
    if _admin then insert into public.pending_admins(email) values (e) on conflict do nothing;
    else delete from public.pending_admins where email = e; end if;
  else
    if _admin then insert into public.user_roles(user_id, role) values (uid,'admin') on conflict do nothing;
    else delete from public.user_roles where user_id = uid and role = 'admin'; end if;
  end if;
  return null;
end $$;
grant execute on function public.set_admin(text, boolean) to authenticated;