class Game {
    constructor() {
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initializeGame();
        this.initializeControls();
        this.resetGame();
        this.showStartScreen();
        requestAnimationFrame(() => this.gameLoop());
    }

    initializeGame() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 400;
        
        // 初始化游戏状态
        this.gameStarted = false;
        this.lastUpdate = 0;
        this.paused = false;

        // 添加碰撞状态
        this.playerCollisionState = {
            isColliding: false,
            collisionTime: 0,
            waitDuration: 1000 // 等待时间（毫秒）
        };
        this.npcCollisionState = {
            isColliding: false,
            collisionTime: 0,
            waitDuration: 1000
        };

        // 初始化游戏配置
        this.initGame();
    }

    initializeControls() {
        // 初始化控制
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.gameSpeed = parseInt(e.target.value);
        });
        
        document.querySelectorAll('.theme-switcher button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', this.theme);
                document.querySelectorAll('.theme-switcher button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 无限模式开关
        document.getElementById('infiniteMode').addEventListener('click', () => {
            this.infiniteMode = !this.infiniteMode;
            document.getElementById('infiniteMode').textContent = 
                this.infiniteMode ? "普通模式" : "无限模式";
        });

        // 复活按钮
        document.getElementById('revive').addEventListener('click', () => {
            if (this.reviveCount > 0) {
                this.reviveCount--;
                this.snake = [{x: 10, y: 10}];
                this.health = 100;
                document.getElementById('health').textContent = this.health;
                document.getElementById('revive').style.display = 'none';
                document.getElementById('revive').textContent = `复活（剩余${this.reviveCount}次）`;
            }
        });

        // 暂停按钮
        document.getElementById('pause').addEventListener('click', () => {
            this.paused = !this.paused;
            document.getElementById('pause').textContent = 
                this.paused ? "继续" : "暂停";
        });

        // 重新开始按钮
        document.getElementById('restart').addEventListener('click', () => {
            if (confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
                this.resetGame();
            }
        });

        // 食物数量选择
        document.getElementById('foodCount').addEventListener('change', (e) => {
            this.foodCount = parseInt(e.target.value);
            if (!this.infiniteMode) {
                this.activeFoods = Array(this.foodCount).fill(null).map(() => ({
                    ...this.generateFood(),
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                }));
            }
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowUp': 'up', 'w': 'up',
                'ArrowDown': 'down', 's': 'down',
                'ArrowLeft': 'left', 'a': 'left',
                'ArrowRight': 'right', 'd': 'right'
            };
            if (keyMap[e.key] && !this.isOpposite(keyMap[e.key])) {
                this.nextDirection = keyMap[e.key];
            }
        });

        // 点击开始游戏
        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            }
        });
    }

    isOpposite(newDir) {
        const opposites = {up: 'down', down: 'up', left: 'right', right: 'left'};
        return opposites[newDir] === this.direction;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * (this.canvas.width / 20)),
                y: Math.floor(Math.random() * (this.canvas.height / 20))
            };
        } while (this.snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        return newFood;
    }

    update() {
        if (!this.snake.length || !this.npcSnake.length) {
            return;
        }

        this.direction = this.nextDirection;
        const head = {...this.snake[0]};
        const npcHead = {...this.npcSnake[0]};

        // 更新玩家蛇的位置（如果没有处于碰撞状态）
        if (!this.playerCollisionState.isColliding) {
            switch(this.direction) {
                case 'up': head.y--; break;
                case 'down': head.y++; break;
                case 'left': head.x--; break;
                case 'right': head.x++; break;
            }
        } else if (Date.now() - this.playerCollisionState.collisionTime >= this.playerCollisionState.waitDuration) {
            this.playerCollisionState.isColliding = false;
        }

        // 更新NPC蛇的位置（如果没有处于碰撞状态）
        if (!this.npcCollisionState.isColliding && this.activeFoods.length > 0) {
            const nearestFood = this.activeFoods.reduce((nearest, food) => {
                const currentDist = Math.abs(npcHead.x - food.x) + Math.abs(npcHead.y - food.y);
                const nearestDist = Math.abs(npcHead.x - nearest.x) + Math.abs(npcHead.y - nearest.y);
                return currentDist < nearestDist ? food : nearest;
            }, this.activeFoods[0]);

            // NPC简单AI
            if (nearestFood) {
                if (npcHead.x < nearestFood.x) this.npcDirection = 'right';
                else if (npcHead.x > nearestFood.x) this.npcDirection = 'left';
                else if (npcHead.y < nearestFood.y) this.npcDirection = 'down';
                else if (npcHead.y > nearestFood.y) this.npcDirection = 'up';
            }

            switch(this.npcDirection) {
                case 'up': npcHead.y--; break;
                case 'down': npcHead.y++; break;
                case 'left': npcHead.x--; break;
                case 'right': npcHead.x++; break;
            }
        } else if (Date.now() - this.npcCollisionState.collisionTime >= this.npcCollisionState.waitDuration) {
            this.npcCollisionState.isColliding = false;
        }

        // 处理蛇之间的碰撞
        // 增强型碰撞检测逻辑
        const isHeadToHead = head.x === npcHead.x && head.y === npcHead.y;
        const npcBodyCollision = this.npcSnake.findIndex((seg, index) => 
            index > 0 && seg.x === head.x && seg.y === head.y);
        const playerBodyCollision = this.snake.findIndex((seg, index) => 
            index > 0 && seg.x === npcHead.x && seg.y === npcHead.y);

        // 头对头碰撞 - 根据长度决定胜负
        if (isHeadToHead && !this.playerCollisionState.isColliding && !this.npcCollisionState.isColliding) {
            if (this.snake.length > this.npcSnake.length) {
                // 玩家蛇获胜
                this.npcCollisionState.isColliding = true;
                this.npcCollisionState.collisionTime = Date.now();
                this.snake = this.snake.concat(this.npcSnake);
                this.npcSnake = [];
                this.score += 50;
                this.showFloatingText('完美对撞！+50', head.x, head.y, '#00ff00');
            } else if (this.snake.length < this.npcSnake.length) {
                // NPC蛇获胜
                this.playerCollisionState.isColliding = true;
                this.playerCollisionState.collisionTime = Date.now();
                this.npcSnake = this.npcSnake.concat(this.snake);
                this.snake = [];
                this.score -= 30;
                this.showFloatingText('对撞失败！-30', head.x, head.y, '#ff0000');
            } else {
                // 平局处理
                this.playerCollisionState.isColliding = true;
                this.npcCollisionState.isColliding = true;
                this.playerCollisionState.collisionTime = Date.now();
                this.npcCollisionState.collisionTime = Date.now();
                this.score += 10;
                this.showFloatingText('势均力敌！+10', head.x, head.y, '#ffff00');
            }
            return;
        }

        // 玩家蛇头撞NPC蛇身
        if (npcBodyCollision !== -1 && !this.npcCollisionState.isColliding) {
            this.npcCollisionState.isColliding = true;
            this.npcCollisionState.collisionTime = Date.now();
            const eatenSegments = this.npcSnake.slice(npcBodyCollision);
            this.snake = this.snake.concat(eatenSegments);
            this.npcSnake = this.npcSnake.slice(0, npcBodyCollision);
            this.score += 20;
            this.showFloatingText('侧击成功！+20', head.x, head.y, '#00ff00');
            return;
        }

        // NPC蛇头撞玩家蛇身
        if (playerBodyCollision !== -1 && !this.playerCollisionState.isColliding) {
            this.playerCollisionState.isColliding = true;
            this.playerCollisionState.collisionTime = Date.now();
            const eatenSegments = this.snake.slice(playerBodyCollision);
            this.npcSnake = this.npcSnake.concat(eatenSegments);
            this.snake = this.snake.slice(0, playerBodyCollision);
            this.score -= 15;
            this.showFloatingText('被偷袭！-15', npcHead.x, npcHead.y, '#ff0000');
            return;
        }

        // 处理边界碰撞
        let hitWall = false;
        if (!this.infiniteMode) {
            hitWall = head.x < 0 || head.x >= this.canvas.width/20 || 
                     head.y < 0 || head.y >= this.canvas.height/20;

            // NPC蛇边界检查
            if (npcHead.x < 0 || npcHead.x >= this.canvas.width/20 || 
                npcHead.y < 0 || npcHead.y >= this.canvas.height/20) {
                this.npcDirection = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
                return;
            }
        } else {
            // 无限模式边界处理
            if (head.x < 0) head.x = this.canvas.width/20 - 1;
            if (head.x >= this.canvas.width/20) head.x = 0;
            if (head.y < 0) head.y = this.canvas.height/20 - 1;
            if (head.y >= this.canvas.height/20) head.y = 0;
        }

        // 处理自碰撞
        const selfCollision = this.snake.some(seg => seg.x === head.x && seg.y === head.y);
        
        if (hitWall) {
            const damage = {150: 5, 100: 10, 60: 20}[this.gameSpeed];
            this.health = Math.max(0, this.health - damage);
            document.getElementById('health').textContent = this.health;
            
            if (this.health <= 0) {
                document.getElementById('revive').style.display = 'inline-block';
                return;
            }
        }

        if (selfCollision || (hitWall && !this.infiniteMode)) {
            if (this.reviveCount > 0) {
                document.getElementById('revive').style.display = 'inline-block';
                return;
            } else {
                alert(`游戏结束！得分：${this.score}`);
                location.reload();
            }
        }

        this.snake.unshift(head);
        this.npcSnake.unshift(npcHead);
        
        // 检查食物碰撞
        const playerEatenFoodIndex = this.activeFoods.findIndex(food => 
            head.x === food.x && head.y === food.y);
        const npcEatenFoodIndex = this.activeFoods.findIndex(food => 
            npcHead.x === food.x && npcHead.y === food.y);

        if (playerEatenFoodIndex !== -1) {
            const eatenFood = this.activeFoods[playerEatenFoodIndex];
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.activeFoods.splice(playerEatenFoodIndex, 1);
            // 将食物颜色添加到蛇身
            this.snake[this.snake.length - 1].color = eatenFood.color;
        } else {
            this.snake.pop();
        }

        if (npcEatenFoodIndex !== -1) {
            const eatenFood = this.activeFoods[npcEatenFoodIndex];
            this.activeFoods.splice(npcEatenFoodIndex, 1);
            // 将食物颜色添加到NPC蛇身
            this.npcSnake[this.npcSnake.length - 1].color = eatenFood.color;
        } else {
            this.npcSnake.pop();
        }

        // 检查是否完成游戏
        if (this.infiniteMode) {
            // 无限模式：检查蛇长度是否达到100
            if (this.snake.length >= 100) {
                if (confirm(`恭喜完成无限模式！最终得分：${this.score}\n是否复活重新开始？`)) {
                    this.resetGame();
                } else {
                    location.reload();
                }
            }
        }

        // 无限模式或普通模式下，当食物被吃完时自动生成新的食物
        if (this.activeFoods.length === 0) {
            if (!this.infiniteMode && this.npcSnake.length === 0) {
                // 非无限模式：检查是否吃掉所有食物且NPC蛇被吃掉
                if (confirm(`恭喜完成关卡！最终得分：${this.score}\n是否复活重新开始？`)) {
                    this.resetGame();
                } else {
                    location.reload();
                }
            } else {
                this.activeFoods = Array(this.foodCount).fill(null).map(() => ({
                    ...this.generateFood(),
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                }));
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制食物
        this.activeFoods.forEach(food => {
            this.ctx.fillStyle = food.color;
            this.ctx.fillRect(food.x*20, food.y*20, 18, 18);
        });

        // 绘制玩家蛇（带边框）
        this.snake.forEach((seg, index) => {
            // 绘制边框
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(seg.x*20, seg.y*20, 18, 18);
            // 填充颜色
            this.ctx.fillStyle = seg.color || `hsl(${index * 15}, 70%, 50%)`;
            this.ctx.fillRect(seg.x*20, seg.y*20, 18, 18);
        });

        // 绘制NPC蛇
        this.npcSnake.forEach((seg, index) => {
            this.ctx.fillStyle = seg.color || `hsl(${180 + index * 15}, 70%, 50%)`;
            this.ctx.fillRect(seg.x*20, seg.y*20, 18, 18);
        });
    }

    resetGame() {
        this.initGame();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('health').textContent = this.health;
        document.getElementById('score').textContent = this.score;
        document.getElementById('revive').style.display = 'none';
        document.getElementById('revive').textContent = `复活（剩余${this.reviveCount}次）`;
        document.getElementById('infiniteMode').textContent = this.infiniteMode ? "普通模式" : "无限模式";
    }

    initGame() {
        // 初始化游戏基本状态
        this.snake = [{x: 10, y: 10}];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.health = 100;
        this.reviveCount = 3;

        // 初始化游戏配置
        this.gameSpeed = parseInt(document.getElementById('difficulty')?.value || '100');
        this.theme = document.querySelector('.theme-switcher button.active')?.dataset.theme || 'default';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.infiniteMode = document.getElementById('infiniteMode')?.textContent === '普通模式';
        this.foodCount = parseInt(document.getElementById('foodCount')?.value || '10');

        // 初始化NPC蛇
        this.npcSnake = [
            {x: 30, y: 10},
            {x: 29, y: 10},
            {x: 28, y: 10}
        ];
        this.npcDirection = 'left';

        // 初始化食物
        this.activeFoods = Array(this.foodCount).fill(null).map(() => ({
            ...this.generateFood(),
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        }));

        // 更新UI
        document.getElementById('health').textContent = this.health;
        document.getElementById('score').textContent = this.score;
        document.getElementById('revive').style.display = 'none';
        document.getElementById('revive').textContent = `复活（剩余${this.reviveCount}次）`;
    }

    showFloatingText(text, x, y, color) {
        const floatingText = {
            text: text,
            x: x * 20 + 10,
            y: y * 20,
            alpha: 1.0,
            color: color
        };
        
        // 创建临时canvas绘制特效
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        const animate = () => {
            if (floatingText.alpha <= 0) return;
            
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.save();
            tempCtx.globalAlpha = floatingText.alpha;
            tempCtx.fillStyle = color;
            tempCtx.font = '18px Arial';
            tempCtx.textAlign = 'center';
            tempCtx.fillText(text, floatingText.x, floatingText.y);
            tempCtx.restore();
            
            this.ctx.drawImage(tempCanvas, 0, 0);
            
            floatingText.y -= 1;
            floatingText.alpha -= 0.02;
            requestAnimationFrame(animate);
        };
        animate();
    }

    showStartScreen() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('贪吃蛇大作战', this.canvas.width/2, this.canvas.height/2 - 50);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('点击开始游戏', this.canvas.width/2, this.canvas.height/2 + 20);
    }

    gameLoop(timestamp) {
        if (!this.gameStarted) {
            this.showStartScreen();
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }

        if (this.paused) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }

        if (!this.lastUpdate) {
            this.lastUpdate = timestamp;
        }

        const elapsed = timestamp - this.lastUpdate;
        if (elapsed >= this.gameSpeed) {
            this.lastUpdate = timestamp;
            if (this.snake && this.snake.length > 0) {
                this.update();
                this.draw();
            }
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    startGame() {
        this.gameStarted = true;
        this.resetGame();
        this.lastUpdate = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// 启动游戏
window.addEventListener('load', () => {
    const game = new Game();
});
