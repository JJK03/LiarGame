import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import './styles.css';

function Game() {
  // 상태 정의
  const [step, setStep] = useState('nickname'); // nickname, lobby, game, result
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState(null); // 현재 입장한 방 정보
  const [rooms, setRooms] = useState([]); // 전체 방 목록
  const [inputRoomName, setInputRoomName] = useState(''); // 방 만들기 입력값
  const [word, setWord] = useState('');
  const [role, setRole] = useState('');
  const [chat, setChat] = useState('');
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]); // 로비 플레이어 목록
  const [voteTarget, setVoteTarget] = useState('');
  const [voteResult, setVoteResult] = useState('');
  const [error, setError] = useState(null);

  // 소켓 이벤트 등록
  useEffect(() => {
    socket.on('updatePlayerList', (lobbyPlayers) => {
      setPlayers(lobbyPlayers);
    });

    socket.on('updateRoomList', (roomList) => {
      setRooms(roomList);
    });

    socket.on('roomInfo', (roomData) => {
      setError(null); // 방에 들어가면 에러 초기화
      setRoom(roomData);
      setMessages([]);
      setStep('lobby');
    });

    socket.on('chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('gameStart', ({ word, role }) => {
      setError(null);
      setWord(word);
      setRole(role);
      setStep('game');
    });

    socket.on('voteResult', (result) => {
      setVoteResult(result);
      setStep('result');
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off('updatePlayerList');
      socket.off('updateRoomList');
      socket.off('roomInfo');
      socket.off('chat');
      socket.off('gameStart');
      socket.off('voteResult');
      socket.off('error');
    };
  }, []);

  const handleEnter = () => {
    if (nickname.trim()) {
      socket.emit('join', nickname);
      setStep('lobby');
    }
  };

  const handleCreateRoom = () => {
    if (inputRoomName.trim()) {
      socket.emit('createRoom', inputRoomName);
      setInputRoomName('');
    }
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('joinRoom', roomId);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chat.trim()) {
      socket.emit('chat', `${nickname}: ${chat}`);
      setChat('');
    }
  };

  const handleStartGame = () => {
    if (room) {
      socket.emit('startGame', room.id);
    }
  };

  const handleVote = () => {
    if (voteTarget && room) {
      socket.emit('vote', { roomId: room.id, target: voteTarget });
    }
  };

  // --- 화면 렌더링 --- //

  if (step === 'nickname') {
    return (
      <div className="container center">
        <h2>닉네임 입력</h2>
        {error && <div className="error-message">{error}</div>}
        <div style={{ maxWidth: 420, margin: '10px auto' }}>
          <input className="textInput" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임" />
          <div style={{ marginTop: 10 }}>
            <button className="primaryBtn" onClick={handleEnter} style={{ width: '100%' }}>로비 입장</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'lobby') {
    if (room) {
      return (
        <div className="container">
          <div className="header">
            <h2>{room.name}</h2>
            <div className="small">내 닉네임: <b>{nickname}</b></div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="panel">
            <div className="left box">
              <strong>참가자 목록 ({room.players.length}명)</strong>
              <div className="small">{room.players.map(p => p.nickname).join(', ')}</div>
              <div style={{ marginTop: 12 }}>
                <button 
                  className="primaryBtn" 
                  onClick={handleStartGame} 
                  disabled={room.players.length < 3}
                >게임 시작</button>
                {room.players.length < 3 && <div className="small-hint">3명 이상부터 시작할 수 있습니다.</div>}
              </div>
            </div>
            <div className="right box">
              <h4>채팅</h4>
              <div className="chatWindow">
                {messages.map((msg, idx) => <div key={idx} className="message">{msg}</div>)}
              </div>
              <form onSubmit={handleSendChat} className="formRow">
                <input className="textInput" value={chat} onChange={e => setChat(e.target.value)} placeholder="메시지 입력..." />
                <button className="primaryBtn" type="submit">전송</button>
              </form>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="container">
        <div className="header">
          <h2>메인 로비</h2>
          <div className="small">내 닉네임: <b>{nickname}</b></div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="panel">
          <div className="left box">
            <strong>로비 플레이어</strong>
            <div className="small">{players.map(p => p.nickname).join(', ') || '없음'}</div>
            <hr />
            <strong>방 만들기</strong>
            <div className="formRow">
              <input className="textInput" value={inputRoomName} onChange={e => setInputRoomName(e.target.value)} placeholder="방 이름" />
              <button className="primaryBtn" onClick={handleCreateRoom}>생성</button>
            </div>
          </div>
          <div className="right box">
            <h4>방 목록</h4>
            {rooms.length > 0 ? rooms.map(r => (
              <div key={r.id} className="roomItem">
                <span>{r.name} ({r.playerCount}명){r.gameStarted ? ' (게임 중)' : ''}</span>
                <button 
                  className="primaryBtn" 
                  onClick={() => handleJoinRoom(r.id)}
                  disabled={r.gameStarted}
                >입장</button>
              </div>
            )) : '생성된 방이 없습니다.'}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'game') {
    return (
      <div className="container">
        <div className="header">
          <h2>라이어 게임</h2>
          <div className="small">내 닉네임: <b>{nickname}</b></div>
        </div>
        <div className="panel">
          <div className="left box">
            <div><strong>나의 제시어</strong></div>
            <div className="small" style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{word}</div>
            <div style={{ marginTop: 16 }}>
              <h4>투표</h4>
              <select value={voteTarget} onChange={e => setVoteTarget(e.target.value)} className="textInput">
                <option value="">--플레이어 선택--</option>
                {room && room.players.map((p, idx) => <option key={idx} value={p.id}>{p.nickname}</option>)}
              </select>
              <div style={{ marginTop: 8 }}>
                <button className="primaryBtn" onClick={handleVote}>투표</button>
              </div>
            </div>
          </div>
          <div className="right box">
            <h4>채팅</h4>
            <div className="chatWindow">
              {messages.map((msg, idx) => <div key={idx} className="message">{msg}</div>)}
            </div>
            <form onSubmit={handleSendChat} className="formRow">
              <input className="textInput" value={chat} onChange={e => setChat(e.target.value)} placeholder="메시지 입력..." />
              <button className="primaryBtn" type="submit">전송</button>
            </form>
          </div>
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
