import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

import type { DepotCree } from "@/hooks/useCreerDepot";
import { QrCode } from "@/components/common/QrCode";
import { lienSuivi } from "@/hooks/usePortail";
import { detailLigne } from "@/lib/comptoir";
import { formatDate, formatDateHeure, formatFCFA, formatTelephone, nomAbrege } from "@/lib/format";
import { LIBELLES_MOYEN, type Boutique, type Pressing } from "@/lib/types";

export type ContenuImpression = "ticket" | "etiquettes";

function CodeBarres({ valeur, hauteur = 46 }: { valeur: string; hauteur?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, valeur, {
        format: "CODE128",
        height: hauteur,
        width: 1.6,
        margin: 0,
        displayValue: false,
      });
    } catch {
      /* valeur non encodable : le numéro reste lisible en clair */
    }
  }, [valeur, hauteur]);
  return <svg ref={ref} style={{ maxWidth: "100%" }} aria-label={valeur} />;
}

interface Props {
  contenu: ContenuImpression | null;
  depot: DepotCree;
  client: { nom: string; telephone: string };
  pressing: Pressing;
  boutique: Boutique;
  caissier: string;
  duplicata?: boolean;
}

const ligne: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8 };

/** Zone invisible à l'écran, seule visible à l'impression (voir .zone-impression dans styles.css). */
export function ZoneImpression({
  contenu,
  depot,
  client,
  pressing,
  boutique,
  caissier,
  duplicata = false,
}: Props) {
  if (!contenu) return null;
  const d = depot.depot;

  if (contenu === "etiquettes") {
    return (
      <div className="zone-impression">
        {depot.etiquettes.map((e) => (
          <div
            key={e.code}
            style={{
              padding: "3mm 4mm",
              breakAfter: "page",
              pageBreakAfter: "always",
              fontSize: 11,
              lineHeight: 1.25,
            }}
          >
            <div style={{ ...ligne, alignItems: "baseline" }}>
              <strong style={{ fontSize: 18 }}>{e.code.slice(d.numero.length + 1)}</strong>
              <span>Retrait {formatDate(d.date_retrait_prevue)}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{nomAbrege(client.nom)}</div>
            <div style={{ margin: "1.5mm 0" }}>
              <CodeBarres valeur={e.code} />
            </div>
            <div style={ligne}>
              <span>{e.code}</span>
              {d.express ? <strong>EXPRESS</strong> : null}
            </div>
            <div style={{ fontSize: 10 }}>{e.libelle}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="zone-impression" style={{ padding: "4mm", fontSize: 11.5, lineHeight: 1.35 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{pressing.nom}</div>
        <div>{boutique.nom}</div>
        {boutique.adresse || boutique.commune ? (
          <div>{[boutique.adresse, boutique.commune].filter(Boolean).join(", ")}</div>
        ) : null}
        {boutique.telephone || pressing.telephone ? (
          <div>Tél. {formatTelephone(boutique.telephone ?? pressing.telephone)}</div>
        ) : null}
      </div>
      {duplicata ? (
        <div style={{ textAlign: "center", fontWeight: 800, margin: "2mm 0" }}>DUPLICATA</div>
      ) : null}
      <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "2.5mm 0" }} />
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 800 }}>{d.numero}</div>
      <div style={{ textAlign: "center", margin: "1mm 0 2mm" }}>
        <CodeBarres valeur={d.numero} hauteur={34} />
      </div>
      <div style={ligne}>
        <span>Client</span>
        <strong>{client.nom}</strong>
      </div>
      <div style={ligne}>
        <span>Téléphone</span>
        <span>{formatTelephone(client.telephone)}</span>
      </div>
      <div style={ligne}>
        <span>Déposé le</span>
        <span>{formatDateHeure(d.created_at)}</span>
      </div>
      <div style={ligne}>
        <span>Retrait prévu</span>
        <strong>{formatDate(d.date_retrait_prevue)}</strong>
      </div>
      {d.express ? (
        <div style={{ fontWeight: 800, textAlign: "center", marginTop: "1mm" }}>
          SERVICE EXPRESS
        </div>
      ) : null}
      <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "2.5mm 0" }} />
      {depot.lignes.map((l) => (
        <div key={l.id} style={{ marginBottom: "1.5mm" }}>
          <div>{l.libelle}</div>
          <div style={ligne}>
            <span>{detailLigne(l)}</span>
            <span>{formatFCFA(l.total, false)}</span>
          </div>
          {l.observations ? (
            <div style={{ fontSize: 10, fontStyle: "italic" }}>{l.observations}</div>
          ) : null}
        </div>
      ))}
      <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "2.5mm 0" }} />
      <div style={ligne}>
        <span>Total</span>
        <span>{formatFCFA(d.total_ht)}</span>
      </div>
      {d.remise > 0 ? (
        <div style={ligne}>
          <span>Remise</span>
          <span>−{formatFCFA(d.remise)}</span>
        </div>
      ) : null}
      <div style={{ ...ligne, fontSize: 14, fontWeight: 800 }}>
        <span>Net à payer</span>
        <span>{formatFCFA(d.net_a_payer)}</span>
      </div>
      <div style={ligne}>
        <span>Déjà payé</span>
        <span>{formatFCFA(d.deja_paye)}</span>
      </div>
      {depot.paiement && depot.paiement.statut === "a_verifier" ? (
        <div style={ligne}>
          <span>{LIBELLES_MOYEN[depot.paiement.moyen]} (à vérifier)</span>
          <span>{formatFCFA(depot.paiement.montant)}</span>
        </div>
      ) : null}
      <div style={{ ...ligne, fontWeight: 800 }}>
        <span>Reste à payer</span>
        <span>{formatFCFA(d.reste_a_payer)}</span>
      </div>
      <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "2.5mm 0" }} />
      <div style={ligne}>
        <span>Pièces</span>
        <span>{depot.etiquettes.length}</span>
      </div>
      <div style={ligne}>
        <span>Caissier</span>
        <span>{caissier}</span>
      </div>
      {boutique.pied_ticket ? (
        <div style={{ textAlign: "center", marginTop: "3mm" }}>{boutique.pied_ticket}</div>
      ) : null}
      {d.jeton_suivi ? (
        <div style={{ textAlign: "center", marginTop: "3mm" }}>
          <QrCode
            valeur={lienSuivi(d.jeton_suivi)}
            taille={110}
            label="QR code de suivi du dépôt"
          />
          <div style={{ fontSize: 9 }}>Scannez pour suivre votre dépôt</div>
        </div>
      ) : null}
      <div style={{ textAlign: "center", marginTop: "2mm", fontSize: 9 }}>
        Présentez ce ticket pour retirer votre linge.
      </div>
    </div>
  );
}
