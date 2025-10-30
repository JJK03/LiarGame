import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Game from './Game.jsx'

function Root() {
  const [view, setView] = useState('app')
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setView('app')} style={{ marginRight: 8 }}>App (채팅)</button>
        <button onClick={() => setView('game')}>Game (라이어)</button>
      </div>
      {view === 'app' ? <App /> : <Game />}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
