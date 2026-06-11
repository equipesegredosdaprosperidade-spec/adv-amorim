// Click-to-edit inline content system (text-node level + image swap).
//
// Why text-node level: elements like <h1>Texto <span>destaque</span> resto</h1>
// or <p>... <strong>palavra</strong> ...</p> have mixed children. Editing the
// whole element loses the inner formatting. We instead wrap each meaningful
// text node in a <span data-edit-key="..."> and make THAT contentEditable.
//
// Image swap: in edit mode, clicking any <img> (outside [data-no-edit]) opens
// a prompt to paste a URL or upload a file. The original src is preserved as
// data-orig-src so overrides can be re-applied across reloads.

import {
  getContentOverrides, setContentOverrides,
  getImageOverrides, setImageOverrides,
  isAdminAuthed,
} from "@/lib/site-config";

const EDIT_KEY = "data-edit-key";
const WRAP_MARK = "data-edit-wrapped";
const ORIG_SRC = "data-orig-src";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "IFRAME", "TEXTAREA", "INPUT", "CODE", "PRE"]);

function isInsideNoEdit(node: Node | null): boolean {
  let n: Node | null = node;
  while (n) {
    if (n instanceof HTMLElement && n.hasAttribute("data-no-edit")) return true;
    n = n.parentNode;
  }
  return false;
}

function shouldSkipParent(parent: Element | null): boolean {
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.hasAttribute(WRAP_MARK)) return true; // already a wrapper
  return false;
}

function walkMeaningfulTextNodes(root: ParentNode, cb: (n: Text) => void) {
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      const t = (node.nodeValue || "").trim();
      if (!t) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (shouldSkipParent(parent)) return NodeFilter.FILTER_REJECT;
      if (isInsideNoEdit(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const buf: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) buf.push(n as Text);
  buf.forEach(cb);
}

/* ─── Apply overrides (called on every page load) ─── */
export function applyContentOverrides(root: ParentNode = document) {
  const map = getContentOverrides();
  if (Object.keys(map).length) {
    walkMeaningfulTextNodes(root, (textNode) => {
      const raw = textNode.nodeValue || "";
      const key = raw.trim();
      const next = map[key];
      if (next && next !== key) {
        // preserve surrounding whitespace
        const leading = raw.match(/^\s*/)?.[0] || "";
        const trailing = raw.match(/\s*$/)?.[0] || "";
        textNode.nodeValue = leading + next + trailing;
      }
    });
  }
  applyImageOverrides(root);
}

export function applyImageOverrides(root: ParentNode = document) {
  const map = getImageOverrides();
  if (!Object.keys(map).length) return;
  const imgs = (root as Document | Element).querySelectorAll<HTMLImageElement>("img");
  imgs.forEach((img) => {
    if (isInsideNoEdit(img)) return;
    const key = img.getAttribute(ORIG_SRC) || img.src;
    if (!img.getAttribute(ORIG_SRC)) img.setAttribute(ORIG_SRC, key);
    const next = map[key];
    if (next && img.src !== next) img.src = next;
  });
}

/* ─── Edit mode ─── */
let active = false;
let cleanupFns: Array<() => void> = [];

export function isEditModeActive() { return active; }

export function canEnableEdit(): boolean {
  if (typeof window === "undefined") return false;
  const u = new URL(window.location.href);
  return u.searchParams.get("edit") === "1" && isAdminAuthed();
}

function wrapTextNodes() {
  walkMeaningfulTextNodes(document.body, (textNode) => {
    const raw = textNode.nodeValue || "";
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    const key = raw.trim();
    if (!key) return;

    const span = document.createElement("span");
    span.setAttribute(WRAP_MARK, "1");
    span.setAttribute(EDIT_KEY, key);
    span.className = "inline-editable";
    span.contentEditable = "true";
    span.spellcheck = false;
    span.textContent = key;

    const parent = textNode.parentNode!;
    if (leading) parent.insertBefore(document.createTextNode(leading), textNode);
    parent.insertBefore(span, textNode);
    if (trailing) parent.insertBefore(document.createTextNode(trailing), textNode);
    parent.removeChild(textNode);

    const onBlur = () => {
      const newVal = (span.textContent || "").trim();
      const original = span.getAttribute(EDIT_KEY) || "";
      const map = getContentOverrides();
      if (newVal && newVal !== original) map[original] = newVal;
      else delete map[original];
      setContentOverrides(map);
    };
    const onClick = (ev: MouseEvent) => {
      // Prevent <a>/<button> navigation/submit while editing
      ev.stopPropagation();
      const link = span.closest("a,button");
      if (link) ev.preventDefault();
    };
    span.addEventListener("blur", onBlur);
    span.addEventListener("click", onClick);
    cleanupFns.push(() => {
      span.removeEventListener("blur", onBlur);
      span.removeEventListener("click", onClick);
    });
  });
}

async function promptImageSwap(img: HTMLImageElement) {
  const choice = window.prompt(
    "Trocar imagem — digite uma URL OU deixe vazio e clique OK para escolher um arquivo do computador.\n(Cancele para manter)",
    ""
  );
  if (choice === null) return;
  const apply = (newSrc: string) => {
    const key = img.getAttribute(ORIG_SRC) || img.src;
    if (!img.getAttribute(ORIG_SRC)) img.setAttribute(ORIG_SRC, key);
    img.src = newSrc;
    const map = getImageOverrides();
    map[key] = newSrc;
    setImageOverrides(map);
  };
  const trimmed = choice.trim();
  if (trimmed) { apply(trimmed); return; }
  // file picker
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) {
      alert("Imagem grande demais para localStorage (limite ~1.5MB). Prefira uma URL pública.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => apply(String(reader.result));
    reader.readAsDataURL(f);
  };
  input.click();
}

function bindImages() {
  const imgs = document.querySelectorAll<HTMLImageElement>("img");
  imgs.forEach((img) => {
    if (isInsideNoEdit(img)) return;
    if (img.hasAttribute("data-edit-img-bound")) return;
    img.setAttribute("data-edit-img-bound", "1");
    img.classList.add("inline-editable-img");
    const onClick = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      promptImageSwap(img);
    };
    img.addEventListener("click", onClick);
    cleanupFns.push(() => {
      img.removeEventListener("click", onClick);
      img.removeAttribute("data-edit-img-bound");
      img.classList.remove("inline-editable-img");
    });
  });
}

export function enableInlineEdit() {
  if (typeof window === "undefined" || active) return;
  active = true;
  document.body.classList.add("edit-mode-on");

  wrapTextNodes();
  bindImages();

  // Re-process DOM mutations (new content from React renders)
  const mo = new MutationObserver(() => {
    wrapTextNodes();
    bindImages();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  cleanupFns.push(() => mo.disconnect());
}

export function disableInlineEdit() {
  if (!active) return;
  active = false;
  document.body.classList.remove("edit-mode-on");
  cleanupFns.forEach((f) => f());
  cleanupFns = [];
  // Unwrap text spans (collapse back to plain text nodes)
  document.querySelectorAll<HTMLElement>(`[${WRAP_MARK}]`).forEach((sp) => {
    const text = document.createTextNode(sp.textContent || "");
    sp.parentNode?.replaceChild(text, sp);
  });
}
