package fun.cauai.ans;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * ANS 手机端外壳：一个全屏 WebView 加载 ans.cauai.fun。
 * 网站改了 App 立刻生效；这里只补浏览器做不到或做不好的事：
 * 文件上传与拍照、带登录态下载、断网页、返回键、版本提示。
 */
public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int STORAGE_PERMISSION_REQUEST = 1002;
    private static final int NAVY = Color.parseColor("#09142F");

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private View offlineView;
    private boolean mainFrameFailed;
    private long lastBackPressAt;

    private ValueCallback<Uri[]> filePathCallback;
    private File cameraOutputFile;
    private Uri cameraOutputUri;
    private PendingDownload pendingDownload;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(NAVY);
        if (Build.VERSION.SDK_INT >= 35) {
            applyEdgeToEdgeInsets(root);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(NAVY);
        configureWebView(webView);
        root.addView(webView, matchParent());

        offlineView = buildOfflineView();
        offlineView.setVisibility(View.GONE);
        root.addView(offlineView, matchParent());

        setContentView(root);

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(BuildConfig.HOME_URL);
        }
        checkForUpdate();
    }

    // Android 15 起强制全屏绘制，状态栏、导航栏和键盘的位置要自己让出来。
    @TargetApi(35)
    private static void applyEdgeToEdgeInsets(View root) {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.ime()
                    | WindowInsets.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // 网站靠这个标识判断「正在 App 里」，例如 /app 页显示快捷入口而不是下载按钮。
        settings.setUserAgentString(settings.getUserAgentString() + " ANSMobileApp/" + BuildConfig.VERSION_NAME);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(view, true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        view.setWebViewClient(new ShellWebViewClient());
        view.setWebChromeClient(new ShellChromeClient());
        view.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                handleDownload(new PendingDownload(url, userAgent, contentDisposition, mimeType)));
    }

    // ---- 页面导航 -------------------------------------------------------

    private class ShellWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return request.isForMainFrame() && handleNavigation(request.getUrl());
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            mainFrameFailed = false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            CookieManager.getInstance().flush();
            if (!mainFrameFailed) {
                offlineView.setVisibility(View.GONE);
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                mainFrameFailed = true;
                offlineView.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // 渲染进程被系统回收时，不处理会直接闪退；重建页面即可。
            recreate();
            return true;
        }
    }

    /** 返回 true 表示已交给外部处理，WebView 不再加载。 */
    private boolean handleNavigation(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (scheme.equals("http") || scheme.equals("https")) {
            if (isOwnHost(uri.getHost()) && !isApkLink(uri)) {
                return false;
            }
            openExternally(uri);
            return true;
        }
        if (scheme.equals("intent")) {
            try {
                Intent intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                startActivity(intent);
            } catch (Exception ignored) {
                // 没装对应应用就留在当前页。
            }
            return true;
        }
        // weixin://、alipays://、mailto:、tel: 等交给系统。
        openExternally(uri);
        return true;
    }

    private static boolean isOwnHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        return h.equals("cauai.fun") || h.endsWith(".cauai.fun");
    }

    private static boolean isApkLink(Uri uri) {
        String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);
        return path.endsWith(".apk") || path.startsWith("/api/app/download");
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // 没有能打开的应用，忽略。
        }
    }

    // ---- 文件上传与拍照 -------------------------------------------------

    private class ShellChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;

            // 不用 params.createIntent()：它只取第一个 accept 值，accept=".zip" 时会变成无效类型，选择器打不开文件。
            String[] mimeTypes = toMimeTypes(params.getAcceptTypes());
            Intent content = new Intent(Intent.ACTION_GET_CONTENT);
            content.addCategory(Intent.CATEGORY_OPENABLE);
            content.setType("*/*");
            if (mimeTypes.length > 0) {
                content.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
            }
            if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                content.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            }

            Intent camera = acceptsImages(mimeTypes) ? buildCameraIntent() : null;
            Intent chooser;
            if (camera != null && params.isCaptureEnabled()) {
                chooser = camera;
            } else {
                chooser = Intent.createChooser(content, getString(R.string.choose_file));
                if (camera != null) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                }
            }

            try {
                startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException e) {
                filePathCallback = null;
                clearCameraOutput();
                return false;
            }
        }
    }

    /** 把 accept 里的扩展名换成 MIME；有认不出的就不过滤，宁可多给也别让用户选不到文件。 */
    private static String[] toMimeTypes(String[] acceptTypes) {
        Set<String> result = new LinkedHashSet<>();
        if (acceptTypes == null) return new String[0];
        for (String entry : acceptTypes) {
            if (entry == null) continue;
            for (String raw : entry.split(",")) {
                String token = raw.trim().toLowerCase(Locale.ROOT);
                if (token.isEmpty()) continue;
                if (token.contains("/")) {
                    if (token.equals("*/*")) return new String[0];
                    result.add(token);
                } else if (token.startsWith(".")) {
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(token.substring(1));
                    if (mime == null) return new String[0];
                    result.add(mime);
                } else {
                    return new String[0];
                }
            }
        }
        return result.toArray(new String[0]);
    }

    private static boolean acceptsImages(String[] mimeTypes) {
        if (mimeTypes.length == 0) return true;
        for (String mime : mimeTypes) {
            if (mime.startsWith("image/")) return true;
        }
        return false;
    }

    private Intent buildCameraIntent() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (intent.resolveActivity(getPackageManager()) == null) return null;
        try {
            File dir = new File(getCacheDir(), "camera");
            if (!dir.exists() && !dir.mkdirs()) return null;
            cameraOutputFile = new File(dir, "ans-" + System.currentTimeMillis() + ".jpg");
            cameraOutputUri = FileProvider.getUriForFile(this, getPackageName() + ".files", cameraOutputFile);
        } catch (Exception e) {
            clearCameraOutput();
            return null;
        }
        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
        // 放进选择器后，只有挂在 ClipData 上的授权才会传给相机应用。
        intent.setClipData(ClipData.newRawUri("", cameraOutputUri));
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private void clearCameraOutput() {
        cameraOutputFile = null;
        cameraOutputUri = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (filePathCallback == null) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK) {
            if (cameraOutputFile != null && cameraOutputFile.length() > 0) {
                // 相机写进了文件，说明用户选的是拍照。
                results = new Uri[]{cameraOutputUri};
            } else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                ClipData clip = data.getClipData();
                results = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) {
                    results[i] = clip.getItemAt(i).getUri();
                }
            } else if (data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
        clearCameraOutput();
    }

    // ---- 下载 -----------------------------------------------------------

    private static final class PendingDownload {
        final String url;
        final String userAgent;
        final String contentDisposition;
        final String mimeType;

        PendingDownload(String url, String userAgent, String contentDisposition, String mimeType) {
            this.url = url;
            this.userAgent = userAgent;
            this.contentDisposition = contentDisposition;
            this.mimeType = mimeType;
        }
    }

    private void handleDownload(PendingDownload download) {
        Uri uri = Uri.parse(download.url);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            // blob:/data: 链接系统下载器拿不到。
            toast(R.string.download_unsupported);
            return;
        }
        if (isApkLink(uri) || "application/vnd.android.package-archive".equals(download.mimeType)) {
            openExternally(uri);
            return;
        }
        if (Build.VERSION.SDK_INT < 29
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = download;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST);
            return;
        }
        enqueueDownload(download);
    }

    private void enqueueDownload(PendingDownload download) {
        try {
            String fileName = URLUtil.guessFileName(download.url, download.contentDisposition, download.mimeType);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(download.url));
            if (download.mimeType != null && !download.mimeType.isEmpty()) {
                request.setMimeType(download.mimeType);
            }
            // 带上登录态，私有文件才下得下来。
            String cookie = CookieManager.getInstance().getCookie(download.url);
            if (cookie != null) {
                request.addRequestHeader("Cookie", cookie);
            }
            request.addRequestHeader("User-Agent", download.userAgent);
            request.setTitle(fileName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            manager.enqueue(request);
            toast(R.string.download_started);
        } catch (Exception e) {
            toast(R.string.download_unsupported);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != STORAGE_PERMISSION_REQUEST || pendingDownload == null) return;
        PendingDownload download = pendingDownload;
        pendingDownload = null;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            enqueueDownload(download);
        } else {
            toast(R.string.download_unsupported);
        }
    }

    // ---- 断网页 ---------------------------------------------------------

    private View buildOfflineView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(NAVY);
        layout.setClickable(true);
        int pad = dp(32);
        layout.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setGravity(Gravity.CENTER);
        layout.addView(title);

        TextView body = new TextView(this);
        body.setText(R.string.offline_body);
        body.setTextColor(Color.parseColor("#B8C2D9"));
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        body.setGravity(Gravity.CENTER);
        body.setPadding(0, dp(8), 0, dp(24));
        layout.addView(body);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setMinWidth(dp(160));
        retry.setOnClickListener(v -> {
            String current = webView.getUrl();
            if (current == null || current.startsWith("about:") || current.startsWith("data:")) {
                webView.loadUrl(BuildConfig.HOME_URL);
            } else {
                webView.reload();
            }
        });
        layout.addView(retry);
        return layout;
    }

    // ---- 版本提示 -------------------------------------------------------

    private void checkForUpdate() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(BuildConfig.UPDATE_MANIFEST_URL).openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setUseCaches(false);
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return;
                final JSONObject manifest = new JSONObject(readAll(connection.getInputStream()));
                int latest = manifest.optInt("versionCode", 0);
                final String downloadUrl = manifest.optString("downloadUrl", "");
                if (latest > BuildConfig.VERSION_CODE && downloadUrl.startsWith("https://")) {
                    mainHandler.post(() -> showUpdateDialog(
                            manifest.optString("versionName", ""),
                            manifest.optString("notes", ""),
                            downloadUrl));
                }
            } catch (Exception ignored) {
                // 查不到新版本不影响使用。
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "ans-update-check").start();
    }

    private static String readAll(InputStream in) throws java.io.IOException {
        try (InputStream input = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private void showUpdateDialog(String versionName, String notes, String downloadUrl) {
        if (isFinishing() || isDestroyed()) return;
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(getString(R.string.update_title, versionName))
                .setPositiveButton(R.string.update_action, (dialog, which) -> openExternally(Uri.parse(downloadUrl)))
                .setNegativeButton(R.string.update_later, null);
        if (!notes.isEmpty()) {
            builder.setMessage(notes);
        }
        builder.show();
    }

    // ---- 生命周期与返回键 -----------------------------------------------

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        long now = SystemClock.elapsedRealtime();
        if (now - lastBackPressAt < 2000) {
            super.onBackPressed();
        } else {
            lastBackPressAt = now;
            toast(R.string.press_back_again);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    // ---- 小工具 ---------------------------------------------------------

    private static FrameLayout.LayoutParams matchParent() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toast(int resId) {
        Toast.makeText(this, resId, Toast.LENGTH_SHORT).show();
    }
}
