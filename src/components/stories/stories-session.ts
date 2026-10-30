/* Session-only (sessionStorage) keys shared by the Stories views. */

/** Index (in consoleMedia) of the story last chosen; the 3D console loads it when it opens. */
export const STORY_KEY = "jazzhq-stories-episode";
/** "gallery" | "3d": the view the visitor deliberately switched to this session. */
export const VIEW_KEY = "stories-view";
/** Set once the first-visit hint about Gallery has been shown. */
export const TIP_KEY = "stories-view-tip";

export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice just isn't remembered.
  }
}
