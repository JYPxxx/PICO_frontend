export function loadFigmaCapture(){if(!location.hash.includes('figmacapture='))return;
 document.title+=' · '+innerWidth+'px';
 const nav=document.querySelector('.bottom-nav');if(nav&&document.documentElement.classList.contains('capture-full'))document.querySelector('#app').append(nav);
 const script=document.createElement('script');script.src='https://mcp.figma.com/mcp/html-to-design/capture.js';script.async=true;document.head.append(script);
}
