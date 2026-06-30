(function () {
  const CONFIG = {
    word: "Register",
    selector: '[data-mj="header"]',
    lottiePath: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json"
  };

  let mounted = false;

  function matchesPage() {
    const hasWord = document.body && document.body.innerText.includes(CONFIG.word);
    const hasElement = document.querySelector(CONFIG.selector);

    return hasWord || hasElement;
  }

  function mountLottie() {
    if (mounted) return;
    if (!window.lottie) {
      console.error("[Conditional Lottie] lottie-web is not loaded");
      return;
    }

    mounted = true;

    const container = document.createElement("div");
    container.id = "conditional-lottie";
    container.style.position = "fixed";
    container.style.right = "20px";
    container.style.bottom = "20px";
    container.style.width = "220px";
    container.style.height = "220px";
    container.style.zIndex = "999999";
    container.style.pointerEvents = "none";

    document.body.appendChild(container);

    window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: CONFIG.lottiePath
    });

    console.log("[Conditional Lottie] mounted");
  }

  function check() {
    if (matchesPage()) {
      mountLottie();
    }
  }

  check();

  const observer = new MutationObserver(check);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
