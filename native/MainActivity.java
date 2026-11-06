package __PACKAGE__;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestTimerPlugin.class); // plugin local (notificação com contagem regressiva)
        registerPlugin(FitWidgetPlugin.class); // widgets da tela inicial (hidratação, descanso e refeição)
        FitWidgets.takeIntent(this, getIntent()); // aberto por um botão do widget de refeição
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        FitWidgets.takeIntent(this, intent); // guarda a ação antes de avisar o app (FitWidgetPlugin)
        super.onNewIntent(intent);
    }
}
