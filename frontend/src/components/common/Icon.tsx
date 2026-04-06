/**
 * src/components/common/Icon.tsx
 *
 * 피그마 SVG 아이콘 컴포넌트 — assets/icons/ 폴더의 파일 기반
 * 사용법:  <Icon name="search" size={24} color={C.textSub} />
 *          <Icon name="home" active />
 */

import React from "react";
import Svg, {
  Path,
  Circle,
  Rect,
  G,
} from "react-native-svg";

export type IconName =
  | "home"
  | "chat"
  | "todo"
  | "more"
  | "add"
  | "alarm"
  | "search"
  | "send"
  | "mic"
  | "camera"
  | "back"
  | "chevron"
  | "menu"
  | "filter"
  | "sort"
  | "sorting"
  | "pause"
  | "resume"
  | "stop"
  | "folder"
  | "file"
  | "checkbox"
  | "profile"
  | "option"
  | "close"
  | "photo"
  | "bell"
  | "star"
  | "settings"
  | "link"
  | "calendar"
  | "board"
  | "announcement"
  | "vote"
  | "phone"
  | "robot"
  | "pin";

interface IconProps {
  name: IconName;
  active?: boolean;
  size?: number;
  color?: string;
}

const ACTIVE_COLOR = "#00A9EC";
const DEFAULT_COLOR = "#333333";

export default function Icon({
  name,
  active = false,
  size = 24,
  color,
}: IconProps) {
  const c = color ?? (active ? ACTIVE_COLOR : DEFAULT_COLOR);

  switch (name) {
    // ── Close.svg ──────────────────────────────────────────
    case "close":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M18 6L6 18" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 6L18 18" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    // ── Home=Active.svg / Home=Default.svg (32x32) ──────────
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          {active ? (
            <Path
              d="M17.9997 21.333V28H13.9997V21.333H17.9997ZM15.9997 6.60156C17.4794 6.60156 18.7223 7.66639 21.2067 9.7959L22.5397 10.9385C23.9142 12.1166 24.6015 12.7063 24.9675 13.502C25.3333 14.2975 25.3337 15.2026 25.3337 17.0127V22.667C25.3337 25.1807 25.3333 26.4377 24.5524 27.2188C23.8437 27.9275 22.7429 27.992 20.6667 27.998V21.333C20.6665 19.8604 19.4723 18.667 17.9997 18.667H13.9997C12.5272 18.6672 11.3339 19.8605 11.3337 21.333V27.998C9.25731 27.992 8.1567 27.9275 7.44794 27.2188C6.66693 26.4377 6.66669 25.1809 6.66669 22.667V17.0127C6.66669 15.2025 6.66705 14.2975 7.0329 13.502C7.39885 12.7063 8.08612 12.1166 9.46063 10.9385L10.7936 9.7959C13.2779 7.66655 14.5201 6.60172 15.9997 6.60156Z"
              fill={c}
            />
          ) : (
            <Path
              d="M17.9997 21.333H18.4997V20.833H17.9997V21.333ZM17.9997 28V28.5H18.4997V28H17.9997ZM13.9997 28H13.4997V28.5H13.9997V28ZM13.9997 21.333V20.833H13.4997V21.333H13.9997ZM17.9997 21.333H17.4997V28H17.9997H18.4997V21.333H17.9997ZM17.9997 28V27.5H13.9997V28V28.5H17.9997V28ZM13.9997 28H14.4997V21.333H13.9997H13.4997V28H13.9997ZM13.9997 21.333V21.833H17.9997V21.333V20.833H13.9997V21.333Z"
              fill={c}
            />
          )}
        </Svg>
      );

    // ── Chat Value=Active/Default, Status=Default.svg (32x32) ─
    case "chat":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path
            d="M17.3333 5.33337C21.0783 5.33337 22.951 5.33317 24.2962 6.23181C24.8785 6.6209 25.3788 7.12118 25.7679 7.70349C26.6667 9.04864 26.6663 10.9214 26.6663 14.6664C26.6663 18.4113 26.6665 20.2841 25.7679 21.6293C25.3788 22.2116 24.8785 22.7118 24.2962 23.101C22.951 23.9998 21.0785 24.0004 17.3333 24.0004H14.6663C13.8896 24.0004 13.1934 23.9976 12.5657 23.9896L12.4681 24.2377L10.013 26.4379C9.19475 27.1706 7.89102 26.6551 7.79523 25.5609L7.57257 23.0092C7.0464 22.6343 6.59118 22.1672 6.23175 21.6293C5.33326 20.2841 5.33331 18.4111 5.33331 14.6664C5.33331 10.9214 5.33299 9.04864 6.23175 7.70349C6.62086 7.12114 7.12108 6.62092 7.70343 6.23181C9.04858 5.33305 10.9214 5.33337 14.6663 5.33337H17.3333Z"
            fill={c}
          />
        </Svg>
      );

    // ── ToDo=Active.svg / ToDo=Default.svg (32x32) ──────────
    case "todo":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          {active ? (
            <Path
              d="M16 4C19.2133 4 22.1292 5.2656 24.2832 7.32227L14.4912 18.2021L10.1338 14.9336C9.54469 14.4918 8.70843 14.6111 8.2666 15.2002C7.82494 15.7893 7.94425 16.6256 8.5332 17.0674L12.8916 20.335C13.996 21.1629 15.5501 21.0122 16.4736 19.9863L26.0117 9.38672C27.2669 11.2831 28 13.5555 28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4Z"
              fill={c}
            />
          ) : (
            <Path
              d="M24.2832 7.32227L24.6548 7.65675L24.9796 7.2959L24.6285 6.96064L24.2832 7.32227ZM14.4912 18.2021L14.1912 18.6021L14.557 18.8765L14.8629 18.5366L14.4912 18.2021ZM10.1338 14.9336L10.4338 14.5336L10.4338 14.5336L10.1338 14.9336ZM8.2666 15.2002L7.8666 14.9002L7.86656 14.9003L8.2666 15.2002ZM8.5332 17.0674L8.23316 17.4674L8.23327 17.4674L8.5332 17.0674ZM12.8916 20.335L13.1915 19.9349L13.1915 19.9349L12.8916 20.335ZM16.4736 19.9863L16.8452 20.3209L16.8453 20.3208L16.4736 19.9863ZM26.0117 9.38672L26.4287 9.11075L26.0721 8.57209L25.64 9.05227L26.0117 9.38672ZM16 4V4.5C19.0793 4.5 21.8729 5.7122 23.9379 7.6839L24.2832 7.32227L24.6285 6.96064C22.3855 4.81899 19.3474 3.5 16 3.5V4ZM24.2832 7.32227L23.9116 6.98778L14.1196 17.8677L14.4912 18.2021L14.8629 18.5366L24.6548 7.65675L24.2832 7.32227ZM14.4912 18.2021L14.7912 17.8022L10.4338 14.5336L10.1338 14.9336L9.83376 15.3336L14.1912 18.6021L14.4912 18.2021ZM10.1338 14.9336L10.4338 14.5336C9.62385 13.9261 8.47417 14.0901 7.8666 14.9002L8.2666 15.2002L8.6666 15.5002C8.94269 15.1321 9.46552 15.0574 9.83379 15.3336L10.1338 14.9336ZM8.2666 15.2002L7.86656 14.9003C7.25935 15.7101 7.42325 16.8598 8.23316 17.4674L8.5332 17.0674L8.83324 16.6674C8.46525 16.3914 8.39053 15.8684 8.66664 15.5001L8.2666 15.2002ZM8.5332 17.0674L8.23327 17.4674L12.5917 20.735L12.8916 20.335L13.1915 19.9349L8.83313 16.6673L8.5332 17.0674ZM12.8916 20.335L12.5917 20.735C13.9029 21.7181 15.7484 21.5393 16.8452 20.3209L16.4736 19.9863L16.102 19.6518C15.3519 20.4851 14.0891 20.6078 13.1915 19.9349L12.8916 20.335ZM16.4736 19.9863L16.8453 20.3208L26.3834 9.72117L26.0117 9.38672L25.64 9.05227L16.102 19.6519L16.4736 19.9863ZM26.0117 9.38672L25.5948 9.66269C26.7977 11.4801 27.5 13.657 27.5 16H28H28.5C28.5 13.454 27.7362 11.0862 26.4287 9.11075L26.0117 9.38672ZM28 16H27.5C27.5 22.3513 22.3513 27.5 16 27.5V28V28.5C22.9036 28.5 28.5 22.9036 28.5 16H28ZM16 28V27.5C9.64873 27.5 4.5 22.3513 4.5 16H4H3.5C3.5 22.9036 9.09644 28.5 16 28.5V28ZM4 16H4.5C4.5 9.64873 9.64873 4.5 16 4.5V4V3.5C9.09644 3.5 3.5 9.09644 3.5 16H4Z"
              fill={c}
            />
          )}
        </Svg>
      );

    // ── More=Active.svg / More=Default.svg (32x32) ──────────
    case "more":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Circle
            cx="16" cy="16" r="1.33333"
            fill={active ? c : "none"}
            stroke={c}
            strokeWidth={active ? 2 : 1.33333}
            strokeLinecap="round"
          />
          <Circle
            cx="8.00002" cy="16" r="1.33333"
            fill={active ? c : "none"}
            stroke={c}
            strokeWidth={active ? 2 : 1.33333}
            strokeLinecap="round"
          />
          <Circle
            cx="24" cy="16" r="1.33333"
            fill={active ? c : "none"}
            stroke={c}
            strokeWidth={active ? 2 : 1.33333}
            strokeLinecap="round"
          />
        </Svg>
      );

    // ── Add.svg (24x24) ─────────────────────────────────────
    case "add":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 6L12 18" stroke={c} strokeWidth="2" strokeLinecap="square" strokeLinejoin="round" />
          <Path d="M18 12L6 12" stroke={c} strokeWidth="2" strokeLinecap="square" strokeLinejoin="round" />
        </Svg>
      );

    // ── Search.svg (24x24) ──────────────────────────────────
    case "search":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2" />
          <Path d="M20 20L16.25 16.25" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    // ── Send.svg (24x24) ────────────────────────────────────
    case "send":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M17.8205 9.94444C19.3816 10.725 20.1621 11.1156 20.1621 11.7336C20.1619 12.3515 19.3814 12.7423 17.8205 13.5228L9.7944 17.5355C7.57595 18.6447 6.46612 19.1995 5.95641 18.69C5.44676 18.1804 6.00167 17.0707 7.11098 14.8521L8.17095 12.7328L14.3271 12.7335C14.8793 12.7335 15.3268 12.2858 15.327 11.7336C15.327 11.1813 14.8793 10.7337 14.3271 10.7337H8.17026L7.11098 8.61516C6.00175 6.39668 5.44694 5.28687 5.95641 4.77717C6.46607 4.26752 7.57577 4.82243 9.7944 5.93174L17.8205 9.94444Z"
            fill={c}
          />
        </Svg>
      );

    // ── Mic.svg (24x24) ─────────────────────────────────────
    case "mic":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="9" y="3" width="6" height="11" rx="3" stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <Path d="M5 11C5 12.8565 5.7375 14.637 7.05025 15.9497C8.36301 17.2625 10.1435 18 12 18C13.8565 18 15.637 17.2625 16.9497 15.9497C18.2625 14.637 19 12.8565 19 11" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 21V19" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    // ── Camera.svg (24x24) ──────────────────────────────────
    case "camera":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9.8541C3 8.83011 3.83011 8 4.8541 8C5.55638 8 6.19839 7.60322 6.51246 6.97508L7.33333 5.33333C7.44329 5.11342 7.49827 5.00346 7.56062 4.90782C7.8859 4.40882 8.41668 4.08078 9.00848 4.01299C9.1219 4 9.24484 4 9.49071 4H14.5093C14.7552 4 14.8781 4 14.9915 4.01299C15.5833 4.08078 16.1141 4.40882 16.4394 4.90782C16.5017 5.00346 16.5567 5.11342 16.6667 5.33333L17.4875 6.97508C17.8016 7.60322 18.4436 8 19.1459 8C20.1699 8 21 8.83011 21 9.8541V14.8571C21 16.8619 21 17.8643 20.5402 18.5961C20.3004 18.9777 19.9777 19.3004 19.5961 19.5402C18.8643 20 17.8619 20 15.8571 20H8.14286C6.1381 20 5.13571 20 4.4039 19.5402C4.02229 19.3004 3.69961 18.9777 3.45983 18.5961C3 17.8643 3 16.8619 3 14.8571V9.8541Z"
            stroke={c} strokeWidth="2"
          />
          <Circle cx="12" cy="13" r="3" stroke={c} strokeWidth="2" />
        </Svg>
      );

    case "photo":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="8.5" cy="8.5" r="1.5" fill={c} />
          <Path d="M21 15L16 10L5 21" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    // ── Back.svg (24x24) ────────────────────────────────────
    case "back":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 12L3.29289 11.2929L2.58579 12L3.29289 12.7071L4 12ZM19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11V12V13ZM10 6L9.29289 5.29289L3.29289 11.2929L4 12L4.70711 12.7071L10.7071 6.70711L10 6ZM4 12L3.29289 12.7071L9.29289 18.7071L10 18L10.7071 17.2929L4.70711 11.2929L4 12ZM4 12V13H19V12V11H4V12Z"
            fill={c}
          />
        </Svg>
      );

    // ── Chevron.svg (24x24) ─────────────────────────────────
    // 기본은 오른쪽 방향 (>)
    case "chevron":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6L15 12L9 18" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    // ── Menu.svg (24x24) ────────────────────────────────────
    case "menu":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 7H19" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <Path d="M5 12H19" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <Path d="M5 17H19" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    // ── Filter.svg (24x24) ──────────────────────────────────
    // 피그마 Filter.svg 기반 funnel 모양
    case "filter":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 5H20L14 12.5V19L10 17V12.5L4 5Z"
            stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </Svg>
      );

    // ── Sort.svg (24x24) — 3줄 내림차순 ────────────────────
    case "sort":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 7H19" stroke={c} strokeLinecap="round" />
          <Path d="M5 12H15" stroke={c} strokeLinecap="round" />
          <Path d="M5 17H11" stroke={c} strokeLinecap="round" />
        </Svg>
      );

    // ── Sorting Value=Ascending.svg (24x24) — 위 방향 화살표
    case "sorting":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4L6 10M12 4L18 10M12 4L12 19"
            stroke={c} strokeLinecap="round" strokeLinejoin="round"
          />
        </Svg>
      );

    // ── Alarm Status=Default.svg (24x24) ────────────────────
    case "alarm":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6.44784 7.96942C6.76219 5.14032 9.15349 3 12 3C14.8465 3 17.2378 5.14032 17.5522 7.96942L17.804 10.2356C17.8072 10.2645 17.8088 10.279 17.8104 10.2933C17.9394 11.4169 18.3051 12.5005 18.8836 13.4725C18.8909 13.4849 18.8984 13.4973 18.9133 13.5222L19.4914 14.4856C20.0159 15.3599 20.2782 15.797 20.2216 16.1559C20.1839 16.3946 20.061 16.6117 19.8757 16.7668C19.5971 17 19.0873 17 18.0678 17H5.93223C4.91268 17 4.40291 17 4.12434 16.7668C3.93897 16.6117 3.81609 16.3946 3.77841 16.1559C3.72179 15.797 3.98407 15.3599 4.50862 14.4856L5.08665 13.5222C5.10161 13.4973 5.10909 13.4849 5.11644 13.4725C5.69488 12.5005 6.06064 11.4169 6.18959 10.2933C6.19123 10.279 6.19283 10.2645 6.19604 10.2356L6.44784 7.96942Z"
            stroke={c} strokeWidth="2"
          />
          <Path
            d="M8 17C8 17.5253 8.10346 18.0454 8.30448 18.5307C8.5055 19.016 8.80014 19.457 9.17157 19.8284C9.54301 20.1999 9.98396 20.4945 10.4693 20.6955C10.9546 20.8965 11.4747 21 12 21C12.5253 21 13.0454 20.8965 13.5307 20.6955C14.016 20.4945 14.457 20.1999 14.8284 19.8284C15.1999 19.457 15.4945 19.016 15.6955 18.5307C15.8965 18.0454 16 17.5253 16 17"
            stroke={c} strokeWidth="2" strokeLinecap="round"
          />
        </Svg>
      );

    // ── Pause.svg (24x24) ───────────────────────────────────
    case "pause":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="6" y="5" width="4" height="14" rx="1" fill={c} />
          <Rect x="14" y="5" width="4" height="14" rx="1" fill={c} />
        </Svg>
      );

    // ── Resume.svg (24x24) ──────────────────────────────────
    case "resume":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M16.1378 10.5689L9.60498 7.30246C8.40816 6.70405 7 7.57434 7 8.91243V15.0875C7 16.4256 8.40816 17.2959 9.60498 16.6975L16.1378 13.4311C17.3171 12.8414 17.3171 11.1585 16.1378 10.5689Z"
            fill={c}
          />
        </Svg>
      );

    // ── Stop.svg (24x24) ────────────────────────────────────
    case "stop":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="5.35" y="5.35" width="13.3" height="13.3" rx="2.45" fill={c} stroke={c} strokeWidth="0.7" />
        </Svg>
      );

    // ── Folder.svg (24x24) ──────────────────────────────────
    case "folder":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 9C4 7.11438 4 6.17157 4.58579 5.58579C5.17157 5 6.11438 5 8 5H8.34315C9.16065 5 9.5694 5 9.93694 5.15224C10.3045 5.30448 10.5935 5.59351 11.1716 6.17157L11.8284 6.82843C12.4065 7.40649 12.6955 7.69552 13.0631 7.84776C13.4306 8 13.8394 8 14.6569 8H16C17.8856 8 18.8284 8 19.4142 8.58579C20 9.17157 20 10.1144 20 12V15C20 16.8856 20 17.8284 19.4142 18.4142C18.8284 19 17.8856 19 16 19H8C6.11438 19 5.17157 19 4.58579 18.4142C4 17.8284 4 16.8856 4 15V9Z"
            stroke={c} strokeWidth="2"
          />
        </Svg>
      );

    // ── File_dock.svg (24x24) ───────────────────────────────
    case "file":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M13.1716 3H9C7.11438 3 6.17157 3 5.58579 3.58579C5 4.17157 5 5.11438 5 7V17C5 18.8856 5 19.8284 5.58579 20.4142C6.17157 21 7.11438 21 9 21H15C16.8856 21 17.8284 21 18.4142 20.4142C19 19.8284 19 18.8856 19 17V8.82843C19 8.41968 19 8.2153 18.9239 8.03153C18.8478 7.84776 18.7032 7.70324 18.4142 7.41421L14.5858 3.58579C14.2968 3.29676 14.1522 3.15224 13.9685 3.07612C13.7847 3 13.5803 3 13.1716 3Z"
            stroke={c} strokeWidth="2"
          />
          <Path d="M9 13L15 13" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <Path d="M9 17L13 17" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <Path d="M13 3V7C13 7.94281 13 8.41421 13.2929 8.70711C13.5858 9 14.0572 9 15 9H19" stroke={c} strokeWidth="2" />
        </Svg>
      );

    // ── Checkbox Value=Default/Active.svg (24x24) ───────────
    case "checkbox":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {active ? (
            <G>
              <Circle cx="12" cy="12" r="9" fill="#27AE60" />
              <Path d="M8 12L11 15L16 9" stroke="white" strokeWidth="1.2" />
            </G>
          ) : (
            <Circle cx="12" cy="12" r="8.4" stroke={c} strokeWidth="1.2" />
          )}
        </Svg>
      );

    // ── Profile Value=Active/Default, Status=Default.svg (32x32) ─
    case "profile":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Circle cx="16" cy="10.6667" r="5.33333" stroke={c} strokeWidth="2" />
          <Path d="M6.66669 26.6667C6.66669 22.3484 10.6652 18.6667 16 18.6667C21.3348 18.6667 25.3334 22.3484 25.3334 26.6667" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    // ── Option.svg (settings/gear, 24x24) ───────────────────
    case "option":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" />
          <Path
            d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74485 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66515 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95231 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87231 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74485 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83445 4.66515 4.21 4.29C4.58515 3.91445 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66485 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95231 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87231 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58515 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66485 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z"
            stroke={c} strokeWidth="1.8"
          />
        </Svg>
      );

    case "bell":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8V11C6 11.2384 5.92318 11.4116 5.8 11.6L4.2 14.1C3.86667 14.6 4.22667 15.6 4.8 15.6H19.2C19.7733 15.6 20.1333 14.6 19.8 14.1L18.2 11.6C18.0768 11.4116 18 11.2384 18 11V8Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M10 19C10 20.1046 10.8954 21 12 21C13.1046 21 14 20.1046 14 19" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "star":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "settings":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" />
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "link":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "calendar":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 2v4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M8 2v4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M3 10h18" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "board":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 12h6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 16h6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "announcement":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 19l7-7 3 3-7 7-3-3z" fill={c} />
          <Path d="M10 21L3 14l3-3 7 7-3 3z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 19L5 12 16 2l7 7-11 10z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "vote":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 11l3 3L22 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "phone":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "robot":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="11" width="18" height="10" rx="2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 8V11" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="5" r="2" stroke={c} strokeWidth="2" />
          <Path d="M8 15h.01" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 15h.01" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case "pin":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2L12 9M12 9L15 9C17 9 17 11 15 11L12 11M12 9L9 9C7 9 7 11 9 11L12 11M12 11V22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    default:
      return null;
  }
}
