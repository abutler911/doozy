import { useEffect, useState } from "react";

/**
 * Shows an "Install" button when the browser fires `beforeinstallprompt`
 * (Android Chrome / desktop Chromium). Hidden once installed or unsupported
 * (e.g. iOS, where the user installs via the Share sheet).
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function install() {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <button className="install-btn" onClick={install}>
      ⤓ Install
    </button>
  );
}
