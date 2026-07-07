const CARD_BACKGROUND = '#081A2D';
const CARD_BORDER = 'rgba(173, 198, 255, 0.28)';
const GRID_DOT = 'rgba(148, 163, 184, 0.18)';
const GRID_LINE = 'rgba(59, 130, 246, 0.08)';

export function useStartupScreenStyles(insets: { top: number; bottom: number }) {
  return {
    root: 'bg-[#111318] flex-1',
    gridBackground:
      'absolute inset-0 justify-between py-[10px]',
    gridRow: 'flex-row justify-between px-1',
    gridDot: {
      className: 'rounded-full h-[2px] w-[2px]',
      style: { backgroundColor: GRID_DOT },
    },
    shell: {
      className: 'items-center flex-1 px-4',
      style: {
        paddingBottom: Math.max(insets.bottom, 16),
        paddingTop: Math.max(insets.top, 16),
      },
    },
    topDivider: {
      className: 'h-px w-[88%] mt-8',
      style: { backgroundColor: GRID_LINE },
    },
    card: {
      className: 'items-center flex-1 mt-4 max-w-[360px] overflow-hidden w-full',
      style: {
        backgroundColor: CARD_BACKGROUND,
        borderColor: CARD_BORDER,
        borderRadius: 12,
        borderWidth: 1,
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 32,
        shadowColor: '#020B14',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 22,
      },
    },
    cardTopDivider: {
      className: 'h-px absolute left-0 right-0',
      style: { backgroundColor: 'rgba(17, 37, 58, 0.75)', top: 162 },
    },
    brandCore: 'items-center justify-center mt-[128px]',
    brandHaloOuter: {
      className: 'items-center justify-center relative rounded-full h-[74px] w-[74px]',
      style: {
        backgroundColor: 'rgba(7, 28, 44, 0.82)',
        borderColor: 'rgba(34, 197, 94, 0.18)',
        borderWidth: 1,
      },
    },
    brandHaloInner: {
      className: 'items-center justify-center rounded-full h-[58px] w-[58px]',
      style: {
        borderColor: 'rgba(59, 130, 246, 0.16)',
        borderWidth: 1,
      },
    },
    brandBadge: {
      className: 'items-center justify-center rounded-full h-[38px] w-[38px]',
      style: {
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        borderColor: 'rgba(173, 198, 255, 0.12)',
        borderWidth: 1,
      },
    },
    brandMiniBadge: {
      className: 'items-center justify-center rounded-full h-4 w-4 absolute -bottom-0.5 -right-0.5',
      style: {
        backgroundColor: '#123252',
        borderColor: 'rgba(173, 198, 255, 0.24)',
        borderWidth: 1,
      },
    },
    brandName:
      'text-[25px] font-extrabold tracking-[0.5px] mt-6 text-center text-primary-soft',
    brandSubhead:
      'text-[10px] font-bold tracking-[2.1px] mt-1 text-center',
    brandSubheadStyle: { color: '#D8E2EF' },
    statusBlock: 'mt-[36px] w-full',
    statusRow: 'flex-row items-center gap-2 px-6',
    statusDot: {
      className: 'rounded-full h-[6px] w-[6px]',
      style: {
        backgroundColor: '#22C55E',
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.65,
        shadowRadius: 6,
      },
    },
    statusText: 'flex-1 text-[10px] leading-[14px] text-typography-muted',
    progressTrack: {
      className: 'rounded-full h-px mt-4 overflow-hidden w-full',
      style: { backgroundColor: 'rgba(173, 198, 255, 0.14)' },
    },
    progressFill: {
      className: 'rounded-full h-px',
      style: {
        backgroundColor: '#22C55E',
        width: 96,
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
    },
    errorBlock: 'items-center mt-6 w-full',
    errorText: 'text-xs leading-[18px] text-warning text-center',
    retryButton: {
      className: 'items-center justify-center mt-4 min-h-[40px] min-w-[140px] px-4 rounded-full',
      style: {
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
      },
    },
    retryButtonPressed: 'opacity-[0.72]',
    retryText: 'text-[12px] font-bold text-primary-soft',
    cardFooterSpacer: 'flex-1',
    versionText: 'text-[9px] font-semibold tracking-[0.6px] mt-4',
    versionTextStyle: { color: 'rgba(148, 163, 184, 0.62)' },
  };
}
