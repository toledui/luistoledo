"use client";
import { AccountMenu } from "@/components/account-menu/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { BookOpen, CreditCard, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./student-navbar.module.css";
import { CartButton } from "@/components/cart/cart-context";
const links=[
 {href:"/mi-aprendizaje",label:"Mis cursos",icon:BookOpen},
 {href:"/mi-aprendizaje/pedidos",label:"Pedidos y pagos",icon:CreditCard},
 {href:"/mi-cuenta",label:"Mi cuenta",icon:UserRound},
 {href:"/mi-cuenta/seguridad",label:"Seguridad",icon:ShieldCheck},
];
export function StudentNavbar(){const pathname=usePathname();return <header className={styles.header}><div className={styles.inner}><Link href="/" className={styles.brand}><span className={styles.brandLogo}><BrandLogo dark /></span></Link><nav>{links.map(({href,label,icon:Icon})=><Link className={pathname===href?styles.active:""} href={href} key={href}><Icon/>{label}</Link>)}</nav><CartButton/><AccountMenu/></div></header>}
