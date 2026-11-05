/** Keep native collapse preferences; open this section on explicit navigation. */
(function (global: any) {
  function connect(document: any, body: any, isAlive: () => boolean) {
    const section = body?.closest?.('collapsible-section') || body?.parentElement;
    if (!section?.removeAttribute) return () => {};
    const pane = section.getAttribute?.('data-pane');
    section.removeAttribute('empty');
    const onNavigate = (event: any) => {
      if (!isAlive() || event.button !== 0 || !pane) return;
      const button = event.target?.closest?.('item-pane-sidenav .btn[data-pane]');
      if (button?.getAttribute('data-pane') !== pane) return;
      section.removeAttribute('empty');
      // The native sidenav scrolls to a section without expanding it. Use its
      // native setter so explicit navigation also saves the user's open state.
      (section.wrappedJSObject || section).open = true;
    };
    document.addEventListener('click', onNavigate, true);
    return () => document.removeEventListener('click', onNavigate, true);
  }
  global.MindFlowItemPaneVisibility = { connect };
})(typeof globalThis !== 'undefined' ? globalThis : this);
