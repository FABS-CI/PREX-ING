/** Exports des rapports : CSV pour Excel (séparateur ;) et impression A4 (PDF). */

export type Cellule = string | number | null | undefined;
export interface Section {
  titre: string;
  colonnes: string[];
  lignes: Cellule[][];
}

function echapper(v: Cellule): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function versCsv(titre: string, sections: Section[]): string {
  const lignes: string[] = [echapper(titre), ""];
  for (const s of sections) {
    lignes.push(echapper(s.titre));
    lignes.push(s.colonnes.map(echapper).join(";"));
    for (const l of s.lignes) lignes.push(l.map(echapper).join(";"));
    lignes.push("");
  }
  // BOM : Excel reconnaît l'UTF-8 (accents) ; ; : séparateur des Excel en français.
  return `\uFEFF${lignes.join("\r\n")}`;
}

export function telechargerCsv(nomFichier: string, titre: string, sections: Section[]): void {
  const blob = new Blob([versCsv(titre, sections)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const html = (s: Cellule) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );

/** Ouvre le rapport en A4 dans une fenêtre et lance l'impression (Enregistrer en PDF). */
export function imprimerRapport(titre: string, sousTitre: string, sections: Section[]): void {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  const corps = sections
    .map(
      (s) =>
        `<h2>${html(s.titre)}</h2><table><thead><tr>${s.colonnes.map((c) => `<th>${html(c)}</th>`).join("")}</tr></thead><tbody>${s.lignes
          .map(
            (l) =>
              `<tr>${l.map((c, i) => `<td class="${i > 0 && typeof c === "number" ? "n" : ""}">${html(typeof c === "number" ? c.toLocaleString("fr-FR") : c)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join("");
  w.document
    .write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${html(titre)}</title><style>
@page{size:A4;margin:16mm}body{font-family:Inter,Arial,sans-serif;color:#0A1630;font-size:11pt}
h1{font-size:18pt;margin:0;color:#0B3D91}p{margin:4px 0 16px;color:#4A5876}
h2{font-size:12pt;margin:18px 0 6px;color:#0B3D91}table{width:100%;border-collapse:collapse}
th,td{padding:5px 8px;border-bottom:1px solid #E2E7F0;text-align:left}th{background:#F4F6FA;font-size:9pt}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
</style></head><body><h1>${html(titre)}</h1><p>${html(sousTitre)}</p>${corps}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/** Fiche de paie simplifiée, au format A4 (Enregistrer en PDF). */
export function imprimerFichePaie(f: {
  pressing: string;
  boutique: string;
  employe: string;
  poste: string | null;
  mois: string;
  lignes: [string, number][];
  net: number;
  detail: string;
  paye: string | null;
}): void {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  const n = (x: number) => `${x.toLocaleString("fr-FR")} FCFA`;
  w.document
    .write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche de paie — ${html(f.employe)} — ${html(f.mois)}</title><style>
@page{size:A4;margin:18mm}body{font-family:Inter,Arial,sans-serif;color:#0A1630;font-size:11pt}
header{display:flex;justify-content:space-between;border-bottom:2px solid #0B3D91;padding-bottom:10px;margin-bottom:18px}
h1{font-size:18pt;margin:0;color:#0B3D91}.m{color:#4A5876}table{width:100%;border-collapse:collapse;margin-top:12px}
td{padding:8px;border-bottom:1px solid #E2E7F0}td.n{text-align:right;font-variant-numeric:tabular-nums}
tr.net td{font-weight:700;font-size:13pt;border-top:2px solid #0B3D91;border-bottom:none}
footer{margin-top:40px;display:flex;justify-content:space-between}.sig{width:45%;border-top:1px solid #4A5876;padding-top:6px;color:#4A5876;font-size:9pt}
</style></head><body><header><div><h1>Fiche de paie</h1><div class="m">${html(f.mois)}</div></div><div style="text-align:right"><strong>${html(f.pressing)}</strong><div class="m">${html(f.boutique)}</div></div></header>
<p><strong>${html(f.employe)}</strong>${f.poste ? ` · ${html(f.poste)}` : ""}</p><p class="m">${html(f.detail)}</p>
<table>${f.lignes.map(([l, v]) => `<tr><td>${html(l)}</td><td class="n">${n(v)}</td></tr>`).join("")}<tr class="net"><td>Net à payer</td><td class="n">${n(f.net)}</td></tr></table>
<p class="m">${f.paye ? html(f.paye) : "Non payé"}</p>
<p class="m" style="font-size:9pt">Document simplifié, sans cotisations sociales (CNPS) ni impôt sur salaire.</p>
<footer><div class="sig">Signature de l’employeur</div><div class="sig">Signature de l’employé</div></footer></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
