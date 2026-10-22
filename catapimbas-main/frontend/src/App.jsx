import AppRoutes from './routes/AppRoutes';
import AccessibilityTools from './components/AccessibilityTools';
import NexusAssistant from './components/NexusAssistant';

export default function App() {
  return (
    <>
      <a
        className="skip-to-content"
        href="#conteudo-principal"
      >
        Pular para o conteúdo principal
      </a>

      <AppRoutes />

      <AccessibilityTools />

      <NexusAssistant />
    </>
  );
}