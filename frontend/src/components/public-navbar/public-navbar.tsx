"use client";
import { AccountMenu } from "@/components/account-menu/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { CartButton } from "@/components/cart/cart-context";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./public-navbar.module.css";
export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo}><BrandLogo dark /></span>
          <span className={styles.copy}>
            <strong>Luis Toledo</strong>
            <small>Academy</small>
          </span>
        </Link>
        <nav>
          <Link href="/cursos" onClick={() => setOpen(false)}>Cursos</Link>
          <Link href="/#metodo" onClick={() => setOpen(false)}>Metodología</Link>
          <Link href="/#sobre-mi" onClick={() => setOpen(false)}>Sobre mí</Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>Preguntas</Link>
          <Link href="/contacto" onClick={() => setOpen(false)}>Contacto</Link>
        </nav>
        <div className={styles.actions}>
          <CartButton />
          <AccountMenu responsive />
        </div>
        <button
          className={styles.menuButton}
          onClick={() => setOpen((current) => !current)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className={styles.mobile} id="mobile-navigation">
          <Link href="/cursos" onClick={() => setOpen(false)}>Cursos</Link>
          <Link href="/#metodo" onClick={() => setOpen(false)}>Metodología</Link>
          <Link href="/#sobre-mi" onClick={() => setOpen(false)}>Sobre mí</Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>Preguntas</Link>
          <Link href="/contacto" onClick={() => setOpen(false)}>Contacto</Link>
        </div>
      )}
    </header>
  );
}
