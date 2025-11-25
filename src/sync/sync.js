window.addEventListener('DOMContentLoaded', function () {
    // Populate domain dropdown
    chrome.storage.local.get(null, function (items) {
        const select = document.getElementById('domainSelect');
        Object.keys(items).forEach(key => {
            if (key.startsWith('savedCookies_')) {
                const domain = key.replace('savedCookies_', '');
                const option = document.createElement('option');
                option.value = domain;
                option.textContent = domain;
                select.appendChild(option);
            }
        });
    });

    // Sync (Set) button
    document.getElementById('syncSet').addEventListener('click', function () {
        const domain = document.getElementById('domainSelect').value;
        chrome.storage.local.get('savedCookies_' + domain, function (items) {
            const cookies = items['savedCookies_' + domain];
            if (cookies && cookies.length > 0) {
                chrome.storage.sync.set({ ['cookies_' + domain]: cookies }, function () {
                    document.getElementById('syncOutput').textContent =
                        `Synced ${cookies.length} cookies for ${domain}!`;
                });
            } else {
                document.getElementById('syncOutput').textContent =
                    "No yanked cookies found for this domain.";
            }
        });
    });

    // Get button

    document.getElementById('syncGet').addEventListener('click', function () {
        const domain = document.getElementById('domainSelect').value;
        chrome.storage.sync.get('cookies_' + domain, function (items) {
            const synced = items['cookies_' + domain];
            displayCookiesAsCards(synced, 'syncOutput');
        });
    });



    // Delete button
    document.getElementById('syncDelete').addEventListener('click', function () {
        const domain = document.getElementById('domainSelect').value;
        chrome.storage.sync.remove('cookies_' + domain, function () {
            document.getElementById('syncOutput').textContent =
                `Deleted synced cookies for ${domain}.`;
        });
    });
});


function displayCookiesAsCards(cookies, targetElementId) {
    const container = document.getElementById(targetElementId);
    container.innerHTML = '';
    if (!cookies || cookies.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No cookies found for this domain.</div>';
        return;
    }

    cookies.forEach(cookie => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'card mb-2 cookie-group p-2';

        const nameDiv = document.createElement('h5');
        nameDiv.className = 'card-title cookie-name';
        nameDiv.textContent = `Name: ${cookie.name}`;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'card-text cookie-value mb-1';
        valueDiv.textContent = `Value: ${cookie.value}`;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'card-text cookie-meta text-muted small';
        metaDiv.innerHTML = `
      Domain: ${cookie.domain}<br>
      Path: ${cookie.path}<br>
      Expires: ${cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toLocaleString() : 'Session'}<br>
      Secure: ${cookie.secure ? 'Yes' : 'No'}<br>
      HttpOnly: ${cookie.httpOnly ? 'Yes' : 'No'}
    `;

        groupDiv.appendChild(nameDiv);
        groupDiv.appendChild(valueDiv);
        groupDiv.appendChild(metaDiv);

        container.appendChild(groupDiv);
    });
}
