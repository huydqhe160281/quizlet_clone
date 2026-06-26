export type GuideAction =
  | { type: 'navigate'; path: string }
  | { type: 'highlight'; targetId: string; durationMs?: number }
  | { type: 'openModal'; modalId: string }
  | { type: 'execute'; actionId: string; params?: Record<string, string> };

export type GuideActionHandler = {
  navigate: (path: string) => void;
  highlight: (targetId: string) => void;
  openModal: (modalId: string) => void;
  execute: (actionId: string, params?: Record<string, string>) => void;
};

export const noopGuideActions: GuideActionHandler = {
  navigate: () => undefined,
  highlight: () => undefined,
  openModal: () => undefined,
  execute: () => undefined,
};
