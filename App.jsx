import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, PlusCircle, Table2, Users, Smartphone, FileSearch,
  Search, Pencil, Trash2, X, Check, AlertCircle, Star, Loader2,
  TrendingUp, Wallet, Package, UserPlus, Phone, MapPin, ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line, Legend, Cell
} from "recharts";
import {
  fetchCustomers, insertCustomer, updateCustomerDb, deleteCustomerDb,
  fetchEntries, upsertEntry, deleteEntryDb,
} from "./dataService";

/* ---------------------------------------------------------------------- */
/*  design tokens                                                          */
/* ---------------------------------------------------------------------- */
const C = {
  ink: "#1C2331",
  inkSoft: "#5B6478",
  paper: "#F2EFE7",
  card: "#FFFFFE",
  line: "#E3DED0",
  teal: "#0F6E74",
  tealDark: "#0B4F54",
  tealSoft: "#E4F0EF",
  rust: "#A6402E",
  rustSoft: "#F5E6E1",
  amber: "#B9873A",
  amberSoft: "#F5EDDD",
  green: "#3F7A56",
  greenSoft: "#E6EFE7",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&family=JetBrains+Mono:wght@500;600&display=swap');
`;

/* tiny registration-mark motif — the app's signature element */
function RegMark({ size = 14, color = C.teal, style }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" style={style} aria-hidden="true">
      <circle cx="10" cy="10" r="6" fill="none" stroke={color} strokeWidth="1.4" />
      <line x1="10" y1="0" x2="10" y2="20" stroke={color} strokeWidth="1.4" />
      <line x1="0" y1="10" x2="20" y2="10" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/*  helpers                                                                 */
/* ---------------------------------------------------------------------- */
const money = (n) =>
  (Number(n) || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج.م";

const todayISO = () => new Date().toISOString().slice(0, 10);
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const genCustomerCode = (existing) => {
  let n = existing.length + 1;
  let code = "C" + String(n).padStart(3, "0");
  const codes = new Set(existing.map((c) => c.code));
  while (codes.has(code)) { n += 1; code = "C" + String(n).padStart(3, "0"); }
  return code;
};
const monthLabel = (iso) => {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const names = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
};

const DEFAULT_DESIGNERS = ["احمد", "ابانوب", "اسلام", "زينة", "محمد", "بودة", "منة", "ريم"];
const DEFAULT_JOBTYPES = [
  "ملزمة 1 لون", "ملزمة 2 لون", "ملزمة 4 لون",
  "بوستر 1 لون", "بوستر 2 لون", "بوستر 4 لون",
  "بوست فيس", "بوست مجمع", "غلاف",
];
const PAYMENT_TYPES = ["كاش", "فودافون كاش"];

/* ---------------------------------------------------------------------- */
/*  small building blocks                                                  */
/* ---------------------------------------------------------------------- */
function Card({ children, style, className = "" }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: "0 1px 2px rgba(28,35,49,0.04)", ...style }}
    >
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <div className="flex items-center gap-2">
          <RegMark size={16} />
          <h1 style={{ fontFamily: "Cairo", color: C.ink }} className="text-xl font-bold">{title}</h1>
        </div>
        {subtitle && <p style={{ color: C.inkSoft }} className="text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", type = "button", small, disabled }) {
  const styles = {
    primary: { background: C.teal, color: "#fff" },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    danger: { background: C.rustSoft, color: C.rust },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-opacity hover:opacity-85 disabled:opacity-50 ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={{ fontFamily: "Tajawal", ...styles[variant] }}
    >
      {children}
    </button>
  );
}

function Field({ label, error, children, required }) {
  return (
    <label className="block">
      <span className="text-xs font-medium mb-1 block" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>
        {label} {required && <span style={{ color: C.rust }}>*</span>}
      </span>
      {children}
      {error && (
        <span className="text-xs flex items-center gap-1 mt-1" style={{ color: C.rust }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: `1px solid ${C.line}`,
  fontFamily: "Tajawal",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
  color: C.ink,
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={`focus:ring-2 ${props.className || ""}`} />;
}
function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={`focus:ring-2 ${props.className || ""}`}>{props.children}</select>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(28,35,49,0.45)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-2xl p-5`}
        style={{ background: C.card }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "Cairo", color: C.ink }} className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70" style={{ color: C.inkSoft }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ text, onConfirm, onCancel }) {
  return (
    <Modal title="تأكيد الحذف" onClose={onCancel}>
      <p style={{ color: C.inkSoft, fontFamily: "Tajawal" }} className="text-sm mb-5">{text}</p>
      <div className="flex gap-2 justify-end">
        <Btn variant="ghost" onClick={onCancel}>إلغاء</Btn>
        <Btn variant="danger" onClick={onConfirm}>حذف نهائيًا</Btn>
      </div>
    </Modal>
  );
}

function KPI({ icon: Icon, label, value, tint }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg" style={{ background: tint }}>
          <Icon size={18} style={{ color: C.ink }} />
        </div>
        <RegMark size={10} color={C.line} />
      </div>
      <div className="mt-3 text-xl font-bold" style={{ fontFamily: "JetBrains Mono", color: C.ink }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>{label}</div>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/*  entry form (add / edit)                                                */
/* ---------------------------------------------------------------------- */
function EntryForm({ initial, customers, designers, jobTypes, onSave, onCancel, onAddCustomer }) {
  const blank = {
    date: todayISO(), customerCode: "", jobType: jobTypes[0] || "",
    price: "", discount: "0", paid: "0", paymentType: PAYMENT_TYPES[0],
    designer: designers[0] || "", notes: "",
  };
  const [form, setForm] = useState(initial || blank);
  const [errors, setErrors] = useState({});
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", area: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const balance = (parseFloat(form.price) || 0) - (parseFloat(form.discount) || 0) - (parseFloat(form.paid) || 0);

  const validate = () => {
    const e = {};
    if (!form.date) e.date = "التاريخ مطلوب";
    if (!newCustomerMode && !form.customerCode) e.customerCode = "اختار العميل";
    if (newCustomerMode && !newCustomer.name.trim()) e.customerName = "اسم العميل مطلوب";
    if (!form.jobType) e.jobType = "نوع الشغل مطلوب";
    if (form.price === "" || isNaN(form.price) || Number(form.price) < 0) e.price = "السعر لازم يكون رقم صحيح";
    if (form.discount !== "" && (isNaN(form.discount) || Number(form.discount) < 0)) e.discount = "رقم غير صحيح";
    if (form.paid !== "" && (isNaN(form.paid) || Number(form.paid) < 0)) e.paid = "رقم غير صحيح";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    let customerCode = form.customerCode;
    let customerName = customers.find((c) => c.code === customerCode)?.name || "";
    if (newCustomerMode) {
      try {
        const created = await onAddCustomer(newCustomer);
        customerCode = created.code;
        customerName = created.name;
      } catch {
        return; // error surfaced globally via saveError banner
      }
    }
    onSave({
      ...form,
      id: form.id || genId(),
      customerCode,
      customerName,
      price: Number(form.price) || 0,
      discount: Number(form.discount) || 0,
      paid: Number(form.paid) || 0,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="التاريخ" required error={errors.date}>
          <TextInput type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="نوع الدفع">
          <Select value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="العميل" required error={errors.customerCode || errors.customerName}>
        {!newCustomerMode ? (
          <div className="flex gap-2">
            <Select value={form.customerCode} onChange={(e) => set("customerCode", e.target.value)} style={{ flex: 1 }}>
              <option value="">-- اختار عميل --</option>
              {customers.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </Select>
            <Btn variant="ghost" small onClick={() => setNewCustomerMode(true)}><UserPlus size={14} /> جديد</Btn>
          </div>
        ) : (
          <div className="space-y-2 p-2 rounded-lg" style={{ background: C.paper }}>
            <TextInput placeholder="اسم العميل" value={newCustomer.name} onChange={(e) => setNewCustomer((n) => ({ ...n, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput placeholder="رقم التليفون" value={newCustomer.phone} onChange={(e) => setNewCustomer((n) => ({ ...n, phone: e.target.value }))} />
              <TextInput placeholder="المنطقة" value={newCustomer.area} onChange={(e) => setNewCustomer((n) => ({ ...n, area: e.target.value }))} />
            </div>
            <Btn variant="ghost" small onClick={() => setNewCustomerMode(false)}>إلغاء واختيار عميل موجود</Btn>
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="نوع الشغل" required error={errors.jobType}>
          <Select value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
            {jobTypes.map((j) => <option key={j} value={j}>{j}</option>)}
          </Select>
        </Field>
        <Field label="المصمم">
          <Select value={form.designer} onChange={(e) => set("designer", e.target.value)}>
            {designers.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="السعر" required error={errors.price}>
          <TextInput type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
        <Field label="الخصم" error={errors.discount}>
          <TextInput type="number" min="0" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
        </Field>
        <Field label="المدفوع" error={errors.paid}>
          <TextInput type="number" min="0" value={form.paid} onChange={(e) => set("paid", e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: balance > 0 ? C.rustSoft : C.greenSoft }}>
        <span className="text-xs font-medium" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>الرصيد المتبقي (دين على العميل)</span>
        <span className="font-bold" style={{ fontFamily: "JetBrains Mono", color: balance > 0 ? C.rust : C.green }}>{money(balance)}</span>
      </div>

      <Field label="ملاحظات">
        <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} style={inputStyle} />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onCancel}>إلغاء</Btn>
        <Btn onClick={submit}><Check size={15} /> حفظ</Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Dashboard                                                              */
/* ---------------------------------------------------------------------- */
function Dashboard({ entries, customers }) {
  const totals = useMemo(() => {
    let price = 0, paid = 0, discount = 0;
    entries.forEach((e) => { price += e.price; paid += e.paid; discount += e.discount; });
    return { price, paid, balance: price - discount - paid };
  }, [entries]);

  const thisMonthCount = useMemo(() => {
    const ym = todayISO().slice(0, 7);
    return entries.filter((e) => e.date?.startsWith(ym)).length;
  }, [entries]);

  const monthlyData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const ym = e.date?.slice(0, 7);
      if (!ym) return;
      if (!map[ym]) map[ym] = { ym, price: 0, paid: 0 };
      map[ym].price += e.price;
      map[ym].paid += e.paid;
    });
    return Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym)).slice(-6)
      .map((m) => ({ ...m, label: monthLabel(m.ym + "-01") }));
  }, [entries]);

  const byDesigner = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.designer) return;
      map[e.designer] = (map[e.designer] || 0) + e.price;
    });
    return Object.entries(map).map(([designer, price]) => ({ designer, price })).sort((a, b) => b.price - a.price);
  }, [entries]);

  const topDebtors = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const bal = e.price - e.discount - e.paid;
      if (bal <= 0) return;
      map[e.customerName] = (map[e.customerName] || 0) + bal;
    });
    return Object.entries(map).map(([name, balance]) => ({ name, balance })).sort((a, b) => b.balance - a.balance).slice(0, 5);
  }, [entries]);

  return (
    <div>
      <PageHeader title="لوحة التحكم" subtitle="ملخص سريع لحالة الشغل والحسابات" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI icon={Package} label="اجمالي الشغل" value={money(totals.price)} tint={C.tealSoft} />
        <KPI icon={Wallet} label="اجمالي المدفوع" value={money(totals.paid)} tint={C.greenSoft} />
        <KPI icon={AlertCircle} label="اجمالي الرصيد (ديون)" value={money(totals.balance)} tint={C.rustSoft} />
        <KPI icon={Users} label="عدد العملاء" value={customers.length} tint={C.amberSoft} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "Cairo", color: C.ink }}>الشغل والمدفوعات خلال آخر 6 شهور</h3>
          {monthlyData.length === 0 ? <Empty text="لسه مفيش بيانات كفاية" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Tajawal" }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ fontFamily: "Tajawal", direction: "rtl" }} />
                <Legend wrapperStyle={{ fontFamily: "Tajawal", fontSize: 12 }} />
                <Bar dataKey="price" name="اجمالي الشغل" fill={C.teal} radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="المدفوع" fill={C.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "Cairo", color: C.ink }}>الشغل حسب المصمم</h3>
          {byDesigner.length === 0 ? <Empty text="لسه مفيش بيانات كفاية" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDesigner} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="designer" type="category" width={60} tick={{ fontSize: 12, fontFamily: "Tajawal" }} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ fontFamily: "Tajawal", direction: "rtl" }} />
                <Bar dataKey="price" fill={C.tealDark} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="md:col-span-2">
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "Cairo", color: C.ink }}>أكتر 5 عملاء عليهم رصيد (دين)</h3>
          {topDebtors.length === 0 ? <Empty text="مفيش عملاء عليهم رصيد حاليًا 🎉" /> : (
            <div className="space-y-2">
              {topDebtors.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0" style={{ borderColor: C.line, fontFamily: "Tajawal" }}>
                  <span style={{ color: C.ink }}>{d.name}</span>
                  <span className="font-bold" style={{ fontFamily: "JetBrains Mono", color: C.rust }}>{money(d.balance)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs mt-2" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>عدد طلبات الشهر الحالي: {thisMonthCount}</div>
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-sm text-center py-8" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>{text}</div>;
}

/* ---------------------------------------------------------------------- */
/*  Entries table                                                          */
/* ---------------------------------------------------------------------- */
function EntriesTable({ entries, customers, designers, jobTypes, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const [designerFilter, setDesignerFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (q && !(`${e.customerName} ${e.jobType} ${e.notes || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (designerFilter && e.designer !== designerFilter) return false;
      if (paymentFilter && e.paymentType !== paymentFilter) return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [entries, q, designerFilter, paymentFilter, from, to]);

  return (
    <div>
      <PageHeader title="سجل الشغل" subtitle={`${filtered.length} من ${entries.length} عملية`} />
      <Card className="mb-4">
        <div className="grid md:grid-cols-5 gap-2">
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: C.inkSoft }} />
            <TextInput placeholder="بحث بالاسم أو نوع الشغل..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingRight: 30 }} />
          </div>
          <Select value={designerFilter} onChange={(e) => setDesignerFilter(e.target.value)}>
            <option value="">كل المصممين</option>
            {designers.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="">كل طرق الدفع</option>
            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="من تاريخ" />
            <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} title="إلى تاريخ" />
          </div>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "Tajawal" }}>
            <thead>
              <tr style={{ background: C.paper, color: C.inkSoft }}>
                {["التاريخ", "العميل", "الشغل", "المصمم", "السعر", "المدفوع", "الرصيد", "الدفع", ""].map((h) => (
                  <th key={h} className="text-right px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><Empty text="مفيش نتائج مطابقة" /></td></tr>
              )}
              {filtered.map((e) => {
                const bal = e.price - e.discount - e.paid;
                return (
                  <tr key={e.id} className="border-t" style={{ borderColor: C.line }}>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{e.date}</td>
                    <td className="px-3 py-2">{e.customerName}</td>
                    <td className="px-3 py-2">{e.jobType}</td>
                    <td className="px-3 py-2">{e.designer}</td>
                    <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono" }}>{money(e.price)}</td>
                    <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono", color: C.green }}>{money(e.paid)}</td>
                    <td className="px-3 py-2 font-semibold" style={{ fontFamily: "JetBrains Mono", color: bal > 0 ? C.rust : C.inkSoft }}>{money(bal)}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: e.paymentType === "فودافون كاش" ? C.tealSoft : C.paper, color: C.ink }}>{e.paymentType}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: C.tealSoft, color: C.tealDark }}><Pencil size={13} /></button>
                        <button onClick={() => onDelete(e)} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: C.rustSoft, color: C.rust }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Customers page                                                         */
/* ---------------------------------------------------------------------- */
function CustomerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: "", phone: "", area: "", rating: 3 });
  const [error, setError] = useState("");
  const submit = () => {
    if (!form.name.trim()) { setError("اسم العميل مطلوب"); return; }
    onSave(form);
  };
  return (
    <div className="space-y-3">
      <Field label="اسم العميل" required error={error}>
        <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </Field>
      <Field label="رقم التليفون">
        <TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </Field>
      <Field label="المنطقة">
        <TextInput value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
      </Field>
      <Field label="تقييم العميل">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))} type="button">
              <Star size={20} fill={n <= form.rating ? C.amber : "none"} color={C.amber} />
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onCancel}>إلغاء</Btn>
        <Btn onClick={submit}><Check size={15} /> حفظ</Btn>
      </div>
    </div>
  );
}

function CustomersPage({ customers, entries, onAdd, onUpdate, onDelete, onOpenReport }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', customer}
  const [confirmDel, setConfirmDel] = useState(null);

  const agg = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.customerCode]) map[e.customerCode] = { work: 0, paid: 0, balance: 0 };
      map[e.customerCode].work += e.price;
      map[e.customerCode].paid += e.paid;
      map[e.customerCode].balance += e.price - e.discount - e.paid;
    });
    return map;
  }, [entries]);

  const filtered = customers.filter((c) => !q || c.name.includes(q) || (c.phone || "").includes(q));

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle={`${customers.length} عميل`}
        action={<Btn onClick={() => setModal({ mode: "add" })}><UserPlus size={15} /> عميل جديد</Btn>}
      />
      <Card className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: C.inkSoft }} />
          <TextInput placeholder="بحث بالاسم أو رقم التليفون..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingRight: 30 }} />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.length === 0 && <Empty text="مفيش عملاء" />}
        {filtered.map((c) => {
          const a = agg[c.code] || { work: 0, paid: 0, balance: 0 };
          return (
            <Card key={c.code}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold flex items-center gap-2" style={{ fontFamily: "Cairo", color: C.ink }}>
                    {c.name}
                    <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: C.paper, color: C.inkSoft, fontFamily: "JetBrains Mono" }}>{c.code}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>
                    {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                    {c.area && <span className="flex items-center gap-1"><MapPin size={11} />{c.area}</span>}
                  </div>
                  <div className="flex gap-0.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={n <= (c.rating || 0) ? C.amber : "none"} color={C.amber} />)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onOpenReport(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: C.tealSoft, color: C.tealDark }} title="تقرير العميل"><FileSearch size={14} /></button>
                  <button onClick={() => setModal({ mode: "edit", customer: c })} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: C.amberSoft, color: C.amber }}><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDel(c)} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: C.rustSoft, color: C.rust }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                <div>
                  <div className="text-xs" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>اجمالي الشغل</div>
                  <div className="font-semibold text-sm" style={{ fontFamily: "JetBrains Mono", color: C.ink }}>{money(a.work)}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>تم دفع</div>
                  <div className="font-semibold text-sm" style={{ fontFamily: "JetBrains Mono", color: C.green }}>{money(a.paid)}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>الرصيد</div>
                  <div className="font-semibold text-sm" style={{ fontFamily: "JetBrains Mono", color: a.balance > 0 ? C.rust : C.inkSoft }}>{money(a.balance)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === "add" ? "عميل جديد" : "تعديل بيانات العميل"} onClose={() => setModal(null)}>
          <CustomerForm
            initial={modal.customer}
            onCancel={() => setModal(null)}
            onSave={(data) => {
              if (modal.mode === "add") onAdd(data); else onUpdate({ ...modal.customer, ...data });
              setModal(null);
            }}
          />
        </Modal>
      )}
      {confirmDel && (
        <ConfirmModal
          text={`هتحذف "${confirmDel.name}" نهائيًا. البيانات القديمة الخاصة بيه في سجل الشغل هتفضل موجودة بس من غير ربط بعميل محذوف.`}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => { onDelete(confirmDel); setConfirmDel(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Vodafone Cash report                                                   */
/* ---------------------------------------------------------------------- */
function VodafonePage({ entries }) {
  const vf = useMemo(() => entries.filter((e) => e.paymentType === "فودافون كاش").sort((a, b) => (b.date || "").localeCompare(a.date || "")), [entries]);
  const total = vf.reduce((s, e) => s + e.paid, 0);
  return (
    <div>
      <PageHeader title="تقرير فودافون كاش" subtitle={`${vf.length} عملية بإجمالي ${money(total)}`} />
      <Card style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "Tajawal" }}>
            <thead>
              <tr style={{ background: C.paper, color: C.inkSoft }}>
                {["التاريخ", "العميل", "الشغل", "المصمم", "المدفوع (فودافون)"].map((h) => <th key={h} className="text-right px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {vf.length === 0 && <tr><td colSpan={5}><Empty text="مفيش عمليات دفع بفودافون كاش لسه" /></td></tr>}
              {vf.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: C.line }}>
                  <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{e.date}</td>
                  <td className="px-3 py-2">{e.customerName}</td>
                  <td className="px-3 py-2">{e.jobType}</td>
                  <td className="px-3 py-2">{e.designer}</td>
                  <td className="px-3 py-2 font-semibold" style={{ fontFamily: "JetBrains Mono", color: C.teal }}>{money(e.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Customer detail report                                                 */
/* ---------------------------------------------------------------------- */
function CustomerReportPage({ customers, entries, preselect }) {
  const [code, setCode] = useState(preselect?.code || "");
  useEffect(() => { if (preselect?.code) setCode(preselect.code); }, [preselect]);

  const customer = customers.find((c) => c.code === code);
  const rows = useMemo(() => entries.filter((e) => e.customerCode === code).sort((a, b) => (a.date || "").localeCompare(b.date || "")), [entries, code]);
  const totals = rows.reduce((s, e) => ({ price: s.price + e.price, paid: s.paid + e.paid, balance: s.balance + (e.price - e.discount - e.paid) }), { price: 0, paid: 0, balance: 0 });

  return (
    <div>
      <PageHeader title="تقرير مفصل لعميل" subtitle="اختار عميل عشان تشوف كل تعاملاته" />
      <Card className="mb-4">
        <Select value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">-- اختار عميل --</option>
          {customers.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </Select>
      </Card>

      {customer && (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="font-bold text-lg" style={{ fontFamily: "Cairo", color: C.ink }}>{customer.name}</div>
                <div className="flex gap-3 mt-1 text-xs" style={{ color: C.inkSoft, fontFamily: "Tajawal" }}>
                  {customer.phone && <span className="flex items-center gap-1"><Phone size={11} />{customer.phone}</span>}
                  {customer.area && <span className="flex items-center gap-1"><MapPin size={11} />{customer.area}</span>}
                  <span style={{ fontFamily: "JetBrains Mono" }}>{customer.code}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-xs" style={{ color: C.inkSoft }}>اجمالي الشغل</div>
                  <div className="font-bold" style={{ fontFamily: "JetBrains Mono", color: C.ink }}>{money(totals.price)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs" style={{ color: C.inkSoft }}>تم دفع</div>
                  <div className="font-bold" style={{ fontFamily: "JetBrains Mono", color: C.green }}>{money(totals.paid)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs" style={{ color: C.inkSoft }}>الرصيد</div>
                  <div className="font-bold" style={{ fontFamily: "JetBrains Mono", color: totals.balance > 0 ? C.rust : C.inkSoft }}>{money(totals.balance)}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "Tajawal" }}>
                <thead>
                  <tr style={{ background: C.paper, color: C.inkSoft }}>
                    {["التاريخ", "الشغل", "المصمم", "السعر", "المدفوع", "الرصيد", "الدفع"].map((h) => <th key={h} className="text-right px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7}><Empty text="مفيش تعاملات لسه" /></td></tr>}
                  {rows.map((e) => {
                    const bal = e.price - e.discount - e.paid;
                    return (
                      <tr key={e.id} className="border-t" style={{ borderColor: C.line }}>
                        <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{e.date}</td>
                        <td className="px-3 py-2">{e.jobType}</td>
                        <td className="px-3 py-2">{e.designer}</td>
                        <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono" }}>{money(e.price)}</td>
                        <td className="px-3 py-2" style={{ fontFamily: "JetBrains Mono", color: C.green }}>{money(e.paid)}</td>
                        <td className="px-3 py-2 font-semibold" style={{ fontFamily: "JetBrains Mono", color: bal > 0 ? C.rust : C.inkSoft }}>{money(bal)}</td>
                        <td className="px-3 py-2 text-xs">{e.paymentType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  App shell                                                              */
/* ---------------------------------------------------------------------- */
const TABS = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "add", label: "إدخال شغل", icon: PlusCircle },
  { id: "entries", label: "سجل الشغل", icon: Table2 },
  { id: "customers", label: "العملاء", icon: Users },
  { id: "vodafone", label: "فودافون كاش", icon: Smartphone },
  { id: "report", label: "تقرير عميل", icon: FileSearch },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [designers] = useState(DEFAULT_DESIGNERS);
  const [jobTypes] = useState(DEFAULT_JOBTYPES);
  const [editEntry, setEditEntry] = useState(null);
  const [confirmDelEntry, setConfirmDelEntry] = useState(null);
  const [reportPreselect, setReportPreselect] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([fetchCustomers(), fetchEntries()]);
      setCustomers(c);
      setEntries(e);
      setSaveError("");
    } catch (err) {
      setSaveError("مش قادر أوصل لقاعدة البيانات. تأكد من إعدادات Supabase في ملف .env.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const addCustomer = useCallback(async (data) => {
    try {
      const created = await insertCustomer({ ...data, code: genCustomerCode(customers) });
      setCustomers((prev) => [...prev, created]);
      return created;
    } catch {
      setSaveError("حصلت مشكلة في حفظ العميل، حاول تاني.");
      throw new Error("save-failed");
    }
  }, [customers]);

  const updateCustomer = useCallback(async (c) => {
    try {
      await updateCustomerDb(c);
      setCustomers((prev) => prev.map((x) => (x.code === c.code ? c : x)));
    } catch {
      setSaveError("حصلت مشكلة في تعديل العميل، حاول تاني.");
    }
  }, []);

  const deleteCustomer = useCallback(async (c) => {
    try {
      await deleteCustomerDb(c.code);
      setCustomers((prev) => prev.filter((x) => x.code !== c.code));
    } catch {
      setSaveError("حصلت مشكلة في حذف العميل، حاول تاني.");
    }
  }, []);

  const saveEntry = useCallback(async (entry) => {
    try {
      const saved = await upsertEntry(entry);
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === saved.id);
        return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      });
      setEditEntry(null);
      setTab("entries");
    } catch {
      setSaveError("حصلت مشكلة في حفظ العملية، حاول تاني.");
    }
  }, []);

  const deleteEntry = useCallback(async (entry) => {
    try {
      await deleteEntryDb(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch {
      setSaveError("حصلت مشكلة في حذف العملية، حاول تاني.");
    } finally {
      setConfirmDelEntry(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: C.paper }}>
        <Loader2 className="animate-spin" style={{ color: C.teal }} size={28} />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: C.paper, minHeight: "100vh", fontFamily: "Tajawal" }}>
      <style>{FONTS}</style>
      <header className="sticky top-0 z-40" style={{ background: C.ink }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RegMark size={20} color="#fff" />
            <span style={{ fontFamily: "Cairo", color: "#fff" }} className="font-bold text-base">شغل المكتب</span>
          </div>
          <span className="text-xs" style={{ color: "#B8C0D0" }}>نظام متابعة الطباعة والتصميم</span>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id !== "add") setEditEntry(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
                style={{
                  background: active ? C.teal : "transparent",
                  color: active ? "#fff" : "#B8C0D0",
                  fontFamily: "Tajawal",
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {saveError && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="text-sm px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: C.rustSoft, color: C.rust }}>
            <AlertCircle size={14} /> {saveError}
            <button className="mr-auto" onClick={() => setSaveError("")}><X size={14} /></button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-5">
        {tab === "dashboard" && <Dashboard entries={entries} customers={customers} />}

        {tab === "add" && (
          <div>
            <PageHeader title={editEntry ? "تعديل عملية شغل" : "إدخال شغل جديد"} subtitle="سجّل طلب جديد وربطه بعميل ومصمم" />
            <Card style={{ maxWidth: 640 }}>
              <EntryForm
                initial={editEntry}
                customers={customers}
                designers={designers}
                jobTypes={jobTypes}
                onAddCustomer={addCustomer}
                onSave={saveEntry}
                onCancel={() => { setEditEntry(null); setTab(editEntry ? "entries" : "dashboard"); }}
              />
            </Card>
          </div>
        )}

        {tab === "entries" && (
          <EntriesTable
            entries={entries}
            customers={customers}
            designers={designers}
            jobTypes={jobTypes}
            onEdit={(e) => { setEditEntry(e); setTab("add"); }}
            onDelete={(e) => setConfirmDelEntry(e)}
          />
        )}

        {tab === "customers" && (
          <CustomersPage
            customers={customers}
            entries={entries}
            onAdd={addCustomer}
            onUpdate={updateCustomer}
            onDelete={deleteCustomer}
            onOpenReport={(c) => { setReportPreselect(c); setTab("report"); }}
          />
        )}

        {tab === "vodafone" && <VodafonePage entries={entries} />}

        {tab === "report" && <CustomerReportPage customers={customers} entries={entries} preselect={reportPreselect} />}
      </main>

      {confirmDelEntry && (
        <ConfirmModal
          text={`هتحذف عملية "${confirmDelEntry.jobType}" الخاصة بـ ${confirmDelEntry.customerName} نهائيًا.`}
          onCancel={() => setConfirmDelEntry(null)}
          onConfirm={() => deleteEntry(confirmDelEntry)}
        />
      )}
    </div>
  );
}
