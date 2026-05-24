
function getData(settings){
      // 1a. Extract links 
    const links = Array.from(document.querySelectorAll('a.underline.text-cairn-main.hover\\:text-cairn-dark.font-medium.absolute.inset-0'));
    const urls = links.map(a => a.href);

    // Extract chapter titles
const chapterNodes = Array.from(
  document.querySelectorAll(
    'div.w-full.lg\\:basis-9\\/12 > div.pe-6.mt-0\\.5 > div.font-serif >p.font-bold'
  )
);


    const chapterTitles = chapterNodes.map(d => d.textContent.trim()).filter(t => t.length > 0);


    if (urls.length === 0) {
      alert("No links found with this CSS selector! Update the extension.");
      return;
    }

    // 1b. Extract document ID from the ISBN span
    // Find the <span> containing 'ISBN' (case-insensitive) among multiple spans
    const isbnSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent && /ISBN/i.test(s.textContent));
    const isbnText = isbnSpan ? isbnSpan.textContent : '';
    // Remove everything up to and including 'ISBN' (handles 'ISBN:', 'ISBN ' etc.)
    const docId = isbnText ? isbnText.replace(/.*ISBN[:\s]*/i, '').trim() : '';
    // Author for metadata
    const authorLink = document.querySelector('a.underline.text-cairn-main.hover\\:text-cairn-dark.font-medium.inline.\\!font-bold.z-\\[1\\].relative');
    const author = authorLink ? authorLink.textContent.trim() : '';
    // Title for metadata
    const titleLink = document.querySelector('h1.font-light.text-5xl.\\!text-4xl.leading-10');
    const title = titleLink ? titleLink.textContent.trim() : '';

    

    // 2. Send the global list to the background to start the loop
    browser.runtime.sendMessage({ action: "list_ok", urls: urls, chapters: chapterTitles, docId: docId, author: author, title: title, settings: settings });
}

// Listen for messages (notably the click from the popup)
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "initialise") {
    getData(request.settings);
  }
});

// Each time a reader page finishes loading,
// the content script runs and notifies the background it's ready to capture the fetch.
if (document.readyState === "complete" || document.readyState === "interactive") {
  notifierPagePrete();
} else {
  window.addEventListener("DOMContentLoaded", notifierPagePrete);
}

function notifierPagePrete() {
  // Notify the background that the page is loaded and it can wait for the fetch
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
