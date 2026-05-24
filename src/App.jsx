import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONFIG — substitua pela sua URL e chave anon
// ============================================================
const SUPABASE_URL = "https://rablpvofyfvcaaxxkqfv.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhYmxwdm9meWZ2Y2FheHhrcWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODkwNDcsImV4cCI6MjA5NTE2NTA0N30.1txJePlkZ2la7Pz_1JBq_Pu3Wf3n1Td9LSOBHWQcQEo";

// ---- Supabase client mínimo sem biblioteca externa ----
const sb = {
  headers: {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "return=representation",
  },
  url: (path) => `${SUPABASE_URL}/rest/v1/${path}`,

  async get(table, query = "") {
    const r = await fetch(this.url(`${table}?${query}`), { headers: this.headers });
    return r.json();
  },
  async post(table, body) {
    const r = await fetch(this.url(table), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return r.json();
  },
  async patch(table, id, body) {
    const r = await fetch(this.url(`${table}?id=eq.${id}`), {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(this.url(`${table}?id=eq.${id}`), {
      method: "DELETE",
      headers: this.headers,
    });
    return r.ok;
  },
};

// ============================================================
// DEFAULT PHASES
// ============================================================
const DEFAULT_PHASES = [
  {
    id: "pre",
    label: "Pré-Arrematação",
    color: "#f59e0b",
    icon: "🔍",
    items: [
      { id: "contato_prop", label: "Contato com ex-proprietário" },
      { id: "contato_corretor", label: "Contato com corretor na área" },
      { id: "dividas", label: "Dívidas de condomínio e IPTU" },
      { id: "preco_ref", label: "Referência de preço" },
      { id: "matricula", label: "Matrícula verificada" },
    ],
  },
  {
    id: "pos",
    label: "Pós-Arrematação",
    color: "#3b82f6",
    icon: "🔨",
    items: [
      { id: "boleto_pago", label: "Boleto da entrada pago" },
      { id: "contrato_ass", label: "Contrato de financiamento assinado" },
      { id: "dividas_pagas", label: "Dívidas pagas" },
      { id: "registro_feito", label: "Registro feito" },
    ],
  },
  {
    id: "desocupacao",
    label: "Desocupação",
    color: "#ef4444",
    icon: "🏚️",
    items: [{ id: "desocupado", label: "Imóvel desocupado" }],
  },
  {
    id: "reforma",
    label: "Reforma",
    color: "#8b5cf6",
    icon: "🔧",
    items: [
      { id: "pintura", label: "Pintura" },
      { id: "chaveiro", label: "Chaveiro" },
      { id: "moveis", label: "Móveis" },
    ],
  },
  {
    id: "venda",
    label: "Venda",
    color: "#10b981",
    icon: "💰",
    items: [
      { id: "vistoria_fin", label: "Vistoria para financiamento" },
      { id: "anuncio_corretor", label: "Anúncio do corretor" },
      { id: "anuncio_smart", label: "Anúncio da Smart" },
      { id: "trafego_pago", label: "Tráfego pago" },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================
const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const phaseProgress = (checks, phase) => {
  if (!phase.items.length) return 0;
  const done = phase.items.filter((i) => checks?.[i.id]).length;
  return Math.round((done / phase.items.length) * 100);
};

const totalProgress = (checks, phases) => {
  const all = phases.flatMap((p) => p.items);
  if (!all.length) return 0;
  return Math.round((all.filter((i) => checks?.[i.id]).length / all.length) * 100);
};

// ============================================================
// DEMO DATA (usado quando Supabase não está configurado)
// ============================================================
const DEMO_SOCIOS = ["Ana", "Bruno", "Carlos"];
const DEMO_PROPERTIES = [
  {
    id: "demo-1",
    name: "Apto 302 – Bloco B",
    address: "Rua das Flores, 120 – SP",
    arrematacao: 280000,
    avaliacao: 420000,
    status: "Em andamento",
    checks: { contato_prop: true, contato_corretor: true, matricula: true },
    gastos: [
      { id: "g1", descricao: "Taxa de leilão", valor: 5600, pagamentos: { Ana: true } },
      { id: "g2", descricao: "ITBI", valor: 8400, pagamentos: { Bruno: true } },
    ],
    phases: DEFAULT_PHASES,
    socios: DEMO_SOCIOS,
  },
  {
    id: "demo-2",
    name: "Casa Térrea",
    address: "Av. Paulista, 900 – SP",
    arrematacao: 350000,
    avaliacao: 550000,
    status: "Em andamento",
    checks: { contato_prop: true, dividas: true, preco_ref: true, boleto_pago: true, contrato_ass: true, dividas_pagas: true, registro_feito: true },
    gastos: [],
    phases: DEFAULT_PHASES,
    socios: DEMO_SOCIOS,
  },
];

// ============================================================
// ICONS
// ============================================================
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus: "M12 5v14M5 12h14",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    arrow: "M19 12H5M12 5l-7 7 7 7",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  );
};

// ============================================================
// MODAL
// ============================================================
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 16, padding: 28, width: "100%", maxWidth: wide ? 760 : 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// PROPERTY FORM
// ============================================================
function PropertyForm({ initial, socios, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", address: "", arrematacao: "", avaliacao: "", status: "Em andamento" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={initial ? "Editar Imóvel" : "Novo Imóvel"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { label: "Nome / Identificação", key: "name", placeholder: "Ex: Apto 302 – Bloco B" },
          { label: "Endereço", key: "address", placeholder: "Rua, número – Cidade" },
          { label: "Valor de Arrematação (R$)", key: "arrematacao", type: "number", placeholder: "0" },
          { label: "Valor de Avaliação (R$)", key: "avaliacao", type: "number", placeholder: "0" },
        ].map(({ label, key, type, placeholder }) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
            <input type={type || "text"} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
              style={{ background: "#0f1117", border: "1px solid #2d3548", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none" }} />
          </label>
        ))}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Status</span>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}
            style={{ background: "#0f1117", border: "1px solid #2d3548", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14 }}>
            {["Em andamento", "Concluído", "Cancelado"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #2d3548", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// GASTO FORM
// ============================================================
function GastoForm({ initial, socios, onSave, onClose }) {
  const [form, setForm] = useState(initial || { descricao: "", valor: "" });
  return (
    <Modal title={initial ? "Editar Gasto" : "Novo Gasto"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Descrição</span>
          <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Taxa de leilão"
            style={{ background: "#0f1117", border: "1px solid #2d3548", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Valor (R$)</span>
          <input type="number" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0"
            style={{ background: "#0f1117", border: "1px solid #2d3548", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14 }} />
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #2d3548", background: "none", color: "#94a3b8", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PHASE EDITOR MODAL
// ============================================================
function PhaseEditorModal({ phases, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(phases)));

  const addPhase = () => setLocal((p) => [...p, { id: `fase_${Date.now()}`, label: "Nova Fase", color: "#64748b", icon: "📋", items: [] }]);
  const delPhase = (pid) => setLocal((p) => p.filter((x) => x.id !== pid));
  const updatePhase = (pid, key, val) => setLocal((p) => p.map((ph) => ph.id === pid ? { ...ph, [key]: val } : ph));

  const addItem = (pid) => setLocal((p) => p.map((ph) => ph.id === pid ? { ...ph, items: [...ph.items, { id: `item_${Date.now()}`, label: "Novo item" }] } : ph));
  const delItem = (pid, iid) => setLocal((p) => p.map((ph) => ph.id === pid ? { ...ph, items: ph.items.filter((i) => i.id !== iid) } : ph));
  const updateItem = (pid, iid, val) => setLocal((p) => p.map((ph) => ph.id === pid ? { ...ph, items: ph.items.map((i) => i.id === iid ? { ...i, label: val } : i) } : ph));

  return (
    <Modal title="Editar Fases e Etapas" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {local.map((ph) => (
          <div key={ph.id} style={{ background: "#0f1117", borderRadius: 12, padding: 16, border: `1px solid ${ph.color}44` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <input value={ph.icon} onChange={(e) => updatePhase(ph.id, "icon", e.target.value)} style={{ width: 46, background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 8, padding: "6px 8px", color: "#f1f5f9", fontSize: 18, textAlign: "center" }} />
              <input value={ph.label} onChange={(e) => updatePhase(ph.id, "label", e.target.value)} style={{ flex: 1, background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 14, fontWeight: 600 }} />
              <input type="color" value={ph.color} onChange={(e) => updatePhase(ph.id, "color", e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
              <button onClick={() => delPhase(ph.id)} style={{ background: "#ef444422", border: "none", borderRadius: 8, padding: 8, color: "#ef4444", cursor: "pointer" }}><Icon name="trash" size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ph.items.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ph.color, flexShrink: 0 }} />
                  <input value={it.label} onChange={(e) => updateItem(ph.id, it.id, e.target.value)} style={{ flex: 1, background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9", fontSize: 13 }} />
                  <button onClick={() => delItem(ph.id, it.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><Icon name="x" size={13} /></button>
                </div>
              ))}
              <button onClick={() => addItem(ph.id)} style={{ alignSelf: "flex-start", background: `${ph.color}22`, border: `1px dashed ${ph.color}66`, borderRadius: 6, padding: "5px 12px", color: ph.color, cursor: "pointer", fontSize: 12, marginTop: 4 }}>+ Adicionar etapa</button>
            </div>
          </div>
        ))}
        <button onClick={addPhase} style={{ padding: "11px", borderRadius: 10, border: "1px dashed #2d3548", background: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>+ Adicionar fase</button>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #2d3548", background: "none", color: "#94a3b8", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave(local)} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Salvar Fases</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SOCIOS MANAGER
// ============================================================
function SociosModal({ socios, onSave, onClose }) {
  const [list, setList] = useState([...socios]);
  const [novo, setNovo] = useState("");
  return (
    <Modal title="Gerenciar Sócios" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome do sócio"
            style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3548", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14 }} />
          <button onClick={() => { if (novo.trim()) { setList((l) => [...l, novo.trim()]); setNovo(""); } }}
            style={{ background: "#3b82f6", border: "none", borderRadius: 8, padding: "0 16px", color: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f1117", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ color: "#f1f5f9" }}>👤 {s}</span>
              <button onClick={() => setList((l) => l.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #2d3548", background: "none", color: "#94a3b8", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave(list)} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PROPERTY DETAIL VIEW
// ============================================================
function PropertyDetail({ prop, onUpdate, onBack, currentUser, allSocios }) {
  const [editProp, setEditProp] = useState(false);
  const [editPhases, setEditPhases] = useState(false);
  const [gastoModal, setGastoModal] = useState(null); // null | "new" | {gasto}
  const [tab, setTab] = useState("progresso");

  const socios = prop.socios || allSocios;
  const phases = prop.phases || DEFAULT_PHASES;
  const checks = prop.checks || {};
  const gastos = prop.gastos || [];

  const toggleCheck = (itemId) => {
    const next = { ...checks, [itemId]: !checks[itemId] };
    onUpdate({ ...prop, checks: next });
  };

  const saveGasto = (form) => {
    const val = parseFloat(form.valor) || 0;
    if (gastoModal === "new") {
      const g = { id: `g_${Date.now()}`, descricao: form.descricao, valor: val, pagamentos: {} };
      onUpdate({ ...prop, gastos: [...gastos, g] });
    } else {
      onUpdate({ ...prop, gastos: gastos.map((g) => g.id === gastoModal.id ? { ...g, descricao: form.descricao, valor: val } : g) });
    }
    setGastoModal(null);
  };

  const delGasto = (gid) => onUpdate({ ...prop, gastos: gastos.filter((g) => g.id !== gid) });

  const togglePagamento = (gid, socio) => {
    onUpdate({
      ...prop,
      gastos: gastos.map((g) => g.id === gid ? { ...g, pagamentos: { ...g.pagamentos, [socio]: !g.pagamentos?.[socio] } } : g),
    });
  };

  const totalGastos = gastos.reduce((s, g) => s + (parseFloat(g.valor) || 0), 0);
  const porSocio = socios.length ? totalGastos / socios.length : 0;
  const prog = totalProgress(checks, phases);

  const statusColor = { "Em andamento": "#f59e0b", Concluído: "#10b981", Cancelado: "#ef4444" };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 10, padding: "8px 14px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="arrow" size={14} /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, color: "#f1f5f9", fontFamily: "'DM Serif Display', Georgia, serif" }}>{prop.name}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>{prop.address}</p>
        </div>
        <span style={{ background: `${statusColor[prop.status]}22`, color: statusColor[prop.status], border: `1px solid ${statusColor[prop.status]}44`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600 }}>{prop.status}</span>
        <button onClick={() => setEditProp(true)} style={{ background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 10, padding: "8px 12px", color: "#94a3b8", cursor: "pointer" }}><Icon name="edit" size={14} /></button>
      </div>

      {/* Cards financeiros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Arrematação", val: fmt(prop.arrematacao), color: "#f59e0b" },
          { label: "Avaliação", val: fmt(prop.avaliacao), color: "#3b82f6" },
          { label: "Desconto", val: prop.avaliacao && prop.arrematacao ? `${Math.round((1 - prop.arrematacao / prop.avaliacao) * 100)}%` : "—", color: "#10b981" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "#1a1f2e", borderRadius: 12, padding: "16px 18px", border: `1px solid ${color}33` }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Progress bar geral */}
      <div style={{ background: "#1a1f2e", borderRadius: 12, padding: "16px 20px", marginBottom: 24, border: "1px solid #2d3548" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>Progresso geral</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: prog === 100 ? "#10b981" : "#f1f5f9" }}>{prog}%</span>
        </div>
        <div style={{ background: "#0f1117", borderRadius: 99, height: 8 }}>
          <div style={{ background: `linear-gradient(90deg, #3b82f6, #10b981)`, borderRadius: 99, height: 8, width: `${prog}%`, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#1a1f2e", borderRadius: 12, padding: 4, border: "1px solid #2d3548" }}>
        {[{ id: "progresso", label: "📋 Progresso" }, { id: "gastos", label: "💰 Gastos" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: tab === t.id ? "#2d3548" : "none", color: tab === t.id ? "#f1f5f9" : "#64748b", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: PROGRESSO */}
      {tab === "progresso" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {phases.map((phase) => {
            const pp = phaseProgress(checks, phase);
            return (
              <div key={phase.id} style={{ background: "#1a1f2e", borderRadius: 14, padding: 20, border: `1px solid ${phase.color}33` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{phase.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{phase.label}</div>
                      <div style={{ fontSize: 11, color: phase.color }}>{pp}% concluído</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: "#0f1117", borderRadius: 99, height: 6, width: 80 }}>
                      <div style={{ background: phase.color, borderRadius: 99, height: 6, width: `${pp}%`, transition: "width 0.4s" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {phase.items.map((item) => (
                    <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: checks[item.id] ? `${phase.color}15` : "#0f1117", border: `1px solid ${checks[item.id] ? phase.color + "44" : "#2d3548"}`, cursor: "pointer", transition: "all 0.2s", userSelect: "none" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checks[item.id] ? phase.color : "#3d4560"}`, background: checks[item.id] ? phase.color : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                        {checks[item.id] && <Icon name="check" size={12} />}
                      </div>
                      <span style={{ fontSize: 14, color: checks[item.id] ? "#f1f5f9" : "#94a3b8", textDecoration: checks[item.id] ? "line-through" : "none", transition: "all 0.2s" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <button onClick={() => setEditPhases(true)} style={{ padding: "11px", borderRadius: 12, border: "1px dashed #2d3548", background: "none", color: "#64748b", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="settings" size={14} /> Editar Fases e Etapas
          </button>
        </div>
      )}

      {/* TAB: GASTOS */}
      {tab === "gastos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Total de gastos", val: fmt(totalGastos), color: "#ef4444" },
              { label: `Por sócio (${socios.length})`, val: fmt(porSocio), color: "#f59e0b" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: "#1a1f2e", borderRadius: 12, padding: "16px 18px", border: `1px solid ${color}33` }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Lista de gastos */}
          {gastos.map((g) => {
            const porcao = socios.length ? g.valor / socios.length : 0;
            const pagosSocios = socios.filter((s) => g.pagamentos?.[s]);
            const totalPago = pagosSocios.length * porcao;

            return (
              <div key={g.id} style={{ background: "#1a1f2e", borderRadius: 14, padding: 18, border: "1px solid #2d3548" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>{g.descricao}</div>
                    <div style={{ fontSize: 13, color: "#ef4444", marginTop: 2 }}>{fmt(g.valor)} total — {fmt(porcao)}/sócio</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setGastoModal(g)} style={{ background: "#2d3548", border: "none", borderRadius: 8, padding: "6px 10px", color: "#94a3b8", cursor: "pointer" }}><Icon name="edit" size={13} /></button>
                    <button onClick={() => delGasto(g.id)} style={{ background: "#ef444422", border: "none", borderRadius: 8, padding: "6px 10px", color: "#ef4444", cursor: "pointer" }}><Icon name="trash" size={13} /></button>
                  </div>
                </div>

                {/* Progresso pagamento */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Pagamentos</span>
                    <span style={{ fontSize: 12, color: "#10b981" }}>{fmt(totalPago)} / {fmt(g.valor)}</span>
                  </div>
                  <div style={{ background: "#0f1117", borderRadius: 99, height: 5 }}>
                    <div style={{ background: "#10b981", borderRadius: 99, height: 5, width: g.valor ? `${(totalPago / g.valor) * 100}%` : "0%", transition: "width 0.4s" }} />
                  </div>
                </div>

                {/* Sócios */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {socios.map((s) => {
                    const pago = g.pagamentos?.[s];
                    return (
                      <button key={s} onClick={() => togglePagamento(g.id, s)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: `1px solid ${pago ? "#10b98166" : "#2d3548"}`, background: pago ? "#10b98122" : "#0f1117", color: pago ? "#10b981" : "#64748b", cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
                        {pago ? <Icon name="check" size={12} /> : null}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button onClick={() => setGastoModal("new")} style={{ padding: "13px", borderRadius: 12, border: "1px dashed #10b98166", background: "#10b98111", color: "#10b981", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="plus" size={16} /> Adicionar Gasto
          </button>
        </div>
      )}

      {/* Modais */}
      {editProp && (
        <PropertyForm initial={prop} socios={socios} onClose={() => setEditProp(false)} onSave={(form) => { onUpdate({ ...prop, ...form }); setEditProp(false); }} />
      )}
      {editPhases && (
        <PhaseEditorModal phases={phases} onClose={() => setEditPhases(false)} onSave={(newPhases) => { onUpdate({ ...prop, phases: newPhases }); setEditPhases(false); }} />
      )}
      {gastoModal && (
        <GastoForm initial={gastoModal !== "new" ? gastoModal : null} socios={socios} onClose={() => setGastoModal(null)} onSave={saveGasto} />
      )}
    </div>
  );
}

// ============================================================
// PROPERTY CARD
// ============================================================
function PropertyCard({ prop, onClick, onDelete }) {
  const phases = prop.phases || DEFAULT_PHASES;
  const prog = totalProgress(prop.checks || {}, phases);
  const statusColor = { "Em andamento": "#f59e0b", Concluído: "#10b981", Cancelado: "#ef4444" };
  const sc = statusColor[prop.status] || "#64748b";

  return (
    <div onClick={onClick} style={{ background: "#1a1f2e", borderRadius: 16, padding: 20, border: "1px solid #2d3548", cursor: "pointer", transition: "all 0.2s", position: "relative" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2d3548"; e.currentTarget.style.transform = ""; }}>
      <button onClick={(e) => { e.stopPropagation(); if (confirm("Excluir este imóvel?")) onDelete(); }}
        style={{ position: "absolute", top: 14, right: 14, background: "#ef444422", border: "none", borderRadius: 8, padding: "5px 8px", color: "#ef4444", cursor: "pointer" }}>
        <Icon name="trash" size={13} />
      </button>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 4, paddingRight: 32, fontFamily: "'DM Serif Display', Georgia, serif" }}>{prop.name}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{prop.address}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{prop.status}</span>
        {prop.arrematacao && prop.avaliacao && (
          <span style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b98144", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            {Math.round((1 - prop.arrematacao / prop.avaliacao) * 100)}% desconto
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        <span>Arrematação: <strong style={{ color: "#f59e0b" }}>{fmt(prop.arrematacao)}</strong></span>
        <span>Avaliação: <strong style={{ color: "#3b82f6" }}>{fmt(prop.avaliacao)}</strong></span>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>Progresso</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: prog === 100 ? "#10b981" : "#94a3b8" }}>{prog}%</span>
        </div>
        <div style={{ background: "#0f1117", borderRadius: 99, height: 5 }}>
          <div style={{ background: prog === 100 ? "#10b981" : "linear-gradient(90deg,#3b82f6,#8b5cf6)", borderRadius: 99, height: 5, width: `${prog}%`, transition: "width 0.4s" }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [properties, setProperties] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSocios, setShowSocios] = useState(false);
  const [socios, setSocios] = useState(DEMO_SOCIOS);
  const [currentUser, setCurrentUser] = useState(null);
  const [userModal, setUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false); // modo demo até Supabase configurado
  const [lastSync, setLastSync] = useState(null);

  // Load initial data
  useEffect(() => {
    if (demo) {
      setProperties(DEMO_PROPERTIES);
      setSocios(DEMO_SOCIOS);
      const saved = localStorage.getItem("leilao_user");
      if (saved) setCurrentUser(saved);
      return;
    }
    loadFromSupabase();
  }, [demo]);

  // Polling sync (5s)
  useEffect(() => {
    if (demo) return;
    const t = setInterval(loadFromSupabase, 5000);
    return () => clearInterval(t);
  }, [demo]);

  const loadFromSupabase = async () => {
    setLoading(true);
    try {
      const data = await sb.get("imoveis", "order=created_at");
      if (Array.isArray(data)) {
        setProperties(data.map((d) => ({ ...d, checks: d.checks || {}, gastos: d.gastos || [], phases: d.phases || DEFAULT_PHASES, socios: d.socios || socios })));
        setLastSync(new Date());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveProperty = async (prop) => {
    if (demo) {
      setProperties((ps) => ps.map((p) => p.id === prop.id ? prop : p));
      if (selected?.id === prop.id) setSelected(prop);
      return;
    }
    await sb.patch("imoveis", prop.id, prop);
    loadFromSupabase();
  };

  const addProperty = async (form) => {
    const newProp = { ...form, id: `prop_${Date.now()}`, checks: {}, gastos: [], phases: DEFAULT_PHASES, socios, arrematacao: parseFloat(form.arrematacao) || 0, avaliacao: parseFloat(form.avaliacao) || 0 };
    if (demo) { setProperties((ps) => [...(ps || []), newProp]); return; }
    await sb.post("imoveis", newProp);
    loadFromSupabase();
  };

  const deleteProperty = async (id) => {
    if (demo) { setProperties((ps) => ps.filter((p) => p.id !== id)); return; }
    await sb.delete("imoveis", id);
    loadFromSupabase();
  };

  if (!currentUser && !userModal) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#1a1f2e", borderRadius: 20, padding: 40, width: "100%", maxWidth: 400, border: "1px solid #2d3548", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <h1 style={{ margin: "0 0 8px", color: "#f1f5f9", fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28 }}>LeilãoPro</h1>
          <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>Gestão de imóveis de leilão para sócios</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...socios, "+ Entrar como visitante"].map((s, i) => (
              <button key={i} onClick={() => { const u = i < socios.length ? s : "Visitante"; setCurrentUser(u); localStorage.setItem("leilao_user", u); }}
                style={{ padding: "13px", borderRadius: 10, border: "1px solid #2d3548", background: i < socios.length ? "#2d3548" : "none", color: i < socios.length ? "#f1f5f9" : "#64748b", cursor: "pointer", fontSize: 14, fontWeight: i < socios.length ? 600 : 400 }}>
                {i < socios.length ? `👤 ${s}` : s}
              </button>
            ))}
          </div>
          {demo && <p style={{ fontSize: 11, color: "#3d4560", marginTop: 20 }}>Modo demonstração — Configure o Supabase para sincronização real</p>}
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ borderBottom: "1px solid #2d3548", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1f2ecc", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏛️</span>
            <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: "#f1f5f9" }}>LeilãoPro</span>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "1px solid #2d3548", borderRadius: 8, padding: "6px 12px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
            👤 {currentUser}
          </button>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
          <PropertyDetail prop={selected} onUpdate={(p) => { saveProperty(p); setSelected(p); }} onBack={() => setSelected(null)} currentUser={currentUser} allSocios={socios} />
        </div>
      </div>
    );
  }

  const props = properties || [];
  const totalAtivos = props.filter((p) => p.status !== "Cancelado").length;
  const totalInvestido = props.reduce((s, p) => s + (parseFloat(p.arrematacao) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* NAV */}
      <div style={{ borderBottom: "1px solid #2d3548", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1f2ecc", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏛️</span>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: "#f1f5f9" }}>LeilãoPro</span>
          {demo && <span style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>DEMO</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!demo && lastSync && <span style={{ fontSize: 11, color: "#3d4560" }}>Sync {lastSync.toLocaleTimeString("pt-BR")}</span>}
          <button onClick={() => !demo && loadFromSupabase()} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 6 }} title="Atualizar">
            <Icon name="refresh" size={15} />
          </button>
          <button onClick={() => setShowSocios(true)} style={{ background: "#2d3548", border: "none", borderRadius: 8, padding: "7px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
            👥 Sócios
          </button>
          <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "1px solid #2d3548", borderRadius: 8, padding: "7px 12px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
            👤 {currentUser}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Imóveis ativos", val: totalAtivos, icon: "🏠", color: "#3b82f6" },
            { label: "Total investido", val: fmt(totalInvestido), icon: "💵", color: "#f59e0b" },
            { label: "Sócios", val: socios.length, icon: "👥", color: "#8b5cf6" },
          ].map(({ label, val, icon, color }) => (
            <div key={label} style={{ background: "#1a1f2e", borderRadius: 14, padding: "18px 20px", border: `1px solid ${color}33` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Header lista */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9", fontFamily: "'DM Serif Display', Georgia, serif" }}>Imóveis</h2>
          <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            <Icon name="plus" size={15} /> Novo Imóvel
          </button>
        </div>

        {/* Grid */}
        {props.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#3d4560" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏚️</div>
            <div style={{ fontSize: 16 }}>Nenhum imóvel cadastrado ainda</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Clique em "Novo Imóvel" para começar</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {props.map((p) => (
              <PropertyCard key={p.id} prop={p} onClick={() => setSelected(p)} onDelete={() => deleteProperty(p.id)} />
            ))}
          </div>
        )}

        {demo && (
          <div style={{ marginTop: 40, background: "#1a1f2e", borderRadius: 14, padding: 20, border: "1px solid #f59e0b33" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>⚙️ Como configurar o banco de dados</div>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#94a3b8", fontSize: 13, lineHeight: 1.8 }}>
              <li>Crie uma conta em <strong style={{ color: "#f1f5f9" }}>supabase.com</strong></li>
              <li>Crie um novo projeto</li>
              <li>No SQL Editor, execute o script abaixo para criar a tabela</li>
              <li>Copie a URL e a chave anon do projeto</li>
              <li>Substitua <code style={{ background: "#0f1117", padding: "2px 6px", borderRadius: 4 }}>SUPABASE_URL</code> e <code style={{ background: "#0f1117", padding: "2px 6px", borderRadius: 4 }}>SUPABASE_ANON_KEY</code> no topo do arquivo</li>
              <li>Faça deploy na Vercel com <code style={{ background: "#0f1117", padding: "2px 6px", borderRadius: 4 }}>vercel deploy</code></li>
            </ol>
            <pre style={{ background: "#0f1117", borderRadius: 10, padding: 16, marginTop: 14, fontSize: 12, color: "#10b981", overflowX: "auto" }}>
{`CREATE TABLE imoveis (
  id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  arrematacao NUMERIC,
  avaliacao NUMERIC,
  status TEXT DEFAULT 'Em andamento',
  checks JSONB DEFAULT '{}',
  gastos JSONB DEFAULT '[]',
  phases JSONB,
  socios JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e acesso público (para demo sem auth)
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON imoveis FOR ALL USING (true) WITH CHECK (true);`}
            </pre>
          </div>
        )}
      </div>

      {showForm && (
        <PropertyForm socios={socios} onClose={() => setShowForm(false)} onSave={(form) => { addProperty(form); setShowForm(false); }} />
      )}
      {showSocios && (
        <SociosModal socios={socios} onClose={() => setShowSocios(false)} onSave={(list) => { setSocios(list); setShowSocios(false); }} />
      )}
    </div>
  );
}
