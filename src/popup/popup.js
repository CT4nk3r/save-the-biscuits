function encryptData(data, password) {
  const encoder = new TextEncoder();
  const keyMaterial = crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
  );

  return keyMaterial.then(key => {
      return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: encoder.encode('salt'), iterations: 100000, hash: 'SHA-256' },
          key,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
      ).then(aesKey => {
          const iv = crypto.getRandomValues(new Uint8Array(12));
          return crypto.subtle.encrypt(
              { name: 'AES-GCM', iv },
              aesKey,
              encoder.encode(data)
          ).then(encrypted => {
              return btoa(JSON.stringify({ encrypted: Array.from(new Uint8Array(encrypted)), iv: Array.from(iv) }));
          });
      });
  });
}

function decryptData(encryptedData, password) {
  const decoder = new TextDecoder();
  const parsedData = JSON.parse(atob(encryptedData));
  const encryptedBytes = new Uint8Array(parsedData.encrypted);
  const iv = new Uint8Array(parsedData.iv);

  const keyMaterial = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
  );

  return keyMaterial.then(key => {
      return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: new TextEncoder().encode('salt'), iterations: 100000, hash: 'SHA-256' },
          key,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
      ).then(aesKey => {
          return crypto.subtle.decrypt(
              { name: 'AES-GCM', iv },
              aesKey,
              encryptedBytes
          ).then(decrypted => {
              return decoder.decode(decrypted);
          });
      });
  });
}

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
      chrome.tabs.reload(tab.id);
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
        document.getElementById('cookieList').textContent = `Error: Invalid file or wrong password! Details: ${error.message}`;
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