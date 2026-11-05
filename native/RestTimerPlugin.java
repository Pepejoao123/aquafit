package __PACKAGE__;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Notificação contínua do timer de descanso, com contagem regressiva ao vivo
 * (cronômetro nativo do Android — continua rodando com o app em segundo plano).
 * O aviso de "descanso acabou" é agendado separadamente pelo LocalNotifications.
 */
@CapacitorPlugin(name = "RestTimer")
public class RestTimerPlugin extends Plugin {

    private static final String CHANNEL = "rest_timer";
    private static final int NOTIF_ID = 3100;

    @PluginMethod
    public void start(PluginCall call) {
        int ms = Math.max(0, call.getInt("ms", 90000));
        if (show(getContext(), ms, call.getBoolean("paused", false), call.getString("label", ""))) call.resolve();
        else call.reject("Sem permissão de notificação");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        cancel(getContext());
        call.resolve();
    }

    /** Mostra/atualiza a notificação contínua (usado pelo app e pelo widget de descanso). */
    static boolean show(Context ctx, int ms, boolean paused, String label) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return false;
        if (label == null) label = "";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Timer de descanso", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Contagem regressiva do descanso entre séries");
            ch.setShowBadge(false);
            ch.setSound(null, null);
            ch.enableVibration(false);
            nm.createNotificationChannel(ch);
        }

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(ctx, CHANNEL)
                : new Notification.Builder(ctx);

        int icon = ctx.getResources().getIdentifier("ic_stat_water", "drawable", ctx.getPackageName());
        if (icon == 0) icon = ctx.getApplicationInfo().icon;

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
            b.setContentIntent(PendingIntent.getActivity(ctx, NOTIF_ID, open, flags));
        }

        long end = System.currentTimeMillis() + ms;
        b.setSmallIcon(icon)
                .setColor(0xFF22D3EE)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentTitle(paused ? "⏸ Descanso pausado" : "⏱️ Descansando")
                .setContentText(paused ? "Faltam " + fmt(ms) : (label.isEmpty() ? "Próxima série 💪" : label));

        if (paused) {
            b.setShowWhen(false);
        } else {
            b.setShowWhen(true).setWhen(end).setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) b.setChronometerCountDown(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) b.setTimeoutAfter(ms + 1000L);
        }

        try {
            nm.notify(NOTIF_ID, b.build());
            return true;
        } catch (SecurityException e) {
            return false;
        }
    }

    static void cancel(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    private static String fmt(int ms) {
        int s = Math.round(ms / 1000f);
        return (s / 60) + ":" + String.format("%02d", s % 60);
    }
}
