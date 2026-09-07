# CopyCraft Android Compatibility & New Version Support Guide (Android 13, 14, 15)

This guide documents the changes implemented to support all modern Android versions (Android 13, 14, and 15 / API Levels 33, 34, 35) and provides the exact steps to build and sign compatible APKs.

---

## 1. What Was Implemented

### A. Modern Web App & PWA WebAPK Compliance
- **File**: `frontend/public/manifest.json`
  - Added unique `id: "/"` and `scope: "/"`.
  - Configured discrete icons for `192x192` and `512x512` with both `any` and `maskable` purposes.
  - Added `display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"]` for modern Android WebAPK installation.
  - Added app shortcuts for instant portal access.

### B. Mobile Viewport & Edge-to-Edge Display
- **File**: `frontend/index.html`
  - Added `viewport-fit=cover` to support Android 14/15 edge-to-edge screens and camera cutouts.
  - Added theme color tags for both light and dark mode.
  - Enabled mobile web app capability tags.

### C. Backend CORS & Mobile Origin Whitelist
- **File**: `backend/index.js`
  - Configured CORS to accept all Android WebView origins including:
    - `capacitor://localhost`
    - `ionic://localhost`
    - `http://localhost` & `https://localhost`
    - `android-app://`
    - `file://` (when assets are loaded from local storage)
  - Replaced error-throwing CORS handler with clean rejection to prevent 500 crashes during preflight `OPTIONS` requests.

---

## 2. Critical Checklist for Building Compatible APKs

If you are packaging this web app into an Android APK (using **Website2APK**, **Capacitor**, **Cordova**, or **Android Studio**), ensure the following settings:

### 1. Target SDK Version (Android 14+ Enforced)
Android 14 and 15 block apps built for older Android versions.
In `android/app/build.gradle`:
```groovy
android {
    compileSdkVersion 34 // or 35
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 34 // or 35
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 2. APK Signature Scheme v2 & v3 (Android 11+ Enforced)
Android 11+ refuses to install APKs signed with legacy v1 JAR signing.
When generating your signed release APK with `apksigner`:
```bash
apksigner sign --ks copycraft-key.jks --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out copycraft-release.apk app-unsigned.apk
```

### 3. Cleartext Network Traffic & Permissions
In `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- Android 13+ Notification Permission -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <!-- Android 13+ Media & File Upload Permissions -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:usesCleartextTraffic="true"
        android:allowBackup="true"
        android:label="CopyCraft"
        android:icon="@mipmap/ic_launcher">
        ...
    </application>
</manifest>
```

### 4. WebView File Picker (Document Upload Fix)
In your Android WebView activity (`MainActivity.java` or `MainActivity.kt`), ensure `WebChromeClient.onShowFileChooser` is implemented so users can select PDF and image files:
```java
webView.setWebChromeClient(new WebChromeClient() {
    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
        Intent intent = fileChooserParams.createIntent();
        try {
            startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
        } catch (ActivityNotFoundException e) {
            return false;
        }
        return true;
    }
});
```

---

## 3. Instant Installation via PWA (No APK Required)
Users on Android 13, 14, and 15 can also install the app directly without downloading an unsigned APK:
1. Open the website in **Google Chrome** on the Android device.
2. Tap the **3 dots menu** (top right) -> **Install app** or **Add to Home screen**.
3. Android creates a native WebAPK icon that runs fullscreen with native performance.
