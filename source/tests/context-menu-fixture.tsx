import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ContextMenu } from '../src/components/menu/ContextMenu';
import { CanvasContextMenu } from '../src/components/menu/CanvasContextMenu';

function Fixture() {
  const [open, setOpen] = useState<'node' | 'canvas' | null>(null);
  const [count, setCount] = useState(0);
  const close = () => setOpen(null);
  const action = () => setCount(value => value + 1);
  const position = { x: window.innerWidth - 5, y: window.innerHeight - 5 };
  return <><button id="node-launcher" onClick={() => setOpen('node')}>Node menu</button>
    <button id="canvas-launcher" onClick={() => setOpen('canvas')}>Canvas menu</button>
    <output id="action-count">{count}</output>
    {open === 'node' && <ContextMenu {...position} node={{ id: 'root', text: 'Test', children: [] }}
      onClose={close} onAddChild={action} onAddSibling={action} onDelete={action}
      onToggleCollapse={action} onStartEdit={action} />}
    {open === 'canvas' && <CanvasContextMenu {...position} onClose={close} onCenterCanvas={action}
      onResetZoom={action} canvasBackground="dots" onChangeCanvasBackground={action} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
