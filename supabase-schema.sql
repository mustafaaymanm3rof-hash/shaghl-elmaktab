-- شغّل الكود ده مرة واحدة في Supabase: SQL Editor > New query > الصق والصق Run

create table if not exists customers (
  code text primary key,
  name text not null,
  phone text,
  area text,
  rating int default 3,
  created_at timestamptz default now()
);

create table if not exists work_entries (
  id text primary key,
  date date not null,
  customer_code text references customers(code) on delete set null,
  customer_name text,
  job_type text,
  designer text,
  price numeric default 0,
  discount numeric default 0,
  paid numeric default 0,
  payment_type text,
  notes text,
  created_at timestamptz default now()
);

-- تفعيل الحماية على مستوى الصفوف (Row Level Security)
alter table customers enable row level security;
alter table work_entries enable row level security;

-- السماح لأي حد معاه رابط الموقع (anon key) بالقراءة والكتابة
-- ملاحظة: ده مناسب لأداة داخلية بين الموظفين، مش لموقع عام على الإنترنت.
-- لو عايز حماية بباسورد لكل موظف، محتاج تفعّل Supabase Auth، وده ممكن نضيفه لاحقًا.
create policy "allow all - customers" on customers for all using (true) with check (true);
create policy "allow all - work_entries" on work_entries for all using (true) with check (true);
