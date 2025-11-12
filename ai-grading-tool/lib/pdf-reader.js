const { PdfReader } = require("pdfreader");

function extractPdfText(buffer) {
  return new Promise((resolve, reject) => {
    let textContent = "";
    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        // End of buffer
        resolve(textContent);
      } else if (item.text) {
        textContent += item.text + " ";
      }
    });
  });
}

module.exports = { extractPdfText };
