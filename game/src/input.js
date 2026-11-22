// Keyboard and mouse input: WASD or arrows to move, Shift to sneak, 1/2/3 to spend
// tools, a click to toss a coin at that spot, Enter or a click to confirm, P to
// pause, R to retry after being caught. One action is reported once per press.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RETRY = 4;

export function createInput(canvas, toField) {
  const keys = new Set();
  let actions = 0;
  let tool = null;
  let toolX = 0;
  let toolY = 0;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === 'enter' || key === ' ') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'r') actions |= ACTION_RETRY;
    if (key === '1') {
      tool = 'coin';
      toolX = 0;
      toolY = 0;
    }
    if (key === '2') tool = 'smoke';
    if (key === '3') tool = 'jammer';
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (event) => {
    const point = toField(event.clientX, event.clientY);
    tool = 'coin';
    toolX = point.x;
    toolY = point.y;
    actions |= ACTION_CONFIRM;
  });

  function axis(negative, positive) {
    return (keys.has(positive) ? 1 : 0) - (keys.has(negative) ? 1 : 0);
  }

  return {
    // -1..1 movement for this frame, plus the tool spent (once) and its target.
    read() {
      const moveX = axis('a', 'd') + axis('arrowleft', 'arrowright');
      const moveY = axis('w', 's') + axis('arrowup', 'arrowdown');
      const spent = tool;
      const spentX = toolX;
      const spentY = toolY;
      tool = null;
      return {
        moveX,
        moveY,
        sneak: keys.has('shift'),
        tool: spent,
        toolX: spentX,
        toolY: spentY,
      };
    },
    takeActions() {
      const value = actions;
      actions = 0;
      return value;
    },
  };
}
