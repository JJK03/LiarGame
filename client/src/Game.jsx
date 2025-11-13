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
  const [showVoteConfirmation, setShowVoteConfirmation] = useState(false);
  const [turnInfo, setTurnInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showVoting, setShowVoting] = useState(false);
  const [showHostChoice, setShowHostChoice] = useState(false);
  const [endedRound, setEndedRound] = useState(1);

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
        setStep((prevStep) => (prevStep === 'result' ? 'result' : 'lobby'));
      });
  
      socket.on('leftRoom', () => {
        setRoom(null);
        setError(null);
      });
  
      socket.on('chat', (msg) => {
        setMessages((prev) => [...prev, `${msg.nickname}: ${msg.message}`]);
      });
  
      socket.on('gameStart', ({ word, role }) => {
        setError(null);
        setWord(word);
        setRole(role);
        setStep('game');
        setMessages([]); // 게임 시작 시 메시지 초기화
        setShowVoting(false); // 게임 시작 시 투표 UI 숨김
        setShowHostChoice(false); // 게임 시작 시 방장 선택 UI 숨김
      });
  
      socket.on('nextTurn', (data) => {
        setShowHostChoice(false); // 새로운 턴이 시작되면 방장 선택 UI 숨김
        setTurnInfo(data);
        setIsMyTurn(data.currentPlayer.id === socket.id);
        setShowVoting(false); // 새로운 턴이 시작되면 투표 UI 숨김
      });

      socket.on('firstRoundEnd', ({ round }) => {
        setTurnInfo(null); // 턴 정보 초기화
        setEndedRound(round);
        setShowHostChoice(true);
      });
  
      socket.on('startVoting', () => {
        setShowHostChoice(false);
        setShowVoting(true);
        setTurnInfo(null); // 턴 정보 초기화
      });
  
      socket.on('voteResult', (result) => {
        setVoteResult(result);
        setStep('result');
      });
  
      socket.on('error', (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
      });

      socket.on('gameTerminated', (message) => {
        alert(message);
        handleReturnToLobby();
      });
  
      return () => {
        socket.off('updatePlayerList');
        socket.off('updateRoomList');
        socket.off('roomInfo');
        socket.off('leftRoom');
        socket.off('chat');
        socket.off('gameStart');
        socket.off('voteResult');
        socket.off('error');
        socket.off('nextTurn');
        socket.off('startVoting');
        socket.off('firstRoundEnd');
        socket.off('gameTerminated');
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
  
    const handleLeaveRoom = () => {
      if (room) {
        socket.emit('leaveRoom', room.id);
      }
    };
  
    const handleSendMessage = (e) => {
      e.preventDefault();
      if (chat.trim() && room) {
        if (step === 'lobby') {
          socket.emit('chat', { nickname, message: chat });
        }
        else if (step === 'game' && isMyTurn) {
          socket.emit('submitTurn', { roomId: room.id, message: chat });
        }
        setChat('');
      }
    };
  
    const handleStartGame = () => {
      if (room) {
        if (room.players.length < 3) {
          alert('게임 시작에는 최소 3명 이상의 플레이어가 필요합니다.');
          return;
        }
        socket.emit('startGame', room.id);
      }
    };

    const handleRequestVoting = () => {
      if (room) {
        socket.emit('requestVoting', { roomId: room.id });
      }
    };

    const handleRequestSecondRound = () => {
      if (room) {
        socket.emit('requestSecondRound', { roomId: room.id });
      }
    };
  
      const handleVote = () => {
        if (voteTarget && room) {
          socket.emit('vote', { roomId: room.id, target: voteTarget });
          setShowVoteConfirmation(true);
          setTimeout(() => setShowVoteConfirmation(false), 2000); // 2초 후 메시지 숨김
        }
      };
    
      const handleReturnToLobby = () => {
        setStep('lobby');
        setVoteResult('');
        setWord('');
        setRole('');
        setShowVoting(false);
        setMessages([]);
      };
    
      // --- 화면 렌더링 --- //


      //레거시코드
      /*if (step === 'nickname') {
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
      }*/



    if (step === 'nickname') {
        return (
            <div
                // 전체 화면(배경) – 가운데 정렬 기준은 여기 하나만 쓴다
                style={{
                    minHeight: '100vh',
                    background: '#0D0D0F',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {/* 가운데 정렬되는 실제 컨텐츠 박스 */}
                <div
                    style={{
                        width: '100%',
                        maxWidth: '420px',       // 타이틀/카드/인풋 모두 이 폭 안에서만
                        padding: '0 20px',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        color: '#EEE',
                    }}
                >
                    {/* 타이틀 */}
                    <h1
                        style={{
                            fontSize: '2.6rem',
                            margin: '0 0 32px',
                            color: '#E74C3C',
                            textShadow: '0 0 8px rgba(231,76,60,0.7)',
                        }}
                    >
                         LIAR GAME
                    </h1>

                    {/* 에러메시지 */}
                    {error && (
                        <div
                            style={{
                                background: 'rgba(255,0,0,0.15)',
                                padding: '10px',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                border: '1px solid rgba(255,0,0,0.4)',
                                fontSize: '0.9rem',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* 카드 박스 */}
                    <div
                        style={{
                            width: '100%',
                            padding: '20px 20px 24px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            boxShadow: '0 0 18px rgba(0,0,0,0.7)',
                            boxSizing: 'border-box',
                        }}
                    >
                        <label
                            style={{
                                fontSize: '0.95rem',
                                color: '#AAA',
                                display: 'block',
                                marginBottom: '6px',
                            }}
                        >
                            닉네임 입력
                        </label>

                        {/* 인풋 */}
                        <input
                            className="textInput"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="닉네임을 입력하세요"
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '8px',
                                border: '1px solid #333',
                                background: 'rgba(255,255,255,0.07)',
                                color: '#EEE',
                                fontSize: '1.05rem',
                                outline: 'none',
                                marginTop: '8px',
                                marginBottom: '16px',
                                boxSizing: 'border-box',   // 카드 폭 안에 딱 맞게
                            }}
                        />

                        {/* 버튼 */}
                        <button
                            className="primaryBtn"
                            onClick={handleEnter}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '1.05rem',
                                borderRadius: '8px',
                                background: '#3498DB',
                                color: 'white',
                                border: 'none',
                                boxShadow: '0 0 12px rgba(0,0,0,0.8)',
                                cursor: 'pointer',
                            }}
                        >
                            ▶ 로비 만들기
                        </button>
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
                  <div className="small">
                    {room.players.map((p, index) => (
                      <span key={p.id}>
                        {p.nickname} {room.host === p.id && '(방장)'}
                        {index < room.players.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
                    <button 
                      className="primaryBtn" 
                      onClick={handleStartGame}
                      disabled={socket.id !== room.host || room.gameStarted}
                    >{room.gameStarted ? '게임 중...' : '게임 시작'}</button>
                    <button className="secondaryBtn" onClick={handleLeaveRoom}>방 나가기</button>
                  </div>
                  {room.players.length < 3 && !room.gameStarted && <div className="small-hint">3명 이상부터 시작할 수 있습니다.</div>}
                </div>
                <div className="right box">
                  <h4>채팅</h4>
                  <div className="chatWindow">
                    {messages.map((msg, idx) => <div key={idx} className="message">{msg}</div>)}
                  </div>
                  <form onSubmit={handleSendMessage} className="formRow">
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
            {turnInfo && (
              <div className="turn-info">
                <h3>{turnInfo.round} 라운드 {turnInfo.turn}/{turnInfo.totalTurns} 번째 턴</h3>
                <p>현재 차례: <strong>{turnInfo.currentPlayer.nickname}</strong></p>
              </div>
            )}
            {showHostChoice && (
              <div className="turn-info">
                <h4>{endedRound}차 발언 종료</h4>
                {socket.id === room.host ? (
                  <div>
                    <p>투표를 시작하거나, 한 라운드 더 발언 기회를 가질 수 있습니다.</p>
                    <div style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
                      <button className="primaryBtn" onClick={handleRequestVoting}>투표 시작하기</button>
                      <button className="secondaryBtn" onClick={handleRequestSecondRound}>한 라운드 더하기</button>
                    </div>
                  </div>
                ) : (
                  <p>방장이 다음 행동을 선택하고 있습니다...</p>
                )}
              </div>
            )}
            <div className="panel">
              <div className="left box">
                <div style={{ marginTop: 10 }}><strong>나의 제시어</strong></div>
                <div className="small" style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{word}</div>
                {showVoting && (
                  <div style={{ marginTop: 16 }}>
                    <h4>라이어 투표</h4>
                    <p>모든 플레이어가 발언을 마쳤습니다. 라이어라고 생각되는 사람에게 투표하세요.</p>
                    <select value={voteTarget} onChange={e => setVoteTarget(e.target.value)} className="textInput">
                      <option value="">--플레이어 선택--</option>
                      {room && room.players.filter(p => p.id !== socket.id).map((p, idx) => <option key={idx} value={p.id}>{p.nickname}</option>)}
                    </select>
                    <div style={{ marginTop: 8 }}>
                      <button className="primaryBtn" onClick={handleVote} disabled={!voteTarget}>투표하기</button>
                    </div>
                    {showVoteConfirmation && <div className="small-hint" style={{ marginTop: 10, color: 'green' }}>투표 완료!</div>}
                  </div>
                )}
              </div>
              <div className="right box">
                <h4>진행 상황</h4>
                <div className="chatWindow">
                  {messages.map((msg, idx) => <div key={idx} className="message">{msg}</div>)}
                </div>
                {isMyTurn && (
                  <form onSubmit={handleSendMessage} className="formRow">
                    <input className="textInput" value={chat} onChange={e => setChat(e.target.value)} placeholder="제시어에 대해 설명하세요..." />
                    <button className="primaryBtn" type="submit">제출</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      }
    
      if (step === 'result') {
        const isCitizenWin = voteResult.includes('시민');
        return (
          <div className="container center" style={{ maxWidth: '500px' }}>
            <div className="header" style={{ justifyContent: 'center' }}>
              <h2>게임 결과</h2>
            </div>
            <div className="box" style={{ backgroundColor: isCitizenWin ? '#e9f3ff' : '#fbeae8', textAlign: 'center' }}>
              <h3 style={{ color: isCitizenWin ? 'var(--primary-color)' : 'var(--error-color)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                {isCitizenWin ? '시민 승리!' : '라이어 승리!'}
              </h3>
              <p style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>{voteResult}</p>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button className="primaryBtn" onClick={handleReturnToLobby}>방으로 돌아가기</button>
            </div>
          </div>
        );
      }
    
      return null;
    }
export default Game;
