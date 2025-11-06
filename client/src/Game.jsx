import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import './styles.css';

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
    // [신규] 서버에서 플레이어 목록 업데이트 이벤트를 받으면 상태 업데이트
    socket.on('updatePlayerList', (updatedPlayers) => {
      setPlayers(updatedPlayers);
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
      // [신규] 컴포넌트 언마운트 시 'updatePlayerList' 이벤트 리스너 해제
      socket.off('updatePlayerList');
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
      <div className="container center">
        <h2>닉네임 입력</h2>
        <div style={{ maxWidth: 420, margin: '10px auto' }}>
          <input className="textInput" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임" />
          <div style={{ marginTop: 10 }}>
            <button className="primaryBtn" onClick={handleEnter} style={{ width: '100%' }}>입장</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'lobby') {
    return (
      <div className="container">
        <div className="header">
          <h2>방 로비</h2>
          <div className="small">내 닉네임: <b>{nickname}</b></div>
        </div>

        <div className="panel">
          <div className="left box">
            <div style={{ marginBottom: 8 }}>
              <button className="primaryBtn" onClick={handleCreateRoom}>방 만들기</button>
              <input className="textInput" value={inputRoom} onChange={e => setInputRoom(e.target.value)} placeholder="방 번호" style={{ width: 120, marginLeft: 8 }} />
              <button className="primaryBtn" onClick={handleJoinRoom} style={{ marginLeft: 8 }}>방 입장</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>참가자 목록</strong>
              <div className="small">{players.map(p => p.username).join(', ') || '아직 없음'}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="primaryBtn" onClick={handleStartGame}>게임 시작</button>
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

  if (step === 'game') {
    return (
      <div className="container">
        <div className="header">
          <h2>라이어 게임</h2>
          <div className="small">내 닉네임: <b>{nickname}</b></div>
        </div>

        <div className="panel">
          <div className="left box">
            <div><strong>정체</strong></div>
            <div className="badge">{role === 'liar' ? '라이어' : '시민'}</div>
            {role !== 'liar' && <div style={{ marginTop: 8 }}><strong>제시어</strong><div className="small">{word}</div></div>}

            <div style={{ marginTop: 16 }}>
              <h4>투표</h4>
              <select value={voteTarget} onChange={e => setVoteTarget(e.target.value)} className="textInput">
                <option value="">--플레이어 선택--</option>
                {players.map((p, idx) => <option key={idx} value={p.username}>{p.username}</option>)}
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
