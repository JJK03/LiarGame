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
            } else if (step === 'game' && isMyTurn) {
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

    // ---------------- 공통 디자인 스타일 (1차 화면 컨셉) ----------------
    const pageStyle = {
        minHeight: '100vh',
        background: '#0D0D0F',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
    };

    const centerColumnWrapper = {
        width: '100%',
        maxWidth: '420px',
        padding: '0 20px',
        boxSizing: 'border-box',
        textAlign: 'center',
        color: '#EEE',
    };

    const wideWrapper = {
        width: '100%',
        maxWidth: '960px',
        padding: '0 20px',
        boxSizing: 'border-box',
        color: '#EEE',
    };

    const titleStyle = {
        fontSize: '2.6rem',
        margin: '0 0 24px',
        color: '#E74C3C',
        textShadow: '0 0 8px rgba(231,76,60,0.7)',
        textAlign: 'center',
    };

    const subTitleStyle = {
        fontSize: '1rem',
        color: '#AAA',
        textAlign: 'center',
        marginBottom: '16px',
    };

    const errorBoxStyle = {
        background: 'rgba(255,0,0,0.15)',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '15px',
        border: '1px solid rgba(255,0,0,0.4)',
        fontSize: '0.9rem',
    };

    const cardStyle = {
        width: '100%',
        padding: '20px 20px 24px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 0 18px rgba(0,0,0,0.7)',
        boxSizing: 'border-box',
    };

    const cardHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        fontSize: '0.95rem',
        color: '#AAA',
    };

    const labelStyle = {
        fontSize: '0.95rem',
        color: '#AAA',
        display: 'block',
        marginBottom: '6px',
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #333',
        background: 'rgba(255,255,255,0.07)',
        color: '#EEE',
        fontSize: '1rem',
        outline: 'none',
        marginTop: '6px',
        marginBottom: '10px',
        boxSizing: 'border-box',
    };

    const primaryBtnStyle = {
        padding: '12px 16px',
        fontSize: '1rem',
        borderRadius: '8px',
        background: '#3498DB',
        color: 'white',
        border: 'none',
        boxShadow: '0 0 12px rgba(0,0,0,0.8)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    };

    const secondaryBtnStyle = {
        padding: '12px 16px',
        fontSize: '0.95rem',
        borderRadius: '8px',
        background: '#444',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    };

    const twoColumnStyle = {
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '18px',
    };

    const verticalGap = { display: 'flex', flexDirection: 'column', gap: '12px' };

    const chatWindowStyle = {
        width: '100%',
        height: '220px',
        borderRadius: '8px',
        border: '1px solid #333',
        background: 'rgba(0,0,0,0.35)',
        padding: '10px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        fontSize: '0.9rem',
    };

    const smallText = { fontSize: '0.9rem', color: '#BBB' };

    const smallHint = { fontSize: '0.8rem', color: '#888', marginTop: '4px' };

    const formRowStyle = {
        display: 'flex',
        gap: '8px',
        marginTop: '10px',
    };

    // --- 화면 렌더링 ---

    //1차 화면 디자인 (완) - 닉네임 입력 화면
    if (step === 'nickname') {
        return (
            <div style={pageStyle}>
                {/* 가운데 정렬되는 실제 컨텐츠 박스 */}
                <div style={centerColumnWrapper}>
                    {/* 타이틀 */}
                    <h1 style={titleStyle}>LIAR GAME</h1>

                    {/* 에러메시지 */}
                    {error && <div style={errorBoxStyle}>{error}</div>}

                    {/* 카드 박스 */}
                    <div style={cardStyle}>
                        <label style={labelStyle}>닉네임 입력</label>

                        {/* 인풋 */}
                        <input
                            className="textInput"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="닉네임을 입력하세요"
                            style={inputStyle}
                        />

                        {/* 버튼 */}
                        <button
                            className="primaryBtn"
                            onClick={handleEnter}
                            style={{ ...primaryBtnStyle, width: '100%', marginTop: '6px' }}
                        >
                            ▶ 로비 입장
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    //2차 화면 디자인 - 로비 단계
    if (step === 'lobby') {
        // 방 내부 로비 화면 (방에 들어간 상태)
        if (room) {
            return (
                <div style={pageStyle}>
                    <div style={wideWrapper}>
                        <h1 style={titleStyle}>LIAR GAME</h1>
                        <div style={subTitleStyle}>
                            방 이름: <b>{room.name}</b> · 내 닉네임: <b>{nickname}</b>
                        </div>

                        {error && <div style={errorBoxStyle}>{error}</div>}

                        {/* 방 정보 + 채팅 카드 */}
                        <div style={twoColumnStyle}>
                            {/* 왼쪽: 방 정보 / 참가자 / 버튼 */}
                            <div style={cardStyle}>
                                <div style={cardHeaderStyle}>
                                    <span>방 정보</span>
                                    <span style={smallText}>
                    인원: {room.players.length}명
                                        {room.gameStarted && ' · 게임 진행 중'}
                  </span>
                                </div>

                                <div style={verticalGap}>
                                    <div>
                                        <strong style={{ fontSize: '1rem' }}>참가자 목록</strong>
                                        <div style={{ ...smallText, marginTop: '6px' }}>
                                            {room.players.map((p, index) => (
                                                <span key={p.id}>
                          {p.nickname} {room.host === p.id && '(방장)'}
                                                    {index < room.players.length - 1 ? ', ' : ''}
                        </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button
                                            className="primaryBtn"
                                            onClick={handleStartGame}
                                            disabled={socket.id !== room.host || room.gameStarted}
                                            style={{
                                                ...primaryBtnStyle,
                                                flex: 1,
                                                opacity:
                                                    socket.id !== room.host || room.gameStarted ? 0.6 : 1,
                                            }}
                                        >
                                            {room.gameStarted ? '게임 진행 중' : '게임 시작'}
                                        </button>
                                        <button
                                            className="secondaryBtn"
                                            onClick={handleLeaveRoom}
                                            style={{ ...secondaryBtnStyle, flex: 1 }}
                                        >
                                            방 나가기
                                        </button>
                                    </div>

                                    {room.players.length < 3 && !room.gameStarted && (
                                        <div style={smallHint}>3명 이상부터 게임을 시작할 수 있습니다.</div>
                                    )}
                                </div>
                            </div>

                            {/* 오른쪽: 채팅 */}
                            <div style={cardStyle}>
                                <div style={cardHeaderStyle}>
                                    <span>채팅</span>
                                    <span style={smallText}>방 참가자들과 대화하세요</span>
                                </div>
                                <div style={chatWindowStyle}>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className="message">
                                            {msg}
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleSendMessage} style={formRowStyle}>
                                    <input
                                        className="textInput"
                                        value={chat}
                                        onChange={e => setChat(e.target.value)}
                                        placeholder="메시지 입력..."
                                        style={{ ...inputStyle, margin: 0, flex: 1 }}
                                    />
                                    <button
                                        className="primaryBtn"
                                        type="submit"
                                        style={primaryBtnStyle}
                                    >
                                        전송
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // 방 만들기 전 디자인 - 메인 로비
        return (
            <div style={pageStyle}>
                <div style={wideWrapper}>
                    <h1 style={titleStyle}>LIAR GAME</h1>
                    <div style={subTitleStyle}>
                        메인 로비 · 내 닉네임: <b>{nickname}</b>
                    </div>

                    {error && <div style={errorBoxStyle}>{error}</div>}

                    <div style={twoColumnStyle}>
                        {/* 왼쪽: 로비 플레이어 + 방 만들기 */}
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span>로비 정보</span>
                                <span style={smallText}>현재 대기 중인 플레이어</span>
                            </div>

                            <div style={verticalGap}>
                                <div>
                                    <strong style={{ fontSize: '1rem' }}>로비 플레이어</strong>
                                    <div style={{ ...smallText, marginTop: '6px' }}>
                                        {players.length > 0
                                            ? players.map(p => p.nickname).join(', ')
                                            : '대기 중인 플레이어가 없습니다.'}
                                    </div>
                                </div>

                                <div style={{ marginTop: '14px' }}>
                                    <strong style={{ fontSize: '1rem' }}>방 만들기</strong>
                                    <div style={{ ...smallText, marginTop: '4px' }}>
                                        방 이름을 입력하고 새로운 게임 방을 생성하세요.
                                    </div>
                                    <div style={formRowStyle}>
                                        <input
                                            className="textInput"
                                            value={inputRoomName}
                                            onChange={e => setInputRoomName(e.target.value)}
                                            placeholder="방 이름"
                                            style={{ ...inputStyle, margin: 0, flex: 1 }}
                                        />
                                        <button
                                            className="primaryBtn"
                                            onClick={handleCreateRoom}
                                            style={primaryBtnStyle}
                                        >
                                            생성
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 오른쪽: 방 목록 */}
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span>방 목록</span>
                                <span style={smallText}>
                  현재 생성된 게임 방 {rooms.length}개
                </span>
                            </div>
                            <div style={{ ...verticalGap, maxHeight: '340px', overflowY: 'auto' }}>
                                {rooms.length > 0 ? (
                                    rooms.map(r => (
                                        <div
                                            key={r.id}
                                            className="roomItem"
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #333',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'rgba(0,0,0,0.35)',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '0.95rem' }}>
                                                    {r.name}{' '}
                                                    <span style={{ color: '#999', fontSize: '0.85rem' }}>
                            ({r.playerCount}명)
                          </span>
                                                </div>
                                                <div style={{ ...smallText, marginTop: '2px' }}>
                                                    {r.gameStarted ? '게임 진행 중' : '대기 중'}
                                                </div>
                                            </div>
                                            <button
                                                className="primaryBtn"
                                                onClick={() => handleJoinRoom(r.id)}
                                                disabled={r.gameStarted}
                                                style={{
                                                    ...primaryBtnStyle,
                                                    opacity: r.gameStarted ? 0.6 : 1,
                                                }}
                                            >
                                                입장
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div style={smallText}>생성된 방이 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 방 내부 디자인 - 실제 게임 화면
    if (step === 'game') {
        return (
            <div style={pageStyle}>
                <div style={wideWrapper}>
                    <h1 style={titleStyle}>LIAR GAME</h1>
                    <div style={subTitleStyle}>
                        방 이름: <b>{room?.name}</b> · 내 닉네임: <b>{nickname}</b> · 역할:{' '}
                        <b>{role || '비밀'}</b>
                    </div>

                    {turnInfo && (
                        <div
                            style={{
                                ...cardStyle,
                                marginBottom: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '1rem', marginBottom: '4px' }}>
                                    {turnInfo.round} 라운드{' '}
                                    {turnInfo.turn}/{turnInfo.totalTurns} 번째 턴
                                </div>
                                <div style={smallText}>
                                    현재 차례:{' '}
                                    <strong style={{ color: '#fff' }}>
                                        {turnInfo.currentPlayer.nickname}
                                    </strong>
                                </div>
                            </div>
                            <div style={smallHint}>
                                {isMyTurn
                                    ? '당신의 발언 차례입니다.'
                                    : '차례를 기다려 주세요.'}
                            </div>
                        </div>
                    )}

                    {showHostChoice && (
                        <div
                            style={{
                                ...cardStyle,
                                marginBottom: '16px',
                            }}
                        >
                            <h4 style={{ margin: 0, marginBottom: '6px' }}>
                                {endedRound}차 발언 종료
                            </h4>
                            {socket.id === room.host ? (
                                <div>
                                    <p style={{ ...smallText, marginBottom: '10px' }}>
                                        투표를 시작하거나, 한 라운드 더 발언 기회를 가질 수 있습니다.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className="primaryBtn"
                                            onClick={handleRequestVoting}
                                            style={{ ...primaryBtnStyle, flex: 1 }}
                                        >
                                            투표 시작하기
                                        </button>
                                        <button
                                            className="secondaryBtn"
                                            onClick={handleRequestSecondRound}
                                            style={{ ...secondaryBtnStyle, flex: 1 }}
                                        >
                                            한 라운드 더하기
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p style={smallText}>방장이 다음 행동을 선택하고 있습니다...</p>
                            )}
                        </div>
                    )}

                    {/* 좌우 2열: 제시어/투표 + 진행 상황/발언 */}
                    <div style={twoColumnStyle}>
                        {/* 왼쪽: 제시어 / 투표 */}
                        <div style={cardStyle}>
                            <div style={verticalGap}>
                                <div>
                                    <div style={labelStyle}>나의 제시어</div>
                                    <div
                                        style={{
                                            ...smallText,
                                            marginTop: '4px',
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            color: '#fff',
                                        }}
                                    >
                                        {word || '게임 시작 대기 중'}
                                    </div>
                                </div>

                                {showVoting && (
                                    <div style={{ marginTop: '10px' }}>
                                        <h4 style={{ margin: 0, marginBottom: '6px' }}>라이어 투표</h4>
                                        <p style={{ ...smallText, marginBottom: '8px' }}>
                                            모든 플레이어가 발언을 마쳤습니다. 라이어라고 생각되는
                                            사람에게 투표하세요.
                                        </p>
                                        <select
                                            value={voteTarget}
                                            onChange={e => setVoteTarget(e.target.value)}
                                            className="textInput"
                                            style={inputStyle}
                                        >
                                            <option value="">-- 플레이어 선택 --</option>
                                            {room &&
                                                room.players
                                                    .filter(p => p.id !== socket.id)
                                                    .map((p, idx) => (
                                                        <option key={idx} value={p.id}>
                                                            {p.nickname}
                                                        </option>
                                                    ))}
                                        </select>
                                        <button
                                            className="primaryBtn"
                                            onClick={handleVote}
                                            disabled={!voteTarget}
                                            style={{
                                                ...primaryBtnStyle,
                                                width: '100%',
                                                marginTop: '4px',
                                                opacity: voteTarget ? 1 : 0.6,
                                            }}
                                        >
                                            투표하기
                                        </button>
                                        {showVoteConfirmation && (
                                            <div
                                                style={{
                                                    ...smallHint,
                                                    marginTop: '8px',
                                                    color: 'lightgreen',
                                                }}
                                            >
                                                투표가 완료되었습니다.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 오른쪽: 진행 상황 + 발언 입력 */}
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span>진행 상황</span>
                                <span style={smallText}>
                  각 플레이어의 발언 및 시스템 메시지
                </span>
                            </div>
                            <div style={chatWindowStyle}>
                                {messages.map((msg, idx) => (
                                    <div key={idx} className="message">
                                        {msg}
                                    </div>
                                ))}
                            </div>

                            {isMyTurn && (
                                <form onSubmit={handleSendMessage} style={formRowStyle}>
                                    <input
                                        className="textInput"
                                        value={chat}
                                        onChange={e => setChat(e.target.value)}
                                        placeholder="제시어에 대해 설명하세요..."
                                        style={{ ...inputStyle, margin: 0, flex: 1 }}
                                    />
                                    <button
                                        className="primaryBtn"
                                        type="submit"
                                        style={primaryBtnStyle}
                                    >
                                        제출
                                    </button>
                                </form>
                            )}
                            {!isMyTurn && (
                                <div style={{ ...smallHint, marginTop: '8px' }}>
                                    다른 플레이어의 발언을 기다리는 중입니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 결과창 디자인
    if (step === 'result') {
        const isCitizenWin = voteResult.includes('시민');

        return (
            <div style={pageStyle}>
                <div style={centerColumnWrapper}>
                    <h1 style={titleStyle}>LIAR GAME</h1>
                    <div style={subTitleStyle}>게임 결과</div>

                    <div
                        style={{
                            ...cardStyle,
                            textAlign: 'center',
                            background: isCitizenWin
                                ? 'rgba(52, 152, 219, 0.12)'
                                : 'rgba(231, 76, 60, 0.12)',
                            border: isCitizenWin
                                ? '1px solid rgba(52, 152, 219, 0.6)'
                                : '1px solid rgba(231, 76, 60, 0.6)',
                        }}
                    >
                        <h3
                            style={{
                                color: isCitizenWin ? '#3498DB' : '#E74C3C',
                                fontSize: '1.6rem',
                                marginBottom: '0.8rem',
                            }}
                        >
                            {isCitizenWin ? '시민 승리!' : '라이어 승리!'}
                        </h3>
                        <p
                            style={{
                                fontSize: '1rem',
                                whiteSpace: 'pre-wrap',
                                color: '#EEE',
                                marginBottom: '0.8rem',
                            }}
                        >
                            {voteResult}
                        </p>
                    </div>

                    <button
                        className="primaryBtn"
                        onClick={handleReturnToLobby}
                        style={{ ...primaryBtnStyle, width: '100%', marginTop: '16px' }}
                    >
                        방으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

export default Game;
