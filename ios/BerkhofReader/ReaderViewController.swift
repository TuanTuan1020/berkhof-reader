import UIKit
import WebKit

final class ReaderViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private static let storeKey = "berkhof.reader.native.state"
    private static let messageName = "readerPreferences"
    private static let readerKeys: Set<String> = ["size", "dark", "position"]
    private let bookURL = Bundle.main.url(forResource: "Book", withExtension: "html")
    private var dark = false

    override var preferredStatusBarStyle: UIStatusBarStyle {
        dark ? .lightContent : .darkContent
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let bookURL else {
            let label = UILabel()
            label.text = "无法打开内置书稿"
            label.textAlignment = .center
            view = label
            return
        }

        let values = UserDefaults.standard.dictionary(forKey: Self.storeKey) as? [String: String] ?? [:]
        applyTheme(values["dark"] == "true")
        let serialized = (try? JSONEncoder().encode(values)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        let bridge = """
            (() => {
              const values = (serialized);
              window.bookPreferences = {
                get(key) { return values[key] ?? null; },
                set(key, value) {
                  values[key] = value;
                  window.webkit.messageHandlers.readerPreferences.postMessage({key, value});
                }
              };
            })();
            """
        let controller = WKUserContentController()
        controller.add(WeakReaderMessageHandler(self), name: Self.messageName)
        controller.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .nonPersistent()
        configuration.dataDetectorTypes = []
        let reader = WKWebView(frame: .zero, configuration: configuration)
        reader.navigationDelegate = self
        reader.isOpaque = false
        reader.backgroundColor = .clear
        reader.scrollView.backgroundColor = .clear
        reader.scrollView.contentInsetAdjustmentBehavior = .never
        reader.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(reader)

        let safeArea = view.safeAreaLayoutGuide
        let bottom = reader.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor)
        bottom.priority = .defaultHigh
        NSLayoutConstraint.activate([
            reader.topAnchor.constraint(equalTo: safeArea.topAnchor),
            reader.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor),
            reader.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor),
            bottom
        ])
        if #available(iOS 15.0, *) {
            reader.bottomAnchor.constraint(lessThanOrEqualTo: view.keyboardLayoutGuide.topAnchor).isActive = true
        }
        reader.loadFileURL(bookURL, allowingReadAccessTo: bookURL)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let bookURL, let url = action.request.url,
              url.isFileURL, url.standardizedFileURL.path == bookURL.standardizedFileURL.path else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageName, message.frameInfo.isMainFrame,
              let payload = message.body as? [String: String],
              let key = payload["key"], Self.readerKeys.contains(key),
              let value = payload["value"] else { return }
        let defaults = UserDefaults.standard
        var values = defaults.dictionary(forKey: Self.storeKey) as? [String: String] ?? [:]
        guard values[key] != value else { return }
        values[key] = value
        defaults.set(values, forKey: Self.storeKey)
        if key == "dark" {
            applyTheme(value == "true")
        }
    }

    private func applyTheme(_ dark: Bool) {
        self.dark = dark
        view.backgroundColor = dark
            ? UIColor(red: 32 / 255, green: 36 / 255, blue: 31 / 255, alpha: 1)
            : UIColor(red: 250 / 255, green: 248 / 255, blue: 242 / 255, alpha: 1)
        overrideUserInterfaceStyle = dark ? .dark : .light
        setNeedsStatusBarAppearanceUpdate()
    }
}

private final class WeakReaderMessageHandler: NSObject, WKScriptMessageHandler {
    weak var reader: ReaderViewController?

    init(_ reader: ReaderViewController) {
        self.reader = reader
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        reader?.userContentController(controller, didReceive: message)
    }
}
