import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
export const metadata: Metadata = { title: "Contacto" };
export default function ContactPage() { return <ContactForm />; }
