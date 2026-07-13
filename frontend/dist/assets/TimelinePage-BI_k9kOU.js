import{h as c,r as a,t as S,j as e,R as C,p as $,P as T,F as M}from"./index-DdcAMSI4.js";import{C as E}from"./clock-V46meOlc.js";import{A as z}from"./alert-triangle-DO6p0uLp.js";import{C as I}from"./chevron-right-lHgpNM2B.js";import{f as F}from"./format-D9pTN3Kd.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=c("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=c("Printer",[["polyline",{points:"6 9 6 2 18 2 18 9",key:"1306q4"}],["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["rect",{width:"12",height:"8",x:"6",y:"14",key:"5ipwut"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=c("Thermometer",[["path",{d:"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z",key:"17jzev"}]]),r="#152E57",R="#1e4a8c";function H(l=""){return l.replace(/_/g," ").replace(/\.pdf$/i,"").replace(/\.jpg$/i,"")}const g={report:{label:"Lab Report",color:"#3b82f6",bg:"#eff6ff",border:"#bfdbfe",icon:e.jsx(M,{className:"w-[18px] h-[18px]"})},medication:{label:"Medication",color:"#10b981",bg:"#ecfdf5",border:"#a7f3d0",icon:e.jsx(T,{className:"w-[18px] h-[18px]"})},symptom:{label:"Symptom Log",color:"#f59e0b",bg:"#fffbeb",border:"#fde68a",icon:e.jsx(L,{className:"w-[18px] h-[18px]"})}};function X(){const[l,f]=a.useState([]),[h,p]=a.useState(!0),[n,b]=a.useState("all"),[u,D]=a.useState(null),[s,V]=a.useState(null),[U,Y]=a.useState(!1),[_,q]=a.useState("structured"),[B,G]=a.useState(!1);a.useEffect(()=>{y()},[n]);const y=async()=>{try{p(!0);const t=await S.getFull(n!=="all"?{type:n}:{});t.data.success&&f(t.data.data.events||[])}catch(t){console.error("Timeline fetch error:",t)}finally{p(!1)}},v=()=>{var m,x;if(!s&&!u)return;const t=new Date,i=t.toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"}),o=t.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),w=(m=s==null?void 0:s.keyIssues)!=null&&m.length?s.keyIssues.map((N,k)=>`<li style="margin-bottom:8px;padding:10px 12px;background:#fff8f8;border-left:3px solid #e53e3e;border-radius:4px;">
             <span style="font-weight:700;color:#c53030;margin-right:8px;">${k+1}.</span>${N}
           </li>`).join(""):'<li style="color:#718096;">No specific issues flagged.</li>',j=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MedIntel Clinical Handover Note</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a202c; background: #fff; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #152E57; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 42px; height: 42px; background: linear-gradient(135deg,#152E57,#1e4a8c); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .brand-icon svg { width: 24px; height: 24px; fill: none; stroke: white; stroke-width: 2; }
    .brand-name { font-size: 22px; font-weight: 800; color: #152E57; }
    .brand-name span { color: #0d9488; }
    .brand-tag { font-size: 10px; color: #718096; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #718096; line-height: 1.8; }
    .meta strong { color: #1a202c; }

    /* Document title */
    .doc-title { margin-bottom: 28px; }
    .doc-title h1 { font-size: 20px; font-weight: 800; color: #152E57; margin-bottom: 4px; }
    .doc-title p { font-size: 11px; color: #e53e3e; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

    /* Sections */
    .section { margin-bottom: 24px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .section-label::after { content: ''; flex: 1; height: 1px; background: currentColor; opacity: 0.2; }
    .section-body { font-size: 13px; color: #2d3748; line-height: 1.75; background: #f7fafc; border-radius: 6px; padding: 14px 16px; border-left: 3px solid currentColor; }

    .reason .section-label { color: #152E57; }
    .reason .section-body { border-color: #152E57; font-weight: 600; background: #ebf2ff; }
    .clinical .section-label { color: #2b6cb0; }
    .clinical .section-body { border-color: #2b6cb0; }
    .trends .section-label { color: #6b46c1; }
    .trends .section-body { border-color: #6b46c1; }

    /* Two column grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .grid-card { border-radius: 6px; padding: 14px 16px; }
    .grid-card h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .meds-card { background: #f0fff4; border: 1px solid #9ae6b4; }
    .meds-card h4 { color: #276749; }
    .symp-card { background: #fffbeb; border: 1px solid #f6e05e; }
    .symp-card h4 { color: #975a16; }
    .grid-card p { font-size: 12px; color: #4a5568; line-height: 1.7; white-space: pre-line; }

    /* Issues */
    .issues-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #c53030; margin-bottom: 10px; }
    .issues-list { list-style: none; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #a0aec0; }
    .disclaimer { font-size: 9px; color: #cbd5e0; text-align: center; margin-top: 8px; font-style: italic; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div>
        <div class="brand-name">Med<span>Intel</span></div>
        <div class="brand-tag">Understand Today. Healthier Tomorrow.</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Document Type:</strong> Clinical Handover Note</div>
      <div><strong>Generated:</strong> ${i} at ${o}</div>
      <div><strong>Classification:</strong> Confidential — For Physician Review</div>
    </div>
  </div>

  <!-- Title -->
  <div class="doc-title">
    <h1>Pre-Consultation Clinical Summary</h1>
    <p>⚠ Not a medical diagnosis — prepared for physician review only</p>
  </div>

  <!-- Reason for Visit -->
  ${s!=null&&s.reasonForVisit?`
  <div class="section reason">
    <div class="section-label">Reason for Visit</div>
    <div class="section-body" style="border-color:#152E57;">${s.reasonForVisit}</div>
  </div>`:""}

  <!-- Clinical Summary -->
  ${s!=null&&s.clinicalSummary?`
  <div class="section clinical">
    <div class="section-label" style="color:#2b6cb0;">Clinical Summary</div>
    <div class="section-body" style="border-color:#2b6cb0;">${s.clinicalSummary}</div>
  </div>`:""}

  <!-- Laboratory Trends -->
  ${s!=null&&s.laboratoryTrends?`
  <div class="section trends">
    <div class="section-label" style="color:#6b46c1;">Laboratory Trends</div>
    <div class="section-body" style="border-color:#6b46c1;">${s.laboratoryTrends}</div>
  </div>`:""}

  <!-- Medications + Symptoms grid -->
  <div class="grid-2">
    <div class="grid-card meds-card">
      <h4>Current Medications</h4>
      <p>${(s==null?void 0:s.currentMedications)||"No current medications reported."}</p>
    </div>
    <div class="grid-card symp-card">
      <h4>Reported Symptoms</h4>
      <p>${(s==null?void 0:s.reportedSymptoms)||"No symptoms documented."}</p>
    </div>
  </div>

  <!-- Key Issues -->
  ${(x=s==null?void 0:s.keyIssues)!=null&&x.length?`
  <div class="section">
    <div class="issues-label">⚑ Key Issues for Physician Review</div>
    <ul class="issues-list">${w}</ul>
  </div>`:""}

  <!-- Footer -->
  <div class="footer">
    <span>MedIntel · medintel.app</span>
    <span>Patient-generated document · ${i}</span>
  </div>
  <div class="disclaimer">This document was automatically generated by MedIntel AI and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.</div>

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:center;margin-top:32px;">
    <button onclick="window.print()" style="background:#152E57;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:12px;">🖨 Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#f7fafc;color:#4a5568;border:1px solid #e2e8f0;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Close</button>
  </div>
</div>
</body></html>`,d=window.open("","_blank","width=900,height=750");if(!d){alert("Pop-up blocked. Please allow pop-ups for this site.");return}d.document.write(j),d.document.close(),d.focus()};return e.jsxs("div",{className:"min-h-screen",style:{background:"#F4F7FA"},children:[e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8",children:[e.jsxs("div",{children:[e.jsx("div",{className:"flex items-center gap-2 mb-1",children:e.jsx("span",{className:"text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full",style:{background:"#EBF2FF",color:r},children:"Health Record"})}),e.jsx("h1",{className:"text-3xl font-extrabold tracking-tight",style:{color:r},children:"Your Health Timeline"}),e.jsx("p",{className:"mt-1 text-sm text-gray-500 max-w-lg",children:"A complete chronological record of your reports, medications, and symptom logs."})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto",children:[e.jsxs("select",{value:n,onChange:t=>b(t.target.value),className:"flex-1 sm:flex-initial text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none font-medium",style:{color:r},children:[e.jsx("option",{value:"all",children:"All Events"}),e.jsx("option",{value:"report",children:"Reports"}),e.jsx("option",{value:"medication",children:"Medications"}),e.jsx("option",{value:"symptom",children:"Symptoms"})]}),e.jsxs("button",{onClick:v,className:"flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors",style:{color:r},children:[e.jsx(A,{className:"w-4 h-4"}),"Export"]})]})]}),e.jsx("div",{className:"grid grid-cols-1 gap-6",children:e.jsx("div",{className:"w-full overflow-y-auto pr-1",style:{maxHeight:"calc(100vh - 220px)"},children:h?e.jsx("div",{className:"space-y-4",children:[1,2,3,4].map(t=>e.jsxs("div",{className:"flex gap-4 animate-pulse",children:[e.jsx("div",{className:"w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"}),e.jsx("div",{className:"flex-1 bg-white rounded-2xl h-28 border border-gray-100"})]},t))}):l.length===0?e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center",children:[e.jsx("div",{className:"w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4",children:e.jsx(P,{className:"w-8 h-8 text-blue-400"})}),e.jsx("h3",{className:"font-bold text-gray-800 text-lg mb-1",children:"Your timeline is empty"}),e.jsx("p",{className:"text-sm text-gray-400",children:"Upload a medical report, add a medication, or log symptoms to get started."})]}):e.jsxs("div",{className:"relative pl-5",children:[e.jsx("div",{className:"absolute top-3 bottom-3 left-[18px] w-0.5 rounded-full",style:{background:`linear-gradient(to bottom, ${r}22, ${r}55, ${r}22)`}}),e.jsx("div",{className:"space-y-5",children:l.map((t,i)=>{const o=g[t.type]||g.report;return e.jsxs("div",{className:"flex gap-4 group",style:{animation:"fadeInUp 0.4s ease both",animationDelay:`${i*60}ms`},children:[e.jsx("div",{className:"relative flex-shrink-0 flex flex-col items-center z-10",children:e.jsx("div",{className:"w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110",style:{background:o.bg,border:`2px solid ${o.border}`,color:o.color},children:o.icon})}),e.jsxs("div",{className:"flex-1 bg-white rounded-2xl border shadow-sm p-5 transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 overflow-hidden",style:{borderColor:"#e5e7eb"},children:[e.jsxs("div",{className:"flex items-center justify-between gap-2 mb-2",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full",style:{background:o.bg,color:o.color},children:[o.icon&&C.cloneElement(o.icon,{className:"w-3 h-3"}),o.label]}),e.jsxs("span",{className:"flex items-center gap-1 text-[11px] text-gray-400 font-medium",children:[e.jsx(E,{className:"w-3 h-3"}),F(new Date(t.date),"MMM d, yyyy")]})]}),e.jsx("h3",{className:"text-[15px] font-bold mb-1.5 leading-snug transition-colors group-hover:text-blue-700",style:{color:r},children:H(t.title)}),t.summary&&e.jsx("p",{className:"text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3",children:t.summary}),e.jsxs("div",{className:"flex items-center justify-between pt-3 border-t border-gray-50",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[t.type==="report"&&e.jsxs(e.Fragment,{children:[t.subtype&&e.jsx("span",{className:"text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600",children:t.subtype}),t.abnormalCount>0?e.jsxs("span",{className:"flex items-center gap-1 text-[11px] font-bold text-red-600",children:[e.jsx(z,{className:"w-3 h-3"}),t.abnormalCount," abnormal"]}):e.jsxs("span",{className:"flex items-center gap-1 text-[11px] font-bold text-emerald-600",children:[e.jsx($,{className:"w-3 h-3"}),"All normal"]})]}),t.type==="medication"&&e.jsx("span",{className:`text-[11px] font-bold px-2 py-0.5 rounded-md ${t.isActive?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-500"}`,children:t.isActive?"● Active":"Completed"}),t.type==="symptom"&&e.jsx("span",{className:"text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700",children:"Entry logged"})]}),t.type==="report"&&t.id&&e.jsxs("a",{href:`/reports/${t.id}`,className:"inline-flex items-center gap-1 text-[12px] font-bold transition-colors hover:underline",style:{color:R},children:["View Analysis",e.jsx(I,{className:"w-3.5 h-3.5"})]})]})]})]},`${t.type}-${t.id||i}`)})})]})})})]}),e.jsx("style",{children:`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `})]})}export{X as default};
