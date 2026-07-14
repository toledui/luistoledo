"use client";
import { CreditCard, FileText, Mail, MessageSquare, Palette, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./configuration-layout.module.css";
const sections = [
  {
    href: "/admin/configuracion/inicial",
    label: "General",
    description: "Academia y contacto",
    icon: Settings2,
  },
  {
    href: "/admin/configuracion/apariencia",
    label: "Apariencia",
    description: "Marca y colores",
    icon: Palette,
  },
  {
    href: "/admin/configuracion/contacto",
    label: "Contacto",
    description: "Destinatario y Turnstile",
    icon: MessageSquare,
  },
  {
    href: "/admin/configuracion/correo",
    label: "Correo",
    description: "Proveedor y SMTP",
    icon: Mail,
  },
  {
    href: "/admin/configuracion/pagos",
    label: "Pagos",
    description: "Stripe y transferencia",
    icon: CreditCard,
  },
  {
    href: "/admin/configuracion/plantillas-email",
    label: "Plantillas",
    description: "Mensajes automáticos",
    icon: FileText,
  },
];
export function ConfigurationNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.navigation} aria-label="Secciones de configuración">
      {sections.map(({ href, label, description, icon: Icon }) => (
        <Link
          className={pathname === href ? styles.active : ""}
          href={href}
          key={href}
        >
          <Icon size={18} />
          <span>
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
