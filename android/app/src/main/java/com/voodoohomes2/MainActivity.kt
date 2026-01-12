package com.voodoohomes2

import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "voodoohomeS2"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
      val mgr = getSystemService(ShortcutManager::class.java)
      if (mgr != null) {
        val motorIntent = Intent(Intent.ACTION_VIEW, Uri.parse("voodoohomeS2://shortcut/motor/toggle"))
          .setClassName(this, "com.voodoohomes2.MainActivity")
          .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val lockIntent = Intent(Intent.ACTION_VIEW, Uri.parse("voodoohomeS2://shortcut/lock/toggle"))
          .setClassName(this, "com.voodoohomes2.MainActivity")
          .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val motorShortcut = ShortcutInfo.Builder(this, "shortcut_motor")
          .setShortLabel("Motor")
          .setLongLabel("Motor On/Off")
          .setIcon(Icon.createWithResource(this, R.mipmap.ic_launcher))
          .setIntent(motorIntent)
          .build()
        val lockShortcut = ShortcutInfo.Builder(this, "shortcut_lock")
          .setShortLabel("Lock")
          .setLongLabel("Lock/Unlock")
          .setIcon(Icon.createWithResource(this, R.mipmap.ic_launcher))
          .setIntent(lockIntent)
          .build()
        try {
          mgr.dynamicShortcuts = listOf(motorShortcut, lockShortcut)
        } catch (_: Throwable) {
          try {
            mgr.addDynamicShortcuts(listOf(motorShortcut, lockShortcut))
          } catch (_: Throwable) { }
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}
