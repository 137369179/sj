import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";

const rootDir = path.resolve(import.meta.dirname, "..");

function readHtml(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  expect(fs.existsSync(fullPath)).toBe(true);
  return fs.readFileSync(fullPath, "utf8");
}

function createDocument(relativePath) {
  const html = readHtml(relativePath);
  return new JSDOM(html).window.document;
}

describe("static website files", () => {
  test("creates shared assets", () => {
    expect(fs.existsSync(path.join(rootDir, "assets/styles.css"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "assets/app.js"))).toBe(true);
  });

  test("creates the homepage with three entry links", () => {
    const document = createDocument("index.html");

    expect(document.querySelector("h1")?.textContent).toContain("市集");
    expect(document.querySelector("#ecosystem")).not.toBeNull();
    expect(document.querySelector("#capabilities")).not.toBeNull();
    expect(document.querySelector('a[href="./vendor.html"]')).not.toBeNull();
    expect(document.querySelector('a[href="./organizer.html"]')).not.toBeNull();
    expect(document.querySelector('a[href="./consumer.html"]')).not.toBeNull();
  });

  test("creates the vendor page with value, flow, and CTA", () => {
    const document = createDocument("vendor.html");

    expect(document.querySelector("h1")?.textContent).toContain("报名");
    expect(document.querySelectorAll(".timeline-step").length).toBeGreaterThanOrEqual(4);
    expect(document.querySelector("[data-cta-label]")).not.toBeNull();
  });

  test("creates the organizer page with role-specific sections", () => {
    const document = createDocument("organizer.html");

    expect(document.querySelector("h1")?.textContent).toContain("审核");
    expect(document.body.textContent).toContain("结算");
    expect(document.querySelector(".feature-stack")).not.toBeNull();
  });

  test("creates the consumer page with reminder-oriented content", () => {
    const document = createDocument("consumer.html");

    expect(document.querySelector("h1")?.textContent).toContain("提醒");
    expect(document.body.textContent).toContain("收藏");
    expect(document.querySelector(".feature-stack")).not.toBeNull();
  });
});

describe("shared app behavior", () => {
  test("highlights the current nav item and updates CTA status on click", () => {
    const scriptPath = path.join(rootDir, "assets/app.js");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, "utf8");
    const dom = new JSDOM(
      `
        <!DOCTYPE html>
        <body>
          <a class="nav-link" data-nav href="index.html">首页</a>
          <a class="nav-link" data-nav href="vendor.html">摊主端</a>
          <button data-cta-label="摊主端优先">查看</button>
          <p data-cta-status>初始状态</p>
        </body>
      `,
      {
        url: "https://example.com/vendor.html",
        runScripts: "outside-only",
      }
    );

    dom.window.eval(scriptContent);
    dom.window.document.dispatchEvent(
      new dom.window.Event("DOMContentLoaded", { bubbles: true })
    );

    const activeLink = dom.window.document.querySelector('a[href="vendor.html"]');
    const button = dom.window.document.querySelector("[data-cta-label]");
    const status = dom.window.document.querySelector("[data-cta-status]");

    expect(activeLink.classList.contains("is-active")).toBe(true);
    button.click();
    expect(status.textContent).toContain("摊主端优先");
  });
});
