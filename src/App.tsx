import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameClear, setIsGameClear] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isGameStarted) {
        setIsGameStarted(true);
      }
    };

    document.addEventListener('keydown', handleSpaceKey);
    return () => document.removeEventListener('keydown', handleSpaceKey);
  }, [isGameStarted]);

  useEffect(() => {
    if (!isGameStarted) return; // ゲームが開始されていない場合は処理を行わない

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスのサイズを設定
    canvas.width = 960;
    canvas.height = 640; // プレイ領域のための余裕を持たせる

    // 背景画像の読み込み
    const bgImage = new Image();
    bgImage.src = '/background.png';
    bgImage.onload = () => {
      // ゲームの状態
      const gameState = {
        ball: {
          x: canvas.width / 2,
          y: canvas.height - 30,
          dx: 3,
          dy: -3,
          radius: 8,
        },
        paddle: {
          width: 150,
          height: 10,
          x: canvas.width / 2 - 75,
        },
        bricks: [] as { x: number; y: number; width: number; height: number; status: boolean; opacity: number }[],
        score: 0,
      };

      // ブロックの初期化（画面全体を覆うように）
      const brickWidth = 80;  // 960/12 = 80（12列のブロック）
      const brickHeight = 36; // 540/15 = 36（15行のブロック）

      // 画面を完全に覆うために必要な行数と列数を計算
      const brickColumnCount = Math.ceil(canvas.width / brickWidth);
      const brickRowCount = Math.ceil(540 / brickHeight); // 背景画像の高さを540pxに設定

      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          const brickX = c * brickWidth;
          const brickY = r * brickHeight;
          // 最後の行と列のブロックのサイズを調整して隙間をなくす
          const adjustedWidth = (c === brickColumnCount - 1) ? canvas.width - (brickColumnCount - 1) * brickWidth : brickWidth;
          const adjustedHeight = (r === brickRowCount - 1) ? 540 - (brickRowCount - 1) * brickHeight : brickHeight;
          gameState.bricks.push({ 
            x: brickX, 
            y: brickY, 
            width: adjustedWidth,
            height: adjustedHeight,
            status: true, 
            opacity: 1.0 
          });
        }
      }

      // パドルの移動
      let rightPressed = false;
      let leftPressed = false;

      const keyDownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
          rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
          leftPressed = true;
        } else if (e.key === ' ' && isGameOver) {  // スペースキーでリスタート
          document.location.reload();
        }
      };

      const keyUpHandler = (e: KeyboardEvent) => {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
          rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
          leftPressed = false;
        }
      };

      // 描画関数
      const draw = () => {
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 背景画像の描画（元のサイズを維持）
        ctx.drawImage(bgImage, 0, 0, canvas.width, 540); // 背景画像の高さを540pxに設定

        // 背景の下部分を黒で塗りつぶす
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 540, canvas.width, canvas.height - 540);

        // ブロックの描画
        gameState.bricks.forEach((brick) => {
          if (brick.status) {
            ctx.beginPath();
            ctx.rect(brick.x, brick.y, brick.width, brick.height);
            // サンドブラウンの背景
            ctx.fillStyle = `rgba(244, 164, 96, ${brick.opacity})`;
            ctx.fill();
            // 白い枠線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            ctx.closePath();
          }
        });

        // ボールの描画
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.closePath();

        // パドルの描画（位置を調整）
        ctx.beginPath();
        ctx.rect(gameState.paddle.x, canvas.height - 10, gameState.paddle.width, gameState.paddle.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        // パドルに影をつける
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0; // 他の描画に影響しないようにリセット
        ctx.closePath();

        // スコアの表示
        ctx.font = 'bold 28px "Zen Maru Gothic"';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(`スコア: ${gameState.score}`, 20, canvas.height - 20);

        // 衝突検出
        gameState.bricks.forEach((brick) => {
          if (brick.status) {
            if (
              gameState.ball.x > brick.x &&
              gameState.ball.x < brick.x + brick.width &&
              gameState.ball.y > brick.y &&
              gameState.ball.y < brick.y + brick.height
            ) {
              gameState.ball.dy = -gameState.ball.dy;
              brick.status = false;
              gameState.score += 10;

              // 全てのブロックが崩されたかチェック
              const remainingBricks = gameState.bricks.filter(b => b.status).length;
              if (remainingBricks === 0) {
                setIsGameClear(true);
                setFinalScore(gameState.score);
                return;
              }
            }
          }
        });

        // ボールと壁の衝突
        if (gameState.ball.x + gameState.ball.dx > canvas.width - gameState.ball.radius || gameState.ball.x + gameState.ball.dx < gameState.ball.radius) {
          gameState.ball.dx = -gameState.ball.dx;
        }
        if (gameState.ball.y + gameState.ball.dy < gameState.ball.radius) {
          gameState.ball.dy = -gameState.ball.dy;
        }

        // パドルとの衝突判定（位置を調整）
        const paddleTop = canvas.height - 10;
        const paddleBottom = paddleTop + gameState.paddle.height;
        const ballBottom = gameState.ball.y + gameState.ball.radius + gameState.ball.dy;

        if (ballBottom > paddleTop && gameState.ball.y < paddleBottom) {
          if (
            gameState.ball.x > gameState.paddle.x &&
            gameState.ball.x < gameState.paddle.x + gameState.paddle.width
          ) {
            // パドルに当たった場合
            gameState.ball.dy = -Math.abs(gameState.ball.dy); // 必ず上向きに反射

            // ボールがパドルのどの位置に当たったかで反射角度を変える
            const paddleCenter = gameState.paddle.x + (gameState.paddle.width / 2);
            const hitPosition = (gameState.ball.x - paddleCenter) / (gameState.paddle.width / 2);
            gameState.ball.dx = hitPosition * 8; // 反射角度の調整
          }
        }

        // 画面下端に到達した場合（ゲームオーバー）
        if (gameState.ball.y + gameState.ball.radius > paddleBottom) {
          setIsGameOver(true);
          setFinalScore(gameState.score);
          return; // アニメーションを停止
        }

        // パドルの移動速度を調整
        if (rightPressed && gameState.paddle.x < canvas.width - gameState.paddle.width) {
          gameState.paddle.x += 8;
        } else if (leftPressed && gameState.paddle.x > 0) {
          gameState.paddle.x -= 8;
        }

        // ボールの移動
        gameState.ball.x += gameState.ball.dx;
        gameState.ball.y += gameState.ball.dy;

        requestAnimationFrame(draw);
      };

      // クリックでリスタート
      const handleRestart = () => {
        if (isGameOver) {
          document.location.reload();
        }
      };

      canvas.addEventListener('click', handleRestart);

      // イベントリスナーの設定
      document.addEventListener('keydown', keyDownHandler);
      document.addEventListener('keyup', keyUpHandler);

      draw();

      return () => {
        document.removeEventListener('keydown', keyDownHandler);
        document.removeEventListener('keyup', keyUpHandler);
        canvas.removeEventListener('click', handleRestart);
      };
    };
  }, [isGameOver, isGameClear, isGameStarted]);

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 font-['Zen_Maru_Gothic']">
        <div className="bg-black bg-opacity-80 p-12 rounded-lg border-4 border-pink-400 shadow-lg text-center">
          <h1 className="text-pink-400 text-4xl font-bold mb-8">💗 ちょっとえっちなのあちゃんがでてくるよ！</h1>
          <p className="text-white text-xl mb-8">スペースキーを押してゲームスタート</p>
        </div>
      </div>
    );
  }

  if (isGameClear) {
    const shareClearMessage = `もちのあブロック崩しゲームをクリアしました！\nスコア: ${finalScore}点\n#もちのあブロック崩しゲーム\n${window.location.href}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareClearMessage)}`;

    return (
      <div 
        className="flex flex-col items-center justify-start min-h-screen bg-black font-['Zen_Maru_Gothic']"
        style={{ 
          backgroundImage: 'url(/background.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
          paddingTop: '540px'
        }}
      >
        <div className="bg-black bg-opacity-80 p-16 rounded-lg border-8 border-orange-300 shadow-2xl" style={{ minWidth: '800px' }}>
          <h1 className="text-orange-300 text-8xl font-bold mb-12 text-center">GAME CLEAR!</h1>
          <div className="text-center mb-12">
            <h2 className="text-orange-100 text-4xl mb-6">クリアスコア</h2>
            <p className="text-orange-300 text-9xl font-bold">{finalScore}</p>
          </div>
          <div className="text-center text-orange-100 text-2xl mb-8">
            <p>おめでとうございます！</p>
            <p>全てのブロックを崩しました！</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => document.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition-colors duration-200 flex-1"
            >
              もう一度プレイ
            </button>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black hover:bg-gray-900 text-white font-bold py-4 px-8 rounded-lg text-2xl border-2 border-orange-300 flex items-center justify-center gap-2 transition-colors duration-200 flex-1 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              スコアを共有
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isGameOver) {
    const shareGameOverMessage = `もちのあブロック崩しゲームで${finalScore}点を獲得しました！\n#もちのあブロック崩しゲーム\n${window.location.href}`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareGameOverMessage)}`;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen font-['Zen_Maru_Gothic']" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="bg-black bg-opacity-80 p-12 rounded-lg border-4 border-orange-400 shadow-lg">
          <h1 className="text-orange-400 text-6xl font-bold mb-8 text-center">GAME OVER</h1>
          <div className="text-center mb-8">
            <h2 className="text-orange-200 text-3xl mb-4">最終スコア</h2>
            <p className="text-orange-300 text-7xl font-bold">{finalScore}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => document.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-xl flex-1"
            >
              もう一度プレイ
            </button>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-lg text-xl border-2 border-orange-400 flex items-center justify-center gap-2 transition-colors duration-200 flex-1 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              スコアを共有
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 font-['Zen_Maru_Gothic']">
      <canvas
        ref={canvasRef}
        className="border-4 border-blue-500 rounded-lg cursor-pointer"
      />
      <p className="text-white mt-4">← → キーでパドルを動かしてください</p>
    </div>
  )
}

export default App

