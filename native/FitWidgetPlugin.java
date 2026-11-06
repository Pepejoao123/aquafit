package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app (JS) e os widgets da tela inicial.
 *  update()      → app envia água, calorias/macros de hoje, metas, frases, tema e estado do descanso
 *  takePending() → app recebe a água registrada pelo widget, o descanso iniciado nele e a ação
 *                  pedida pelo widget de refeição (foto / registrar)
 *  evento "widgetAction" → avisa o app já aberto que um botão de widget o chamou
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
        e.putFloat("kcal", call.getDouble("kcal", 0.0).floatValue());
        e.putFloat("p", call.getDouble("p", 0.0).floatValue());
        e.putFloat("c", call.getDouble("c", 0.0).floatValue());
        e.putFloat("f", call.getDouble("f", 0.0).floatValue());
        e.putFloat("goalKcal", call.getDouble("goalKcal", 0.0).floatValue());
        e.putFloat("goal_p", call.getDouble("goalP", 0.0).floatValue());
        e.putFloat("goal_c", call.getDouble("goalC", 0.0).floatValue());
        e.putFloat("goal_f", call.getDouble("goalF", 0.0).floatValue());
        String theme = call.getString("theme");
        if (theme != null && !theme.isEmpty()) e.putString("theme", theme);
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
        String action = p.getString("pendingAction", "");
        if (!action.isEmpty() && now - p.getLong("pendingActionAt", 0) < 120000) r.put("action", action);
        p.edit().putString("pendingWater", "[]").remove("pendingAction").apply();
        call.resolve(r);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        Context c = getContext();
        String kind = call.getString("kind", "water");
        Class<?> cls = "rest".equals(kind) ? RestWidget.class : "meal".equals(kind) ? MealWidget.class : WaterWidget.class;
        ComponentName cn = new ComponentName(c, cls);
        JSObject r = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager m = c.getSystemService(AppWidgetManager.class);
            if (m != null && m.isRequestPinAppWidgetSupported()) ok = m.requestPinAppWidget(cn, null, null);
        }
        r.put("ok", ok);
        call.resolve(r);
    }

    /** App já aberto e chamado por um botão de widget (MainActivity guardou a ação). */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        notifyListeners("widgetAction", new JSObject());
    }
}
