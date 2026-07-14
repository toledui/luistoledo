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
          <Link href="/cursos">Cursos</Link>
          <Link href="/#metodo">Metodología</Link>
          <Link href="/#sobre-mi">Sobre mí</Link>
          <Link href="/#faq">Preguntas</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <div className={styles.actions}>
          <CartButton />
          <AccountMenu />
        </div>
        <button
          className={styles.menuButton}
          onClick={() => setOpen(!open)}
          aria-label="Abrir menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className={styles.mobile}>
          <Link href="/cursos">Cursos</Link>
          <Link href="/#metodo">Metodología</Link>
          <Link href="/#sobre-mi">Sobre mí</Link>
          <Link href="/#faq">Preguntas</Link>
          <Link href="/contacto">Contacto</Link>
          <CartButton />
          <AccountMenu mobile />
        </div>
      )}
    </header>
  );
}
