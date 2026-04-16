import React from 'react';

// ─── Shared types ────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'obliques'
  | 'upper_abs'
  | 'lower_abs'
  | 'traps'
  | 'lats'
  | 'rhomboids'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'hip_flexors'
  | 'adductors'
  | 'calves';

interface MuscleMapProps {
  /** Which muscles to highlight */
  active?: MuscleGroup[];
  /** Size in px — components are square-ish, this sets the width */
  size?: number;
  /** Muted (inactive) muscle fill */
  mutedColor?: string;
  /** Highlighted (active) muscle fill */
  highlightColor?: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SKIN = '#71717a'; // zinc-500 — body silhouette
const OUTLINE = '#3f3f46'; // zinc-700 — body border

const defaults = {
  mutedColor: '#3f3f46', // zinc-700
  highlightColor: '#10b981', // emerald-500
};

function c(muscle: MuscleGroup, active: MuscleGroup[], highlight: string, muted: string) {
  return active.includes(muscle) ? highlight : muted;
}

// ─── Front Torso ──────────────────────────────────────────────────────────────

export function FrontTorso({
  active = [],
  size = 120,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 120 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Front torso muscle map"
    >
      {/* Neck */}
      <rect x="52" y="4" width="16" height="18" rx="4" fill={SKIN} />
      {/* Head outline */}
      <ellipse cx="60" cy="0" rx="18" ry="6" fill={SKIN} />
      {/* Torso body */}
      <path
        d="M36 22 Q60 18 84 22 L86 100 Q60 108 34 100Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Left shoulder */}
      <ellipse cx="30" cy="38" rx="12" ry="16" fill={m('shoulders')} opacity="0.9" />
      {/* Right shoulder */}
      <ellipse cx="90" cy="38" rx="12" ry="16" fill={m('shoulders')} opacity="0.9" />
      {/* Chest left */}
      <path
        d="M40 28 Q60 24 62 28 L60 58 Q50 62 40 56Z"
        fill={m('chest')}
        opacity="0.9"
      />
      {/* Chest right */}
      <path
        d="M80 28 Q60 24 58 28 L60 58 Q70 62 80 56Z"
        fill={m('chest')}
        opacity="0.9"
      />
      {/* Upper abs */}
      <rect
        x="50"
        y="62"
        width="8"
        height="9"
        rx="2"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="62"
        y="62"
        width="8"
        height="9"
        rx="2"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      {/* Lower abs */}
      <rect
        x="50"
        y="74"
        width="8"
        height="9"
        rx="2"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="62"
        y="74"
        width="8"
        height="9"
        rx="2"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="50"
        y="86"
        width="8"
        height="9"
        rx="2"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="62"
        y="86"
        width="8"
        height="9"
        rx="2"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      {/* Obliques */}
      <path
        d="M40 58 Q36 74 38 96 L44 94 Q44 76 44 60Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      <path
        d="M80 58 Q84 74 82 96 L76 94 Q76 76 76 60Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      {/* Left arm */}
      <rect
        x="16"
        y="52"
        width="14"
        height="38"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Bicep left */}
      <path
        d="M18 54 Q24 52 28 56 L27 76 Q22 80 18 76Z"
        fill={m('biceps')}
        opacity="0.9"
      />
      {/* Right arm */}
      <rect
        x="90"
        y="52"
        width="14"
        height="38"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Bicep right */}
      <path
        d="M102 54 Q96 52 92 56 L93 76 Q98 80 102 76Z"
        fill={m('biceps')}
        opacity="0.9"
      />
      {/* Forearms */}
      <rect
        x="14"
        y="90"
        width="16"
        height="28"
        rx="5"
        fill={m('forearms')}
        opacity="0.85"
      />
      <rect
        x="90"
        y="90"
        width="16"
        height="28"
        rx="5"
        fill={m('forearms')}
        opacity="0.85"
      />
      {/* Hips */}
      <rect
        x="38"
        y="100"
        width="44"
        height="30"
        rx="8"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Back Torso ───────────────────────────────────────────────────────────────

export function BackTorso({
  active = [],
  size = 120,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 120 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Back torso muscle map"
    >
      {/* Neck */}
      <rect x="52" y="4" width="16" height="18" rx="4" fill={SKIN} />
      {/* Torso body */}
      <path
        d="M36 22 Q60 18 84 22 L86 100 Q60 108 34 100Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Traps */}
      <path
        d="M44 22 Q60 18 76 22 L72 44 Q60 40 48 44Z"
        fill={m('traps')}
        opacity="0.9"
      />
      {/* Rhomboids */}
      <path
        d="M48 44 Q60 40 72 44 L70 62 Q60 58 50 62Z"
        fill={m('rhomboids')}
        opacity="0.9"
      />
      {/* Left lat */}
      <path d="M36 44 Q46 50 48 68 L42 80 Q34 68 36 52Z" fill={m('lats')} opacity="0.9" />
      {/* Right lat */}
      <path d="M84 44 Q74 50 72 68 L78 80 Q86 68 84 52Z" fill={m('lats')} opacity="0.9" />
      {/* Lower back */}
      <path
        d="M48 68 Q60 64 72 68 L72 98 Q60 102 48 98Z"
        fill={m('lower_back')}
        opacity="0.9"
      />
      {/* Shoulders */}
      <ellipse cx="30" cy="38" rx="12" ry="16" fill={m('shoulders')} opacity="0.85" />
      <ellipse cx="90" cy="38" rx="12" ry="16" fill={m('shoulders')} opacity="0.85" />
      {/* Arms (neutral) */}
      <rect
        x="16"
        y="52"
        width="14"
        height="66"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="90"
        y="52"
        width="14"
        height="66"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Hips */}
      <rect
        x="38"
        y="100"
        width="44"
        height="30"
        rx="8"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Abs (close-up) ───────────────────────────────────────────────────────────

export function AbsView({
  active = [],
  size = 100,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 100 180"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Abs muscle map"
    >
      {/* Torso shape */}
      <path
        d="M20 10 Q50 4 80 10 L82 160 Q50 168 18 160Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Obliques */}
      <path
        d="M20 14 Q26 30 24 120 L20 120 Q18 40 20 14Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      <path
        d="M80 14 Q74 30 76 120 L80 120 Q82 40 80 14Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      {/* Upper abs — 2 rows */}
      <rect
        x="34"
        y="24"
        width="13"
        height="14"
        rx="3"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="53"
        y="24"
        width="13"
        height="14"
        rx="3"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="34"
        y="42"
        width="13"
        height="14"
        rx="3"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="53"
        y="42"
        width="13"
        height="14"
        rx="3"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      {/* Lower abs — 2 rows */}
      <rect
        x="34"
        y="60"
        width="13"
        height="14"
        rx="3"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="53"
        y="60"
        width="13"
        height="14"
        rx="3"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="34"
        y="78"
        width="13"
        height="14"
        rx="3"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="53"
        y="78"
        width="13"
        height="14"
        rx="3"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      {/* Hip flexors suggestion */}
      <path
        d="M30 100 Q50 96 70 100 L68 130 Q50 134 32 130Z"
        fill={m('hip_flexors')}
        opacity="0.75"
      />
    </svg>
  );
}

// ─── Front Legs ───────────────────────────────────────────────────────────────

export function FrontLegs({
  active = [],
  size = 110,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 110 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Front legs muscle map"
    >
      {/* Hips/pelvis */}
      <rect
        x="22"
        y="4"
        width="66"
        height="28"
        rx="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Hip flexors */}
      <path
        d="M30 6 Q55 2 80 6 L78 28 Q55 24 32 28Z"
        fill={m('hip_flexors')}
        opacity="0.85"
      />
      {/* Left thigh */}
      <rect
        x="22"
        y="30"
        width="28"
        height="90"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right thigh */}
      <rect
        x="60"
        y="30"
        width="28"
        height="90"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Quads left */}
      <path
        d="M24 34 Q36 30 48 34 L46 112 Q36 118 26 112Z"
        fill={m('quads')}
        opacity="0.9"
      />
      {/* Quads right */}
      <path
        d="M86 34 Q74 30 62 34 L64 112 Q74 118 84 112Z"
        fill={m('quads')}
        opacity="0.9"
      />
      {/* Adductors (inner thigh) */}
      <path
        d="M48 36 Q55 32 62 36 L60 108 Q55 112 50 108Z"
        fill={m('adductors')}
        opacity="0.85"
      />
      {/* Left knee */}
      <ellipse
        cx="36"
        cy="122"
        rx="14"
        ry="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right knee */}
      <ellipse
        cx="74"
        cy="122"
        rx="14"
        ry="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Left shin */}
      <rect
        x="24"
        y="130"
        width="24"
        height="82"
        rx="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right shin */}
      <rect
        x="62"
        y="130"
        width="24"
        height="82"
        rx="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Back Legs ────────────────────────────────────────────────────────────────

export function BackLegs({
  active = [],
  size = 110,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 110 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Back legs muscle map"
    >
      {/* Hips/glutes */}
      <rect
        x="22"
        y="4"
        width="66"
        height="36"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Glutes */}
      <path d="M24 6 Q55 2 86 6 L84 36 Q55 44 26 36Z" fill={m('glutes')} opacity="0.9" />
      {/* Left thigh */}
      <rect
        x="22"
        y="38"
        width="28"
        height="86"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right thigh */}
      <rect
        x="60"
        y="38"
        width="28"
        height="86"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Hamstrings left */}
      <path
        d="M24 42 Q36 38 48 42 L46 116 Q36 122 26 116Z"
        fill={m('hamstrings')}
        opacity="0.9"
      />
      {/* Hamstrings right */}
      <path
        d="M86 42 Q74 38 62 42 L64 116 Q74 122 84 116Z"
        fill={m('hamstrings')}
        opacity="0.9"
      />
      {/* Left knee */}
      <ellipse
        cx="36"
        cy="126"
        rx="14"
        ry="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right knee */}
      <ellipse
        cx="74"
        cy="126"
        rx="14"
        ry="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Left calf */}
      <rect
        x="24"
        y="134"
        width="24"
        height="80"
        rx="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Right calf */}
      <rect
        x="62"
        y="134"
        width="24"
        height="80"
        rx="10"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Calves muscle */}
      <path
        d="M26 136 Q36 132 46 136 L44 190 Q36 196 28 190Z"
        fill={m('calves')}
        opacity="0.9"
      />
      <path
        d="M84 136 Q74 132 64 136 L66 190 Q74 196 82 190Z"
        fill={m('calves')}
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Arms (close-up, both) ────────────────────────────────────────────────────

export function ArmsView({
  active = [],
  size = 120,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 120 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Arms muscle map"
    >
      {/* Shoulder caps */}
      <ellipse cx="22" cy="30" rx="18" ry="14" fill={m('shoulders')} opacity="0.85" />
      <ellipse cx="98" cy="30" rx="18" ry="14" fill={m('shoulders')} opacity="0.85" />
      {/* Upper left arm */}
      <rect
        x="8"
        y="40"
        width="26"
        height="70"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Upper right arm */}
      <rect
        x="86"
        y="40"
        width="26"
        height="70"
        rx="12"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Bicep left (front of upper arm) */}
      <path
        d="M10 44 Q22 40 32 44 L30 80 Q22 86 12 80Z"
        fill={m('biceps')}
        opacity="0.9"
      />
      {/* Bicep right */}
      <path
        d="M110 44 Q98 40 88 44 L90 80 Q98 86 108 80Z"
        fill={m('biceps')}
        opacity="0.9"
      />
      {/* Tricep left (back of upper arm — shown as lower band) */}
      <path
        d="M10 78 Q22 74 32 78 L32 108 Q22 112 10 108Z"
        fill={m('triceps')}
        opacity="0.85"
      />
      {/* Tricep right */}
      <path
        d="M110 78 Q98 74 88 78 L88 108 Q98 112 110 108Z"
        fill={m('triceps')}
        opacity="0.85"
      />
      {/* Forearm left */}
      <rect
        x="8"
        y="110"
        width="26"
        height="60"
        rx="10"
        fill={m('forearms')}
        opacity="0.85"
      />
      {/* Forearm right */}
      <rect
        x="86"
        y="110"
        width="26"
        height="60"
        rx="10"
        fill={m('forearms')}
        opacity="0.85"
      />
      {/* Wrists */}
      <rect
        x="10"
        y="168"
        width="22"
        height="16"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="88"
        y="168"
        width="22"
        height="16"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Full Body Front (overview) ───────────────────────────────────────────────

export function FullBodyFront({
  active = [],
  size = 80,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 80 260"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Full body front muscle map"
    >
      {/* Head */}
      <ellipse
        cx="40"
        cy="14"
        rx="12"
        ry="14"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Neck */}
      <rect x="34" y="26" width="12" height="10" rx="3" fill={SKIN} />
      {/* Torso */}
      <path
        d="M22 36 Q40 32 58 36 L60 100 Q40 106 20 100Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Shoulders */}
      <ellipse cx="16" cy="46" rx="9" ry="12" fill={m('shoulders')} opacity="0.9" />
      <ellipse cx="64" cy="46" rx="9" ry="12" fill={m('shoulders')} opacity="0.9" />
      {/* Chest */}
      <path
        d="M26 40 Q40 36 42 40 L40 60 Q32 64 26 58Z"
        fill={m('chest')}
        opacity="0.9"
      />
      <path
        d="M54 40 Q40 36 38 40 L40 60 Q48 64 54 58Z"
        fill={m('chest')}
        opacity="0.9"
      />
      {/* Abs */}
      <rect
        x="33"
        y="63"
        width="6"
        height="7"
        rx="1.5"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="41"
        y="63"
        width="6"
        height="7"
        rx="1.5"
        fill={m('upper_abs')}
        opacity="0.9"
      />
      <rect
        x="33"
        y="73"
        width="6"
        height="7"
        rx="1.5"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="41"
        y="73"
        width="6"
        height="7"
        rx="1.5"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="33"
        y="83"
        width="6"
        height="7"
        rx="1.5"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      <rect
        x="41"
        y="83"
        width="6"
        height="7"
        rx="1.5"
        fill={m('lower_abs')}
        opacity="0.9"
      />
      {/* Obliques */}
      <path
        d="M22 58 Q20 72 22 96 L26 94 Q26 74 26 60Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      <path
        d="M58 58 Q60 72 58 96 L54 94 Q54 74 54 60Z"
        fill={m('obliques')}
        opacity="0.85"
      />
      {/* Upper arms */}
      <rect
        x="6"
        y="56"
        width="10"
        height="30"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="64"
        y="56"
        width="10"
        height="30"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path d="M7 58 Q11 56 14 58 L14 72 Q11 76 7 72Z" fill={m('biceps')} opacity="0.9" />
      <path
        d="M73 58 Q69 56 66 58 L66 72 Q69 76 73 72Z"
        fill={m('biceps')}
        opacity="0.9"
      />
      {/* Forearms */}
      <rect
        x="4"
        y="86"
        width="12"
        height="22"
        rx="4"
        fill={m('forearms')}
        opacity="0.85"
      />
      <rect
        x="64"
        y="86"
        width="12"
        height="22"
        rx="4"
        fill={m('forearms')}
        opacity="0.85"
      />
      {/* Hips */}
      <rect
        x="22"
        y="100"
        width="36"
        height="20"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M24 102 Q40 98 56 102 L54 118 Q40 122 26 118Z"
        fill={m('hip_flexors')}
        opacity="0.8"
      />
      {/* Left thigh */}
      <rect
        x="22"
        y="118"
        width="16"
        height="64"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M23 120 Q30 117 37 120 L36 176 Q30 180 24 176Z"
        fill={m('quads')}
        opacity="0.9"
      />
      {/* Right thigh */}
      <rect
        x="42"
        y="118"
        width="16"
        height="64"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M57 120 Q50 117 43 120 L44 176 Q50 180 56 176Z"
        fill={m('quads')}
        opacity="0.9"
      />
      {/* Adductors */}
      <path
        d="M37 120 Q40 117 43 120 L42 172 Q40 176 38 172Z"
        fill={m('adductors')}
        opacity="0.8"
      />
      {/* Knees */}
      <ellipse
        cx="30"
        cy="184"
        rx="8"
        ry="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <ellipse
        cx="50"
        cy="184"
        rx="8"
        ry="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Shins/calves */}
      <rect
        x="22"
        y="190"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="42"
        y="190"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Full Body Back (overview) ────────────────────────────────────────────────

export function FullBodyBack({
  active = [],
  size = 80,
  mutedColor = defaults.mutedColor,
  highlightColor = defaults.highlightColor,
}: MuscleMapProps) {
  const m = (muscle: MuscleGroup) => c(muscle, active, highlightColor, mutedColor);
  return (
    <svg
      width={size}
      viewBox="0 0 80 260"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Full body back muscle map"
    >
      {/* Head */}
      <ellipse
        cx="40"
        cy="14"
        rx="12"
        ry="14"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Neck */}
      <rect x="34" y="26" width="12" height="10" rx="3" fill={SKIN} />
      {/* Torso */}
      <path
        d="M22 36 Q40 32 58 36 L60 100 Q40 106 20 100Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Traps */}
      <path
        d="M28 36 Q40 32 52 36 L50 52 Q40 48 30 52Z"
        fill={m('traps')}
        opacity="0.9"
      />
      {/* Rhomboids */}
      <path
        d="M30 52 Q40 48 50 52 L48 64 Q40 60 32 64Z"
        fill={m('rhomboids')}
        opacity="0.9"
      />
      {/* Shoulders */}
      <ellipse cx="16" cy="46" rx="9" ry="12" fill={m('shoulders')} opacity="0.85" />
      <ellipse cx="64" cy="46" rx="9" ry="12" fill={m('shoulders')} opacity="0.85" />
      {/* Lats */}
      <path d="M22 48 Q28 56 30 72 L26 82 Q18 68 20 52Z" fill={m('lats')} opacity="0.9" />
      <path d="M58 48 Q52 56 50 72 L54 82 Q62 68 60 52Z" fill={m('lats')} opacity="0.9" />
      {/* Lower back */}
      <path
        d="M30 72 Q40 68 50 72 L50 98 Q40 102 30 98Z"
        fill={m('lower_back')}
        opacity="0.9"
      />
      {/* Arms */}
      <rect
        x="6"
        y="56"
        width="10"
        height="52"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="64"
        y="56"
        width="10"
        height="52"
        rx="4"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="4"
        y="86"
        width="12"
        height="22"
        rx="4"
        fill={m('forearms')}
        opacity="0.85"
      />
      <rect
        x="64"
        y="86"
        width="12"
        height="22"
        rx="4"
        fill={m('forearms')}
        opacity="0.85"
      />
      {/* Glutes */}
      <rect
        x="22"
        y="100"
        width="36"
        height="22"
        rx="7"
        fill={m('glutes')}
        opacity="0.9"
      />
      {/* Left thigh */}
      <rect
        x="22"
        y="120"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M23 122 Q30 119 37 122 L36 176 Q30 180 24 176Z"
        fill={m('hamstrings')}
        opacity="0.9"
      />
      {/* Right thigh */}
      <rect
        x="42"
        y="120"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M57 122 Q50 119 43 122 L44 176 Q50 180 56 176Z"
        fill={m('hamstrings')}
        opacity="0.9"
      />
      {/* Knees */}
      <ellipse
        cx="30"
        cy="184"
        rx="8"
        ry="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <ellipse
        cx="50"
        cy="184"
        rx="8"
        ry="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Calves */}
      <rect
        x="22"
        y="190"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <rect
        x="42"
        y="190"
        width="16"
        height="62"
        rx="7"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <path
        d="M23 192 Q30 189 37 192 L36 232 Q30 238 24 232Z"
        fill={m('calves')}
        opacity="0.9"
      />
      <path
        d="M57 192 Q50 189 43 192 L44 232 Q50 238 56 232Z"
        fill={m('calves')}
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Convenience: all muscle groups list ──────────────────────────────────────

export const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'obliques',
  'upper_abs',
  'lower_abs',
  'traps',
  'lats',
  'rhomboids',
  'lower_back',
  'glutes',
  'quads',
  'hamstrings',
  'hip_flexors',
  'adductors',
  'calves',
];

/** Map each muscle to which views it appears in */
export const MUSCLE_VIEW_MAP: Record<MuscleGroup, string[]> = {
  chest: ['FrontTorso', 'FullBodyFront'],
  shoulders: ['FrontTorso', 'BackTorso', 'ArmsView', 'FullBodyFront', 'FullBodyBack'],
  biceps: ['FrontTorso', 'ArmsView', 'FullBodyFront'],
  triceps: ['ArmsView'],
  forearms: ['FrontTorso', 'ArmsView', 'FullBodyFront', 'FullBodyBack'],
  obliques: ['FrontTorso', 'AbsView', 'FullBodyFront'],
  upper_abs: ['AbsView', 'FullBodyFront'],
  lower_abs: ['AbsView', 'FullBodyFront'],
  traps: ['BackTorso', 'FullBodyBack'],
  lats: ['BackTorso', 'FullBodyBack'],
  rhomboids: ['BackTorso', 'FullBodyBack'],
  lower_back: ['BackTorso', 'FullBodyBack'],
  glutes: ['BackLegs', 'FullBodyBack'],
  quads: ['FrontLegs', 'FullBodyFront'],
  hamstrings: ['BackLegs', 'FullBodyBack'],
  hip_flexors: ['FrontLegs', 'AbsView', 'FullBodyFront'],
  adductors: ['FrontLegs', 'FullBodyFront'],
  calves: ['BackLegs', 'FullBodyBack'],
};

export default {
  FrontTorso,
  BackTorso,
  AbsView,
  FrontLegs,
  BackLegs,
  ArmsView,
  FullBodyFront,
  FullBodyBack,
};
