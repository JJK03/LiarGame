import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

// 서버 주소
export const socket = io('http://localhost:3001');

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // 서버에서 'chat' 이벤트를 받으면 메시지 추가
    socket.on('chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 컴포넌트 언마운트 시 이벤트 해제
    return () => {
      socket.off('chat');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() !== '') {
      socket.emit('chat', input);
      setInput('');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h2>실시간 채팅</h2>
        <div className="small">서버: http://localhost:3001</div>
      </div>

      <div className="panel">
        <div className="left">
          <div className="chatWindow">
            {messages.map((msg, idx) => (
              <div key={idx} className="message">{msg}</div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="formRow">
            <input
              className="textInput"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지 입력..."
            />
            <button className="primaryBtn" type="submit">전송</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
