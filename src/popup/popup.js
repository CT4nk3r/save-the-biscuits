function simpleEncrypt(text, password) {
  const textBytes = new TextEncoder().encode(text);
  const passwordBytes = new TextEncoder().encode(password);
  const encryptedBytes = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    encryptedBytes[i] = textBytes[i] ^ passwordBytes[i % passwordBytes.length];
  }

  return btoa(String.fromCharCode(...encryptedBytes)); 
}

function simpleDecrypt(encrypted, password) {
  const encryptedBytes = new Uint8Array([...atob(encrypted)].map(char => char.charCodeAt(0)));
  const passwordBytes = new TextEncoder().encode(password);
  const decryptedBytes = new Uint8Array(encryptedBytes.length);

  for (let i = 0; i < encryptedBytes.length; i++) {
    decryptedBytes[i] = encryptedBytes[i] ^ passwordBytes[i % passwordBytes.length];
  }

  return new TextDecoder().decode(decryptedBytes);
}
  
document.getElementById('getCookies').addEventListener('click', function() {
  getCookiesForDomain();
});
  
  document.getElementById('yankCookies').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;
  
      chrome.cookies.getAll({domain: domain}, function(cookies) {
        chrome.storage.local.set({[`savedCookies_${domain}`]: cookies}, () => {
          cookies.forEach(cookie => {
            chrome.cookies.remove({
              url: tab.url,
              name: cookie.name
            });
          });
          document.getElementById('cookieList').textContent = 'Cookies yanked and stored!';
        });
      });
    });
  });
  
  document.getElementById('restoreCookies').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;
  
      chrome.storage.local.get([`savedCookies_${domain}`], (result) => {
        const cookies = result[`savedCookies_${domain}`];
        if (!cookies) {
          document.getElementById('cookieList').textContent = 'No saved cookies to restore!';
          return;
        }
  
        cookies.forEach(cookie => {
          chrome.cookies.set({
            url: tab.url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate
          });
        });
        document.getElementById('cookieList').textContent = 'Cookies restored!';
      });
    });
  });
  
  document.getElementById('exportCookies').addEventListener('click', function() {
    const password = prompt('Enter password to encrypt cookies:');
    if (!password) return;
  
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;
  
      chrome.cookies.getAll({domain: domain}, function(cookies) {
        const cookieJson = JSON.stringify(cookies);
        const encrypted = simpleEncrypt(cookieJson, password);
        const blob = new Blob([encrypted], {type: 'text/plain'});
        const urlBlob = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlBlob;
        link.download = `${domain}_cookies.txt`;
        link.click();
        document.getElementById('cookieList').textContent = 'Cookies exported!';
      });
    });
  });
  
  document.getElementById('importCookies').addEventListener('click', function() {
    const password = prompt('Enter password to decrypt cookies:');
    if (!password) {
      document.getElementById('cookieList').textContent = 'Password required!';
      return;
    }
  
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.click(); // Trigger file picker immediately
  
    input.onchange = function(event) {
      const file = event.target.files[0];
      if (!file) {
        document.getElementById('cookieList').textContent = 'No file selected!';
        return;
      }
  
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const encrypted = e.target.result;
          const decrypted = simpleDecrypt(encrypted, password);
          const cookies = JSON.parse(decrypted);
  
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const tab = tabs[0];
            cookies.forEach(cookie => {
              chrome.cookies.set({
                url: tab.url,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate
              });
            });
            document.getElementById('cookieList').textContent = 'Cookies imported successfully!';
          });
        } catch (error) {
          document.getElementById('cookieList').textContent = 'Error: Invalid file or wrong password!';
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
  });
  
  function getCookiesForDomain() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tab = tabs[0];
      const url = new URL(tab.url);
      const domain = url.hostname;
  
      chrome.cookies.getAll({domain: domain}, function(cookies) {
        if (cookies.length === 0) {
          document.getElementById('cookieList').textContent = 'No cookies found for this domain.';
          return;
        }
  
        let cookieText = '';
        cookies.forEach(cookie => {
          cookieText += `Name: ${cookie.name}\n`;
          cookieText += `Value: ${cookie.value}\n`;
          cookieText += `Domain: ${cookie.domain}\n`;
          cookieText += `Path: ${cookie.path}\n`;
          cookieText += `Expires: ${new Date(cookie.expirationDate * 1000).toLocaleString()}\n`;
          cookieText += `Secure: ${cookie.secure}\n`;
          cookieText += `HttpOnly: ${cookie.httpOnly}\n`;
          cookieText += '--------------------\n';
        });
        
        document.getElementById('cookieList').textContent = cookieText;
      });
    });
  }