"use client";

import { apiFetch } from "@/lib/api";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./account.module.css";

type Profile = {
  phone?: string;
  whatsapp?: string;
  birthDate?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  company?: string;
  jobTitle?: string;
  bio?: string;
};
type User = {
  email: string;
  firstName: string;
  lastName: string;
  profile?: Profile | null;
};
const blank: Profile = {
  phone: "",
  whatsapp: "",
  birthDate: "",
  country: "México",
  state: "",
  city: "",
  postalCode: "",
  company: "",
  jobTitle: "",
  bio: "",
};

export function ProfileForm() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(blank);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void apiFetch<User>("/auth/me")
      .then((value) => {
        setUser(value);
        setProfile({
          ...blank,
          ...value.profile,
          birthDate: value.profile?.birthDate?.slice(0, 10) || "",
        });
      })
      .catch(() => router.replace("/login?next=/mi-cuenta"));
  }, [router]);

  function field(key: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await apiFetch<User>("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          ...profile,
          birthDate: profile.birthDate || undefined,
        }),
      });
      setUser(updated);
      setMessage("Información actualizada correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!user)
    return (
      <main className={styles.loading}>
        <LoaderCircle />
      </main>
    );
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.avatar}>{initials}</span>
          <div>
            <h1>Mi cuenta</h1>
            <p>Completa tu información personal, profesional y de contacto.</p>
          </div>
        </header>
        <section className={styles.card}>
          <h2>Datos personales</h2>
          <div className={styles.grid}>
            <label>
              Nombre
              <input
                value={user.firstName}
                onChange={(event) =>
                  setUser({ ...user, firstName: event.target.value })
                }
              />
            </label>
            <label>
              Apellidos
              <input
                value={user.lastName}
                onChange={(event) =>
                  setUser({ ...user, lastName: event.target.value })
                }
              />
            </label>
            <label>
              Correo electrónico
              <input value={user.email} disabled />
            </label>
            <label>
              Fecha de nacimiento
              <input
                type="date"
                value={profile.birthDate || ""}
                onChange={(event) => field("birthDate", event.target.value)}
              />
            </label>
            <label>
              Teléfono
              <input
                value={profile.phone || ""}
                onChange={(event) => field("phone", event.target.value)}
                placeholder="+52…"
              />
            </label>
            <label>
              WhatsApp
              <input
                value={profile.whatsapp || ""}
                onChange={(event) => field("whatsapp", event.target.value)}
                placeholder="+52…"
              />
            </label>
          </div>
          <h2>Ubicación</h2>
          <div className={styles.grid}>
            {(
              [
                ["country", "País"],
                ["state", "Estado"],
                ["city", "Ciudad"],
                ["postalCode", "Código postal"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={profile[key] || ""}
                  onChange={(event) => field(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <h2>Perfil profesional</h2>
          <div className={styles.grid}>
            <label>
              Empresa
              <input
                value={profile.company || ""}
                onChange={(event) => field("company", event.target.value)}
              />
            </label>
            <label>
              Puesto o profesión
              <input
                value={profile.jobTitle || ""}
                onChange={(event) => field("jobTitle", event.target.value)}
              />
            </label>
            <label className={styles.full}>
              Acerca de ti
              <textarea
                maxLength={1000}
                value={profile.bio || ""}
                onChange={(event) => field("bio", event.target.value)}
                placeholder="Cuéntanos sobre tu experiencia y objetivos de aprendizaje."
              />
            </label>
          </div>
          {message && <p className={styles.message}>{message}</p>}
          <button onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle /> : <Save />} Guardar cambios
          </button>
        </section>
      </div>
    </main>
  );
}
