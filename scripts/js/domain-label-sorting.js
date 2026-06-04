/* Pi-hole: A black hole for Internet advertisements
 *  (c) 2023 Pi-hole, LLC (https://pi-hole.net)
 *  Network-wide ad blocking via your own hardware.
 *
 *  This file is copyright under the latest version of the EUPL.
 *  Please see LICENSE file for your rights under this license. */

"use strict";

const DNS_LABEL_MAX_LENGTH = 63;
const DOMAIN_LABEL_SORT_TYPE = "domain-label";
const DEFAULT_DOMAIN_SORT_TYPE = "string";

function domainLabelSortKey(domain) {
  if (!domain || domain.length === 0) {
    return "";
  }

  const labels = domain
    .trim()
    .toLowerCase()
    .split(".")
    .filter(label => label.length > 0)
    .toReversed();

  return labels.map(label => label.padEnd(DNS_LABEL_MAX_LENGTH, "\0")).join("");
}

function setColumnSortType(table, columnIndex, sortType) {
  const settings = table.settings()[0];
  const column = settings.aoColumns[columnIndex];
  column._sManualType = sortType;
  column.sType = sortType;

  for (const row of settings.aoData) {
    if (row._aSortData) {
      row._aSortData[columnIndex] = null;
    }
  }
}

function updateDomainLabelSortIcon(icon, active, direction) {
  icon.classList.remove("fa-arrow-up-a-z", "fa-arrow-down-z-a", "text-muted");

  if (!active) {
    icon.classList.add("fa-arrow-up-a-z", "text-muted");
    return;
  }

  icon.classList.add(direction === "desc" ? "fa-arrow-down-z-a" : "fa-arrow-up-a-z");
}

function applyDomainLabelSort(table, columnIndex, direction) {
  setColumnSortType(table, columnIndex, DOMAIN_LABEL_SORT_TYPE);
  table.order([[columnIndex, direction]]).draw(false);
}

function initDomainLabelSortHeader(table, columnIndex) {
  const header = $(table.column(columnIndex).header());
  header.addClass("dns-domain-label-sort-header");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-link dns-domain-label-sort-btn";
  button.title = "Sort by domain hierarchy (TLD first, parent before subdomain)";
  button.setAttribute("aria-label", "Sort domains by label hierarchy");

  const icon = document.createElement("span");
  icon.classList.add("fa-solid", "dns-domain-label-sort-icon");
  button.append(icon);
  header.append(button);

  let sortFromLabelButton = false;
  let domainLabelSortActive = false;
  let domainLabelSortDir = null;

  function syncIcon() {
    updateDomainLabelSortIcon(icon, domainLabelSortActive, domainLabelSortDir);
    button.classList.toggle("active", domainLabelSortActive);
    button.setAttribute("aria-pressed", domainLabelSortActive ? "true" : "false");
  }

  function deactivateDomainLabelSort() {
    domainLabelSortActive = false;
    domainLabelSortDir = null;
    setColumnSortType(table, columnIndex, DEFAULT_DOMAIN_SORT_TYPE);
    syncIcon();
  }

  button.addEventListener("click", event => {
    event.stopPropagation();

    domainLabelSortDir = !domainLabelSortActive || domainLabelSortDir === "desc" ? "asc" : "desc";

    sortFromLabelButton = true;
    domainLabelSortActive = true;
    applyDomainLabelSort(table, columnIndex, domainLabelSortDir);
    syncIcon();
  });

  table.on("order.dt", () => {
    if (sortFromLabelButton) {
      sortFromLabelButton = false;
      return;
    }

    const order = table.order();
    const wasActive = domainLabelSortActive;
    deactivateDomainLabelSort();

    if (wasActive && order.length > 0 && order[0][0] === columnIndex) {
      table.order([[columnIndex, order[0][1]]]).draw(false);
    }
  });

  syncIcon();

  return {
    isActive() {
      return domainLabelSortActive;
    },
    getDirection() {
      return domainLabelSortDir;
    },
    applySavedDirection(direction) {
      if (direction !== "asc" && direction !== "desc") {
        return;
      }

      sortFromLabelButton = true;
      domainLabelSortActive = true;
      domainLabelSortDir = direction;
      applyDomainLabelSort(table, columnIndex, direction);
      syncIcon();
    },
  };
}

$.extend($.fn.dataTableExt.oSort, {
  "domain-label-pre"(a) {
    return domainLabelSortKey(a);
  },

  "domain-label-asc"(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  },

  "domain-label-desc"(a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
  },
});

globalThis.initDomainLabelSortHeader = initDomainLabelSortHeader;
