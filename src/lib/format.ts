/** Formats ivoiriens : FCFA sans décimales, dates JJ/MM/AAAA, téléphones à 10 chiffres. */

const NBSP = "\u00A0";

/** 12500 → « 12 500 FCFA » (espace insécable comme séparateur de milliers). */
export function formatFCFA(montant: number | null | undefined, avecDevise = true): string {
  const n = Math.round(Number(montant ?? 0));
  const signe = n < 0 ? "-" : "";
  const chiffres = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${signe}${chiffres}${avecDevise ? `${NBSP}FCFA` : ""}`;
}

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  // Une date seule « 2026-11-11 » est interprétée en heure locale (pas en UTC).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** → « 11/11/2026 » */
export function formatDate(d: string | Date | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** → « 11/11/2026 à 14:05 » */
export function formatDateHeure(d: string | Date | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  return `${formatDate(date)} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Date locale au format ISO « AAAA-MM-JJ » (pour les colonnes de type date). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ajouterJours(d: Date, jours: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + jours);
  return r;
}

/** Début de la journée locale, en ISO (pour filtrer « aujourd'hui »). */
export function debutDuJourISO(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

/** Garde uniquement les chiffres ; retire l'indicatif +225 / 00225 s'il est présent. */
export function normaliserTelephone(saisie: string): string {
  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.length === 13 && chiffres.startsWith("225")) chiffres = chiffres.slice(3);
  if (chiffres.length === 15 && chiffres.startsWith("00225")) chiffres = chiffres.slice(5);
  return chiffres;
}

const PREFIXES_CI = ["01", "05", "07", "21", "25", "27"];

/** Numéro ivoirien valide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27. */
export function telephoneValide(saisie: string): boolean {
  const t = normaliserTelephone(saisie);
  return t.length === 10 && PREFIXES_CI.includes(t.slice(0, 2));
}

/** « 0707070707 » → « 07 07 07 07 07 » */
export function formatTelephone(tel: string | null | undefined): string {
  if (!tel) return "—";
  const t = normaliserTelephone(tel);
  if (t.length !== 10) return tel;
  return t.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** Lien WhatsApp vers un numéro ivoirien, avec un message facultatif. */
export function lienWhatsApp(tel: string, message?: string): string {
  const base = `https://wa.me/225${normaliserTelephone(tel)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Remplit un modèle de message : « Bonjour {client} » + { client: "Awa" }. */
export function remplirModele(modele: string, variables: Record<string, string>): string {
  return modele.replace(/\{(\w+)\}/g, (tout, cle: string) => variables[cle] ?? tout);
}

/** Initiales pour les avatars. */
export function initiales(nom: string | null | undefined): string {
  if (!nom) return "?";
  return nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/** « Kouassi Aya Marie » → « KOUASSI A. » (étiquettes linge). */
export function nomAbrege(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  const premier = (parts[0] ?? "").toUpperCase();
  const second = parts[1] ? ` ${parts[1].charAt(0).toUpperCase()}.` : "";
  return `${premier}${second}`.slice(0, 18);
}
