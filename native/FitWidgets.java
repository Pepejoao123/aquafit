package __PACKAGE__;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.text.DecimalFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Estado compartilhado dos widgets (SharedPreferences), atualizado pelo app (plugin FitWidget)
 * e pelos próprios widgets (água registrada / descanso iniciado na tela inicial).
 * Cada widget tem um layout compacto (2x2) e um largo (3x2+) em 3 temas: dark, glass e glasslight.
 */
public class FitWidgets {

    static final String PREFS = "fitpro_widget";
    static final String DEFAULT_PHRASE = "Bora! Hoje tem evolução.";
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String dayKey(long t) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(t));
    }

    /** Frase do dia (o app envia as frases dos próximos 30 dias). */
    static String phrase(Context c) {
        try {
            JSONObject o = new JSONObject(prefs(c).getString("phrases", "{}"));
            String p = o.optString(dayKey(System.currentTimeMillis()), "");
            return p.isEmpty() ? DEFAULT_PHRASE : p;
        } catch (Exception e) {
            return DEFAULT_PHRASE;
        }
    }

    /* ---------------- layout (tamanho + tema) ---------------- */

    interface Filler { void fill(Context c, RemoteViews v, boolean small); }

    static String theme(Context c) {
        String t = prefs(c).getString("theme", "dark");
        return "glass".equals(t) || "glasslight".equals(t) ? t : "dark";
    }

    private static int layout(Context c, String kind, String size) {
        int id = c.getResources().getIdentifier("widget_" + kind + "_" + size + "_" + theme(c), "layout", c.getPackageName());
        return id != 0 ? id : c.getResources().getIdentifier("widget_" + kind + "_" + size + "_dark", "layout", c.getPackageName());
    }

    private static RemoteViews make(Context c, String kind, boolean small, Filler f) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout(c, kind, small ? "s" : "w"));
        f.fill(c, v, small);
        return v;
    }

    /** Android 12+: o launcher troca sozinho entre compacto e largo ao redimensionar. Antes disso, decide pela largura. */
    static RemoteViews responsive(Context c, AppWidgetManager m, int id, String kind, Filler f) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> map = new HashMap<>();
            map.put(new SizeF(100f, 100f), make(c, kind, true, f));
            map.put(new SizeF(200f, 100f), make(c, kind, false, f));
            return new RemoteViews(map);
        }
        int w = 250;
        if (m != null && id != 0) {
            Bundle o = m.getAppWidgetOptions(id);
            if (o != null) w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        }
        return make(c, kind, w > 0 && w < 200, f);
    }

    /* ---------------- água ---------------- */

    static JSONArray pendingWater(Context c) {
        try { return new JSONArray(prefs(c).getString("pendingWater", "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    static void addWater(Context c, int ml) {
        try {
            JSONArray a = pendingWater(c);
            JSONObject o = new JSONObject();
            o.put("ml", ml);
            o.put("t", System.currentTimeMillis());
            a.put(o);
            prefs(c).edit().putString("pendingWater", a.toString()).apply();
        } catch (Exception ignored) { }
    }

    /** Total de hoje = último total enviado pelo app + o que foi registrado pelo widget. */
    static int waterToday(Context c) {
        SharedPreferences p = prefs(c);
        String today = dayKey(System.currentTimeMillis());
        int total = today.equals(p.getString("day", "")) ? p.getInt("waterMl", 0) : 0;
        JSONArray a = pendingWater(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && today.equals(dayKey(o.optLong("t")))) total += o.optInt("ml");
        }
        return total;
    }

    static String fmtMl(int ml) {
        if (ml < 1000) return ml + " ml";
        DecimalFormat f = new DecimalFormat("0.##", DecimalFormatSymbols.getInstance(new Locale("pt", "BR")));
        return f.format(ml / 1000.0) + " L";
    }

    static String fmtSec(long ms) {
        long s = Math.max(0, Math.round(ms / 1000.0));
        return (s / 60) + ":" + String.format(Locale.US, "%02d", s % 60);
    }

    /* ---------------- refeição ---------------- */

    /** Valor de hoje enviado pelo app (kcal, p, c, f); zera ao virar o dia. */
    static float today(Context c, String key) {
        SharedPreferences p = prefs(c);
        return dayKey(System.currentTimeMillis()).equals(p.getString("day", "")) ? p.getFloat(key, 0f) : 0f;
    }

    static String fmtInt(float v) {
        return NumberFormat.getIntegerInstance(new Locale("pt", "BR")).format(Math.round(v));
    }

    static int pct(float v, float goal) {
        return goal > 0 ? Math.min(100, Math.round(v * 100f / goal)) : 0;
    }

    /** Abre o app com uma ação (ex.: "meal_photo"), entregue ao JS por FitWidget.takePending. */
    static PendingIntent openAction(Context c, String action, int req) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (i == null) return null;
        i.putExtra("fitAction", action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, i, FLAGS);
    }

    /** Chamado pela MainActivity ao abrir pelo widget: guarda a ação para o app executar. */
    static void takeIntent(Context c, Intent i) {
        if (i == null) return;
        String a = i.getStringExtra("fitAction");
        if (a == null || a.isEmpty()) return;
        i.removeExtra("fitAction");
        prefs(c).edit().putString("pendingAction", a).putLong("pendingActionAt", System.currentTimeMillis()).apply();
    }

    /* ---------------- descanso ---------------- */

    static void startRest(Context c, int sec) {
        long end = System.currentTimeMillis() + sec * 1000L;
        prefs(c).edit().putLong("restEnd", end).putLong("restTotal", sec * 1000L)
                .putLong("restPausedMs", 0).putBoolean("restFromWidget", true).apply();
        scheduleAlarm(c, end);
        RestTimerPlugin.show(c, sec * 1000, false, "");
        updateAll(c);
    }

    static void stopRest(Context c) {
        prefs(c).edit().putLong("restEnd", 0).putLong("restPausedMs", 0).putBoolean("restFromWidget", false).apply();
        cancelAlarm(c);
        RestTimerPlugin.cancel(c);
        updateAll(c);
    }

    private static PendingIntent alarmIntent(Context c) {
        return PendingIntent.getBroadcast(c, 3200, new Intent(c, RestAlarmReceiver.class), FLAGS);
    }

    static void scheduleAlarm(Context c, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(c);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void cancelAlarm(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(c));
    }

    /** Aviso "descanso acabou" para descansos iniciados pelo widget (os do app usam o LocalNotifications). */
    static void notifyRestDone(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        String channel = "rest_end";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(channel) == null) {
            NotificationChannel ch = new NotificationChannel(channel, "Fim do descanso", NotificationManager.IMPORTANCE_HIGH);
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
        }
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        int icon = c.getResources().getIdentifier("ic_stat_water", "drawable", c.getPackageName());
        if (icon == 0) icon = c.getApplicationInfo().icon;
        b.setSmallIcon(icon).setColor(0xFF22C55E).setAutoCancel(true)
                .setContentTitle("✅ Descanso acabou").setContentText("Bora pra próxima série 💪");
        PendingIntent open = openApp(c);
        if (open != null) b.setContentIntent(open);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            b.setDefaults(Notification.DEFAULT_ALL).setPriority(Notification.PRIORITY_HIGH);
        }
        try { nm.notify(3000, b.build()); } catch (SecurityException ignored) { }
    }

    /* ---------------- utilitários ---------------- */

    static PendingIntent openApp(Context c) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        return i == null ? null : PendingIntent.getActivity(c, 3300, i, FLAGS);
    }

    static PendingIntent broadcast(Context c, Class<?> cls, String action, int req, String key, int value) {
        Intent i = new Intent(c, cls).setAction(action).putExtra(key, value);
        return PendingIntent.getBroadcast(c, req, i, FLAGS);
    }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        if (m == null) return;
        for (int id : m.getAppWidgetIds(new ComponentName(c, WaterWidget.class))) m.updateAppWidget(id, WaterWidget.build(c, m, id));
        for (int id : m.getAppWidgetIds(new ComponentName(c, RestWidget.class))) m.updateAppWidget(id, RestWidget.build(c, m, id));
        for (int id : m.getAppWidgetIds(new ComponentName(c, MealWidget.class))) m.updateAppWidget(id, MealWidget.build(c, m, id));
    }
}
