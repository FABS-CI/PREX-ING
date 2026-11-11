import {
  BarChart3,
  Boxes,
  Globe,
  LayoutDashboard,
  Receipt,
  Settings,
  Shirt,
  ShoppingBasket,
  Tags,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/types";

export interface EntreeMenu {
  to: string;
  libelle: string;
  icone: LucideIcon;
  roles: Role[];
  /** Affiché dans la barre du bas sur téléphone. */
  mobile?: boolean;
}

const TOUS: Role[] = ["proprietaire", "gerant", "caissier"];
const GESTION: Role[] = ["proprietaire", "gerant"];

export const MENU: EntreeMenu[] = [
  {
    to: "/tableau-de-bord",
    libelle: "Tableau de bord",
    icone: LayoutDashboard,
    roles: TOUS,
    mobile: true,
  },
  { to: "/comptoir", libelle: "Comptoir", icone: ShoppingBasket, roles: TOUS, mobile: true },
  { to: "/depots", libelle: "Dépôts", icone: Shirt, roles: TOUS, mobile: true },
  { to: "/clients", libelle: "Clients", icone: Users, roles: TOUS, mobile: true },
  { to: "/caisse", libelle: "Caisse", icone: Wallet, roles: TOUS },
  {
    to: "/livraisons",
    libelle: "Livraisons",
    icone: Truck,
    roles: ["proprietaire", "gerant", "livreur"],
    mobile: true,
  },
  { to: "/commandes", libelle: "Commandes en ligne", icone: Globe, roles: GESTION },
  { to: "/catalogue", libelle: "Catalogue & tarifs", icone: Tags, roles: GESTION },
  { to: "/depenses", libelle: "Dépenses", icone: Receipt, roles: GESTION },
  { to: "/stock", libelle: "Stock", icone: Boxes, roles: GESTION },
  { to: "/equipe", libelle: "Équipe", icone: UsersRound, roles: ["proprietaire"] },
  { to: "/rapports", libelle: "Rapports", icone: BarChart3, roles: GESTION },
  { to: "/parametres", libelle: "Paramètres", icone: Settings, roles: ["proprietaire"] },
];

export function menuPourRole(role: Role | null): EntreeMenu[] {
  if (!role) return [];
  return MENU.filter((e) => e.roles.includes(role));
}

/** Page d'accueil selon le rôle (le livreur arrive directement sur ses livraisons). */
export function accueilPourRole(role: Role | null): string {
  return role === "livreur" ? "/livraisons" : "/tableau-de-bord";
}
