# kroki-recorder
# Kroki Recorder 🕵️‍♀️

A simple yet powerful Chrome extension designed for manual testers and QA specialists. This tool automatically records user interactions, console errors, and network issues to speed up the process of creating test cases and reporting bugs.

<br>



## Key Features ✨

*   **User Step Recording:** Automatically captures clicks, text input, and page navigation as easy-to-read steps.
*   **Error Logging:** Records JavaScript errors from the developer console and network errors (HTTP 4xx/5xx).
*   **Dynamic Icon:** The extension icon changes based on its state (recording, paused, stopped), so you always know if it's active.
*   **Clear Interface:** All data is presented in a convenient popup with dedicated tabs: **Steps**, **Console**, and **Network**.
*   **Dark/Light Mode:** Customize the look to your preference. Styles are WCAG-compliant for better contrast.
*   **Log Management:** Easily copy all data to the clipboard or clear logs with a single click.

## Who Is This Tool For? 🤔

*   **Manual Testers:** For quickly creating documentation from executed tests.
*   **QA Specialists:** For precisely reporting bug reproduction steps.
*   **Developers:** For easily reproducing issues reported by users.
*   **Product Owners / PMs:** For documenting the behavior of new features.

## Installation 🛠️

Since the extension is not yet on the Chrome Web Store, you can install it locally:

1.  Download this repository as a `.zip` file and unpack it on your computer.
2.  Open your Chrome browser and navigate to: `chrome://extensions`.
3.  In the top-right corner, enable **"Developer mode"**.
4.  New buttons will appear. Click **"Load unpacked"**.
5.  Select the folder with the unpacked extension.
6.  Done! The Kroki Recorder icon will appear on your extensions bar.

## How to Use? 🚀

1.  Pin the extension icon to your toolbar for quick access.
2.  Open the website you want to test.
3.  Click the extension icon, then click the **"Start"** button.
4.  Perform all the steps you want to record.
5.  When you're finished, click **"Stop"**.
6.  Review the results in the tabs, copy them, or clear them to start over.

## File Structure 📂

*   `manifest.json`: The main configuration file for the extension.
*   `background.js`: The Service Worker that handles all background logic (start/stop, listeners, icon changes).
*   `popup.html`: The structure and styles for the user interface.
*   `popup.js`: The event handling logic for the popup (button clicks, theme switching).
*   `content.js`: The script injected into pages to listen for user interactions.
*   `*.png`: Icon files for the different states of the extension.

## Future Plans (Roadmap) 🗺️

-   [ ] Add an option to take screenshots for each step.
-   [ ] Export steps to popular formats (e.g., Markdown, CSV).
-   [ ] Allow editing and adding notes to recorded steps.
-   [ ] Integrate with popular task management tools (e.g., Jira, Trello).

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
