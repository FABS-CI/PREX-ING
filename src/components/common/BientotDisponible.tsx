import { Hammer } from "lucide-react";

import { EtatVide } from "./EtatVide";
import { PageHeader } from "./PageHeader";

export function BientotDisponible({ titre, texte }: { titre: string; texte?: string }) {
  return (
    <>
      <PageHeader titre={titre} />
      <EtatVide
        icone={Hammer}
        titre="Bientôt disponible"
        texte={texte ?? "Ce module arrive dans une prochaine mise à jour de PREX’ING."}
      />
    </>
  );
}
