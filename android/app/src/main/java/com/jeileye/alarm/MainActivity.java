package com.jeileye.alarm;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import android.view.WindowInsets;
import android.window.OnBackInvokedDispatcher;
import java.io.*;
import java.net.URLConnection;
import java.util.*;
import org.json.*;

public class MainActivity extends Activity {
    static final String ORIGIN="https://appassets.androidplatform.net";
    private WebView web;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(45,131,245));getWindow().setNavigationBarColor(Color.WHITE);
        web=new WebView(this);setContentView(web);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::navigateBack);
        if(Build.VERSION.SDK_INT>=30)web.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.addJavascriptInterface(new NativeAlarms(),"JeileyeNativeAlarm");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){
                Uri uri=req.getUrl();if(!"appassets.androidplatform.net".equals(uri.getHost()))return null;
                String path=uri.getPath();if(path==null||path.equals("/"))path="/index.html";
                if(path.contains("..")||path.contains("\\"))return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",null,new ByteArrayInputStream(new byte[0]));
                try{
                    String name=path.substring(1),mime=URLConnection.guessContentTypeFromName(name);
                    if(name.endsWith(".js"))mime="application/javascript";if(name.endsWith(".css"))mime="text/css";if(name.endsWith(".svg"))mime="image/svg+xml";if(name.endsWith(".woff2"))mime="font/woff2";
                    Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");
                    headers.put("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src https://issyhftzmzpudoeidoum.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'");
                    return new WebResourceResponse(mime==null?"application/octet-stream":mime,"UTF-8",200,"OK",headers,getAssets().open(name));
                }catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
                Uri uri=req.getUrl();if(ORIGIN.equals(uri.getScheme()+"://"+uri.getHost()))return false;
                if(!req.isForMainFrame())return true;
                if("https".equals(uri.getScheme())||"tel".equals(uri.getScheme()))try{startActivity(new Intent("tel".equals(uri.getScheme())?Intent.ACTION_DIAL:Intent.ACTION_VIEW,uri));}catch(Exception ignored){}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.loadUrl(ORIGIN+"/index.html"+route(getIntent().getStringExtra("plan")));
        AlarmStore.restore(this);
    }
    static String route(String plan){return plan!=null&&plan.matches("[a-z0-9-]{1,70}")?"#/profile/cataract-before?plan="+plan:"#/";}
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);web.loadUrl(ORIGIN+"/index.html"+route(i.getStringExtra("plan")));}
    @Override protected void onResume(){super.onResume();AlarmStore.restore(this);if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('jeileye-native-resume'))",null);}
    private void navigateBack(){if(web.canGoBack())web.goBack();else finish();}
    @android.annotation.SuppressLint("GestureBackNavigation") // Legacy API 28-32; newer devices use the registered callback.
    @Override public void onBackPressed(){navigateBack();}
    @Override protected void onDestroy(){web.removeJavascriptInterface("JeileyeNativeAlarm");web.destroy();super.onDestroy();}
    private void permissionMenu(){
        String[] choices={"1. 알림 허용 / 팝업 표시","2. 알람 및 리마인더 허용","3. 전체 화면 알림 허용","4. 알람 음량 확인"};
        new AlertDialog.Builder(this).setTitle("안약 알람 설정").setItems(choices,(d,n)->{
            if(n==0&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},10);return;}
            Intent settings;
            if(n==1&&Build.VERSION.SDK_INT>=31)settings=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName()));
            else if(n==2&&Build.VERSION.SDK_INT>=34)settings=new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName()));
            else if(n==3)settings=new Intent(Settings.ACTION_SOUND_SETTINGS);
            else settings=new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,AlarmStore.CHANNEL);
            try{startActivity(settings);}catch(Exception ignored){}
        }).setNegativeButton("닫기",null).show();
    }
    public final class NativeAlarms {
        @JavascriptInterface public String status(){return AlarmPermissions.status(MainActivity.this).toString();}
        @JavascriptInterface public void openSettings(){runOnUiThread(()->permissionMenu());}
        @JavascriptInterface public String replace(String payload){
            try{
                if(payload==null||payload.length()>65536)throw new IllegalArgumentException("알림 정보가 너무 큽니다.");
                JSONObject value=new JSONObject(payload);JSONArray jobs=value.getJSONArray("jobs");
                if(jobs.length()>0&&!AlarmPermissions.status(MainActivity.this).optBoolean("ready"))throw new IllegalStateException(AlarmPermissions.status(MainActivity.this).optString("reason"));
                AlarmStore.replace(MainActivity.this,jobs,value.optJSONArray("activePlans")==null?new JSONArray():value.getJSONArray("activePlans"));
                return "{\"ok\":true}";
            }catch(Exception e){return error(e);}
        }
        @JavascriptInterface public String test(String plan){
            try{JSONObject status=AlarmPermissions.status(MainActivity.this);if(!status.optBoolean("ready"))throw new IllegalStateException(status.optString("reason"));AlarmStore.test(MainActivity.this,plan==null?"test":plan);return "{\"ok\":true}";}catch(Exception e){return error(e);}
        }
        private String error(Exception e){try{return new JSONObject().put("ok",false).put("error",e.getMessage()==null?"기기 알람을 설정하지 못했습니다.":e.getMessage()).toString();}catch(Exception ignored){return "{\"ok\":false}";}}
    }
}
