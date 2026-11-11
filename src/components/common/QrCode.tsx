import qrcode from "qrcode-generator";

/** QR code en SVG (niveau de correction M), net à l'impression thermique. */
export function QrCode({
  valeur,
  taille = 120,
  label,
}: {
  valeur: string;
  taille?: number;
  label: string;
}) {
  const qr = qrcode(0, "M");
  qr.addData(valeur);
  qr.make();
  const n = qr.getModuleCount();
  const carres: string[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.isDark(y, x)) carres.push(`M${x} ${y}h1v1h-1z`);
  return (
    <svg
      width={taille}
      height={taille}
      viewBox={`-2 -2 ${n + 4} ${n + 4}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={carres.join("")} fill="#000" />
    </svg>
  );
}
