module.exports = {
    // … existing pbiviz/webpack config …
    module: {
      rules: [
        {
          test: /\.less$/i,
          use: [
            {
              loader: 'style-loader',
              options: {
                // OPTION A: prepend all styles to the <head> so your global LESS
                // (imported in your entry point) winds up after dynamic ones:
                injectType: 'styleTag',
                insert: (element) => {
                  const head = document.head;
                  head.insertBefore(element, head.firstChild);
                },
  
                // —or—
  
                // OPTION B: track your app’s own <style> tags and always
                // append new ones *before* them:
                // insert: (element) => {
                //   const reference = window.__myGlobalStyleRef;
                //   document.head.insertBefore(element, reference || null);
                //   window.__myGlobalStyleRef = element;
                // }
              }
            },
            'css-loader',
            'less-loader'
          ],
        },
        // … other rules …
      ],
    },
  };
  