const query = new URLSearchParams(window.location.search);
const title = query.get("title") || "A live story from the current desk";
const source = query.get("source") || "Original source";
const topic = query.get("topic") || "live news";
const sourceUrl = query.get("url");
const storageKey = `ming-journal-comments:${title}`;

function isSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

setText("#article-title", title);
setText("#article-source", source);
setText("#article-topic", topic);
setText("#article-tag", topic);
document.title = `${title} | Ming Journal`;

const originalLink = document.querySelector("#original-link");
const safeSourceUrl = isSafeUrl(sourceUrl);
if (originalLink) {
  if (safeSourceUrl) {
    originalLink.href = safeSourceUrl;
  } else {
    originalLink.hidden = true;
  }
}

function readComments() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function renderComments() {
  const list = document.querySelector("#comment-list");
  const count = document.querySelector("#comment-count");
  const comments = readComments();
  if (!list || !count) {
    return;
  }
  count.textContent = `${comments.length} ${comments.length === 1 ? "note" : "notes"}`;
  list.innerHTML = "";
  comments.forEach((comment) => {
    const item = document.createElement("article");
    item.className = "comment-item";
    const name = document.createElement("strong");
    name.textContent = comment.name;
    const body = document.createElement("p");
    body.textContent = comment.text;
    item.append(name, body);
    list.append(item);
  });
}

const commentForm = document.querySelector("#comment-form");
if (commentForm) {
  commentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(commentForm);
    const name = String(data.get("name") || "").trim();
    const comment = String(data.get("comment") || "").trim();
    const note = document.querySelector("#comment-note");
    if (!name || !comment) {
      return;
    }
    const comments = readComments();
    comments.unshift({ name, text: comment });
    localStorage.setItem(storageKey, JSON.stringify(comments.slice(0, 20)));
    commentForm.reset();
    if (note) {
      note.textContent = "Your note has been added on this device.";
    }
    renderComments();
  });
}

renderComments();
