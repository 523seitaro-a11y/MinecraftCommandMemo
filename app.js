const storageKey = "minecraft-command-memos";
const repositoryUrl = "https://github.com/523seitaro-a11y/MinecraftCommandMemo";

const starterMemos = [
  {
    id: crypto.randomUUID(),
    title: "雷を落とす",
    category: "ワールド",
    command: "/summon minecraft:lightning_bolt ~ ~ ~",
    tags: ["Java", "演出"],
    version: "Java",
    note: "現在位置に雷を召喚。イベント演出やテスト用に便利。",
    updatedAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: "最強の剣を入手",
    category: "装備",
    command: "/give @p minecraft:diamond_sword{Enchantments:[{id:sharpness,lvl:5},{id:unbreaking,lvl:3}]} 1",
    tags: ["Java", "武器"],
    version: "Java 1.20+",
    note: "NBT構文はバージョン差が出やすいので、使うワールドのバージョンも残しておく。",
    updatedAt: new Date().toISOString()
  }
];

let memos = loadMemos();
let selectedId = memos[0]?.id ?? null;
let currentFilter = "all";

const elements = {
  memoList: document.querySelector("#memoList"),
  searchInput: document.querySelector("#searchInput"),
  filterRow: document.querySelector("#filterRow"),
  form: document.querySelector("#memoForm"),
  title: document.querySelector("#titleInput"),
  category: document.querySelector("#categoryInput"),
  command: document.querySelector("#commandInput"),
  tags: document.querySelector("#tagsInput"),
  version: document.querySelector("#versionInput"),
  note: document.querySelector("#noteInput"),
  deleteBtn: document.querySelector("#deleteBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  postBtn: document.querySelector("#postBtn"),
  newMemoBtn: document.querySelector("#newMemoBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast")
};

function loadMemos() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(starterMemos));
    return starterMemos;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : starterMemos;
  } catch {
    return starterMemos;
  }
}

function saveMemos() {
  localStorage.setItem(storageKey, JSON.stringify(memos));
}

function renderList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const visibleMemos = memos
    .filter((memo) => currentFilter === "all" || memo.category === currentFilter)
    .filter((memo) => {
      const haystack = [
        memo.title,
        memo.category,
        memo.command,
        memo.version,
        memo.note,
        ...(memo.tags ?? [])
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  elements.memoList.innerHTML = "";

  if (visibleMemos.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "一致するメモがありません";
    elements.memoList.append(empty);
    return;
  }

  visibleMemos.forEach((memo) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `memo-card${memo.id === selectedId ? " active" : ""}`;
    card.addEventListener("click", () => selectMemo(memo.id));

    const title = document.createElement("h2");
    title.textContent = memo.title || "無題のメモ";

    const command = document.createElement("p");
    command.textContent = memo.command;

    const meta = document.createElement("div");
    meta.className = "memo-meta";
    [memo.category, memo.version, ...(memo.tags ?? []).slice(0, 3)]
      .filter(Boolean)
      .forEach((item) => {
        const tag = document.createElement("span");
        tag.textContent = item;
        meta.append(tag);
      });

    card.append(title, command, meta);
    elements.memoList.append(card);
  });
}

function selectMemo(id) {
  selectedId = id;
  const memo = memos.find((item) => item.id === id);
  if (!memo) return;

  elements.title.value = memo.title;
  elements.category.value = memo.category;
  elements.command.value = memo.command;
  elements.tags.value = (memo.tags ?? []).join(", ");
  elements.version.value = memo.version ?? "";
  elements.note.value = memo.note ?? "";
  renderList();
}

function createBlankMemo() {
  const memo = {
    id: crypto.randomUUID(),
    title: "新しいコマンド",
    category: "その他",
    command: "/",
    tags: [],
    version: "",
    note: "",
    updatedAt: new Date().toISOString()
  };
  memos.unshift(memo);
  selectedId = memo.id;
  saveMemos();
  selectMemo(memo.id);
  elements.title.focus();
  elements.title.select();
  showToast("新規メモを作成しました");
}

function handleSubmit(event) {
  event.preventDefault();
  const memo = memos.find((item) => item.id === selectedId);
  if (!memo) return;

  memo.title = elements.title.value.trim();
  memo.category = elements.category.value;
  memo.command = elements.command.value.trim();
  memo.tags = elements.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  memo.version = elements.version.value.trim();
  memo.note = elements.note.value.trim();
  memo.updatedAt = new Date().toISOString();

  saveMemos();
  renderList();
  showToast("保存しました");
}

async function copyCommand() {
  const command = elements.command.value.trim();
  if (!command) return;
  await navigator.clipboard.writeText(command);
  showToast("コマンドをコピーしました");
}

function postMemo() {
  const title = elements.title.value.trim() || "無題のコマンド";
  const category = elements.category.value;
  const command = elements.command.value.trim();
  const tags = elements.tags.value.trim();
  const version = elements.version.value.trim();
  const note = elements.note.value.trim();

  if (!command || command === "/") {
    showToast("投稿するコマンドを入力してください");
    elements.command.focus();
    return;
  }

  const body = [
    "## コマンド",
    "```mcfunction",
    command,
    "```",
    "",
    "## カテゴリ",
    category || "未設定",
    "",
    "## バージョン",
    version || "未設定",
    "",
    "## タグ",
    tags || "なし",
    "",
    "## メモ",
    note || "なし"
  ].join("\n");

  const params = new URLSearchParams({
    template: "command-post.md",
    title: `[投稿] ${title}`,
    body
  });
  window.open(`${repositoryUrl}/issues/new?${params.toString()}`, "_blank", "noreferrer");
  showToast("投稿画面を開きました");
}

function deleteMemo() {
  if (!selectedId) return;
  const memo = memos.find((item) => item.id === selectedId);
  if (!memo) return;

  const ok = confirm(`「${memo.title || "無題のメモ"}」を削除しますか？`);
  if (!ok) return;

  memos = memos.filter((item) => item.id !== selectedId);
  if (memos.length === 0) {
    memos.push({
      id: crypto.randomUUID(),
      title: "新しいコマンド",
      category: "その他",
      command: "/",
      tags: [],
      version: "",
      note: "",
      updatedAt: new Date().toISOString()
    });
  }
  selectedId = memos[0].id;
  saveMemos();
  selectMemo(selectedId);
  showToast("削除しました");
}

function exportMemos() {
  const blob = new Blob([JSON.stringify(memos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "minecraft-command-memos.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("JSONを書き出しました");
}

function importMemos(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("Invalid file");
      memos = imported.map((memo) => ({
        id: memo.id || crypto.randomUUID(),
        title: memo.title || "無題のメモ",
        category: memo.category || "その他",
        command: memo.command || "/",
        tags: Array.isArray(memo.tags) ? memo.tags : [],
        version: memo.version || "",
        note: memo.note || "",
        updatedAt: memo.updatedAt || new Date().toISOString()
      }));
      selectedId = memos[0]?.id ?? null;
      saveMemos();
      if (selectedId) selectMemo(selectedId);
      renderList();
      showToast("JSONを読み込みました");
    } catch {
      showToast("読み込みに失敗しました");
    }
  });
  reader.readAsText(file);
  event.target.value = "";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1800);
}

elements.searchInput.addEventListener("input", renderList);
elements.filterRow.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip === button);
  });
  renderList();
});
elements.form.addEventListener("submit", handleSubmit);
elements.newMemoBtn.addEventListener("click", createBlankMemo);
elements.copyBtn.addEventListener("click", copyCommand);
elements.postBtn.addEventListener("click", postMemo);
elements.deleteBtn.addEventListener("click", deleteMemo);
elements.exportBtn.addEventListener("click", exportMemos);
elements.importInput.addEventListener("change", importMemos);

if (selectedId) {
  selectMemo(selectedId);
} else {
  createBlankMemo();
}
