import { settingsService } from "../services/settingsService.js";
import { toast } from "../ui/components/toast.js";
import { el } from "../utils/dom.js";

export function settingsPage() {
  const wrapper = el("div", { class: "grid" });

  const deviceCard = el("div", { class: "card" }, [
    el("h3", {}, "Dispositivo"),
    el("div", {}, `DeviceId: ${settingsService.getDeviceId()}`)
  ]);

  const themeSelect = el("select", {}, [
    el("option", { value: "light" }, "Claro"),
    el("option", { value: "dark" }, "Oscuro")
  ]);
  themeSelect.value = settingsService.getTheme();
  themeSelect.addEventListener("change", () => {
    settingsService.setTheme(themeSelect.value);
    document.documentElement.setAttribute("data-theme", themeSelect.value);
  });

  const currencyInput = el("input", {
    value: settingsService.getCurrency()
  });
  const syncKeyInput = el("input", {
    value: settingsService.getSyncKey(),
    placeholder: "Sync key (si aplica)"
  });

  const settingsCard = el("div", { class: "card form" }, [
    el("h3", {}, "Preferencias"),
    field("Moneda", currencyInput),
    field("Tema", themeSelect),
    field("Sync key", syncKeyInput),
    el(
      "button",
      {
        class: "btn primary",
        onClick: () => {
          settingsService.setCurrency(currencyInput.value.trim() || "USD");
          settingsService.setSyncKey(syncKeyInput.value.trim());
          toast.success("Preferencias guardadas");
        }
      },
      "Guardar"
    )
  ]);

  wrapper.append(deviceCard, settingsCard);
  return wrapper;
}

settingsPage.title = "Settings";

function field(label, input) {
  return el("div", { class: "field" }, [el("label", {}, label), input]);
}
