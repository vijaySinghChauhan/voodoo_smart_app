import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    
    var startOptions = launchOptions ?? [:]
    if let shortcutItem = startOptions[.shortcutItem] as? UIApplicationShortcutItem {
      var urlString: String?
      switch shortcutItem.type {
      case "shortcut_motor":
        urlString = "voodoohomeS2://shortcut/motor/toggle"
      case "shortcut_lock":
        urlString = "voodoohomeS2://shortcut/lock/toggle"
      default:
        urlString = nil
      }
      if let s = urlString, let url = URL(string: s) {
        startOptions[.url] = url
        let rctKey = UIApplication.LaunchOptionsKey(rawValue: "RCTLaunchOptionsURLKey")
        startOptions[rctKey] = s
      }
    }

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "voodoohomeS2",
      in: window,
      launchOptions: startOptions
    )

    return true
  }
  
  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    let result = RCTLinkingManager.application(app, open: url, options: options)
    let userInfo: [String: Any] = [
      "options": options,
      "openUrl": url
    ]
    NotificationCenter.default.post(
      name: Notification.Name("ApplicationOpenURLNotification"),
      object: nil,
      userInfo: userInfo
    )
    return result
  }
  
  func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
    var urlString: String?
    switch shortcutItem.type {
    case "shortcut_motor":
      urlString = "voodoohomeS2://shortcut/motor/toggle"
    case "shortcut_lock":
      urlString = "voodoohomeS2://shortcut/lock/toggle"
    default:
      urlString = nil
    }
    if let s = urlString, let url = URL(string: s) {
      _ = self.application(application, open: url, options: [:])
      completionHandler(true)
    } else {
      completionHandler(false)
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
