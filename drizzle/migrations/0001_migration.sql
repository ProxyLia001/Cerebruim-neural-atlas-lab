alter table public.payment_settings add column paypal_email text not null default '';

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  plan text not null check (plan in ('monthly','yearly')),
  method text not null,
  reference text not null,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select, insert on public.payment_requests to authenticated;
grant all on public.payment_requests to service_role;
alter table public.payment_requests enable row level security;
create policy "own or staff read requests" on public.payment_requests for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own insert pending" on public.payment_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

alter table public.profiles add column pro_until timestamptz;

create or replace function public.review_payment(_id uuid, _approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare r public.payment_requests;
begin
  if not public.is_staff(auth.uid()) then return 'Only admins can verify payments.'; end if;
  select * into r from public.payment_requests where id = _id;
  if r.id is null or r.status <> 'pending' then return 'Request not found or already reviewed.'; end if;
  update public.payment_requests set status = case when _approve then 'approved' else 'rejected' end, reviewed_at = now() where id = _id;
  if _approve then
    update public.profiles set pro = true,
      pro_until = greatest(coalesce(pro_until, now()), now()) + case when r.plan = 'yearly' then interval '1 year' else interval '1 month' end
    where id = r.user_id;
  end if;
  return null;
end $$;
grant execute on function public.review_payment(uuid, boolean) to authenticated;