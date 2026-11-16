package com.jeileye.alarm;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import org.json.*;
import java.time.Instant;
import java.util.*;

final class AlarmStore {
    static final String PREFS="alarms", CHANNEL="eye_drop_alarm_v1", FIRE="com.jeileye.alarm.FIRE";
    static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
    static JSONArray jobs(Context c){try{return new JSONArray(prefs(c).getString("jobs","[]"));}catch(Exception e){return new JSONArray();}}
    static String key(JSONObject job){return job.optString("plan_id")+":"+job.optInt("slot")+":"+job.optString("fire_at");}
    static long time(JSONObject job){try{return Instant.parse(job.getString("fire_at")).toEpochMilli();}catch(Exception e){return 0;}}
    static PendingIntent pending(Context c,JSONObject job){
        Intent i=new Intent(c,AlarmReceiver.class).setAction(FIRE).setData(Uri.parse("jeileye://alarm/"+Uri.encode(key(job))));
        return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context c,JSONObject job){
        long when=time(job);if(when<=System.currentTimeMillis())return;
        AlarmManager manager=c.getSystemService(AlarmManager.class);
        if(Build.VERSION.SDK_INT>=31&&!manager.canScheduleExactAlarms())throw new SecurityException("알람 및 리마인더 권한을 허용해 주세요.");
        PendingIntent show=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        manager.setAlarmClock(new AlarmManager.AlarmClockInfo(when,show),pending(c,job));
    }
    static synchronized void replace(Context c,JSONArray requested,JSONArray activePlans) throws Exception {
        if(requested.length()>128)throw new IllegalArgumentException("알림이 너무 많습니다.");
        JSONArray valid=new JSONArray();Set<String> seen=new HashSet<>();long now=System.currentTimeMillis();
        for(int n=0;n<requested.length();n++){
            JSONObject j=requested.getJSONObject(n);String plan=j.optString("plan_id");long at=time(j);int slot=j.optInt("slot",-1);
            if(!plan.matches("[a-z0-9-]{1,70}")||slot<0||slot>3||at>now+366L*86400000)throw new IllegalArgumentException("올바르지 않은 알림 일정입니다.");
            if(at>now&&seen.add(key(j)))valid.put(new JSONObject().put("plan_id",plan).put("slot",slot).put("fire_at",j.getString("fire_at")));
        }
        JSONArray previous=jobs(c);AlarmManager manager=c.getSystemService(AlarmManager.class);
        // Persist before changing system alarms; next launch/reboot can restore interrupted work.
        if(!prefs(c).edit().putString("jobs",valid.toString()).commit())throw new IllegalStateException("기기에 알람을 저장하지 못했습니다.");
        for(int n=0;n<previous.length();n++)manager.cancel(pending(c,previous.getJSONObject(n)));
        try{for(int n=0;n<valid.length();n++)schedule(c,valid.getJSONObject(n));}
        catch(SecurityException e){throw new IllegalStateException("정확한 알람 권한을 허용한 뒤 다시 저장해 주세요.");}
        String ringing=prefs(c).getString("ringing","");boolean keep=false;
        for(int n=0;n<activePlans.length();n++)if(ringing.equals(activePlans.optString(n)))keep=true;
        if(!ringing.isEmpty()&&!keep)c.stopService(new Intent(c,AlarmService.class));
    }
    static synchronized JSONObject consume(Context c,String key) throws Exception {
        JSONObject test=new JSONObject(prefs(c).getString("test","{}"));
        if(key(test).equals(key)){if(!prefs(c).edit().remove("test").commit())throw new IllegalStateException("알람 상태 저장 실패");return test;}
        JSONArray list=jobs(c),remaining=new JSONArray();JSONObject found=null;
        for(int n=0;n<list.length();n++){JSONObject j=list.getJSONObject(n);if(key(j).equals(key))found=j;else remaining.put(j);}
        if(!prefs(c).edit().putString("jobs",remaining.toString()).commit())throw new IllegalStateException("알람 상태 저장 실패");return found;
    }
    static synchronized void restore(Context c){
        try{JSONArray list=jobs(c);for(int n=0;n<list.length();n++)schedule(c,list.getJSONObject(n));}
        catch(Exception ignored){/* Permission can be revoked; the setup screen reports it. */}
    }
    static synchronized void test(Context c,String plan) throws Exception {
        JSONObject previous=new JSONObject(prefs(c).getString("test","{}"));if(previous.has("fire_at"))c.getSystemService(AlarmManager.class).cancel(pending(c,previous));
        JSONObject job=new JSONObject().put("plan_id",plan.matches("[a-z0-9-]{1,70}")?plan:"test").put("slot",0).put("fire_at",Instant.ofEpochMilli(System.currentTimeMillis()+10000).toString()).put("test",true);
        if(!prefs(c).edit().putString("test",job.toString()).commit())throw new IllegalStateException("테스트 알람을 저장하지 못했습니다.");schedule(c,job);
    }
}
