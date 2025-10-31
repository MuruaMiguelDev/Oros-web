(() => {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCcjlg1J2kZ1uuwH2t_50ODDQZP_N-NU-kiUWot9nfM4WLq0_XagejdhLEwaW9CVnE5Q/exec";

  // Utilidad: crear y mostrar popups accesibles sin tocar estilos del formulario
  function showPopup({ title = "", message = "", type = "info" }) {
    // Estilos inline para no depender de hojas externas
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "popup-title");
    overlay.tabIndex = -1;

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(15, 23, 42, .55)", // slate-900/55
      display: "grid",
      placeItems: "center",
      zIndex: "9999",
      padding: "1rem"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "100%",
      maxWidth: "28rem",
      background: "#ffffff",
      borderRadius: "1rem",
      boxShadow: "0 10px 30px rgba(2,6,23,.2)",
      padding: "1.25rem",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      gap: ".5rem",
      marginBottom: ".5rem"
    });

    const icon = document.createElement("span");
    Object.assign(icon.style, {
      display: "inline-grid",
      placeItems: "center",
      width: "2rem",
      height: "2rem",
      borderRadius: "9999px",
      flexShrink: "0",
      color: "#fff"
    });

    // Colores por tipo
    const TYPE_COLORS = {
      success: "#16a34a", // green-600
      error: "#dc2626",   // red-600
      info: "#0ea5e9"     // sky-600
    };
    icon.style.background = TYPE_COLORS[type] || TYPE_COLORS.info;
    icon.innerHTML = type === "success"
      ? "✓"
      : type === "error"
      ? "✕"
      : "i";

    const h = document.createElement("h4");
    h.id = "popup-title";
    h.textContent = title || (type === "success" ? "¡Mensaje enviado!" : type === "error" ? "Hubo un problema" : "Aviso");
    Object.assign(h.style, {
      fontSize: "1.125rem",
      fontWeight: "700",
      color: "#0f172a" // slate-900
    });

    const body = document.createElement("p");
    body.innerHTML = message || "";
    Object.assign(body.style, {
      marginTop: ".25rem",
      color: "#475569", // slate-600
      lineHeight: "1.5"
    });

    const footer = document.createElement("div");
    Object.assign(footer.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: ".5rem",
      marginTop: "1rem"
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Cerrar";
    Object.assign(closeBtn.style, {
      padding: ".625rem 1rem",
      borderRadius: ".75rem",
      border: "1px solid #e2e8f0", // slate-200
      background: "#ffffff",
      color: "#0f172a",
      cursor: "pointer"
    });
    closeBtn.addEventListener("mouseenter", () => (closeBtn.style.background = "#f8fafc")); // slate-50
    closeBtn.addEventListener("mouseleave", () => (closeBtn.style.background = "#ffffff"));

    const remove = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      lastFocused?.focus?.();
      document.body.style.overflow = originalOverflow;
    };

    const onKey = (e) => {
      if (e.key === "Escape") remove();
    };

    closeBtn.addEventListener("click", remove);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) remove();
    });

    header.append(icon, h);
    panel.append(header, body, footer);
    footer.append(closeBtn);
    overlay.append(panel);

    const lastFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    // Enfoque accesible
    setTimeout(() => closeBtn.focus(), 0);
  }

  // Serializar FormData a objeto (opcional)
  function formDataToObject(fd) {
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = v;
    return obj;
  }

  // Enviar con fallback CORS -> no-cors
  async function postToScript(formData) {
    // Primer intento: CORS (ideal, permite leer respuesta)
    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: formData
      });
      // Si el servidor responde JSON con {result:"success"} se valida
      let ok = res.ok;
      let isJson = false;
      let data = null;
      try {
        data = await res.clone().json();
        isJson = true;
      } catch (_) {
        // puede no ser JSON, está bien
      }
      if (ok) {
        if (isJson && data && (data.result === "success" || data.status === "success")) {
          return { ok: true, data };
        }
        // Si es 2xx pero sin JSON claro, lo tratamos como éxito
        return { ok: true, data: null };
      }
      // Si no es ok, intentamos fallback
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Segundo intento: no-cors (respuesta opaca, asumimos éxito si no lanza red error)
      try {
        const res2 = await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          body: formData
        });
        // type === "opaque" => no podemos leer, asumimos que llegó
        if (res2 && (res2.ok || res2.type === "opaque")) {
          return { ok: true, data: null, opaque: true };
        }
        throw new Error("No-CORS falló");
      } catch (err2) {
        return { ok: false, error: err2?.message || "Network error" };
      }
    }
  }

  function init() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Deshabilitar envío
      const prevText = submitBtn ? submitBtn.innerHTML : null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.innerHTML = `
          Enviando…
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" opacity=".2"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        `;
      }

      // Construir datos
      const fd = new FormData(form);
      // (Opcional) agregar metadatos útiles
      fd.append("_submittedAt", new Date().toISOString());
      fd.append("_source", window.location.href);

      const result = await postToScript(fd);

      // Restaurar botón
      if (submitBtn && prevText !== null) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "";
        submitBtn.innerHTML = prevText;
      }

      if (result.ok) {
        form.reset();
        showPopup({
          type: "success",
          title: "¡Gracias! Recibimos tu mensaje",
          message:
            "Te contactaremos a la brevedad. Si necesitas una respuesta urgente, puedes escribirnos a <strong>oros.strategy@gmail.com</strong> o llamar al <strong>+54 9 351-567-890</strong>."
        });
      } else {
        const details = (() => {
          // Convertimos a texto legible (sin exponer stack)
          const obj = formDataToObject(new FormData(form));
          delete obj.mensaje?.length > 120 && (obj.mensaje = obj.mensaje.slice(0, 120) + "…");
          return `<pre style="white-space:pre-wrap;font-size:.875rem;background:#f8fafc;padding:.5rem;border-radius:.5rem;border:1px solid #e2e8f0;">${JSON.stringify(
            obj,
            null,
            2
          )}</pre>`;
        })();

        showPopup({
          type: "error",
          title: "No pudimos enviar tu mensaje",
          message:
            `Por favor, intenta nuevamente en unos minutos.<br>Detalle: <em>${result.error || "Error desconocido"}</em><br><br>` +
            `Si el problema persiste, escríbenos a <strong>oros.strategy@gmail.com</strong> o llama al <strong>+54 9 351-567-890</strong>.<br><br>` +
            `<strong>Vista previa de los datos (no sensibles):</strong><br>${details}`
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();