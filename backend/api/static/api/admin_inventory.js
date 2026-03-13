// Clear inventory quantity/location fields when the Part selection changes
document.addEventListener("DOMContentLoaded", function () {
  const clearFieldsForRow = (partSelect) => {
    if (!partSelect.name) return;

    // inventory_set-0-part -> inventory_set-0
    const parts = partSelect.name.split("-");
    if (parts.length < 3) return;
    const rowPrefix = parts[0] + "-" + parts[1];

    ["in_stock", "stock_alert", "shop_location"].forEach((fieldName) => {
      const fieldSelector = `input[name="${rowPrefix}-${fieldName}"]`;
      const input = document.querySelector(fieldSelector);
      if (input) {
        input.value = "";
      }
    });
  };

  const attachListeners = () => {
    const selects = document.querySelectorAll('select[name$="-part"]');
    selects.forEach((select) => {
      if (select.dataset.inventoryListenerAttached === "true") return;
      select.addEventListener("change", function () {
        clearFieldsForRow(this);
      });
      select.dataset.inventoryListenerAttached = "true";
    });
  };

  // Initial attach
  attachListeners();

  // Re-attach when Django adds new inline rows dynamically
  document.body.addEventListener("click", function (e) {
    if (e.target && e.target.classList.contains("add-row")) {
      // Delay so the new row is in the DOM
      setTimeout(attachListeners, 0);
    }
  });
});

