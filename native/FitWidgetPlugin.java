package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app (JS) e os widgets da tela inicial.
 *  update()      → app envia água de hoje, meta, frases e estado do descanso
 *  takePending() → app recebe a água registrada pelo widget e o descanso iniciado nele
 *  pin()         → pede ao launcher para adicionar o widget à tela inicial
 */
@CapacitorPlugin(name = "FitWidget")
public class FitWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context c = getContext();
        SharedPreferences p = FitWidgets.prefs(c);
        SharedPreferences.Editor e = p.edit();
        e.putString("day", call.getString("day", ""));
        e.putInt("waterMl", call.getInt("waterMl", 0));
        e.putInt("goalMl", call.getInt("goalMl", 2500));
        String phrases = call.getString("phrases");
        if (phrases != null && !phrases.isEmpty()) e.putString("phrases", phrases);

        long now = System.currentTimeMillis();
        long end = call.getDouble("restEnd", 0.0).longValue();
        long total = call.getDouble("restTotal", 0.0).longValue();
        long pausedMs = call.getDouble("restPausedMs", 0.0).longValue();
        boolean stop = Boolean.TRUE.equals(call.getBoolean("restStop", false));
        long oldEnd = p.getLong("restEnd", 0);
        boolean widgetRest = p.getBoolean("restFromWidget", false) && oldEnd > now;

        if (end > now) {                       // descanso rodando no app
            if (Math.abs(end - oldEnd) > 1500) e.putBoolean("restFromWidget", false);
            e.putLong("restEnd", end).putLong("restTotal", total).putLong("restPausedMs", 0).apply();
            FitWidgets.scheduleAlarm(c, end);  // só para atualizar o widget no fim
        } else if (pausedMs > 0) {             // pausado no app
            e.putLong("restEnd", 0).putLong("restPausedMs", pausedMs).putBoolean("restFromWidget", false).apply();
            FitWidgets.cancelAlarm(c);
        } else if (stop || !widgetRest) {      // sem descanso (não apaga um descanso iniciado pelo widget)
            e.putLong("restEnd", 0).putLong("restPausedMs", 0).putBoolean("restFromWidget", false).apply();
            if (oldEnd > now) FitWidgets.cancelAlarm(c);
            if (stop && widgetRest) RestTimerPlugin.cancel(c);
        } else {
            e.apply();
        }
        FitWidgets.updateAll(c);
        call.resolve();
    }

    @PluginMethod
    public void takePending(PluginCall call) {
        Context c = getContext();
        SharedPreferences p = FitWidgets.prefs(c);
        JSObject r = new JSObject();
        r.put("water", p.getString("pendingWater", "[]"));
        long now = System.currentTimeMillis(), end = p.getLong("restEnd", 0);
        if (p.getBoolean("restFromWidget", false) && end > now) {
            r.put("restEnd", (double) end);
            r.put("restTotal", (double) p.getLong("restTotal", 0));
        }
        p.edit().putString("pendingWater", "[]").apply();
        call.resolve(r);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        Context c = getContext();
        ComponentName cn = new ComponentName(c, "rest".equals(call.getString("kind", "water")) ? RestWidget.class : WaterWidget.class);
        JSObject r = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager m = c.getSystemService(AppWidgetManager.class);
            if (m != null && m.isRequestPinAppWidgetSupported()) ok = m.requestPinAppWidget(cn, null, null);
        }
        r.put("ok", ok);
        call.resolve(r);
    }
}
