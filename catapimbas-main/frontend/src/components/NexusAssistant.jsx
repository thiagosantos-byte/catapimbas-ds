import { useEffect, useRef, useState } from 'react';
import NexusMascot from './NexusMascot.jsx';
import {
  Bot,
  MessageCircle,
  X,
  Send,
  Mic,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { api } from '../services/api';
import './NexusAssistant.css';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content:
    'Olá! Sou o Assistente Nexus. Posso ajudar com dúvidas sobre projetos, bancas, avaliações e utilização da plataforma.',
};

const SUGGESTIONS = [
  'Como cadastro um projeto?',
  'Como funciona uma banca de avaliação?',
  'Como interpretar o ranking?',
];

export default function NexusAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, loading, open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function sendMessage(event) {
    event?.preventDefault();

    const question = input.trim();

    if (!question || loading) return;

    const history = messages.slice(-8).map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((current) => [
      ...current,
      { role: 'user', content: question },
    ]);

    setInput('');
    setLoading(true);
    setStatus('Enviando pergunta...');

    try {
      const response = await api.post('/assistente/chat', {
        mensagem: question,
        historico: history,
      });

      const answer =
        response.data?.resposta ||
        response.data?.answer ||
        response.data?.mensagem;

      if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error('O servidor não retornou uma resposta válida.');
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: answer.trim(),
        },
      ]);

      setStatus('Resposta recebida.');
    } catch (error) {
      let message;

      if (error.response?.status === 404) {
        message =
          'O serviço de IA ainda não está disponível nesta API. ' +
          'É necessário implementar a rota /api/assistente/chat no backend.';
      } else if (!error.response) {
        message =
          'Não consegui conectar ao servidor. Verifique o endereço da API e a conexão.';
      } else {
        message =
          error.response?.data?.mensagem ||
          'Não foi possível gerar a resposta. Tente novamente.';
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: message,
        },
      ]);

      setStatus('Não foi possível concluir a consulta.');
    } finally {
      setLoading(false);
    }
  }

  function startVoiceInput() {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      setStatus(
        'O reconhecimento de voz não está disponível neste navegador.'
      );
      return;
    }

    try {
      recognitionRef.current?.abort?.();

      const recognition = new Recognition();

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus('Microfone ativo. Dite sua pergunta.');
      };

      recognition.onresult = (event) => {
        const transcript =
          event.results?.[0]?.[0]?.transcript || '';

        if (transcript) {
          setInput((current) =>
            [current, transcript].filter(Boolean).join(' ')
          );

          setStatus('Ditado concluído. Revise a pergunta antes de enviar.');
        }
      };

      recognition.onerror = (event) => {
        setStatus(
          event.error === 'not-allowed'
            ? 'Acesso ao microfone negado. Confira as permissões do navegador.'
            : 'Não foi possível reconhecer sua fala. Tente novamente.'
        );
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setStatus('Não foi possível iniciar o microfone.');
    }
  }

  function readAnswer(text) {
    if (!('speechSynthesis' in window)) {
      setStatus('A leitura em voz alta não está disponível.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="nexus-assistant">
      {open && (
        <section
          className="nexus-assistant-panel"
          aria-label="Assistente do Nexus Academic"
        >
          <header className="nexus-assistant-header">
            <span className="nexus-assistant-avatar">
  <NexusMascot size={42} />
</span>

            <div className="nexus-assistant-heading">
              <strong>Assistente Nexus</strong>
              <small>Orientação sobre a plataforma</small>
            </div>

            <button
              type="button"
              className="nexus-assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>

          <div
            className="nexus-assistant-messages"
            role="log"
            aria-label="Conversa com o assistente"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message, index) => (
              <article
                key={`${index}-${message.role}`}
                className={`nexus-assistant-message ${message.role}`}
              >
                <p>{message.content}</p>

                {message.role === 'assistant' && (
                  <button
                    type="button"
                    className="nexus-assistant-read"
                    onClick={() => readAnswer(message.content)}
                  >
                    <Volume2 size={15} aria-hidden="true" />
                    Ouvir resposta
                  </button>
                )}
              </article>
            ))}

            {loading && (
              <p className="nexus-assistant-thinking" role="status">
                Preparando resposta...
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {!messages.some((message) => message.role === 'user') && (
            <div className="nexus-assistant-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="nexus-assistant-form"
            onSubmit={sendMessage}
          >
            <label
              className="sr-only"
              htmlFor="nexus-assistant-input"
            >
              Sua pergunta para o assistente
            </label>

            <textarea
              id="nexus-assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite sua dúvida..."
              rows={2}
              maxLength={2000}
              disabled={loading}
            />

            <div className="nexus-assistant-actions">
              <button
                type="button"
                onClick={startVoiceInput}
                aria-label="Ditar pergunta por voz"
                title="Ditar pergunta por voz"
                disabled={loading}
              >
                <Mic size={17} aria-hidden="true" />
              </button>

              <span
                className="nexus-assistant-status"
                role="status"
                aria-live="polite"
              >
                {status}
              </span>

              <button
                type="submit"
                className="nexus-assistant-send"
                disabled={loading || !input.trim()}
              >
                <Send size={17} aria-hidden="true" />
                Enviar
              </button>
            </div>
          </form>

          <p className="nexus-assistant-privacy">
            Não envie senhas, tokens ou informações pessoais sensíveis.
            Respostas geradas por IA devem ser verificadas.
          </p>
        </section>
      )}

      <button
        type="button"
        className="nexus-assistant-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X size={19} aria-hidden="true" />
        ) : (
          <Sparkles size={19} aria-hidden="true" />
        )}

        <span>
          {open ? 'Fechar assistente' : 'Assistente Nexus'}
        </span>

        {!open && (
          <MessageCircle size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}