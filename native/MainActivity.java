package __PACKAGE__;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestTimerPlugin.class); // plugin local (notificação com contagem regressiva)
        registerPlugin(FitWidgetPlugin.class); // widgets da tela inicial (hidratação e descanso)
        super.onCreate(savedInstanceState);
    }
}
