/* ==========================================================
   script.js — ILOHA スケジュール
   機能: 日付範囲・タイトル・講師のフィルター / 日付ソート
   ========================================================== */

(function () {
  "use strict";

  const table = document.getElementById("schedule-table");
  const tbody = table.tBodies[0];
  const startInput = document.getElementById("start-date");
  const endInput = document.getElementById("end-date");
  const titleInput = document.getElementById("title-filter");
  const lecturerInput = document.getElementById("lecturer-filter");

  /* ---------- ユーティリティ ---------- */

  // 全角/半角・大文字/小文字・空白の揺れを吸収
  const normalize = (s) =>
    (s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

  // "2026/12/21" と "2022年3月28日" の両方に対応
  function parseDate(text) {
    const t = (text || "").normalize("NFKC");
    const m = t.match(/(\d{4})\s*[\/年.-]\s*(\d{1,2})\s*[\/月.-]\s*(\d{1,2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  // タイトル列は「資料」「動画」などのリンク文字を除外して判定
  function getTitleText(cell) {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll("a").forEach((a) => a.remove());
    return clone.textContent;
  }

  /* ---------- 行データのキャッシュ ---------- */

  const rows = Array.from(tbody.rows).map((tr, index) => ({
    tr,
    index, // 元の並び順（リセット用）
    date: parseDate(tr.cells[1].textContent),
    title: normalize(getTitleText(tr.cells[2])),
    lecturer: normalize(tr.cells[3].textContent),
  }));

  /* ---------- 件数表示 ---------- */

  const countEl = document.createElement("p");
  countEl.id = "result-count";
  countEl.setAttribute("aria-live", "polite");
  table.parentNode.insertBefore(countEl, table);

  function updateCount(visible) {
    countEl.textContent = `${visible} 件 / 全 ${rows.length} 件`;
  }

  /* ---------- flatpickr ---------- */

  const pickerOptions = {
    dateFormat: "Y/m/d",
    allowInput: true,
    disableMobile: true,
  };
  if (window.flatpickr && flatpickr.l10ns && flatpickr.l10ns.ja) {
    pickerOptions.locale = "ja";
  }
  if (window.flatpickr) {
    flatpickr(startInput, pickerOptions);
    flatpickr(endInput, pickerOptions);
  }

  /* ---------- フィルター ---------- */

  function applyFilters() {
    const start = parseDate(startInput.value);
    const end = parseDate(endInput.value);
    const title = normalize(titleInput.value);
    const lecturer = normalize(lecturerInput.value);

    let visible = 0;

    rows.forEach((r) => {
      let ok = true;

      if (start || end) {
        if (!r.date) ok = false; // 日付が読めない行は期間指定時に除外
        else {
          if (start && r.date < start) ok = false;
          if (end && r.date > end) ok = false;
        }
      }
      if (ok && title && !r.title.includes(title)) ok = false;
      if (ok && lecturer && !r.lecturer.includes(lecturer)) ok = false;

      r.tr.hidden = !ok;
      if (ok) visible++;
    });

    updateCount(visible);
  }

  function resetFilters() {
    [startInput, endInput].forEach((el) => {
      if (el._flatpickr) el._flatpickr.clear();
      else el.value = "";
    });
    titleInput.value = "";
    lecturerInput.value = "";

    // ソートも元に戻す
    clearSortState();
    rows.sort((a, b) => a.index - b.index).forEach((r) => tbody.appendChild(r.tr));

    applyFilters();
  }

  /* ---------- ソート ---------- */

  const sortableHeaders = table.querySelectorAll("th[data-sort]");

  function clearSortState() {
    sortableHeaders.forEach((th) => {
      th.classList.remove("asc", "desc");
      th.removeAttribute("aria-sort");
    });
  }

  function sortByDate(direction) {
    const dir = direction === "asc" ? 1 : -1;
    rows
      .slice()
      .sort((a, b) => {
        // 日付なしは常に末尾
        if (!a.date && !b.date) return a.index - b.index;
        if (!a.date) return 1;
        if (!b.date) return -1;
        const diff = (a.date - b.date) * dir;
        return diff !== 0 ? diff : (a.index - b.index) * dir;
      })
      .forEach((r) => tbody.appendChild(r.tr));
  }

  sortableHeaders.forEach((th) => {
    th.tabIndex = 0;
    th.setAttribute("role", "button");

    const toggle = () => {
      const next = th.classList.contains("asc") ? "desc" : "asc";
      clearSortState();
      th.classList.add(next);
      th.setAttribute("aria-sort", next === "asc" ? "ascending" : "descending");

      if (th.dataset.sort === "date") sortByDate(next);
    };

    th.addEventListener("click", toggle);
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* ---------- イベント ---------- */

  // Enterキーで絞り込み
  [titleInput, lecturerInput, startInput, endInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyFilters();
    });
  });

  // HTMLの onclick から呼べるようにグローバルへ公開
  window.applyFilters = applyFilters;
  window.resetFilters = resetFilters;

  // 初期表示
  updateCount(rows.length);
})();