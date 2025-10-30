import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function Game() {
	// 상태 정의
	const [step, setStep] = useState('nickname'); // nickname, lobby, game, result
	const [nickname, setNickname] = useState('');
	const [room, setRoom] = useState('');
	const [inputRoom, setInputRoom] = useState('');
	const [word, setWord] = useState('');
	const [role, setRole] = useState('');
	const [chat, setChat] = useState('');
	const [messages, setMessages] = useState([]);
	const [players, setPlayers] = useState([]);
	const [voteTarget, setVoteTarget] = useState('');
	const [voteResult, setVoteResult] = useState('');

	// 소켓 이벤트 등록
	useEffect(() => {
		socket.on('chat', (msg) => {
			setMessages((prev) => [...prev, msg]);
		});
		socket.on('roomInfo', (info) => {
			setPlayers(info.players);
			setRoom(info.id);
			setStep('lobby');
		});
		socket.on('gameStart', ({ word, role }) => {
			setWord(word);
			setRole(role);
			setStep('game');
		});
		socket.on('voteResult', (result) => {
			setVoteResult(result);
			setStep('result');
		});
		return () => {
			socket.off('chat');
			socket.off('roomInfo');
			socket.off('gameStart');
			socket.off('voteResult');
		};
	}, []);

	// 닉네임 입력 후 입장
	const handleEnter = () => {
		if (nickname.trim()) {
			socket.emit('join', nickname);
			setStep('lobby');
		}
	};

	// 방 생성
	const handleCreateRoom = () => {
		socket.emit('createRoom', nickname + '의 방');
	};

	// 방 입장
	const handleJoinRoom = () => {
		if (inputRoom.trim()) {
			socket.emit('joinRoom', Number(inputRoom));
		}
	};

	// 채팅 전송
	const handleSendChat = (e) => {
		e.preventDefault();
		if (chat.trim()) {
			socket.emit('chat', nickname + ': ' + chat);
			setChat('');
		}
	};

	// 게임 시작
	const handleStartGame = () => {
		socket.emit('startGame', room);
	};

	// 투표
	const handleVote = () => {
		if (voteTarget) {
			socket.emit('vote', { room, target: voteTarget });
		}
	};

	// 화면 렌더링
	if (step === 'nickname') {
		return (
			<div style={{ maxWidth: 400, margin: '40px auto', padding: 20 }}>
				<h2>닉네임 입력</h2>
				<input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임" style={{ width: '100%', marginBottom: 10 }} />
				<button onClick={handleEnter} style={{ width: '100%' }}>입장</button>
			</div>
		);
	}

	if (step === 'lobby') {
		return (
			<div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
				<h2>방 로비</h2>
				<div>내 닉네임: <b>{nickname}</b></div>
				<div style={{ margin: '10px 0' }}>
					<button onClick={handleCreateRoom}>방 만들기</button>
					<input value={inputRoom} onChange={e => setInputRoom(e.target.value)} placeholder="방 번호" style={{ marginLeft: 10, width: 80 }} />
					<button onClick={handleJoinRoom}>방 입장</button>
				</div>
				<div>참가자 목록: {players.map(p => p.username).join(', ')}</div>
				<button onClick={handleStartGame} style={{ marginTop: 10 }}>게임 시작</button>
				<div style={{ marginTop: 20 }}>
					<h4>채팅</h4>
					<div style={{ minHeight: 100, border: '1px solid #eee', marginBottom: 10, padding: 10, background: '#fafafa' }}>
						{messages.map((msg, idx) => <div key={idx}>{msg}</div>)}
					</div>
					<form onSubmit={handleSendChat} style={{ display: 'flex' }}>
						<input value={chat} onChange={e => setChat(e.target.value)} style={{ flex: 1, marginRight: 8 }} placeholder="메시지 입력..." />
						<button type="submit">전송</button>
					</form>
				</div>
			</div>
		);
	}

	if (step === 'game') {
		return (
			<div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
				<h2>라이어 게임</h2>
				<div>내 닉네임: <b>{nickname}</b></div>
				<div>정체: <b>{role === 'liar' ? '라이어' : '시민'}</b></div>
				{role !== 'liar' && <div>제시어: <b>{word}</b></div>}
				<div style={{ marginTop: 20 }}>
					<h4>채팅</h4>
					<div style={{ minHeight: 100, border: '1px solid #eee', marginBottom: 10, padding: 10, background: '#fafafa' }}>
						{messages.map((msg, idx) => <div key={idx}>{msg}</div>)}
					</div>
					<form onSubmit={handleSendChat} style={{ display: 'flex' }}>
						<input value={chat} onChange={e => setChat(e.target.value)} style={{ flex: 1, marginRight: 8 }} placeholder="메시지 입력..." />
						<button type="submit">전송</button>
					</form>
				</div>
				<div style={{ marginTop: 20 }}>
					<h4>투표</h4>
					<select value={voteTarget} onChange={e => setVoteTarget(e.target.value)}>
						<option value="">--플레이어 선택--</option>
						{players.map((p, idx) => <option key={idx} value={p.username}>{p.username}</option>)}
					</select>
					<button onClick={handleVote} style={{ marginLeft: 10 }}>투표</button>
				</div>
			</div>
		);
	}

	if (step === 'result') {
		return (
			<div style={{ maxWidth: 400, margin: '40px auto', padding: 20 }}>
				<h2>결과</h2>
				<div>{voteResult}</div>
				<button onClick={() => window.location.reload()}>처음으로</button>
			</div>
		);
	}

	return null;
}

export default Game;
