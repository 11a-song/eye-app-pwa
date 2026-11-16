package com.jeileye.alarm;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.lang.ref.WeakReference;
import android.window.OnBackInvokedDispatcher;

public class AlarmActivity extends Activity {
    private static WeakReference<AlarmActivity> current=new WeakReference<>(null);
    static void finishActive(){AlarmActivity screen=current.get();if(screen!=null)screen.runOnUiThread(screen::finish);}
    @Override public void onCreate(Bundle state){
        super.onCreate(state);setShowWhenLocked(true);setTurnScreenOn(true);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        current=new WeakReference<>(this);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::stopAlarm);
        render();
    }
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);render();}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private void render(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER);root.setPadding(dp(24),dp(36),dp(24),dp(36));root.setBackgroundColor(Color.rgb(245,248,253));
        TextView clinic=new TextView(this);clinic.setText("연세제일안과");clinic.setTextSize(21);clinic.setTextColor(Color.rgb(45,131,245));clinic.setGravity(Gravity.CENTER);root.addView(clinic);
        TextView title=new TextView(this);title.setText(getIntent().getBooleanExtra("test",false)?"알람 테스트입니다":"안약을 넣을 시간입니다");title.setTextSize(28);title.setGravity(Gravity.CENTER);title.setPadding(0,dp(40),0,dp(20));root.addView(title);
        TextView message=new TextView(this);message.setText("안약과 안약 사이는\n5분 이상 간격을 두세요.");message.setTextSize(19);message.setGravity(Gravity.CENTER);root.addView(message);
        Button stop=new Button(this);stop.setText("알람 끄기");stop.setTextSize(21);stop.setOnClickListener(v->{stopService(new Intent(this,AlarmService.class));finish();});root.addView(stop,new LinearLayout.LayoutParams(-1,dp(64)));
        Button open=new Button(this);open.setText("안약 스케줄 열기");open.setOnClickListener(v->{stopService(new Intent(this,AlarmService.class));startActivity(new Intent(this,MainActivity.class).putExtra("plan",getIntent().getStringExtra("plan")).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP));finish();});root.addView(open,new LinearLayout.LayoutParams(-1,dp(64)));
        setContentView(root);
    }
    @Override protected void onDestroy(){if(current.get()==this)current.clear();super.onDestroy();}
    private void stopAlarm(){stopService(new Intent(this,AlarmService.class));finish();}
    @android.annotation.SuppressLint("GestureBackNavigation") // Legacy API 28-32; API 33+ uses OnBackInvokedDispatcher above.
    @Override public void onBackPressed(){stopAlarm();}
}
