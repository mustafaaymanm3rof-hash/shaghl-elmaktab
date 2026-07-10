import { supabase } from "./supabaseClient";

/* ---- mapping helpers: DB (snake_case) <-> app (camelCase) ---- */
const entryFromDb = (r) => ({
  id: r.id,
  date: r.date,
  customerCode: r.customer_code,
  customerName: r.customer_name,
  jobType: r.job_type,
  designer: r.designer,
  price: Number(r.price) || 0,
  discount: Number(r.discount) || 0,
  paid: Number(r.paid) || 0,
  paymentType: r.payment_type,
  notes: r.notes || "",
});
const entryToDb = (e) => ({
  id: e.id,
  date: e.date,
  customer_code: e.customerCode,
  customer_name: e.customerName,
  job_type: e.jobType,
  designer: e.designer,
  price: e.price,
  discount: e.discount,
  paid: e.paid,
  payment_type: e.paymentType,
  notes: e.notes || "",
});
const customerFromDb = (r) => ({
  code: r.code,
  name: r.name,
  phone: r.phone || "",
  area: r.area || "",
  rating: r.rating ?? 3,
});
const customerToDb = (c) => ({
  code: c.code,
  name: c.name,
  phone: c.phone || "",
  area: c.area || "",
  rating: c.rating ?? 3,
});

/* ---- customers ---- */
export async function fetchCustomers() {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw error;
  return (data || []).map(customerFromDb);
}
export async function insertCustomer(customer) {
  const { data, error } = await supabase.from("customers").insert(customerToDb(customer)).select().single();
  if (error) throw error;
  return customerFromDb(data);
}
export async function updateCustomerDb(customer) {
  const { error } = await supabase.from("customers").update(customerToDb(customer)).eq("code", customer.code);
  if (error) throw error;
}
export async function deleteCustomerDb(code) {
  const { error } = await supabase.from("customers").delete().eq("code", code);
  if (error) throw error;
}

/* ---- work entries ---- */
export async function fetchEntries() {
  const { data, error } = await supabase.from("work_entries").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(entryFromDb);
}
export async function upsertEntry(entry) {
  const { data, error } = await supabase.from("work_entries").upsert(entryToDb(entry)).select().single();
  if (error) throw error;
  return entryFromDb(data);
}
export async function deleteEntryDb(id) {
  const { error } = await supabase.from("work_entries").delete().eq("id", id);
  if (error) throw error;
}
