"use strict";

/*
 * 寰宇元年 · 博客交互脚本（编辑部风格版）
 */

(function () {
    // 平滑滚动 + 导航高亮
    const navLinks = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section[id]');
    const backToTop = document.querySelector('.back-to-top');
    const notice = document.querySelector('.site-notice');
    const noticeClose = document.querySelector('.notice-close');

    // 导航点击平滑滚动
    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 关闭公告带（裁切收起动画）
    if (notice && noticeClose) {
        noticeClose.addEventListener('click', function () {
            notice.classList.add('is-leaving');
            notice.addEventListener('animationend', () => notice.remove(), { once: true });
        });
    }

    // 滚动时更新导航高亮 + 返回顶部
    function onScroll() {
        const scrollY = window.scrollY;

        let current = '';
        sections.forEach((section) => {
            const sectionTop = section.offsetTop - 120;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach((link) => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });

        if (backToTop) {
            backToTop.classList.toggle('show', scrollY > 500);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 滚动显示动画（IntersectionObserver）
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        revealElements.forEach((el) => observer.observe(el));
    } else {
        revealElements.forEach((el) => el.classList.add('visible'));
    }

    // ===== 互动小脸：空心眼睛跟随鼠标 + 自动眨眼 =====
    const face = document.getElementById('heroFace');
    if (face) {
        const eyes = face.querySelectorAll('.eye');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let targetX = 0, targetY = 0, curX = 0, curY = 0;

        if (!reduceMotion) {
            document.addEventListener('mousemove', (e) => {
                const r = face.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                const dist = Math.hypot(dx, dy) || 1;
                const k = Math.min(dist / 600, 1);
                const ang = Math.atan2(dy, dx);
                targetX = Math.cos(ang) * 20 * k;
                targetY = Math.sin(ang) * 20 * k;
            });

            (function follow() {
                curX += (targetX - curX) * 0.18;
                curY += (targetY - curY) * 0.18;
                eyes.forEach((eye) => {
                    eye.style.setProperty('--ex', curX.toFixed(2) + 'px');
                    eye.style.setProperty('--ey', curY.toFixed(2) + 'px');
                });
                requestAnimationFrame(follow);
            })();
        }

        function blink() {
            eyes.forEach((el) => el.classList.add('blink'));
            setTimeout(() => eyes.forEach((el) => el.classList.remove('blink')), 200);
        }
        (function blinkLoop() {
            setTimeout(() => { blink(); blinkLoop(); }, 2400 + Math.random() * 3200);
        })();

        // 点它一下：连眨两下
        let winkTimer = null;
        face.addEventListener('click', () => {
            blink();
            clearTimeout(winkTimer);
            winkTimer = setTimeout(blink, 260);
        });
    }


        // ===== 原子结构动画 v3：容器=小球本体，按住即旋转（轻量优化版） =====
    const atomWrap = document.getElementById('atomField');
    const atomCanvas = document.getElementById('atomCanvas');
    if (atomWrap && atomCanvas) {
        const actx = atomCanvas.getContext('2d');
        const reduceMotionA = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const RED_A = '212, 70, 54';
        const DARK_A = '176, 48, 40';
        const INK_A = '61, 43, 36';
        const dprA = function () { return Math.min(window.devicePixelRatio || 1, 1.5); };

        let AW = 0, AH = 0, cx = 0, cy = 0, R = 0;
        let ry = 0.6, rx = 0.35;                 // 场景旋转角
        let velRy = 0, velRx = 0;                // 惯性角速度（分别对应 ry / rx）
        let dragging = false, lastX = 0, lastY = 0;
        let rafA = 0, bornA = performance.now();

        const MER = 10;                          // 经线数（原12）
        const YS = [-0.88, -0.5, 0, 0.5, 0.88];  // 纬线 y（5条，原7）
        const SEG = 30;                          // 每圈采样（原40/48）

        // 硅原子 Si(14)：核外电子排布 2-8-4 → K/L/M 三层电子壳
        const SHELLS = [
            { r: 0.50, n: 2, ux: 1.35, uz: 0.30, spd: 2.0 },                 // K 壳
            { r: 0.68, n: 8, ux: 0.95, uz: -0.95, spd: 1.35 },               // L 壳
            { r: 0.85, n: 4, ux: 0.50, uz: 1.10, spd: 0.95, valence: true }  // M 壳(价电子)
        ];

        function resizeA() {
            const r = atomWrap.getBoundingClientRect();
            AW = r.width; AH = r.height;
            if (AW < 10 || AH < 10) return;
            atomCanvas.width = Math.round(AW * dprA());
            atomCanvas.height = Math.round(AH * dprA());
            actx.setTransform(dprA(), 0, 0, dprA(), 0, 0);
            cx = AW / 2; cy = AH / 2;
            R = Math.min(AW, AH) * 0.42;
        }

        // 三维旋转（先 Y 后 X）+ 透视投影
        function rotP(x, y, z, cY, sY, cX, sX) {
            const x1 = x * cY + z * sY;
            const z1 = -x * sY + z * cY;
            const y2 = y * cX - z1 * sX;
            const z2 = y * sX + z1 * cX;
            const persp = 3.6 / (3.6 - z2 / R * 0.9);
            return { x: cx + x1 * R * persp, y: cy + y2 * R * persp, z: z2 };
        }

        // 一条 3D 折线按段深度拆成前/后两组（背面被原子核盖住）
        function segs(pts, backP, frontP) {
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                const midZ = (a.z + b.z) / 2;
                const pth = midZ >= 0 ? frontP : backP;
                pth.moveTo(a.x, a.y); pth.lineTo(b.x, b.y);
            }
        }

        function frame(now) {
            if (document.hidden) { rafA = requestAnimationFrame(frame); return; }
            const t = (now - bornA) * 0.001;

            if (!dragging) {
                ry += velRy; rx += velRx;
                velRy *= 0.94; velRx *= 0.94;
                if (Math.abs(velRy) < 0.0001) velRy = 0;
                if (Math.abs(velRx) < 0.0001) velRx = 0;
                if (!reduceMotionA) ry += 0.0014;   // 平时自动缓转
            }
            rx = Math.max(-1.45, Math.min(1.45, rx));

            actx.clearRect(0, 0, AW, AH);   // 每帧清屏（漏了会叠加成实心球）
            const cY = Math.cos(ry), sY = Math.sin(ry);
            const cX = Math.cos(rx), sX = Math.sin(rx);

            const backP = new Path2D();
            const frontP = new Path2D();

            // 经线
            for (let m = 0; m < MER; m++) {
                const mA = (m / MER) * Math.PI * 2;
                const pts = [];
                for (let k = 0; k <= SEG; k++) {
                    const a = (k / SEG) * Math.PI * 2;
                    pts.push(rotP(Math.sin(a) * Math.cos(mA), Math.cos(a), Math.sin(a) * Math.sin(mA), cY, sY, cX, sX));
                }
                segs(pts, backP, frontP);
            }
            // 纬线
            for (let j = 0; j < YS.length; j++) {
                const y0 = YS[j];
                const rr = Math.sqrt(Math.max(0, 1 - y0 * y0));
                const pts = [];
                for (let k = 0; k <= SEG; k++) {
                    const a = (k / SEG) * Math.PI * 2;
                    pts.push(rotP(rr * Math.cos(a), y0, rr * Math.sin(a), cY, sY, cX, sX));
                }
                segs(pts, backP, frontP);
            }

            // 硅的三层壳轨道环（K/L/M，半径递增、平面倾斜各异）
            const rings = [];
            for (let si = 0; si < SHELLS.length; si++) {
                const sh = SHELLS[si];
                const cy2 = Math.cos(sh.ux), sy2 = Math.sin(sh.ux);
                const cz = Math.cos(sh.uz), sz = Math.sin(sh.uz);
                const pts = [];
                for (let k = 0; k <= 40; k++) {
                    const a = (k / 40) * Math.PI * 2;
                    const x = Math.cos(a) * sh.r, y = Math.sin(a) * sh.r, z = 0;
                    const y2 = y * cy2 - z * sy2, z2 = y * sy2 + z * cy2;
                    const x3 = x * cz - z2 * sz, z3 = x * sz + z2 * cz;
                    pts.push(rotP(x3, y2, z3, cY, sY, cX, sX));
                }
                rings.push(pts);
            }

            // 背面
            actx.lineWidth = 1;
            actx.strokeStyle = 'rgba(' + RED_A + ', 0.14)';
            actx.stroke(backP);
            const backRing = new Path2D();
            for (let ri = 0; ri < rings.length; ri++) {
                const rg = rings[ri];
                for (let i = 1; i < rg.length; i++) {
                    if ((rg[i - 1].z + rg[i].z) / 2 < 0) {
                        backRing.moveTo(rg[i - 1].x, rg[i - 1].y);
                        backRing.lineTo(rg[i].x, rg[i].y);
                    }
                }
            }
            actx.stroke(backRing);

            // 原子核（呼吸光晕，跟着球心，不受旋转影响）
            const pulse = reduceMotionA ? 1 : 1 + Math.sin(t * 2.2) * 0.1;
            const nr = R * 0.09;
            actx.fillStyle = 'rgba(' + RED_A + ', 0.12)';
            actx.beginPath(); actx.arc(cx, cy, nr * 3.4 * pulse, 0, 6.2832); actx.fill();
            actx.fillStyle = 'rgba(' + DARK_A + ', 0.85)';
            actx.beginPath(); actx.arc(cx, cy, nr * 1.55 * pulse, 0, 6.2832); actx.fill();
            actx.fillStyle = 'rgb(' + INK_A + ')';
            actx.beginPath(); actx.arc(cx, cy, nr * 0.7 * pulse, 0, 6.2832); actx.fill();

            // 前面
            actx.strokeStyle = 'rgba(' + DARK_A + ', 0.55)';
            actx.stroke(frontP);
            actx.strokeStyle = 'rgba(' + DARK_A + ', 0.5)';
            const frontRing = new Path2D();
            for (let ri = 0; ri < rings.length; ri++) {
                const rg = rings[ri];
                for (let i = 1; i < rg.length; i++) {
                    if ((rg[i - 1].z + rg[i].z) / 2 >= 0) {
                        frontRing.moveTo(rg[i - 1].x, rg[i - 1].y);
                        frontRing.lineTo(rg[i].x, rg[i].y);
                    }
                }
            }
            actx.stroke(frontRing);

            // 电子按壳层排布绕行：K=2 / L=8 / M=4（M 壳为价电子，高亮）
            function electron3D(sh, phase) {
                const cy2 = Math.cos(sh.ux), sy2 = Math.sin(sh.ux);
                const cz = Math.cos(sh.uz), sz = Math.sin(sh.uz);
                const x = Math.cos(phase) * sh.r, y = Math.sin(phase) * sh.r, z = 0;
                const y2 = y * cy2 - z * sy2, z2 = y * sy2 + z * cy2;
                const x3 = x * cz - z2 * sz, z3 = x * sz + z2 * cz;
                const p = rotP(x3, y2, z3, cY, sY, cX, sX);
                const front = p.z >= 0;
                if (sh.valence) {   // 价电子：红光晕更大更亮
                    actx.fillStyle = front ? 'rgba(' + RED_A + ', 0.40)' : 'rgba(' + RED_A + ', 0.15)';
                    actx.beginPath(); actx.arc(p.x, p.y, R * 0.06, 0, 6.2832); actx.fill();
                    actx.fillStyle = front ? 'rgb(' + INK_A + ')' : 'rgba(' + INK_A + ', 0.45)';
                    actx.beginPath(); actx.arc(p.x, p.y, R * 0.028, 0, 6.2832); actx.fill();
                } else {            // 内层电子：小点
                    actx.fillStyle = front ? 'rgba(' + RED_A + ', 0.24)' : 'rgba(' + RED_A + ', 0.09)';
                    actx.beginPath(); actx.arc(p.x, p.y, R * 0.042, 0, 6.2832); actx.fill();
                    actx.fillStyle = front ? 'rgb(' + INK_A + ')' : 'rgba(' + INK_A + ', 0.4)';
                    actx.beginPath(); actx.arc(p.x, p.y, R * 0.02, 0, 6.2832); actx.fill();
                }
            }
            if (!reduceMotionA) {
                for (let si = 0; si < SHELLS.length; si++) {
                    const sh = SHELLS[si];
                    for (let k = 0; k < sh.n; k++) {
                        electron3D(sh, t * sh.spd + (k / sh.n) * Math.PI * 2);
                    }
                }
            }

            rafA = requestAnimationFrame(frame);
        }

        function stopA() { if (rafA) { cancelAnimationFrame(rafA); rafA = 0; } }
        function startA() { if (!rafA) rafA = requestAnimationFrame(frame); }

        resizeA();
        window.addEventListener('resize', resizeA);

        // 拖拽：容器本身就是球的大小，按住球任意处即旋转
        atomWrap.addEventListener('pointerdown', function (e) {
            dragging = true;
            lastX = e.clientX; lastY = e.clientY;
            atomWrap.classList.add('dragging');
            if (atomWrap.setPointerCapture) {
                try { atomWrap.setPointerCapture(e.pointerId); } catch (err) {}
            }
            startA();
        });
        window.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;
            ry += dx * 0.007;      // 横向：随鼠标同向
            rx -= dy * 0.007;      // 纵向：屏幕 Y 向下，取反才跟手
            velRy = dx * 0.007;
            velRx = -dy * 0.007;
        });
        window.addEventListener('pointerup', function () {
            if (!dragging) return;
            dragging = false;
            atomWrap.classList.remove('dragging');
        });

        // 视野外停帧省电
        if ('IntersectionObserver' in window) {
            const ioA = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) startA(); else stopA();
                });
            }, { threshold: 0.02 });
            ioA.observe(atomWrap);
        } else {
            startA();
        }
    }

})();

/* ===== 中 / EN 语言切换（data-en 驱动，独立模块） ===== */
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('langToggle');
    if (!btn) return;
    var zhB = btn.querySelector('.lang-zh');
    var enB = btn.querySelector('.lang-en');
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-en]'));

    function apply(lang) {
        nodes.forEach(function (el) {
            if (lang === 'en') {
                if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML;
                el.innerHTML = el.getAttribute('data-en');
            } else if (el.dataset.zh !== undefined) {
                el.innerHTML = el.dataset.zh;
            }
        });
        root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
        document.title = lang === 'en' ? 'Year One · Personal Blog' : '寰宇元年 · 个人博客';
        zhB.classList.toggle('on', lang !== 'en');
        enB.classList.toggle('on', lang === 'en');
        try { localStorage.setItem('site-lang', lang); } catch (e) { /* 隐私模式下忽略 */ }
    }

    var saved = 'zh';
    try { saved = localStorage.getItem('site-lang') || 'zh'; } catch (e) { /* ignore */ }
    apply(saved === 'en' ? 'en' : 'zh');

    btn.addEventListener('click', function () {
        apply(root.getAttribute('lang') === 'en' ? 'zh' : 'en');
    });
})();

/* ===== 关于我：分类导航切换（tab ↔ 面板联动） ===== */
(function () {
    const tabs = document.querySelectorAll('#aboutTabs .about-tab');
    const panes = document.querySelectorAll('#aboutPanes .tab-pane');
    if (!tabs.length || tabs.length !== panes.length) return;
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach((p, j) => { p.hidden = j !== i; });
        });
    });
})();
