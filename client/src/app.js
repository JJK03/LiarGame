
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// 서버 주소 (포트는 서버와 맞춰주세요)
const socket = io('http://localhost:3001');

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
		<div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
			<h2>실시간 채팅 예제</h2>
			<div style={{ minHeight: 200, border: '1px solid #eee', marginBottom: 10, padding: 10, background: '#fafafa' }}>
				{messages.map((msg, idx) => (
					<div key={idx}>{msg}</div>
				))}
			</div>
			<form onSubmit={sendMessage} style={{ display: 'flex' }}>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					style={{ flex: 1, marginRight: 8 }}
					placeholder="메시지 입력..."
				/>
				<button type="submit">전송</button>
			</form>
		</div>
	);
}

export default App;
