# Privacy Policy for TrueMoji

**Last Updated:** February 2026

TrueMoji ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how our browser extension handles your data.

## 1. Data Collection
**TrueMoji does NOT collect, store, share, or sell any personal information.**

- We do not track your browsing history.
- We do not collect analytics or usage data.
- We do not transmit any data to our servers.

## 2. Permissions Usage
To function correctly, TrueMoji requires specific permissions. Here is why we need them:

- **"Read and change all your data on the websites you visit" (`<all_urls>` / `content_scripts`)**:
  - **Why?** This is the core functionality of the extension. It allows TrueMoji to scan web pages for native emoji characters and replace them with the image set you selected (e.g., Apple, Google).
  - **Privacy:** This processing happens entirely locally on your device (in your browser). The extension does not read your passwords, emails, or private messages for any purpose other than finding and replacing emojis.

- **"Storage" (`storage`)**:
  - **Why?** Used to save your local preferences, such as your chosen emoji set and language (English/Arabic).

- **"Notifications" & "Alarms"**:
  - **Why?** Used only to notify you if a new update for the extension is available on GitHub.

## 3. Third-Party Services
TrueMoji fetches emoji images from **jsDelivr**, a public open-source CDN (Content Delivery Network).
- When a web page loads an emoji image, your browser makes a standard HTTP request to `cdn.jsdelivr.net`.
- jsDelivr may log basic connection information (like IP address) for security and performance monitoring, governed by their own [Privacy Policy](https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net).
- TrueMoji does not send any personal user data to jsDelivr.

## 4. Children’s Privacy
TrueMoji does not knowingly collect any data from children under the age of 13.

## 5. Contact
If you have any questions about this Privacy Policy, please contact us via our [GitHub Repository](https://github.com/voidksa/TrueMoji).
