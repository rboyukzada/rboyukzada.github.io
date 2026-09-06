// type-word animation
// `window.heroTypeArray` can be replaced/updated at any time (e.g. by
// js/content-loader.js once the roles are fetched from Supabase) — the
// animation loop always reads the latest value.
let typingElement = document.querySelector(".typing-text");
window.heroTypeArray = window.heroTypeArray || ["Developer", "Data Analyst"];

let index = 0,
  isAdding = true,
  typeIndex = 0;

function playAnim() {
  setTimeout(
    function () {
      const typeArray =
        window.heroTypeArray && window.heroTypeArray.length
          ? window.heroTypeArray
          : ["Developer"];
      if (typeIndex >= typeArray.length) typeIndex = 0;

      typingElement.innerText = typeArray[typeIndex].slice(0, index);

      // If typing
      if (isAdding) {
        if (index >= typeArray[typeIndex].length) {
          isAdding = false;
          // If text typed completely, wait 2s before starting to remove it.
          setTimeout(function () {
            playAnim();
          }, 2000);
          return;
        } else {
          // Continue to typing text by increasing index
          index++;
        }
      } else {
        // If removing
        if (index === 0) {
          isAdding = true;
          //If text removed completely, move on to next text by increasing typeIndex
          typeIndex++;
          if (typeIndex >= typeArray.length) {
            // Turn to beginning when reached to last text
            typeIndex = 0;
          }
        } else {
          // Continue to removing text by decreasing index
          index--;
        }
      }
      // Call the function always
      playAnim();
    },

    /*
  If typing text, call it every 120ms
  If removing text, call it every 60ms
  Type slower, remove faster
*/
    isAdding ? 200 : 100
  );
}

// Start typing text
if (typingElement) {
  playAnim();
}
