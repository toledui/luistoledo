"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import styles from "./modal.module.css";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="platform-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </header>
        {children && <div className={styles.content}>{children}</div>}
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

export function ConfirmModal({
  open,
  title = "Confirmar acción",
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={destructive ? styles.destructive : ""}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className={styles.warning}>
        <AlertTriangle size={22} />
        <span>Esta acción se aplicará inmediatamente.</span>
      </div>
    </Modal>
  );
}
