(function () {
  window.DMBO_MEDIA_WIDGET_CONFIG = {
    triggerSelector: "body",

    containerId: "dmbo-media-widget-v10",
    styleId: "dmbo-media-widget-v10-style",

    lottiePath: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json",

    youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",

    iframeUrl: "https://react-view-transitions-demo.labs.vercel.dev",
    iframeTitle: "Vercel",

    sportsProxyUrl: "https://sports.hypercubik.workers.dev/",

    casinoGamesUrl: "/api/integration/api/v1.0/webSites/pages/casino/lobby-games"
  };

  try {
    window.dispatchEvent(new Event("dmbo-media-config-ready"));
  } catch (e) {}
})();
