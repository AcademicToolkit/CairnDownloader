
function getData(settings){
      // 1a. Extraction des liens (Ajuste le sélecteur 'a.recipe-link')
    const links = Array.from(document.querySelectorAll('a.underline.text-cairn-main.hover\\:text-cairn-dark.font-medium.absolute.inset-0'));
    const urls = links.map(a => a.href);

    if (urls.length === 0) {
      alert("Aucun lien trouvé avec ce sélecteur CSS ! Mettez à jour l'extension.");
      return;
    }

    // 1b. Extraction de l'ID du document depuis le span ISBN
    // Trouve le <span> qui contient 'ISBN' (cas-insensible) parmi plusieurs spans
    const isbnSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent && /ISBN/i.test(s.textContent));
    const isbnText = isbnSpan ? isbnSpan.textContent : '';
    // Retire tout avant et y compris 'ISBN' (gère 'ISBN:', 'ISBN ' etc.)
    const docId = isbnText ? isbnText.replace(/.*ISBN[:\s]*/i, '').trim() : '';
    // Auteur pour les metadonnées
    const authorLink = document.querySelector('a.underline.text-cairn-main.hover\\:text-cairn-dark.font-medium.inline.\\!font-bold.z-\\[1\\].relative');
    const author = authorLink ? authorLink.textContent.trim() : '';
    // titre pour les metadonnées
    const titleLink = document.querySelector('h1.font-light.text-5xl.\\!text-4xl.leading-10');
    const title = titleLink ? titleLink.textContent.trim() : '';

    

    // 2. Envoie la liste globale au background pour initier la boucle
    browser.runtime.sendMessage({ action: "list_ok", urls: urls, docId: docId, author: author, title: title, settings: settings });
}

// Écoute les messages (notamment le clic depuis la popup)
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "initialise") {
    getData(request.settings);
  }
});

// À chaque fois qu'une page de recette finit de charger, 
// le content script s'exécute et prévient le background qu'on est prêt à capturer le fetch.
if (document.readyState === "complete" || document.readyState === "interactive") {
  notifierPagePrete();
} else {
  window.addEventListener("DOMContentLoaded", notifierPagePrete);
}

function notifierPagePrete() {
  // On signale au background que la page est chargée et qu'il peut attendre le fetch
  browser.runtime.sendMessage({ action: "loaded", url: window.location.href });
}


// Function to inject the download button
function injectDownloadButton() {
  const targetDiv = document.querySelector('div.flex.flex-row.gap-1.overflow-x-auto.whitespace-nowrap.flex-nowrap.scrollbar-hide');

  // If no target div, exit
  if (!targetDiv) return;

  // New condition: ensure the word "proche" does NOT appear anywhere inside the div or its descendants
  // If the word "proche" is present (case-insensitive, whole word), do not inject the button
  if (/\bproche\b/i.test(targetDiv.textContent)) return;

  // Check if button already exists to avoid duplicates
  if (targetDiv.querySelector('#tab-down')) return;

  // Create wrapper div
  const wrapper = document.createElement('div');
  wrapper.className = "font-bold leading-5 text-cairn-main pt-2 pb-1 border-b-2 self-center border-b-transparent";

  // Create anchor element
  const anchor = document.createElement('a');
  anchor.className = "block p-2.5 rounded-md hover:bg-concrete-100 hover:text-cairn-dark";
  anchor.setAttribute("role", "tab");
  anchor.id = "tab-down";
  anchor.setAttribute("aria-selected", "false");
  anchor.setAttribute("x-ref", "tab-down");

  // Add click handler to simulate popup trigger
  anchor.addEventListener("click", () => {
    settings = {exportType: 'pdf'};
    getData(settings);
  });

  // Inner content
  anchor.innerHTML = `
    <div class="flex flex-col md:flex-row items-center justify-center text-center">
      <svg aria-hidden="true" class="bfa bfa-regular inline w-[18px] h-[18px] hidden md:inline-block vmb-1 md:mb-0 md:me-1.5 text-lg"
           fill="none" stroke="currentColor" viewBox="0 0 512 512" version="1.1"
           xmlns="http://www.w3.org/2000/svg">
        <path style="stroke-width:83.3998;stroke-linecap:round" d="M 260.36792,45.699909 V 394.34567"/>
        <path style="stroke-width:83.3998;stroke-linecap:round" d="M 105.90461,284.01474 260.36792,438.47805 414.83124,284.01474"/>
      </svg>
      <span class="text-base block">Download  in PDF</span>
    </div>
  `;

  wrapper.appendChild(anchor);
  targetDiv.appendChild(wrapper);
}

// Run injection when page is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  injectDownloadButton();
} else {
  window.addEventListener("DOMContentLoaded", injectDownloadButton);
}
