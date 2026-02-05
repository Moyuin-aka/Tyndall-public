/**
 * Header behavior module
 * Handles header scroll hide/show, mobile menu, and "More" dropdown
 */

// 全局状态
let menuClickHandler: (() => void) | null = null;
let outsideClickHandler: ((e: MouseEvent) => void) | null = null;
let lastScrollY = 0;
let ticking = false;
const scrollThreshold = 100;

/**
 * 初始化"更多"下拉菜单
 */
function setupMoreDropdown() {
  const dropdown = document.querySelector(".nav-more-dropdown");
  if (!dropdown || (dropdown as HTMLElement).dataset.initialized) return;

  (dropdown as HTMLElement).dataset.initialized = "true";
  const toggle = dropdown.querySelector(".more-toggle");
  if (!toggle) return;

  const open = () => dropdown.classList.add("is-open");
  const close = () => dropdown.classList.remove("is-open");

  toggle.addEventListener("click", (e: Event) => {
    e.stopPropagation();
    dropdown.classList.toggle("is-open");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target as Node)) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dropdown.classList.contains("is-open")) {
      close();
      (toggle as HTMLElement).focus();
    }
  });
}

/**
 * 更新导航链接的激活状态
 */
function updateActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-links .link");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const isExactMatch = href === currentPath;
    const isPrefixMatch =
      href !== "/" && href !== "/en/" && currentPath.startsWith(href);

    if (isExactMatch || isPrefixMatch) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
  const header = document.querySelector("header");
  if (!header) return;

  const menuToggle = header.querySelector("#menu-toggle");
  const navLinks = header.querySelector(".nav-links");
  const controls = header.querySelector(".controls");
  const dropdown = document.getElementById("mobile-dropdown");
  const navContent = header.querySelector(".nav-content");

  if (!menuToggle || !navLinks || !controls || !dropdown || !navContent) return;

  const mq = window.matchMedia("(max-width: 768px)");

  const openMenu = () => {
    header.classList.add("is-menu-open");
    buildMobileMenu();
    dropdown.classList.add("open");
    dropdown.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    header.classList.remove("is-menu-open");
    navContent.insertBefore(navLinks, controls);
    dropdown.classList.remove("open");
    dropdown.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    dropdown.innerHTML = "";
  };

  const buildMobileMenu = () => {
    dropdown.innerHTML = "";

    // 克隆导航链接
    const navLinksClone = navLinks.cloneNode(true) as HTMLElement;

    // 移除桌面端的下拉菜单项和分隔符
    const desktopDropdown = navLinksClone.querySelector(".nav-more-dropdown");
    const separator = navLinksClone.querySelector(".nav-separator");
    if (desktopDropdown) desktopDropdown.remove();
    if (separator) separator.remove();

    // 创建"更多"按钮
    const moreLi = document.createElement("li");
    const moreToggle = document.createElement("button");
    moreToggle.className = "link mobile-more-toggle";
    moreToggle.setAttribute("aria-expanded", "false");
    moreToggle.setAttribute("type", "button");

    const moreText =
      header.querySelector(".more-toggle")?.textContent?.trim() || "More";

    moreToggle.innerHTML = `
      <span class="more-text">${moreText}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="dropdown-icon">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    moreLi.appendChild(moreToggle);
    navLinksClone.appendChild(moreLi);
    dropdown.appendChild(navLinksClone);

    // 创建折叠内容区域
    const moreContent = document.createElement("div");
    moreContent.className = "mobile-more-content";

    const moreMenu = header.querySelector(".more-menu");
    if (moreMenu) {
      const moreItems = moreMenu.querySelectorAll(".more-item");
      const currentPath = window.location.pathname;

      moreItems.forEach((item) => {
        const link = document.createElement("a");
        const itemHref = (item as HTMLAnchorElement).href;
        link.href = itemHref;
        link.className = "link";
        link.textContent = item.textContent?.replace(/\s+/g, " ").trim() || "";

        // 根据当前 URL 实时判断 active 状态，而不是从桌面端复制
        try {
          const itemPath = new URL(itemHref).pathname;
          if (currentPath.startsWith(itemPath) && itemPath !== "/" && itemPath !== "/en/") {
            link.classList.add("active");
          }
        } catch (e) {
          // 忽略无效 URL
        }

        moreContent.appendChild(link);
      });
    }

    dropdown.appendChild(moreContent);

    // 绑定折叠切换事件
    moreToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = moreToggle.getAttribute("aria-expanded") === "true";
      moreToggle.setAttribute("aria-expanded", (!isExpanded).toString());
      moreContent.classList.toggle("open");
    });
  };

  const ensurePlacement = () => {
    if (!mq.matches) {
      if (header.classList.contains("is-menu-open")) {
        closeMenu();
      }
      navContent.insertBefore(navLinks, controls);
    } else if (!header.classList.contains("is-menu-open")) {
      navContent.insertBefore(navLinks, controls);
    }
  };

  // 移除旧的事件监听器
  if (menuClickHandler) {
    menuToggle.removeEventListener("click", menuClickHandler);
  }
  if (outsideClickHandler) {
    document.removeEventListener("click", outsideClickHandler);
  }

  // 创建新的事件处理器
  menuClickHandler = () => {
    header.classList.contains("is-menu-open") ? closeMenu() : openMenu();
  };

  outsideClickHandler = (e: MouseEvent) => {
    if (!header.classList.contains("is-menu-open")) return;
    const target = e.target as HTMLElement;
    if (!dropdown.contains(target) && !menuToggle.contains(target)) {
      closeMenu();
    }
  };

  menuToggle.addEventListener("click", menuClickHandler);
  document.addEventListener("click", outsideClickHandler);

  mq.addEventListener("change", ensurePlacement);
  ensurePlacement();
}

/**
 * 处理滚动事件 - 自动隐藏/显示 header
 */
function handleScroll() {
  const currentScrollY = window.scrollY;

  // 首页不隐藏 header（/ 或 /en/）
  const pathname = window.location.pathname;
  const isHomePage = pathname === "/" || pathname === "/en/" || pathname === "/en";

  if (!ticking) {
    window.requestAnimationFrame(() => {
      const header = document.querySelector("header");
      if (!header) return;

      // 首页始终显示 header
      if (isHomePage) {
        header.classList.remove("header-hidden");
        dispatchHeaderVisibilityEvent(true);
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      if (currentScrollY < scrollThreshold) {
        header.classList.remove("header-hidden");
        dispatchHeaderVisibilityEvent(true);
      } else {
        if (currentScrollY > lastScrollY) {
          header.classList.add("header-hidden");
          dispatchHeaderVisibilityEvent(false);
        } else if (currentScrollY < lastScrollY) {
          header.classList.remove("header-hidden");
          dispatchHeaderVisibilityEvent(true);
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    });

    ticking = true;
  }
}

/**
 * 分发 header 可见性变化事件
 */
function dispatchHeaderVisibilityEvent(isVisible: boolean) {
  const event = new CustomEvent("header-visibility-change", {
    detail: { isVisible },
  });
  window.dispatchEvent(event);
}

/**
 * 初始化滚动监听器
 */
function initScrollListener() {
  lastScrollY = window.scrollY;
  window.addEventListener("scroll", handleScroll, { passive: true });
}

/**
 * 初始化 header 所有功能
 */
function initializeHeader() {
  updateActiveNavLink();
  setupMoreDropdown();
  initMobileMenu();
}

/**
 * 关闭移动端菜单（用于页面切换时）
 */
function closeMobileMenuOnNavigate() {
  const header = document.querySelector("header");
  const dropdown = document.getElementById("mobile-dropdown");
  const menuToggle = document.getElementById("menu-toggle");

  if (header && dropdown && menuToggle) {
    header.classList.remove("is-menu-open");
    dropdown.classList.remove("open");
    dropdown.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    dropdown.innerHTML = "";
  }
}

/**
 * 主入口函数
 */
export function initHeaderBehavior() {
  // 立即执行或等待 DOM 加载
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializeHeader();
      initScrollListener();
    });
  } else {
    initializeHeader();
    initScrollListener();
  }

  // 页面切换前：关闭移动端菜单（解决 persist 导致菜单状态保留的问题）
  document.addEventListener("astro:before-swap", () => {
    closeMobileMenuOnNavigate();
  });

  // 页面切换后重新初始化
  document.addEventListener("astro:after-swap", () => {
    // 清除初始化标记
    const dropdown = document.querySelector(".nav-more-dropdown");
    if (dropdown) {
      delete (dropdown as HTMLElement).dataset.initialized;
    }
    initializeHeader();
    lastScrollY = window.scrollY;
  });
}
