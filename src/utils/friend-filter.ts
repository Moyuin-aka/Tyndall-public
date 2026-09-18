export function initFriendFilter() {
  const filterBtns = document.querySelectorAll<HTMLButtonElement>(".filter-pill");
  const friendCards = document.querySelectorAll<HTMLElement>(".friend-card");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      if (!category) return;

      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      friendCards.forEach((card) => {
        const tagsArray = (card.getAttribute("data-tags") || "").split(",").filter((t) => t);
        const shouldShow = category === "all" || tagsArray.includes(category);
        const wasHidden = card.style.display === "none";
        card.style.display = shouldShow ? "flex" : "none";
        if (shouldShow && wasHidden) card.style.animation = "cardIn 0.4s ease forwards";
      });
    });
  });
}
