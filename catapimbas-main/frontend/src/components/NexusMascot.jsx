export default function NexusMascot({
  size = 48,
  className = '',
}) {
  return (
    <svg
      className={`nexus-mascot-art ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Antena */}
      <path
        d="M50 10V5"
        stroke="#B9A2FF"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <circle cx="50" cy="5" r="5" fill="#8FE8CC" />

      {/* Braços */}
      <path
        d="M25 55L12 66L17 78L29 69"
        fill="#7560AC"
        stroke="#B9A2FF"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M75 55L88 63L83 75L72 68"
        fill="#7560AC"
        stroke="#B9A2FF"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Corpo */}
      <rect
        x="30"
        y="59"
        width="40"
        height="32"
        rx="12"
        fill="#493663"
        stroke="#B9A2FF"
        strokeWidth="3"
      />

      {/* Emblema Nexus */}
      <path
        d="M42 83V69L58 83V69"
        stroke="#D8CCFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Laterais da cabeça */}
      <rect
        x="7"
        y="31"
        width="12"
        height="27"
        rx="6"
        fill="#9580D8"
        stroke="#D5C9FF"
        strokeWidth="2"
      />

      <rect
        x="81"
        y="31"
        width="12"
        height="27"
        rx="6"
        fill="#9580D8"
        stroke="#D5C9FF"
        strokeWidth="2"
      />

      {/* Cabeça */}
      <rect
        x="15"
        y="15"
        width="70"
        height="52"
        rx="20"
        fill="#EEE9FF"
        stroke="#B9A2FF"
        strokeWidth="3"
      />

      {/* Visor */}
      <rect
        x="21"
        y="23"
        width="58"
        height="36"
        rx="14"
        fill="#21172F"
      />

      {/* Olhos expressivos */}
      <path
        d="M31 38Q37 29 43 38"
        stroke="#A994FF"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M57 38Q63 29 69 38"
        stroke="#A994FF"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Sorriso */}
      <path
        d="M39 46Q50 55 61 46"
        stroke="#8FE8CC"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Luz indicadora */}
      <circle
        cx="50"
        cy="63"
        r="2.5"
        fill="#8FE8CC"
      />
    </svg>
  );
}