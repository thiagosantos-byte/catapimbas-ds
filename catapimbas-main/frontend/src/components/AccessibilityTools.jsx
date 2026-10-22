import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accessibility,
  Captions,
  Check,
  Contrast,
  Minus,
  Plus,
  Pause,
  X,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RotateCcw,
} from 'lucide-react';

import './AccessibilityTools.css';

const PREFS_KEY = 'nexus:accessibility-preferences';

const DEFAULTS = {
  theme: 'dark',
  fontScale: 0,
  highContrast: false,
  colorSafe: false,
  reducedMotion: false,
  calmMode: false,
  captions: true,
};

function loadPreferences() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PREFS_KEY) || '{}'
    );

    return {
      theme: saved.theme === 'light' ? 'light' : 'dark',
      fontScale: [0, 1, 2].includes(Number(saved.fontScale))
        ? Number(saved.fontScale)
        : 0,
      highContrast: saved.highContrast === true,
      colorSafe: saved.colorSafe === true,
      reducedMotion: saved.reducedMotion === true,
      calmMode: saved.calmMode === true,
      captions: saved.captions !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function getReadablePageText() {
  const target =
    document.querySelector('#conteudo-principal') ||
    document.querySelector('main') ||
    document.body;

  const copy = target.cloneNode(true);

  copy
    .querySelectorAll(
      [
        '.accessibility-tools',
        '.nexus-assistant',
        'script',
        'style',
        'button',
        'input',
        'select',
        'textarea',
        'svg',
        '[aria-hidden="true"]',
      ].join(',')
    )
    .forEach((element) => element.remove());

  return (copy.innerText || copy.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTextForSpeech(text) {
  const sentences =
    text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  const chunks = [];

  for (const sentence of sentences) {
    let remaining = sentence.trim();

    while (remaining.length > 240) {
      let position = remaining.lastIndexOf(' ', 240);

      if (position < 100) {
        position = 240;
      }

      chunks.push(remaining.slice(0, position).trim());
      remaining = remaining.slice(position).trim();
    }

    if (remaining) {
      chunks.push(remaining);
    }
  }

  return chunks.filter(Boolean);
}

export default function AccessibilityTools() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [speechStatus, setSpeechStatus] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState(false);

  const triggerRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRunRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = preferences.theme;
    root.dataset.a11yFont = String(preferences.fontScale);

    root.classList.toggle(
      'a11y-high-contrast',
      preferences.highContrast
    );

    root.classList.toggle(
      'a11y-color-safe',
      preferences.colorSafe
    );

    root.classList.toggle(
      'a11y-reduced-motion',
      preferences.reducedMotion
    );

    root.classList.toggle(
      'a11y-calm-mode',
      preferences.calmMode
    );

    root.classList.toggle(
      'a11y-captions-on',
      preferences.captions
    );

    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify(preferences)
      );
    } catch {
      // A falha de armazenamento não deve bloquear o painel.
    }

    function syncCaptions() {
      document.querySelectorAll('video, audio').forEach((media) => {
        const tracks = Array.from(media.textTracks || []).filter(
          (track) =>
            track.kind === 'captions' ||
            track.kind === 'subtitles'
        );

        const defaultTrack = media.querySelector(
          'track[kind="captions"][default], ' +
          'track[kind="subtitles"][default]'
        );

        const selected =
          defaultTrack?.track ||
          tracks.find((track) => track.mode === 'showing') ||
          tracks[0];

        tracks.forEach((track) => {
          if (!preferences.captions) {
            track.mode = 'hidden';
          } else {
            track.mode = track === selected ? 'showing' : 'disabled';
          }
        });
      });
    }

    syncCaptions();

    const observer = new MutationObserver((records) => {
      const addedMedia = records.some((record) =>
        Array.from(record.addedNodes).some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }

          return (
            node.matches?.('video, audio, track') ||
            Boolean(node.querySelector?.('video, audio, track'))
          );
        })
      );

      if (addedMedia) syncCaptions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [preferences]);

  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      speechRunRef.current += 1;

      window.speechSynthesis?.cancel();

      recognitionRef.current?.abort?.();
    };
  }, []);

  function update(key, value) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function stopReading() {
    speechRunRef.current += 1;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setReading(false);
    setSpeechStatus('Leitura interrompida.');
  }

  function readPage() {
    if (
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      setSpeechStatus(
        'A leitura por voz não está disponível neste navegador.'
      );
      return;
    }

    const text = getReadablePageText();

    if (!text) {
      setSpeechStatus(
        'Não encontrei texto para ler nesta página.'
      );
      return;
    }

    window.speechSynthesis.cancel();

    const chunks = splitTextForSpeech(text);
    const currentRun = ++speechRunRef.current;

    let position = 0;

    setReading(true);
    setSpeechStatus('Iniciando a leitura da página.');

    function speakNext() {
      if (speechRunRef.current !== currentRun) return;

      if (position >= chunks.length) {
        setReading(false);
        setSpeechStatus('Leitura concluída.');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(
        chunks[position]
      );

      position += 1;

      utterance.lang = 'pt-BR';
      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();

      const portugueseVoice = voices.find(
        (voice) => voice.lang.toLowerCase() === 'pt-br'
      );

      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      }

      utterance.onstart = () => {
        if (speechRunRef.current === currentRun) {
          setSpeechStatus('Lendo o conteúdo da página.');
        }
      };

      utterance.onend = () => speakNext();

      utterance.onerror = () => {
        if (speechRunRef.current === currentRun) {
          setReading(false);
          setSpeechStatus(
            'A leitura foi interrompida pelo navegador.'
          );
        }
      };

      window.speechSynthesis.speak(utterance);
    }

    speakNext();
  }

  function executeVoiceCommand(transcript) {
    const command = transcript
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    setVoiceStatus(`Comando reconhecido: ${transcript}`);

    if (
      command.includes('parar leitura') ||
      command.includes('parar audio')
    ) {
      stopReading();
      return;
    }

    if (
      command.includes('ler pagina') ||
      command.includes('ler conteudo')
    ) {
      readPage();
      return;
    }

    if (
      command.includes('recuperar senha') ||
      command.includes('recuperacao de senha')
    ) {
      navigate('/recuperar-senha');
      setOpen(false);
      return;
    }

    if (
      command.includes('abrir cadastro') ||
      command.includes('criar conta')
    ) {
      navigate('/cadastro');
      setOpen(false);
      return;
    }

    if (
      command.includes('abrir login') ||
      command.includes('ir para login')
    ) {
      navigate('/login');
      setOpen(false);
      return;
    }

    if (
      command.includes('abrir apresentacao') ||
      command.includes('pagina inicial')
    ) {
      navigate('/');
      setOpen(false);
      return;
    }

    if (
      command.includes('abrir painel') ||
      command.includes('abrir dashboard')
    ) {
      navigate('/dashboard');
      setOpen(false);
      return;
    }

    setVoiceStatus(
      'Comando não reconhecido. Tente: abrir login, ' +
      'abrir cadastro, recuperar senha ou ler página.'
    );
  }

  function startVoiceCommands() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus(
        'Este navegador não oferece reconhecimento de voz ' +
        'nesta interface. Use o teclado ou um leitor de tela.'
      );
      return;
    }

    try {
      recognitionRef.current?.abort?.();

      const recognition = new SpeechRecognition();

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setVoiceStatus(
          'Microfone ativo. Diga um comando de navegação.'
        );
      };

      recognition.onresult = (event) => {
        const transcript =
          event.results?.[0]?.[0]?.transcript || '';

        if (transcript) {
          executeVoiceCommand(transcript);
        } else {
          setVoiceStatus(
            'Não consegui reconhecer a fala. Tente novamente.'
          );
        }
      };

      recognition.onerror = (event) => {
        const message =
          event.error === 'not-allowed'
            ? 'Acesso ao microfone negado. Verifique a permissão do navegador.'
            : 'Não foi possível reconhecer o comando. Tente novamente.';

        setVoiceStatus(message);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
      setVoiceStatus(
        'Não foi possível iniciar o reconhecimento de voz.'
      );
    }
  }

  function resetPreferences() {
    setPreferences({ ...DEFAULTS });
  }

  return (
    <div className="accessibility-tools">
      {open && (
        <section
          className="accessibility-panel"
          id="painel-acessibilidade"
          aria-labelledby="accessibility-title"
        >
          <div className="accessibility-panel-heading">
            <div>
              <span className="accessibility-overline">
                PERSONALIZE SUA EXPERIÊNCIA
              </span>

              <h2 id="accessibility-title">
                Acessibilidade
              </h2>
            </div>

            <button
              className="accessibility-icon-button"
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Fechar painel de acessibilidade"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="accessibility-group">
            <span className="accessibility-group-title">
              Aparência
            </span>

            <div
              className="accessibility-theme-control"
              role="group"
              aria-label="Tema da interface"
            >
              <button
                type="button"
                className={
                  preferences.theme === 'light' ? 'active' : ''
                }
                aria-pressed={preferences.theme === 'light'}
                onClick={() => update('theme', 'light')}
              >
                <Sun size={17} aria-hidden="true" />
                Modo claro
              </button>

              <button
                type="button"
                className={
                  preferences.theme === 'dark' ? 'active' : ''
                }
                aria-pressed={preferences.theme === 'dark'}
                onClick={() => update('theme', 'dark')}
              >
                <Moon size={17} aria-hidden="true" />
                Modo escuro
              </button>
            </div>
          </div>

          <div className="accessibility-group">
            <span className="accessibility-group-title">
              Tamanho do texto
            </span>

            <div className="accessibility-text-controls">
              <button
                type="button"
                onClick={() =>
                  update(
                    'fontScale',
                    Math.max(0, preferences.fontScale - 1)
                  )
                }
                disabled={preferences.fontScale === 0}
                aria-label="Diminuir tamanho do texto"
              >
                <Minus size={17} aria-hidden="true" />
                <span>A−</span>
              </button>

              <span
                className="accessibility-current-size"
                aria-live="polite"
              >
                {[
                  'Padrão',
                  'Grande',
                  'Muito grande',
                ][preferences.fontScale]}
              </span>

              <button
                type="button"
                onClick={() =>
                  update(
                    'fontScale',
                    Math.min(2, preferences.fontScale + 1)
                  )
                }
                disabled={preferences.fontScale === 2}
                aria-label="Aumentar tamanho do texto"
              >
                <Plus size={17} aria-hidden="true" />
                <span>A+</span>
              </button>
            </div>
          </div>

          <div className="accessibility-options">
            <label className="accessibility-option">
              <span className="accessibility-option-icon">
                <Contrast size={18} aria-hidden="true" />
              </span>

              <span className="accessibility-option-copy">
                <strong>Alto contraste</strong>
                <small>
                  Textos e controles mais destacados.
                </small>
              </span>

              <input
                type="checkbox"
                checked={preferences.highContrast}
                onChange={(event) =>
                  update('highContrast', event.target.checked)
                }
              />
            </label>

            <label className="accessibility-option">
              <span className="accessibility-option-icon">
                <Check size={18} aria-hidden="true" />
              </span>

              <span className="accessibility-option-copy">
                <strong>Reforçar contornos e links</strong>
                <small>
                  Ajuda a distinguir elementos sem depender só das cores.
                </small>
              </span>

              <input
                type="checkbox"
                checked={preferences.colorSafe}
                onChange={(event) =>
                  update('colorSafe', event.target.checked)
                }
              />
            </label>

            <label className="accessibility-option">
              <span className="accessibility-option-icon">
                <Pause size={18} aria-hidden="true" />
              </span>

              <span className="accessibility-option-copy">
                <strong>Reduzir animações</strong>
                <small>
                  Menos movimento e transições.
                </small>
              </span>

              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(event) =>
                  update('reducedMotion', event.target.checked)
                }
              />
            </label>

            <label className="accessibility-option">
              <span className="accessibility-option-icon">
                <Accessibility size={18} aria-hidden="true" />
              </span>

              <span className="accessibility-option-copy">
                <strong>Leitura tranquila</strong>
                <small>
                  Reduz elementos decorativos e estímulos.
                </small>
              </span>

              <input
                type="checkbox"
                checked={preferences.calmMode}
                onChange={(event) =>
                  update('calmMode', event.target.checked)
                }
              />
            </label>

            <label className="accessibility-option">
              <span className="accessibility-option-icon">
                <Captions size={18} aria-hidden="true" />
              </span>

              <span className="accessibility-option-copy">
                <strong>Mostrar legendas disponíveis</strong>
                <small>
                  Exibe legendas quando a mídia oferece essa faixa.
                </small>
              </span>

              <input
                type="checkbox"
                checked={preferences.captions}
                onChange={(event) =>
                  update('captions', event.target.checked)
                }
              />
            </label>
          </div>

          <div className="accessibility-group">
            <span className="accessibility-group-title">
              Voz e leitura
            </span>

            <div className="accessibility-speech-controls">
              <button
                type="button"
                onClick={readPage}
              >
                <Volume2 size={17} aria-hidden="true" />
                Ler página em voz alta
              </button>

              <button
                type="button"
                onClick={stopReading}
                disabled={!reading}
              >
                <VolumeX size={17} aria-hidden="true" />
                Parar leitura
              </button>

              <button
                type="button"
                onClick={startVoiceCommands}
                disabled={listening}
              >
                {listening ? (
                  <MicOff size={17} aria-hidden="true" />
                ) : (
                  <Mic size={17} aria-hidden="true" />
                )}

                {listening
                  ? 'Escutando comando…'
                  : 'Comandos por voz'}
              </button>
            </div>

            <p className="accessibility-status" role="status" aria-live="polite">
              {speechStatus}
            </p>

            <p className="accessibility-status" role="status" aria-live="polite">
              {voiceStatus}
            </p>

            <p className="accessibility-caption-note">
              O microfone só é ativado quando você solicita um comando.
              O reconhecimento de voz depende do navegador e pode utilizar
              um serviço externo para processar o áudio.
            </p>
          </div>

          <div className="accessibility-note" role="note">
            <Check size={16} aria-hidden="true" />
            A leitura em voz alta complementa, mas não substitui, leitores
            de tela como NVDA e Narrador do Windows.
          </div>

          <p className="accessibility-caption-note">
            A opção de legendas controla faixas já existentes. Para gerar
            legendas automáticas, será necessário integrar um recurso de
            transcrição de áudio nas páginas que tiverem mídia.
          </p>

          <button
            className="accessibility-reset"
            type="button"
            onClick={resetPreferences}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Restaurar configurações padrão
          </button>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="accessibility-trigger"
        aria-controls={open ? 'painel-acessibilidade' : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Accessibility size={20} aria-hidden="true" />
        <span>Acessibilidade</span>
      </button>
    </div>
  );
}